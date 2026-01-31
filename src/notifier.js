const notifier = require('node-notifier');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { loadConfig } = require('./config');

function getIconPath() {
  const iconPath = path.join(__dirname, '..', 'assets', 'icon.png');
  return fs.existsSync(iconPath) ? iconPath : undefined;
}

function notify(options = {}) {
  const config = loadConfig();

  if (!config.notification || !config.notification.enabled) {
    return Promise.resolve();
  }

  const title = options.title || config.notification.title || 'Claude Code';
  let message = options.message || 'Task completed';

  if (config.notification.showWorkDir && options.workDir) {
    message += `\n${options.workDir}`;
  }

  if (config.notification.showTime && options.time) {
    message += `\n${options.time}`;
  }

  const iconPath = getIconPath();
  const platform = os.platform();

  const notificationOptions = {
    title: title,
    message: message,
    sound: false,
    wait: false,
    timeout: 5
  };

  if (iconPath) {
    notificationOptions.icon = iconPath;
  }

  if (platform === 'darwin') {
    if (iconPath) {
      notificationOptions.contentImage = iconPath;
    }
    notificationOptions.sound = false;
  } else if (platform === 'win32') {
    notificationOptions.appID = 'Claude Code Notify Lite';
  }

  return new Promise((resolve) => {
    const timeoutId = setTimeout(() => {
      if (process.env.DEBUG) {
        console.warn('Notification timed out');
      }
      resolve();
    }, 10000);

    notifier.notify(notificationOptions, (err, response) => {
      clearTimeout(timeoutId);
      if (err && process.env.DEBUG) {
        console.warn('Notification error:', err.message);
      }
      resolve(response);
    });
  });
}

module.exports = { notify };
