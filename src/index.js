const { notify } = require('./notifier');
const { playSound } = require('./audio');
const { loadConfig } = require('./config');
const logger = require('./logger');

function formatTime() {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
}

async function run(options = {}) {
  logger.info('Run started', { options, cwd: process.cwd(), claudePwd: process.env.CLAUDE_PWD });

  try {
    const config = loadConfig();
    logger.debug('Config loaded', config);

    const workDir = process.env.CLAUDE_PWD || process.cwd();
    const time = formatTime();

    const title = options.title || config.notification.title || 'Claude Code';
    const message = options.message || 'Task completed';

    logger.info('Sending notification', { title, message, workDir, time });

    const results = await Promise.allSettled([
      notify({
        title,
        message,
        workDir: config.notification.showWorkDir ? workDir : null,
        time: config.notification.showTime ? time : null
      }),
      playSound()
    ]);

    results.forEach((result, index) => {
      const taskName = index === 0 ? 'notify' : 'playSound';
      if (result.status === 'fulfilled') {
        logger.info(`${taskName} completed successfully`);
      } else {
        logger.error(`${taskName} failed`, result.reason);
      }
    });

    logger.info('Run completed');
  } catch (err) {
    logger.error('Run error', err);
  }
}

module.exports = { run };
