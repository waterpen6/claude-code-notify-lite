const path = require('path');
const fs = require('fs');
const os = require('os');
const { exec } = require('child_process');
const { loadConfig, getSoundsDir } = require('./config');

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
    const volumeArg = volume < 100 ? `-v ${volume / 100}` : '';
    exec(`afplay ${volumeArg} "${soundPath}"`, (err) => {
      if (err && process.env.DEBUG) {
        console.warn('afplay error:', err.message);
      }
      resolve();
    });
  });
}

function playWithPowershell(soundPath) {
  return new Promise((resolve) => {
    const escapedPath = soundPath.replace(/\\/g, '\\\\');
    const psScript = [
      'Add-Type -AssemblyName PresentationCore',
      '$player = New-Object System.Windows.Media.MediaPlayer',
      `$player.Open([System.Uri]"${escapedPath}")`,
      'Start-Sleep -Milliseconds 300',
      '$player.Play()',
      'Start-Sleep -Seconds 3'
    ].join('; ');

    exec(`powershell -NoProfile -Command "${psScript}"`, (err) => {
      if (err && process.env.DEBUG) {
        console.warn('PowerShell audio error:', err.message);
      }
      resolve();
    });
  });
}

function playWithLinuxPlayer(soundPath) {
  return new Promise((resolve) => {
    const tryPlayers = (players) => {
      if (players.length === 0) {
        if (process.env.DEBUG) {
          console.warn('No audio player available on Linux');
        }
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

        exec(cmd, (err) => {
          if (err) {
            tryPlayers(rest);
          } else {
            resolve();
          }
        });
      });
    };

    tryPlayers(['paplay', 'aplay', 'mpv', 'ffplay']);
  });
}

function playSound(soundFile) {
  const config = loadConfig();

  if (!config.sound || !config.sound.enabled) {
    return Promise.resolve();
  }

  const soundPath = getSoundPath(soundFile || config.sound.file);

  if (!fs.existsSync(soundPath)) {
    if (process.env.DEBUG) {
      console.warn(`Sound file not found: ${soundPath}`);
    }
    return Promise.resolve();
  }

  const platform = os.platform();
  const volume = config.sound.volume || 80;

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
      if (process.env.DEBUG) {
        console.warn('Failed to read sounds directory:', err.message);
      }
    }
  }

  return sounds;
}

module.exports = { playSound, getSoundPath, listSounds };
