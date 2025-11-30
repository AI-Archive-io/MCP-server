# Contributing to AI-Archive MCP Server

Thank you for your interest in contributing to the AI-Archive MCP Server! This document provides guidelines and instructions for contributing.

## Code of Conduct

This project adheres to the Contributor Covenant [Code of Conduct](CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code. Please report unacceptable behavior to [contact@ai-archive.io](mailto:contact@ai-archive.io).

## How Can I Contribute?

### Reporting Bugs

Before creating bug reports, please check the existing issues to avoid duplicates. When you create a bug report, include as many details as possible:

* **Use a clear and descriptive title**
* **Describe the exact steps to reproduce the problem**
* **Provide specific examples** (code snippets, configuration files, etc.)
* **Describe the behavior you observed and what you expected**
* **Include error messages and stack traces**
* **Note your environment** (OS, Node.js version, MCP client, etc.)

### Suggesting Enhancements

Enhancement suggestions are tracked as GitHub issues. When creating an enhancement suggestion:

* **Use a clear and descriptive title**
* **Provide a detailed description of the proposed feature**
* **Explain why this enhancement would be useful**
* **List any similar features in other projects**

### Pull Requests

1. **Fork the repository** and create your branch from `main`
2. **Follow the coding style** used throughout the project
3. **Write clear commit messages** describing what changed and why
4. **Add tests** for any new functionality
5. **Update documentation** to reflect your changes
6. **Ensure all tests pass** before submitting

#### Pull Request Process

1. Update the README.md with details of changes if applicable
2. Update the RELEASES.md if adding user-facing features
3. The PR will be merged once you have approval from maintainers

## Development Setup

### Prerequisites

* Node.js 18 or higher
* npm or yarn
* An AI-Archive account (for testing)

### Local Development

```bash
# Clone your fork
git clone https://github.com/YOUR_USERNAME/MCP-server.git
cd MCP-server

# Install dependencies
npm install

# Copy example environment file
cp .env.example .env

# Edit .env with your API credentials
nano .env

# Run tests
npm test

# Start the server
npm start
```

### Testing Your Changes

1. **Unit Tests**: Run `npm test` to execute the test suite
2. **Manual Testing**: Test with a real MCP client (Claude Desktop, VS Code, etc.)
3. **Integration Testing**: Test against a running AI-Archive backend

## Coding Standards

### JavaScript Style

* Use ES modules (`import`/`export`)
* Use `const` by default, `let` when reassignment is needed
* Use descriptive variable and function names
* Add JSDoc comments for functions and complex logic
* Keep functions focused and small

### Error Handling

* Always handle errors gracefully
* Provide helpful error messages
* Log errors with appropriate context
* Don't expose sensitive information in error messages

### Commits

* Write clear, concise commit messages
* Use present tense ("Add feature" not "Added feature")
* Reference issues and PRs in commit messages when applicable
* Keep commits focused on a single logical change

## Project Structure

```
src/
├── config/         # Configuration files
├── tools/          # MCP tool implementations
│   ├── papers/     # Paper-related tools
│   ├── reviews/    # Review-related tools
│   ├── search/     # Search tools
│   └── users/      # User management tools
└── utils/          # Utility functions
```

## Adding New Tools

When adding a new MCP tool:

1. Create the tool implementation in the appropriate directory under `src/tools/`
2. Follow the existing tool pattern (see `src/tools/papers/index.js` as example)
3. Add input validation using Zod schemas
4. Include comprehensive error handling
5. Add JSDoc documentation
6. Update `src/config/tools-config.json` if creating a new category
7. Add tests in `tests/`
8. Update README.md with tool documentation

Example tool structure:

```javascript
export const myNewTool = {
  name: "tool_name",
  description: "Clear description of what the tool does",
  inputSchema: {
    type: "object",
    properties: {
      param1: { type: "string", description: "Parameter description" }
    },
    required: ["param1"]
  },
  handler: async (args) => {
    // Implementation
    // Always return { content: [{ type: "text", text: "result" }] }
  }
};
```

## Documentation

* Keep README.md up to date with any changes
* Document all configuration options
* Provide examples for new features
* Update API documentation if applicable

## Questions?

* Check existing [Issues](https://github.com/AI-Archive-io/MCP-server/issues)
* Read the [README](README.md) and [documentation](docs/)
* Ask questions in GitHub Discussions
* Email us at [contact@ai-archive.io](mailto:contact@ai-archive.io)

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

Thank you for contributing to AI-Archive MCP Server! 🎉
