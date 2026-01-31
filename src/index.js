const { notify } = require('./notifier');
const { playSound } = require('./audio');
const { loadConfig } = require('./config');

async function run(options = {}) {
  try {
    const config = loadConfig();

    const workDir = process.env.CLAUDE_PWD || process.cwd();
    const time = new Date().toLocaleString();

    const title = options.title || config.notification.title || 'Claude Code';
    const message = options.message || 'Task completed';

    await Promise.all([
      notify({
        title,
        message,
        workDir: config.notification.showWorkDir ? workDir : null,
        time: config.notification.showTime ? time : null
      }),
      playSound()
    ]);
  } catch (err) {
    if (process.env.DEBUG) {
      console.error('Run error:', err.message);
    }
  }
}

module.exports = { run };
