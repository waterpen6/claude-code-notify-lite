# Claude Code Notify Lite

[Claude Code](https://claude.ai/code) 任务完成通知工具 - 跨平台、轻量级、开箱即用。

[English](./README.md) | 中文

![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-blue)
![License](https://img.shields.io/badge/license-MIT-green)

## 功能特性

- **跨平台** - 支持 Windows、macOS 和 Linux
- **轻量级** - 依赖少，启动快
- **易于使用** - 一条命令完成安装
- **可定制** - 自定义通知提示音
- **低侵入** - 无缝集成 Claude Code

## 快速开始

### 使用 npm 安装（推荐）

```bash
npm install -g claude-code-notify-lite
ccnotify install
```

如果 `ccnotify` 命令找不到，可以使用 npx：

```bash
npx claude-code-notify-lite install
```

或将 npm 全局目录添加到 PATH：

**Windows:** 将 `%APPDATA%\npm` 添加到系统 PATH 环境变量

### 使用安装脚本

**macOS / Linux:**
```bash
curl -fsSL https://raw.githubusercontent.com/waterpen6/claude-code-notify-lite/main/scripts/install.sh | bash
```

**Windows (PowerShell):**
```powershell
iwr -useb https://raw.githubusercontent.com/waterpen6/claude-code-notify-lite/main/scripts/install.ps1 | iex
```

## 使用方法

安装完成后，当 Claude Code 完成任务时会自动弹出通知。

### 命令列表

```bash
# 测试通知
ccnotify test

# 检查安装状态
ccnotify status

# 交互式配置
ccnotify config

# 查看可用提示音
ccnotify sounds

# 卸载
ccnotify uninstall
```

## 配置说明

配置文件位置：
- **Windows:** `%APPDATA%\claude-code-notify-lite\config.json`
- **macOS:** `~/Library/Application Support/claude-code-notify-lite/config.json`
- **Linux:** `~/.config/claude-code-notify-lite/config.json`

### 配置项

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

| 配置项 | 说明 |
|--------|------|
| `notification.enabled` | 是否启用通知 |
| `notification.title` | 通知标题 |
| `notification.showWorkDir` | 是否显示工作目录 |
| `notification.showTime` | 是否显示时间戳 |
| `sound.enabled` | 是否启用提示音 |
| `sound.file` | 提示音文件（default 或自定义路径） |
| `sound.volume` | 音量（0-100） |

### 自定义提示音

支持使用自定义音频文件：

```json
{
  "sound": {
    "file": "/path/to/your/sound.mp3"
  }
}
```

支持格式：MP3、WAV、M4A、OGG

## 工作原理

Claude Code Notify Lite 通过 Claude Code 的 Hook 系统实现：

1. 运行 `ccnotify install` 时，自动在 Claude Code 配置中添加 `Stop` Hook
2. 当 Claude Code 完成任务时，触发该 Hook
3. Hook 发送系统通知并播放提示音

## 常见问题

### ccnotify 命令找不到

npm 全局安装后，如果 `ccnotify` 命令无法识别：

```bash
# 使用 npx 替代
npx claude-code-notify-lite install

# 或查找 npm 全局目录
npm root -g
# 将上级 bin 目录添加到 PATH
```

### 通知不显示

**macOS:**
- 打开 系统设置 > 通知
- 找到 "终端"（或你使用的终端应用）并启用通知

**Windows:**
- 打开 设置 > 系统 > 通知
- 确保通知已启用

### 提示音不播放

- 检查系统音量
- 确认音频文件存在：`ccnotify sounds`
- 尝试更换提示音：`ccnotify config`

### Hook 不工作

```bash
# 检查安装状态
ccnotify status

# 重新安装
ccnotify uninstall
ccnotify install
```

## 卸载

```bash
ccnotify uninstall
npm uninstall -g claude-code-notify-lite
```

## 参与贡献

欢迎提交 Pull Request。

## 开源协议

MIT
