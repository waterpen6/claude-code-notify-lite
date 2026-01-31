const os = require('os');
const path = require('path');
const fs = require('fs');

const CONFIG_DIR_NAME = 'claude-code-notify-lite';
const CONFIG_FILE_NAME = 'config.json';

function getConfigDir() {
  const platform = os.platform();

  if (platform === 'win32') {
    return path.join(process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming'), CONFIG_DIR_NAME);
  } else if (platform === 'darwin') {
    return path.join(os.homedir(), 'Library', 'Application Support', CONFIG_DIR_NAME);
  } else {
    return path.join(process.env.XDG_CONFIG_HOME || path.join(os.homedir(), '.config'), CONFIG_DIR_NAME);
  }
}

function getConfigPath() {
  return path.join(getConfigDir(), CONFIG_FILE_NAME);
}

function getClaudeConfigDir() {
  return path.join(os.homedir(), '.claude');
}

function getDefaultConfig() {
  return {
    version: '1.0.0',
    notification: {
      enabled: true,
      title: 'Claude Code',
      showWorkDir: true,
      showTime: true
    },
    sound: {
      enabled: true,
      file: 'default',
      volume: 80
    }
  };
}

function deepMerge(target, source) {
  const result = { ...target };

  for (const key in source) {
    if (source[key] !== null && typeof source[key] === 'object' && !Array.isArray(source[key])) {
      if (target[key] && typeof target[key] === 'object' && !Array.isArray(target[key])) {
        result[key] = deepMerge(target[key], source[key]);
      } else {
        result[key] = { ...source[key] };
      }
    } else {
      result[key] = source[key];
    }
  }

  return result;
}

function ensureConfigDir() {
  const configDir = getConfigDir();
  if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir, { recursive: true });
  }
  return configDir;
}

function loadConfig() {
  const configPath = getConfigPath();
  const defaultConfig = getDefaultConfig();

  if (!fs.existsSync(configPath)) {
    return defaultConfig;
  }

  try {
    const content = fs.readFileSync(configPath, 'utf8');
    const userConfig = JSON.parse(content);
    return deepMerge(defaultConfig, userConfig);
  } catch (error) {
    if (process.env.DEBUG) {
      console.error('Failed to load config:', error.message);
    }
    return defaultConfig;
  }
}

function saveConfig(config) {
  ensureConfigDir();
  const configPath = getConfigPath();
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf8');
}

function getSoundsDir() {
  return path.join(__dirname, '..', 'assets', 'sounds');
}

module.exports = {
  getConfigDir,
  getConfigPath,
  getClaudeConfigDir,
  getDefaultConfig,
  ensureConfigDir,
  loadConfig,
  saveConfig,
  getSoundsDir
};
