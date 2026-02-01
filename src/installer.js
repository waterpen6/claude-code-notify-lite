const fs = require('fs');
const path = require('path');
const os = require('os');
const { getClaudeConfigDir, getConfigDir, ensureConfigDir, saveConfig, getDefaultConfig } = require('./config');
const logger = require('./logger');

function getClaudeSettingsPath() {
  return path.join(getClaudeConfigDir(), 'settings.json');
}

function isNpxCache(filePath) {
  const normalizedPath = filePath.toLowerCase().replace(/\\/g, '/');
  return normalizedPath.includes('npm-cache/_npx') ||
         normalizedPath.includes('npm-cache\\_npx') ||
         normalizedPath.includes('.npm/_npx');
}

function copyCliToConfigDir() {
  const configDir = getConfigDir();

  ensureConfigDir();

  const srcDir = path.join(configDir, 'src');
  if (!fs.existsSync(srcDir)) {
    fs.mkdirSync(srcDir, { recursive: true });
  }

  const filesToCopy = [
    { src: path.resolve(__dirname, 'index.js'), dest: path.join(srcDir, 'index.js') },
    { src: path.resolve(__dirname, 'notifier.js'), dest: path.join(srcDir, 'notifier.js') },
    { src: path.resolve(__dirname, 'audio.js'), dest: path.join(srcDir, 'audio.js') },
    { src: path.resolve(__dirname, 'config.js'), dest: path.join(srcDir, 'config.js') },
    { src: path.resolve(__dirname, 'logger.js'), dest: path.join(srcDir, 'logger.js') }
  ];

  for (const file of filesToCopy) {
    if (fs.existsSync(file.src)) {
      fs.copyFileSync(file.src, file.dest);
      logger.debug('Copied file', { src: file.src, dest: file.dest });
    }
  }

  const assetsDir = path.resolve(__dirname, '..', 'assets');
  const targetAssetsDir = path.join(configDir, 'assets');
  if (!fs.existsSync(targetAssetsDir)) {
    fs.mkdirSync(targetAssetsDir, { recursive: true });
  }

  const soundsDir = path.join(assetsDir, 'sounds');
  const targetSoundsDir = path.join(targetAssetsDir, 'sounds');
  if (fs.existsSync(soundsDir)) {
    if (!fs.existsSync(targetSoundsDir)) {
      fs.mkdirSync(targetSoundsDir, { recursive: true });
    }
    const sounds = fs.readdirSync(soundsDir);
    for (const sound of sounds) {
      fs.copyFileSync(path.join(soundsDir, sound), path.join(targetSoundsDir, sound));
    }
  }

  const runScript = `const path = require('path');
const srcDir = path.join(__dirname, 'src');
const { run } = require(path.join(srcDir, 'index.js'));
run().catch(err => {
  console.error('Notification error:', err.message);
  process.exit(1);
});
`;
  const runScriptPath = path.join(configDir, 'run.js');
  fs.writeFileSync(runScriptPath, runScript, 'utf8');

  logger.info('Copied CLI files to config directory', { configDir });
  return runScriptPath;
}

function getHookCommand() {
  logger.info('Generating hook command');

  const nodePath = process.execPath;
  const originalCliPath = path.resolve(__dirname, '..', 'bin', 'cli.js');

  let cliPath = originalCliPath;
  let useLocalCopy = false;
  let command;

  if (isNpxCache(originalCliPath)) {
    logger.warn('Running from npx cache, copying files to config directory');
    console.log('  [INFO] Detected npx execution, copying files for persistence...');
    cliPath = copyCliToConfigDir();
    useLocalCopy = true;
    command = `"${nodePath}" "${cliPath}"`;
  } else {
    command = `"${nodePath}" "${cliPath}" run`;
  }

  logger.info('Using absolute path command', { command, nodePath, cliPath, useLocalCopy });
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
    console.log('Run "ccnotify test" or "npx ccnotify test" to verify.\n');

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
