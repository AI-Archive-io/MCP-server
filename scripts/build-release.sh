#!/usr/bin/env bash

set -euo pipefail

echo "Building all platform binaries into dist/"
mkdir -p dist

echo "Building Linux (x64)..."
npm run build:linux

echo "Building macOS (arm64)..."
npm run build:macos

echo "Building Windows (x64)..."
npm run build:windows

echo "All builds complete. Files in dist/:"
ls -lh dist/ai-archive-mcp-*
