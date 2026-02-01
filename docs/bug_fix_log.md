# Bug Fix Log

## [2026-02-01] v1.0.2 - Path Not Found Error

### Problem Description
Users on other machines reported hook execution error:
```
Stop hook error: Failed with non-blocking status code: ϵͳ�Ҳ���ָ����·����
```
(Garbled text is "系统找不到指定的路径" - system cannot find the specified path)

### Root Cause Analysis
1. Hook command used direct node script path that only exists on the development machine
2. Previous command: `node C:\Users\xxx\.claude\scripts\...`
3. This path doesn't exist on other users' machines

### Fix
Changed hook command generation in `src/installer.js`:
```javascript
// Before
const command = `node "${scriptPath}"`;

// After
const command = 'npx --yes claude-code-notify-lite run';
```

Using `npx` automatically resolves the package from npm registry, works across all machines.

### Files Changed
- `src/installer.js`

### Verification
Reinstall on target machine:
```bash
npx claude-code-notify-lite install
```

---

## [2026-02-01] v1.0.2 - Garbled Chinese Characters

### Problem Description
Time format showed garbled characters on Windows with Chinese locale:
```
€T◆X◆◆◆◆◆◆·◆◆◆◆
```

### Root Cause Analysis
1. Used `new Date().toLocaleString()` which produces Chinese characters on Chinese Windows
2. Claude Code hooks don't handle GBK encoding properly
3. Non-ASCII characters get corrupted in the hook output

### Fix
Changed time format in `src/index.js` and `bin/cli.js`:
```javascript
// Before
const time = new Date().toLocaleString();

// After
function formatTime() {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
}
```

### Files Changed
- `src/index.js`
- `bin/cli.js`

### Prevention
Always use ASCII-only output for hook commands to avoid encoding issues.

---

## [2026-02-01] v1.0.1 - Notifications Not Showing on Windows

### Problem Description
No notification popup appeared on Windows after task completion.

### Root Cause Analysis
1. node-notifier relies on external tools that may not be properly configured
2. Windows native notification system has stricter requirements

### Fix
Added native Windows Toast notification using WinRT API in `src/notifier.js`:
```javascript
function notifyWindows(title, message) {
  // Uses PowerShell with WinRT ToastNotificationManager
  // Falls back to node-notifier if Toast fails
}
```

### Files Changed
- `src/notifier.js`

### Verification
Run test command:
```bash
npx claude-code-notify-lite test
```
