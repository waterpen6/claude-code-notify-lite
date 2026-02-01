const fs = require('fs');
const path = require('path');
const { getClaudeConfigDir, getConfigDir, ensureConfigDir, saveConfig, getDefaultConfig } = require('./config');
const logger = require('./logger');

function getClaudeSettingsPath() {
  return path.join(getClaudeConfigDir(), 'settings.json');
}

function getHookCommand() {
  logger.info('Generating hook command');

  const command = 'npx --yes claude-code-notify-lite run';
  logger.info('Using npx command', { command });
  return command;
}

function readClaudeSettings() {
  const settingsPath = getClaudeSettingsPath();
  logger.debug('Reading Claude settings', { settingsPath });

  if (!fs.existsSync(settingsPath)) {
    logger.debug('Settings file not found, returning empty object');
    return {};
  }

  try {
    const content = fs.readFileSync(settingsPath, 'utf8');
    const settings = JSON.parse(content);
    logger.debug('Settings loaded successfully');
    return settings;
  } catch (err) {
    logger.error('Failed to read Claude settings', err);
    return {};
  }
}

function writeClaudeSettings(settings) {
  const settingsPath = getClaudeSettingsPath();
  const claudeDir = getClaudeConfigDir();

  logger.debug('Writing Claude settings', { settingsPath });

  if (!fs.existsSync(claudeDir)) {
    fs.mkdirSync(claudeDir, { recursive: true });
  }

  fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2), 'utf8');
  logger.info('Settings written successfully');
}

function backupClaudeSettings() {
  const settingsPath = getClaudeSettingsPath();

  if (fs.existsSync(settingsPath)) {
    const backupPath = settingsPath + '.backup';
    fs.copyFileSync(settingsPath, backupPath);
    logger.info('Settings backed up', { backupPath });
    return backupPath;
  }

  return null;
}

function isOurHook(command) {
  if (!command) return false;
  return command.includes('claude-code-notify-lite') ||
         command.includes('ccnotify') ||
         command.includes('notify.js');
}

function install(options = {}) {
  console.log('Installing claude-code-notify-lite...\n');
  logger.info('Install started', { options });

  try {
    ensureConfigDir();
    saveConfig(getDefaultConfig());
    console.log('  [OK] Created config file');
    logger.info('Config file created');

    if (options.skipHooks) {
      console.log('  [SKIP] Hook installation skipped');
      logger.info('Hook installation skipped');
      return { success: true, message: 'Installed without hooks' };
    }

    const backupPath = backupClaudeSettings();
    if (backupPath) {
      console.log(`  [OK] Backed up existing settings to ${backupPath}`);
    }

    const settings = readClaudeSettings();

    if (!settings.hooks) {
      settings.hooks = {};
    }

    const hookCommand = getHookCommand();
    logger.info('Hook command generated', { hookCommand });

    const stopHook = {
      hooks: [
        {
          type: 'command',
          command: hookCommand,
          timeout: 30
        }
      ]
    };

    if (!settings.hooks.Stop) {
      settings.hooks.Stop = [stopHook];
      logger.info('Created new Stop hook');
    } else {
      const existingIndex = settings.hooks.Stop.findIndex(h =>
        h.hooks && h.hooks.some(hh => isOurHook(hh.command))
      );

      if (existingIndex === -1) {
        settings.hooks.Stop.push(stopHook);
        logger.info('Added Stop hook');
      } else {
        settings.hooks.Stop[existingIndex] = stopHook;
        console.log('  [OK] Updated existing hook');
        logger.info('Updated existing Stop hook');
      }
    }

    writeClaudeSettings(settings);
    console.log('  [OK] Configured Claude Code hooks');

    console.log('\nInstallation complete!');
    console.log('Run "npx claude-code-notify-lite test" to verify.\n');

    logger.info('Install completed successfully');
    return { success: true };
  } catch (err) {
    logger.error('Install failed', err);
    console.error(`  [ERROR] ${err.message}`);
    return { success: false, error: err.message };
  }
}

function uninstall(options = {}) {
  console.log('Uninstalling claude-code-notify-lite...\n');
  logger.info('Uninstall started', { options });

  try {
    const settings = readClaudeSettings();

    if (settings.hooks && settings.hooks.Stop) {
      settings.hooks.Stop = settings.hooks.Stop.filter(h => {
        if (h.hooks) {
          h.hooks = h.hooks.filter(hh => !isOurHook(hh.command));
          return h.hooks.length > 0;
        }
        return true;
      });

      if (settings.hooks.Stop.length === 0) {
        delete settings.hooks.Stop;
      }

      if (Object.keys(settings.hooks).length === 0) {
        delete settings.hooks;
      }

      writeClaudeSettings(settings);
      console.log('  [OK] Removed Claude Code hooks');
      logger.info('Hooks removed');
    }

    if (!options.keepConfig) {
      const configDir = getConfigDir();
      if (fs.existsSync(configDir)) {
        fs.rmSync(configDir, { recursive: true, force: true });
        console.log('  [OK] Removed config directory');
        logger.info('Config directory removed', { configDir });
      }
    } else {
      console.log('  [SKIP] Kept config directory');
    }

    console.log('\nUninstallation complete!\n');
    logger.info('Uninstall completed');

    return { success: true };
  } catch (err) {
    logger.error('Uninstall failed', err);
    console.error(`  [ERROR] ${err.message}`);
    return { success: false, error: err.message };
  }
}

function checkInstallation() {
  const settings = readClaudeSettings();

  const hasHook = settings.hooks &&
    settings.hooks.Stop &&
    settings.hooks.Stop.some(h =>
      h.hooks && h.hooks.some(hh => isOurHook(hh.command))
    );

  const configDir = getConfigDir();
  const hasConfig = fs.existsSync(path.join(configDir, 'config.json'));

  logger.debug('Installation check', { hasHook, hasConfig });

  return {
    installed: hasHook && hasConfig,
    hasHook,
    hasConfig
  };
}

module.exports = { install, uninstall, checkInstallation };
