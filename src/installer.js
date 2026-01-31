const fs = require('fs');
const path = require('path');
const { getClaudeConfigDir, getConfigDir, ensureConfigDir, saveConfig, getDefaultConfig } = require('./config');

function getClaudeSettingsPath() {
  return path.join(getClaudeConfigDir(), 'settings.json');
}

function getHookCommand() {
  try {
    const { execSync } = require('child_process');
    const npmRoot = execSync('npm root -g', { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] }).trim();
    const notifyScript = path.join(npmRoot, 'claude-code-notify-lite', 'bin', 'notify.js');

    if (fs.existsSync(notifyScript)) {
      const normalizedPath = notifyScript.replace(/\\/g, '/');
      return `node "${normalizedPath}"`;
    }
  } catch (e) {
    if (process.env.DEBUG) {
      console.warn('Failed to find global npm path:', e.message);
    }
  }

  return 'npx claude-code-notify-lite run';
}

function readClaudeSettings() {
  const settingsPath = getClaudeSettingsPath();

  if (!fs.existsSync(settingsPath)) {
    return {};
  }

  try {
    const content = fs.readFileSync(settingsPath, 'utf8');
    return JSON.parse(content);
  } catch (err) {
    if (process.env.DEBUG) {
      console.warn('Failed to read Claude settings:', err.message);
    }
    return {};
  }
}

function writeClaudeSettings(settings) {
  const settingsPath = getClaudeSettingsPath();
  const claudeDir = getClaudeConfigDir();

  if (!fs.existsSync(claudeDir)) {
    fs.mkdirSync(claudeDir, { recursive: true });
  }

  fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2), 'utf8');
}

function backupClaudeSettings() {
  const settingsPath = getClaudeSettingsPath();

  if (fs.existsSync(settingsPath)) {
    const backupPath = settingsPath + '.backup';
    fs.copyFileSync(settingsPath, backupPath);
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

  ensureConfigDir();
  saveConfig(getDefaultConfig());
  console.log('  [OK] Created config file');

  if (options.skipHooks) {
    console.log('  [SKIP] Hook installation skipped');
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

  const stopHook = {
    hooks: [
      {
        type: 'command',
        command: hookCommand,
        timeout: 10
      }
    ]
  };

  if (!settings.hooks.Stop) {
    settings.hooks.Stop = [stopHook];
  } else {
    const exists = settings.hooks.Stop.some(h =>
      h.hooks && h.hooks.some(hh => isOurHook(hh.command))
    );

    if (!exists) {
      settings.hooks.Stop.push(stopHook);
    } else {
      console.log('  [OK] Hook already configured');
    }
  }

  writeClaudeSettings(settings);
  console.log('  [OK] Configured Claude Code hooks');

  console.log('\nInstallation complete!');
  console.log('Run "ccnotify test" to verify.\n');

  return { success: true };
}

function uninstall(options = {}) {
  console.log('Uninstalling claude-code-notify-lite...\n');

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
  }

  if (!options.keepConfig) {
    const configDir = getConfigDir();
    if (fs.existsSync(configDir)) {
      fs.rmSync(configDir, { recursive: true, force: true });
      console.log('  [OK] Removed config directory');
    }
  } else {
    console.log('  [SKIP] Kept config directory');
  }

  console.log('\nUninstallation complete!\n');

  return { success: true };
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

  return {
    installed: hasHook && hasConfig,
    hasHook,
    hasConfig
  };
}

module.exports = { install, uninstall, checkInstallation };
