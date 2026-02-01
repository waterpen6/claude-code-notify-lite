const fs = require('fs');
const path = require('path');
const os = require('os');

const LOG_DIR_NAME = 'claude-code-notify-lite';
const LOG_FILE_NAME = 'debug.log';
const MAX_LOG_SIZE = 1024 * 1024;

function getLogDir() {
  const platform = os.platform();

  if (platform === 'win32') {
    return path.join(process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming'), LOG_DIR_NAME);
  } else if (platform === 'darwin') {
    return path.join(os.homedir(), 'Library', 'Logs', LOG_DIR_NAME);
  } else {
    return path.join(process.env.XDG_STATE_HOME || path.join(os.homedir(), '.local', 'state'), LOG_DIR_NAME);
  }
}

function getLogPath() {
  return path.join(getLogDir(), LOG_FILE_NAME);
}

function ensureLogDir() {
  const logDir = getLogDir();
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }
  return logDir;
}

function rotateLogIfNeeded() {
  const logPath = getLogPath();
  if (fs.existsSync(logPath)) {
    try {
      const stats = fs.statSync(logPath);
      if (stats.size > MAX_LOG_SIZE) {
        const backupPath = logPath + '.old';
        if (fs.existsSync(backupPath)) {
          fs.unlinkSync(backupPath);
        }
        fs.renameSync(logPath, backupPath);
      }
    } catch (e) {}
  }
}

function formatTime() {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
}

function log(level, message, data = null) {
  try {
    ensureLogDir();
    rotateLogIfNeeded();

    const logPath = getLogPath();
    let logLine = `[${formatTime()}] [${level.toUpperCase()}] ${message}`;

    if (data !== null) {
      if (data instanceof Error) {
        logLine += ` | Error: ${data.message}`;
        if (data.stack) {
          logLine += ` | Stack: ${data.stack.replace(/\n/g, ' -> ')}`;
        }
      } else if (typeof data === 'object') {
        logLine += ` | Data: ${JSON.stringify(data)}`;
      } else {
        logLine += ` | ${data}`;
      }
    }

    logLine += '\n';

    fs.appendFileSync(logPath, logLine, 'utf8');
  } catch (e) {}
}

function info(message, data = null) {
  log('info', message, data);
}

function error(message, data = null) {
  log('error', message, data);
}

function debug(message, data = null) {
  log('debug', message, data);
}

function warn(message, data = null) {
  log('warn', message, data);
}

module.exports = {
  info,
  error,
  debug,
  warn,
  getLogPath,
  getLogDir
};
