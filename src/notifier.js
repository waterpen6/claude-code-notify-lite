const notifier = require('node-notifier');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { exec } = require('child_process');
const { loadConfig } = require('./config');
const logger = require('./logger');

function getIconPath() {
  const iconPath = path.join(__dirname, '..', 'assets', 'icon.png');
  return fs.existsSync(iconPath) ? iconPath : undefined;
}

function notifyWindows(title, message) {
  return new Promise((resolve) => {
    logger.info('Sending Windows notification', { title, messageLength: message.length });

    const escapedTitle = title.replace(/"/g, '\\"');
    const escapedMessage = message.replace(/"/g, '\\"').replace(/\n/g, '`n');

    const psScript = `
      [Windows.UI.Notifications.ToastNotificationManager, Windows.UI.Notifications, ContentType = WindowsRuntime] | Out-Null
      [Windows.Data.Xml.Dom.XmlDocument, Windows.Data.Xml.Dom.XmlDocument, ContentType = WindowsRuntime] | Out-Null
      $template = @"
<toast>
  <visual>
    <binding template="ToastText02">
      <text id="1">${escapedTitle}</text>
      <text id="2">${escapedMessage}</text>
    </binding>
  </visual>
</toast>
"@
      $xml = New-Object Windows.Data.Xml.Dom.XmlDocument
      $xml.LoadXml($template)
      $toast = [Windows.UI.Notifications.ToastNotification]::new($xml)
      [Windows.UI.Notifications.ToastNotificationManager]::CreateToastNotifier("Claude Code").Show($toast)
    `.trim();

    exec(`powershell -NoProfile -ExecutionPolicy Bypass -Command "${psScript.replace(/"/g, '\\"')}"`,
      { encoding: 'utf8', windowsHide: true },
      (err) => {
        if (err) {
          logger.warn('Windows Toast failed, falling back to node-notifier', err);
          notifier.notify({
            title: title,
            message: message,
            sound: false,
            wait: false,
            timeout: 5,
            appID: 'Claude Code'
          }, (notifyErr) => {
            if (notifyErr) {
              logger.error('node-notifier also failed', notifyErr);
            } else {
              logger.info('Fallback notification sent');
            }
            resolve();
          });
        } else {
          logger.info('Windows Toast notification sent successfully');
          resolve();
        }
      }
    );
  });
}

function notify(options = {}) {
  logger.debug('notify called', options);

  const config = loadConfig();

  if (!config.notification || !config.notification.enabled) {
    logger.info('Notification disabled in config');
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

  const platform = os.platform();
  logger.info('Platform detected', { platform });

  if (platform === 'win32') {
    return notifyWindows(title, message);
  }

  const iconPath = getIconPath();
  logger.debug('Icon path', { iconPath });

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
  }

  return new Promise((resolve) => {
    const timeoutId = setTimeout(() => {
      logger.warn('Notification timed out');
      resolve();
    }, 10000);

    notifier.notify(notificationOptions, (err, response) => {
      clearTimeout(timeoutId);
      if (err) {
        logger.error('Notification error', err);
      } else {
        logger.info('Notification sent', { response });
      }
      resolve(response);
    });
  });
}

module.exports = { notify };
