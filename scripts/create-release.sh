#!/bin/bash

# Create a GitHub release for AI-Archive MCP Server
# This script builds binaries and creates a GitHub release

set -e

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== AI-Archive MCP Server Release Builder ===${NC}"

# Check if bun is installed
if ! command -v bun &> /dev/null; then
    echo -e "${RED}Error: Bun is not installed${NC}"
    echo "Install from: https://bun.sh"
    exit 1
fi

# Check if gh CLI is installed
if ! command -v gh &> /dev/null; then
    echo -e "${RED}Error: GitHub CLI (gh) is not installed${NC}"
    echo "Install from: https://cli.github.com"
    exit 1
fi

# Get version from package.json
VERSION=$(node -p "require('./package.json').version")
echo -e "${GREEN}Version: v${VERSION}${NC}"

# Ask for confirmation
read -p "Create release for version v${VERSION}? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Aborted"
    exit 1
fi

# Build binaries
echo -e "${BLUE}Building binaries...${NC}"
npm run build:all

# Check if binaries exist
if [ ! -f "dist/ai-archive-mcp-linux-x64" ] || \
   [ ! -f "dist/ai-archive-mcp-macos-arm64" ] || \
   [ ! -f "dist/ai-archive-mcp-win-x64.exe" ]; then
    echo -e "${RED}Error: Not all binaries were built${NC}"
    exit 1
fi

echo -e "${GREEN}✓ All binaries built successfully${NC}"

# Create release notes
RELEASE_NOTES="## AI-Archive MCP Server v${VERSION}

### Standalone Binaries

Pre-built binaries that don't require Node.js or any dependencies:

- **Linux (x64)**: \`ai-archive-mcp-linux-x64\`
- **macOS (Apple Silicon)**: \`ai-archive-mcp-macos-arm64\`  
- **Windows (x64)**: \`ai-archive-mcp-win-x64.exe\`

### Features

- Enhanced semantic paper search with type filtering
- Complete paper submission pipeline with AI review
- Advanced marketplace for reviewer discovery
- Multi-format citation generation
- Professional profile integration
- Enterprise-grade security features

### Installation

Download the binary for your platform, make it executable (Linux/macOS), and run:

\`\`\`bash
# Linux
chmod +x ai-archive-mcp-linux-x64
./ai-archive-mcp-linux-x64

# macOS
chmod +x ai-archive-mcp-macos-arm64
./ai-archive-mcp-macos-arm64

# Windows
ai-archive-mcp-win-x64.exe
\`\`\`

Or install via npm:
\`\`\`bash
npm install -g ai-archive-mcp@${VERSION}
\`\`\`

### Documentation

Full documentation: [README.md](https://github.com/Tomer-Barak/AI-arxiv/tree/main/mcp-server)
"

# Create the release
echo -e "${BLUE}Creating GitHub release...${NC}"

gh release create "v${VERSION}" \
    --title "AI-Archive MCP Server v${VERSION}" \
    --notes "$RELEASE_NOTES" \
    dist/ai-archive-mcp-linux-x64 \
    dist/ai-archive-mcp-macos-arm64 \
    dist/ai-archive-mcp-win-x64.exe

echo -e "${GREEN}✓ Release created successfully!${NC}"
echo -e "${BLUE}View at: https://github.com/Tomer-Barak/AI-arxiv/releases/tag/v${VERSION}${NC}"
