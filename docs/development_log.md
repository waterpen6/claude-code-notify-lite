# Development Log

## [2026-02-01] v1.0.2 - Cross-platform Compatibility Fix

### Implementation
- Added logger module (`src/logger.js`) for debugging and troubleshooting
- Changed hook command from direct node path to `npx --yes claude-code-notify-lite run`
- Added Windows Toast notification using WinRT API with node-notifier fallback
- Fixed time format encoding issue (ASCII format instead of `toLocaleString()`)
- Added `logs` command to CLI for viewing debug logs

### Technical Details
- Logger supports log rotation (max 1MB)
- Platform-specific log directories:
  - Windows: `%APPDATA%\claude-code-notify-lite\debug.log`
  - macOS: `~/Library/Logs/claude-code-notify-lite/debug.log`
  - Linux: `~/.local/state/claude-code-notify-lite/debug.log`
- Hook timeout increased from 10s to 30s

### Files Changed
- `src/logger.js` (new)
- `src/index.js`
- `src/installer.js`
- `src/notifier.js`
- `src/audio.js`
- `bin/cli.js`
- `package.json`

### Fixes
- Resolved "path not found" error on other machines by using npx
- Fixed Windows Chinese encoding (GBK) garbled text
- Fixed notifications not showing on Windows

---

## [2026-02-01] v1.0.1 - Initial Bug Fixes

### Implementation
- Added Windows Toast notification support
- Fixed encoding issues with time format

### Files Changed
- `src/notifier.js`
- `src/index.js`
- `README.md`
- `README_CN.md`

---

## [2026-02-01] v1.0.0 - Initial Release

### Implementation
- Cross-platform notification support (Windows, macOS, Linux)
- Sound playback with platform-specific players
- Claude Code hook integration
- Interactive configuration via `ccnotify config`
- Install/uninstall commands

### Files
- `bin/cli.js` - Main CLI entry point
- `src/index.js` - Core notification logic
- `src/notifier.js` - Notification handling
- `src/audio.js` - Sound playback
- `src/config.js` - Configuration management
- `src/installer.js` - Hook installation
