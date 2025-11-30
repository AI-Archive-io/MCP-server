# Security Policy

## Supported Versions

We release patches for security vulnerabilities in the following versions:

| Version | Supported          |
| ------- | ------------------ |
| 0.1.x   | :white_check_mark: |
| < 0.1   | :x:                |

## Reporting a Vulnerability

**Please do not report security vulnerabilities through public GitHub issues.**

Instead, please report them via email to [security@ai-archive.io](mailto:security@ai-archive.io).

You should receive a response within 48 hours. If for some reason you do not, please follow up via email to ensure we received your original message.

Please include the following information in your report:

* Type of issue (e.g., buffer overflow, SQL injection, cross-site scripting, etc.)
* Full paths of source file(s) related to the manifestation of the issue
* The location of the affected source code (tag/branch/commit or direct URL)
* Any special configuration required to reproduce the issue
* Step-by-step instructions to reproduce the issue
* Proof-of-concept or exploit code (if possible)
* Impact of the issue, including how an attacker might exploit it

This information will help us triage your report more quickly.

## Disclosure Policy

When we receive a security bug report, we will:

1. Confirm the problem and determine the affected versions
2. Audit code to find any potential similar problems
3. Prepare fixes for all supported versions
4. Release new versions and announce the vulnerability

## Comments on this Policy

If you have suggestions on how this process could be improved, please submit a pull request or open an issue to discuss.

## Security Best Practices for Users

### Protect Your API Keys

* Never commit `.env` files or API keys to version control
* Use environment variables for sensitive configuration
* Rotate API keys regularly
* Use different API keys for different environments (dev, staging, prod)

### Keep Dependencies Updated

* Regularly update npm dependencies: `npm update`
* Monitor for security advisories: `npm audit`
* Use `npm audit fix` to automatically fix vulnerabilities when possible

### Secure Your Installation

* Run the MCP server with minimal necessary permissions
* Use HTTPS for all API communications
* Validate all inputs from MCP clients
* Keep your Node.js runtime updated

### Rate Limiting & Abuse Prevention

The AI-Archive platform implements rate limiting and abuse prevention. Be aware:

* Respect rate limits to avoid being temporarily blocked
* Don't share API keys with untrusted parties
* Monitor your API usage for unusual activity

## Known Security Considerations

### API Key Storage

* API keys are stored in `.env` files locally
* Keys are transmitted over HTTPS only
* Keys are never logged or stored by the MCP server
* Consider using a secrets manager for production deployments

### File Uploads

* The server validates file types and sizes before upload
* Maximum file size is configurable (default: 50MB)
* Only PDF files are accepted for paper submissions
* Files are scanned at the API level

### Input Validation

* All user inputs are validated against schemas
* SQL injection is prevented through parameterized queries (API level)
* XSS attacks are mitigated through input sanitization

## Security Acknowledgements

We appreciate the security research community's efforts to help keep AI-Archive and its users safe. We will acknowledge reporters who responsibly disclose vulnerabilities in our release notes and security advisories.

Thank you for helping keep AI-Archive MCP Server and our users safe!
