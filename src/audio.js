const path = require('path');
const fs = require('fs');
const os = require('os');
const { exec } = require('child_process');
const { loadConfig, getSoundsDir } = require('./config');
const logger = require('./logger');

const BUILT_IN_SOUNDS = {
  default: 'default.mp3'
};

const SUPPORTED_FORMATS = ['.mp3', '.wav', '.m4a', '.ogg', '.aiff', '.caf'];

function getSoundPath(soundName) {
  if (!soundName || soundName === 'default') {
    return path.join(getSoundsDir(), BUILT_IN_SOUNDS.default);
  }

  if (BUILT_IN_SOUNDS[soundName]) {
    return path.join(getSoundsDir(), BUILT_IN_SOUNDS[soundName]);
  }

  if (path.isAbsolute(soundName) && fs.existsSync(soundName)) {
    return soundName;
  }

  const expandedPath = soundName.replace(/^~/, os.homedir());
  if (fs.existsSync(expandedPath)) {
    return expandedPath;
  }

  return path.join(getSoundsDir(), BUILT_IN_SOUNDS.default);
}

function playWithAfplay(soundPath, volume) {
  return new Promise((resolve) => {
    logger.info('Playing sound with afplay', { soundPath, volume });
    const volumeArg = volume < 100 ? `-v ${volume / 100}` : '';
    exec(`afplay ${volumeArg} "${soundPath}"`, (err) => {
      if (err) {
        logger.error('afplay error', err);
      } else {
        logger.info('afplay completed');
      }
      resolve();
    });
  });
}

function playWithPowershell(soundPath) {
  return new Promise((resolve) => {
    logger.info('Playing sound with PowerShell', { soundPath });

    const psScript = `
Add-Type -AssemblyName PresentationCore
$player = New-Object System.Windows.Media.MediaPlayer
$player.Open([System.Uri]'${soundPath.replace(/'/g, "''")}')
Start-Sleep -Milliseconds 300
$player.Play()
Start-Sleep -Seconds 3
$player.Close()
`;

    const base64Command = Buffer.from(psScript, 'utf16le').toString('base64');

    exec(`powershell -NoProfile -ExecutionPolicy Bypass -EncodedCommand ${base64Command}`,
      { encoding: 'utf8', windowsHide: true },
      (err) => {
        if (err) {
          logger.error('PowerShell audio error', err);
        } else {
          logger.info('PowerShell audio completed');
        }
        resolve();
      }
    );
  });
}

function playWithLinuxPlayer(soundPath) {
  return new Promise((resolve) => {
    logger.info('Playing sound on Linux', { soundPath });

    const tryPlayers = (players) => {
      if (players.length === 0) {
        logger.warn('No audio player available on Linux');
        resolve();
        return;
      }

      const [player, ...rest] = players;
      exec(`which ${player}`, (whichErr) => {
        if (whichErr) {
          tryPlayers(rest);
          return;
        }

        let cmd;
        switch (player) {
          case 'paplay':
            cmd = `paplay "${soundPath}"`;
            break;
          case 'aplay':
            cmd = `aplay "${soundPath}"`;
            break;
          case 'mpv':
            cmd = `mpv --no-video --really-quiet "${soundPath}"`;
            break;
          case 'ffplay':
            cmd = `ffplay -nodisp -autoexit -loglevel quiet "${soundPath}"`;
            break;
          default:
            cmd = `${player} "${soundPath}"`;
        }

        logger.debug('Using player', { player, cmd });

        exec(cmd, (err) => {
          if (err) {
            logger.warn(`${player} failed, trying next`, err);
            tryPlayers(rest);
          } else {
            logger.info(`${player} completed successfully`);
            resolve();
          }
        });
      });
    };

    tryPlayers(['paplay', 'aplay', 'mpv', 'ffplay']);
  });
}

function playSound(soundFile) {
  logger.debug('playSound called', { soundFile });

  const config = loadConfig();

  if (!config.sound || !config.sound.enabled) {
    logger.info('Sound disabled in config');
    return Promise.resolve();
  }

  const soundPath = getSoundPath(soundFile || config.sound.file);
  logger.info('Sound path resolved', { soundPath });

  if (!fs.existsSync(soundPath)) {
    logger.error('Sound file not found', { soundPath });
    return Promise.resolve();
  }

  const platform = os.platform();
  const volume = config.sound.volume || 80;

  logger.info('Playing sound', { platform, volume });

  if (platform === 'darwin') {
    return playWithAfplay(soundPath, volume);
  } else if (platform === 'win32') {
    return playWithPowershell(soundPath);
  } else {
    return playWithLinuxPlayer(soundPath);
  }
}

function listSounds() {
  const soundsDir = getSoundsDir();
  const sounds = Object.keys(BUILT_IN_SOUNDS);

  if (fs.existsSync(soundsDir)) {
    try {
      const files = fs.readdirSync(soundsDir);
      files.forEach(file => {
        const ext = path.extname(file).toLowerCase();
        if (SUPPORTED_FORMATS.includes(ext)) {
          const name = path.basename(file, ext);
          if (!sounds.includes(name)) {
            sounds.push(name);
          }
        }
      });
    } catch (err) {
      logger.error('Failed to read sounds directory', err);
    }
  }

  return sounds;
}

module.exports = { playSound, getSoundPath, listSounds };
