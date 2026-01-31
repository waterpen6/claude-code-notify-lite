# Claude Code Notify Lite

Task completion notifications for [Claude Code](https://claude.ai/code) - Cross-platform, lightweight, and easy to use.

[English](#features) | [中文](./README_CN.md)

![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-blue)
![License](https://img.shields.io/badge/license-MIT-green)

## Features

- **Cross-platform** - Works on Windows, macOS, and Linux
- **Lightweight** - Minimal dependencies, fast startup
- **Easy to use** - One command installation
- **Customizable** - Choose your notification sound
- **Non-intrusive** - Integrates seamlessly with Claude Code

## Quick Start

### Using npm (Recommended)

```bash
npm install -g claude-code-notify-lite
ccnotify install
```

### Using install script

**macOS / Linux:**
```bash
curl -fsSL https://raw.githubusercontent.com/waterpen6/claude-code-notify-lite/main/scripts/install.sh | bash
```

**Windows (PowerShell):**
```powershell
iwr -useb https://raw.githubusercontent.com/waterpen6/claude-code-notify-lite/main/scripts/install.ps1 | iex
```

## Usage

After installation, notifications will automatically appear when Claude Code completes a task.

### Commands

```bash
# Test notification
ccnotify test

# Check installation status
ccnotify status

# Configure settings interactively
ccnotify config

# List available sounds
ccnotify sounds

# Uninstall
ccnotify uninstall
```

## Configuration

Configuration file location:
- **Windows:** `%APPDATA%\claude-code-notify-lite\config.json`
- **macOS:** `~/Library/Application Support/claude-code-notify-lite/config.json`
- **Linux:** `~/.config/claude-code-notify-lite/config.json`

### Options

```json
{
  "notification": {
    "enabled": true,
    "title": "Claude Code",
    "showWorkDir": true,
    "showTime": true
  },
  "sound": {
    "enabled": true,
    "file": "default",
    "volume": 80
  }
}
```

### Custom Sound

You can use a custom sound file:

```json
{
  "sound": {
    "file": "/path/to/your/sound.mp3"
  }
}
```

Supported formats: MP3, WAV, M4A, OGG

## How It Works

Claude Code Notify Lite integrates with Claude Code's hook system:

1. When you run `ccnotify install`, it adds a `Stop` hook to your Claude Code settings
2. When Claude Code completes a task, it triggers the hook
3. The hook sends a system notification and plays a sound

## Troubleshooting

### Notification not showing

**macOS:**
- Go to System Settings > Notifications
- Find "Terminal" (or your terminal app) and enable notifications

**Windows:**
- Go to Settings > System > Notifications
- Ensure notifications are enabled

### Sound not playing

- Check system volume
- Verify the sound file exists: `ccnotify sounds`
- Try a different sound: `ccnotify config`

### Hook not working

```bash
# Check installation status
ccnotify status

# Reinstall if needed
ccnotify uninstall
ccnotify install
```

## Uninstall

```bash
ccnotify uninstall
npm uninstall -g claude-code-notify-lite
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT
