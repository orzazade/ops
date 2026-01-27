#!/bin/bash
# Install ops skills to Claude Code commands directory

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TARGET_DIR="$HOME/.claude/commands/ops"

echo "Installing ops skills..."

# Create target directory
mkdir -p "$TARGET_DIR"

# Copy skills
cp "$SCRIPT_DIR/skills/"*.md "$TARGET_DIR/"

# Create state directory
mkdir -p "$HOME/.ops/state"

echo "Done! Skills installed to $TARGET_DIR"
echo ""
echo "Available commands:"
ls -1 "$TARGET_DIR" | sed 's/.md$//' | sed 's/^/  \/ops:/'
echo ""
echo "Run /ops:config to set up your configuration."
