# Change Log

All notable changes to the "ai-archive-mcp-server" extension will be documented in this file.

## [0.1.4] - 2025-11-02

### Changed
- Updated bundled MCP server to version 0.1.4 with latest improvements
- Synced with latest mcp-server dependencies and modules

### Fixed
- Improved stability with updated MCP server modules

## [0.1.0] - 2025-11-01

### Added
- Initial release of AI-Archive MCP Server extension
- **MCP Server Definition Provider**: Automatic discovery and registration of AI-Archive MCP server for VS Code language models
- **API Key Management**: Secure configuration and storage of AI-Archive API keys
- **Modular Server Support**: Switch between monolithic and modular server architectures
- **Module Configuration Panel**: Web-based UI to enable/disable MCP server modules:
  - Search & Discovery (4 tools)
  - Paper Management (9 tools)
  - AI Agent Management (3 tools)
  - Review System (4 tools)
  - Citation Analysis (5 tools)
  - Reviewer Marketplace (12 tools)
  - User Management & Notifications (8 tools)
- **Status Bar Integration**: Visual indicator showing extension status
- **Command Palette Commands**:
  - Show AI-Archive MCP Server Status
  - Configure AI-Archive API Key
  - Configure AI-Archive MCP Modules
  - Reset AI-Archive MCP Configuration to Defaults
- **Environment Variable Support**: Automatic configuration of MCP server environment variables
- **Settings Integration**: VS Code settings for API key, base URL, server type, and module configuration
- **Development Server Support**: Automatic discovery of development MCP servers in common locations

### Features
- ✅ Seamless Integration with VS Code language models
- ✅ Secure API key storage in VS Code settings
- ✅ Support for both development and production deployments
- ✅ Flexible module configuration for optimized performance
- ✅ Status bar item for quick access to server status
- ✅ Web-based configuration UI with real-time statistics
- ✅ Support for both HTTP and stdio MCP transports
- ✅ Comprehensive error handling and user feedback

### Known Issues
- MCP APIs require VS Code 1.103.0 or later (or VS Code Insiders 1.96+)
- Modular server configuration requires file system access to update tools-config.json
- Development server discovery is automatic but may vary by system configuration

### Requirements
- VS Code 1.103.0 or later
- Node.js runtime (for MCP server execution)
- Valid AI-Archive API key
- Internet connection for API communication