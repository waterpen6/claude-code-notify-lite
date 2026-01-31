#!/bin/bash

set -e

REPO="waterpen6/claude-code-notify-lite"
INSTALL_DIR="$HOME/.claude-code-notify-lite"

echo ""
echo "  Claude Code Notify Lite Installer"
echo "  ==================================="
echo ""

check_node() {
  if command -v node &> /dev/null; then
    NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VERSION" -ge 16 ]; then
      return 0
    fi
  fi
  return 1
}

install_via_npm() {
  echo "  Installing via npm..."
  npm install -g claude-code-notify-lite
  echo ""
  echo "  Running setup..."
  ccnotify install
}

install_binary() {
  echo "  Downloading binary..."

  OS=$(uname -s | tr '[:upper:]' '[:lower:]')
  ARCH=$(uname -m)

  if [ "$ARCH" = "x86_64" ]; then
    ARCH="x64"
  elif [ "$ARCH" = "arm64" ] || [ "$ARCH" = "aarch64" ]; then
    ARCH="arm64"
  fi

  BINARY_NAME="ccnotify-${OS}-${ARCH}"
  DOWNLOAD_URL="https://github.com/${REPO}/releases/latest/download/${BINARY_NAME}"

  mkdir -p "$INSTALL_DIR/bin"

  curl -fsSL "$DOWNLOAD_URL" -o "$INSTALL_DIR/bin/ccnotify"
  chmod +x "$INSTALL_DIR/bin/ccnotify"

  SHELL_RC=""
  if [ -f "$HOME/.zshrc" ]; then
    SHELL_RC="$HOME/.zshrc"
  elif [ -f "$HOME/.bashrc" ]; then
    SHELL_RC="$HOME/.bashrc"
  elif [ -f "$HOME/.bash_profile" ]; then
    SHELL_RC="$HOME/.bash_profile"
  fi

  if [ -n "$SHELL_RC" ]; then
    if ! grep -q "claude-code-notify-lite" "$SHELL_RC"; then
      echo "" >> "$SHELL_RC"
      echo "# Claude Code Notify Lite" >> "$SHELL_RC"
      echo "export PATH=\"\$HOME/.claude-code-notify-lite/bin:\$PATH\"" >> "$SHELL_RC"
      echo "  Added to PATH in $SHELL_RC"
    fi
  fi

  export PATH="$INSTALL_DIR/bin:$PATH"

  echo ""
  echo "  Running setup..."
  "$INSTALL_DIR/bin/ccnotify" install
}

if check_node; then
  install_via_npm
else
  echo "  Node.js 16+ not found, installing binary..."
  install_binary
fi

echo ""
echo "  Installation complete!"
echo ""
echo "  Run 'ccnotify test' to verify."
echo ""
