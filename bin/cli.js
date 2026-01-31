#!/usr/bin/env node

const { program } = require('commander');
const chalk = require('chalk');
const pkg = require('../package.json');

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

    try {
      await Promise.all([
        notify({
          title: 'Claude Code Notify',
          message: 'Test notification successful!',
          workDir: process.cwd(),
          time: new Date().toLocaleString()
        }),
        playSound()
      ]);

      console.log(chalk.green('  [OK] Notification sent'));
      console.log(chalk.green('  [OK] Sound played'));
      console.log(chalk.green('\nTest completed successfully!\n'));
    } catch (err) {
      console.log(chalk.red(`  [ERROR] ${err.message}`));
    }
  });

program
  .command('status')
  .description('Check installation status')
  .action(() => {
    const { checkInstallation } = require('../src/installer');
    const status = checkInstallation();

    console.log(chalk.blue('Installation Status:\n'));

    if (status.installed) {
      console.log(chalk.green('  [OK] claude-code-notify-lite is installed'));
    } else {
      console.log(chalk.yellow('  [!] claude-code-notify-lite is not fully installed'));
    }

    console.log(`  Hook configured: ${status.hasHook ? chalk.green('Yes') : chalk.red('No')}`);
    console.log(`  Config exists: ${status.hasConfig ? chalk.green('Yes') : chalk.red('No')}`);

    if (!status.installed) {
      console.log(chalk.yellow('\nRun "ccnotify install" to complete installation.\n'));
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

program.parse();
