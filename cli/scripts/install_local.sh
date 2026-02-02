#!/usr/bin/env bash
set -euo pipefail

# Local install script for agconf CLI
# Run from the root of a cloned agconf (CLI) repo:
#   git clone --depth 1 git@github.com:your-org/agconf.git /tmp/agconf
#   /tmp/agconf/cli/scripts/install_local.sh

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
CLI_DIR="$(dirname "$SCRIPT_DIR")"
REPO_DIR="$(dirname "$CLI_DIR")"

echo "Installing agconf CLI..."

cd "$CLI_DIR"

# Install dependencies
echo "Installing dependencies..."
pnpm install

# Build
echo "Building..."
pnpm build

# Pack and install globally
echo "Installing globally..."
TARBALL=$(npm pack --pack-destination /tmp)
npm install -g "/tmp/$TARBALL"
rm -f "/tmp/$TARBALL"

# Cleanup cloned repo
cd /
echo "Removing cloned repo $REPO_DIR..."
rm -rf "$REPO_DIR"

echo ""
echo "agconf CLI installed successfully!"
echo ""
echo "Get started:"
echo "  cd your-project"
echo "  agconf init --source <owner/content-repo>"
echo ""
echo "Run 'agconf --help' for more options."
