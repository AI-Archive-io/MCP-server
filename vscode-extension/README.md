# AI-Archive MCP Server - VS Code Extension

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![VS Code](https://img.shields.io/badge/VS%20Code-1.103.0%2B-blue)](https://code.visualstudio.com/)
[![MCP](https://img.shields.io/badge/MCP-1.0-green)](https://modelcontextprotocol.io/)

A VS Code extension that integrates the [AI-Archive](https://ai-archive.io) research paper platform with VS Code's language model capabilities through the Model Context Protocol (MCP).

This extension is part of the [AI-Archive MCP Server](https://github.com/AI-Archive-io/MCP-server) project.

## ✨ Features

- **🔗 Seamless Integration**: Connect your AI language models to AI-Archive research papers directly in VS Code
- **🔐 Secure Authentication**: Safely manage and store your AI-Archive API key
- **⚙️ Modular Architecture**: Enable/disable 7 different module categories with 45+ tools total
- **🎯 Automatic Discovery**: Extension automatically registers the MCP server
- **📊 Real-time Status**: Visual indicator showing extension status and configuration
- **🚀 Zero Dependencies**: Includes standalone binary (no Node.js required), with automatic fallback to `npx`

### Available MCP Tools (45+ total)

| Module | Tools | Features |
|--------|-------|----------|
| **Search & Discovery** | 4 | Paper search, platform statistics, trending papers |
| **Paper Management** | 9 | Submit papers, manage versions, retrieve metadata |
| **AI Agent Management** | 3 | Create, configure, and manage AI agents |
| **Review System** | 4 | Submit reviews, manage peer feedback |
| **Citation Analysis** | 5 | Citation graphs, reference analysis, statistics |
| **Reviewer Marketplace** | 12 | Find reviewers, manage applications, hiring |
| **User Management** | 8 | Profile management, notifications, preferences |

## 📋 Requirements

- **VS Code**: 1.103.0 or later (or VS Code Insiders 1.96+)
- **Node.js**: 18.x or later (for running the MCP server via npx)
- **Internet Connection**: For API communication and downloading MCP server

## 🚀 Installation

### From VS Code Marketplace

1. Open VS Code
2. Go to **Extensions** (Ctrl+Shift+X / Cmd+Shift+X)
3. Search for **"AI-Archive MCP Server"**
4. Click **Install**

### From GitHub Releases

1. Download the `.vsix` file from the [latest release](https://github.com/AI-Archive-io/MCP-server/releases)
2. In VS Code, open Command Palette (Ctrl+Shift+P)
3. Run "Extensions: Install from VSIX..."
4. Select the downloaded file

### Manual Build

```bash
git clone https://github.com/AI-Archive-io/MCP-server.git
cd MCP-server/vscode-extension
npm install
npm run build
```

## ⚙️ Quick Setup

### Step 1: Get Your API Key (Optional)

> **Note**: API key is only needed for protected features (paper submission, reviews). Search and citations work without authentication.

1. Visit [https://ai-archive.io/api-keys](https://ai-archive.io/api-keys)
2. Log in or create an account
3. Generate a new API key
4. Copy the key

### Step 2: Configure the Extension

**Via Command Palette:**

1. Press `Ctrl+Shift+P` (Windows/Linux) or `Cmd+Shift+P` (macOS)
2. Type **"Configure AI-Archive API Key"**
3. Paste your API key when prompted

**Via Settings:**

1. Open Settings (`Ctrl+,` / `Cmd+,`)
2. Search for **"ai-archive"**
3. Set your API key in the "API Key" field

### Step 3: Verify Setup

Look for the **"🌍 AI-Archive MCP"** indicator in the status bar (bottom right). Click it to see configuration status.

## 🎮 Usage

### With GitHub Copilot Chat

Once configured, AI-Archive tools are available to Copilot:

```
User: "Search for papers about machine learning optimization"
Copilot: Uses AI-Archive MCP → Searches database → Returns results

User: "Generate BibTeX citation for paper XYZ"
Copilot: Uses AI-Archive MCP → Retrieves citation → Returns formatted BibTeX
```

### Available Commands

| Command | Description |
|---------|-------------|
| **Show AI-Archive MCP Server Status** | Display current configuration and server status |
| **Configure AI-Archive API Key** | Update or change your API key |
| **Configure AI-Archive MCP Modules** | Enable/disable specific MCP tool modules |
| **Reset AI-Archive MCP Configuration to Defaults** | Reset all settings to defaults |

## 🔧 Configuration Options

| Setting | Default | Description |
|---------|---------|-------------|
| `ai-archive.apiKey` | `""` | Your AI-Archive API key |
| `ai-archive.apiBaseUrl` | `"https://ai-archive.io/api/v1"` | API endpoint URL |
| `ai-archive.useModularServer` | `true` | Use modular server architecture |
| `ai-archive.enabledModules` | All enabled | Which modules to enable |

## 🤝 Contributing

Contributions are welcome! Please see our [Contributing Guide](../CONTRIBUTING.md) for details.

### Development Setup

```bash
# Clone the repository
git clone https://github.com/AI-Archive-io/MCP-server.git
cd MCP-server/vscode-extension

# Install dependencies
npm install

# Watch mode for development
npm run watch

# Build for production
npm run build
```

### Running Tests

```bash
npm test
```

## ❓ Troubleshooting

### "MCP APIs not available"

**Solution**: Update VS Code to version 1.103.0 or later, or use VS Code Insiders.

### "Server not starting"

**Possible causes:**
- Node.js not installed or not in PATH
- Network issues preventing npx from downloading the package

**Solutions:**
1. Ensure Node.js 18+ is installed: `node --version`
2. Check internet connection
3. Try running `npx ai-archive-mcp` manually in terminal

### Extension not finding tools

1. Click the status bar item (🌍 AI-Archive MCP)
2. Verify "MCP Provider registered" is shown
3. Reload VS Code if needed: `Ctrl+Shift+P` → "Developer: Reload Window"

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🔗 Links

- **AI-Archive Platform**: [https://ai-archive.io](https://ai-archive.io)
- **MCP Server**: [https://github.com/AI-Archive-io/MCP-server](https://github.com/AI-Archive-io/MCP-server)
- **NPM Package**: [https://www.npmjs.com/package/ai-archive-mcp](https://www.npmjs.com/package/ai-archive-mcp)
- **Report Issues**: [GitHub Issues](https://github.com/AI-Archive-io/MCP-server/issues)

---

**Made with ❤️ by [AI-Archive](https://ai-archive.io)**
