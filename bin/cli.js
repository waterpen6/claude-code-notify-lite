#!/usr/bin/env node

const { program } = require('commander');
const chalk = require('chalk');
const fs = require('fs');
const pkg = require('../package.json');

function formatTime() {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
}

program
  .name('ccnotify')
  .description('Task completion notifications for Claude Code')
  .version(pkg.version);

program
  .command('install')
  .description('Install and configure Claude Code hooks')
  .option('--skip-hooks', 'Skip hook installation')
  .action((options) => {
    const { install } = require('../src/installer');
    install(options);
  });

program
  .command('uninstall')
  .description('Uninstall and remove hooks')
  .option('--keep-config', 'Keep configuration files')
  .action((options) => {
    const { uninstall } = require('../src/installer');
    uninstall(options);
  });

program
  .command('run')
  .description('Send a notification (used by hooks)')
  .option('-t, --title <title>', 'Notification title')
  .option('-m, --message <message>', 'Notification message')
  .action(async (options) => {
    const { run } = require('../src/index');
    await run(options);
  });

program
  .command('test')
  .description('Test notification and sound')
  .action(async () => {
    console.log(chalk.blue('Testing notification...\n'));

    const { notify } = require('../src/notifier');
    const { playSound } = require('../src/audio');
    const logger = require('../src/logger');

    logger.info('Test started');

    try {
      await Promise.all([
        notify({
          title: 'Claude Code Notify',
          message: 'Test notification successful!',
          workDir: process.cwd(),
          time: formatTime()
        }),
        playSound()
      ]);

      console.log(chalk.green('  [OK] Notification sent'));
      console.log(chalk.green('  [OK] Sound played'));
      console.log(chalk.green('\nTest completed successfully!\n'));
      logger.info('Test completed successfully');
    } catch (err) {
      console.log(chalk.red(`  [ERROR] ${err.message}`));
      logger.error('Test failed', err);
    }

    console.log(chalk.gray(`Log file: ${logger.getLogPath()}\n`));
  });

program
  .command('status')
  .description('Check installation status')
  .action(() => {
    const { checkInstallation } = require('../src/installer');
    const logger = require('../src/logger');
    const status = checkInstallation();

    console.log(chalk.blue('Installation Status:\n'));

    if (status.installed) {
      console.log(chalk.green('  [OK] claude-code-notify-lite is installed'));
    } else {
      console.log(chalk.yellow('  [!] claude-code-notify-lite is not fully installed'));
    }

    console.log(`  Hook configured: ${status.hasHook ? chalk.green('Yes') : chalk.red('No')}`);
    console.log(`  Config exists: ${status.hasConfig ? chalk.green('Yes') : chalk.red('No')}`);

    console.log(chalk.gray(`\n  Log file: ${logger.getLogPath()}`));

    if (!status.installed) {
      console.log(chalk.yellow('\nRun "npx claude-code-notify-lite install" to complete installation.\n'));
    }
  });

program
  .command('config')
  .description('Configure settings interactively')
  .action(async () => {
    const inquirer = require('inquirer');
    const { loadConfig, saveConfig } = require('../src/config');
    const { listSounds, playSound } = require('../src/audio');

    const config = loadConfig();
    const sounds = listSounds();

    const answers = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'notificationEnabled',
        message: 'Enable notifications?',
        default: config.notification.enabled
      },
      {
        type: 'confirm',
        name: 'soundEnabled',
        message: 'Enable sound?',
        default: config.sound.enabled
      },
      {
        type: 'list',
        name: 'soundFile',
        message: 'Select notification sound:',
        choices: sounds,
        default: config.sound.file,
        when: (answers) => answers.soundEnabled
      },
      {
        type: 'confirm',
        name: 'showWorkDir',
        message: 'Show working directory in notification?',
        default: config.notification.showWorkDir
      },
      {
        type: 'confirm',
        name: 'showTime',
        message: 'Show timestamp in notification?',
        default: config.notification.showTime
      }
    ]);

    config.notification.enabled = answers.notificationEnabled;
    config.sound.enabled = answers.soundEnabled;
    if (answers.soundFile) {
      config.sound.file = answers.soundFile;
    }
    config.notification.showWorkDir = answers.showWorkDir;
    config.notification.showTime = answers.showTime;

    saveConfig(config);
    console.log(chalk.green('\nConfiguration saved!\n'));

    if (answers.soundEnabled && answers.soundFile) {
      const testSound = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'test',
          message: 'Play selected sound?',
          default: true
        }
      ]);

      if (testSound.test) {
        await playSound(answers.soundFile);
      }
    }
  });

program
  .command('sounds')
  .description('List available sounds')
  .action(() => {
    const { listSounds } = require('../src/audio');
    const sounds = listSounds();

    console.log(chalk.blue('Available sounds:\n'));
    sounds.forEach(sound => {
      console.log(`  - ${sound}`);
    });
    console.log('');
  });

program
  .command('logs')
  .description('Show debug logs')
  .option('-n, --lines <number>', 'Number of lines to show', '50')
  .option('-f, --follow', 'Follow log file (like tail -f)')
  .option('-c, --clear', 'Clear log file')
  .action((options) => {
    const logger = require('../src/logger');
    const logPath = logger.getLogPath();

    if (options.clear) {
      try {
        if (fs.existsSync(logPath)) {
          fs.unlinkSync(logPath);
          console.log(chalk.green('Log file cleared.\n'));
        } else {
          console.log(chalk.yellow('Log file does not exist.\n'));
        }
      } catch (err) {
        console.log(chalk.red(`Failed to clear log: ${err.message}\n`));
      }
      return;
    }

    console.log(chalk.blue(`Log file: ${logPath}\n`));

    if (!fs.existsSync(logPath)) {
      console.log(chalk.yellow('No logs yet.\n'));
      return;
    }

    try {
      const content = fs.readFileSync(logPath, 'utf8');
      const lines = content.trim().split('\n');
      const numLines = parseInt(options.lines, 10) || 50;
      const lastLines = lines.slice(-numLines);

      if (lastLines.length === 0) {
        console.log(chalk.yellow('Log file is empty.\n'));
        return;
      }

      console.log(chalk.gray('--- Recent logs ---\n'));
      lastLines.forEach(line => {
        if (line.includes('[ERROR]')) {
          console.log(chalk.red(line));
        } else if (line.includes('[WARN]')) {
          console.log(chalk.yellow(line));
        } else if (line.includes('[INFO]')) {
          console.log(chalk.white(line));
        } else {
          console.log(chalk.gray(line));
        }
      });
      console.log('');
    } catch (err) {
      console.log(chalk.red(`Failed to read log: ${err.message}\n`));
    }
  });

program.parse();
