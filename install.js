#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import axios from 'axios';
import readline from 'readline';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Skip interactive setup if bundled in VS Code extension
if (process.env.VSCODE_MCP_BUNDLE === '1' || process.env.npm_config_vscode_mcp_skip === 'true') {
  console.log('ℹ️  Skipping MCP server interactive setup (bundled in VS Code extension)');
  process.exit(0);
}

// Load existing .env if it exists
const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
}

class MCPInstaller {
  constructor() {
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    this.config = {
      apiBaseUrl: '',
      email: '',
      password: '',
      apiKey: ''
    };
  }

  async prompt(question) {
    return new Promise((resolve) => {
      this.rl.question(question, resolve);
    });
  }

  async promptPassword(question) {
    return new Promise((resolve) => {
      const stdin = process.stdin;
      stdin.setRawMode(true);
      stdin.resume();
      stdin.setEncoding('utf8');

      process.stdout.write(question);
      
      let password = '';
      const onData = (char) => {
        switch (char) {
          case '\n':
          case '\r':
          case '\u0004': // Ctrl-D
            stdin.setRawMode(false);
            stdin.pause();
            stdin.removeListener('data', onData);
            process.stdout.write('\n');
            resolve(password);
            break;
          case '\u0003': // Ctrl-C
            process.exit();
            break;
          case '\u007f': // Backspace
            if (password.length > 0) {
              password = password.slice(0, -1);
              process.stdout.write('\b \b');
            }
            break;
          default:
            password += char;
            process.stdout.write('*');
            break;
        }
      };
      
      stdin.on('data', onData);
    });
  }

  async detectEnvironment() {
    console.log('\n🔍 Detecting environment...\n');
    
    // Try to detect if we're in development or production
    const currentApiUrl = process.env.API_BASE_URL;
    
    if (currentApiUrl?.includes('localhost')) {
      console.log('📍 Current environment: Development (localhost)');
      return 'development';
    } else if (currentApiUrl?.includes('ai-archive.io')) {
      console.log('📍 Current environment: Production (ai-archive.io)');
      return 'production';
    }
    
    // Ask user to choose
    console.log('Available environments:');
    console.log('1. Development (local server)');
    console.log('2. Production (https://ai-archive.io)');
    console.log('3. Custom URL');
    
    const choice = await this.prompt('\nSelect environment (1-3): ');
    
    switch (choice.trim()) {
      case '1':
        return 'development';
      case '2':
        return 'production';
      case '3':
        return 'custom';
      default:
        console.log('❌ Invalid choice. Defaulting to development.');
        return 'development';
    }
  }

  async configureApiUrl(environment) {
    switch (environment) {
      case 'development':
        // Use environment variable or prompt for development URL
        const devUrl = process.env.DEVELOPMENT_API_URL || 'http://localhost:3000/api/v1';
        this.config.apiBaseUrl = devUrl;
        console.log(`✅ Using development API: ${devUrl}`);
        break;
        
      case 'production':
        this.config.apiBaseUrl = 'https://ai-archive.io/api/v1';
        console.log('✅ Using production API: https://ai-archive.io/api/v1');
        break;
        
      case 'custom':
        const customUrl = await this.prompt('Enter custom API URL (e.g., https://your-domain.com/api/v1): ');
        this.config.apiBaseUrl = customUrl.trim();
        console.log(`✅ Using custom API: ${this.config.apiBaseUrl}`);
        break;
    }
  }

  async testConnection() {
    console.log('\n🔗 Testing connection to API...');
    
    try {
      // Try to reach the health endpoint or auth endpoint
      const healthUrl = this.config.apiBaseUrl.replace('/api/v1', '/api/v1/health');
      
      const response = await axios.get(healthUrl, {
        timeout: 10000,
        validateStatus: (status) => status < 500 // Accept any status code less than 500
      });
      
      console.log('✅ API connection successful!');
      return true;
    } catch (error) {
      console.log('❌ Could not connect to API server.');
      console.log(`   Error: ${error.message}`);
      
      if (error.code === 'ECONNREFUSED') {
        console.log('   Tip: Make sure the AI-Archive backend server is running.');
      } else if (error.code === 'ENOTFOUND') {
        console.log('   Tip: Check if the domain/URL is correct.');
      }
      
      const retry = await this.prompt('\nWould you like to continue anyway? (y/N): ');
      return retry.toLowerCase().startsWith('y');
    }
  }

  async authenticateUser() {
    console.log('\n👤 User Authentication\n');
    
    const choice = await this.prompt('Do you have an existing account? (y/N): ');
    
    if (choice.toLowerCase().startsWith('y')) {
      return await this.loginUser();
    } else {
      return await this.registerUser();
    }
  }

  async registerUser() {
    console.log('\n📝 Creating new account...\n');
    
    this.config.email = await this.prompt('Email: ');
    
    let password, confirmPassword;
    do {
      password = await this.promptPassword('Password: ');
      confirmPassword = await this.promptPassword('Confirm password: ');
      
      if (password !== confirmPassword) {
        console.log('❌ Passwords do not match. Please try again.');
      }
    } while (password !== confirmPassword);
    
    this.config.password = password;
    
    const name = await this.prompt('Full name (optional): ');
    const affiliation = await this.prompt('Affiliation (optional): ');
    
    try {
      console.log('\n🔄 Creating account...');
      
      const response = await axios.post(`${this.config.apiBaseUrl}/auth/register`, {
        email: this.config.email,
        password: this.config.password,
        name: name.trim() || undefined,
        affiliation: affiliation.trim() || undefined,
        userType: 'researcher' // Default user type for MCP users
      }, {
        timeout: 10000
      });
      
      if (response.data.success) {
        console.log('✅ Account created successfully!');
        console.log(`   User ID: ${response.data.data.user.id}`);
        return true;
      } else {
        console.log('❌ Registration failed:', response.data.message);
        return false;
      }
    } catch (error) {
      console.log('❌ Registration failed:', error.response?.data?.message || error.message);
      return false;
    }
  }

  async loginUser() {
    console.log('\n🔑 Login to existing account...\n');
    
    this.config.email = await this.prompt('Email: ');
    this.config.password = await this.promptPassword('Password: ');
    
    try {
      console.log('\n🔄 Logging in...');
      
      const response = await axios.post(`${this.config.apiBaseUrl}/auth/login`, {
        login: this.config.email,
        password: this.config.password
      }, {
        timeout: 10000
      });
      
      if (response.data.success) {
        console.log('✅ Login successful!');
        console.log(`   Welcome back, ${response.data.data.user.name || this.config.email}!`);
        return true;
      } else {
        console.log('❌ Login failed:', response.data.message);
        return false;
      }
    } catch (error) {
      console.log('❌ Login failed:', error.response?.data?.message || error.message);
      return false;
    }
  }

  async createApiKey() {
    console.log('\n🔑 Creating API key for MCP access...\n');
    
    try {
      // First, login to get JWT token
      const loginResponse = await axios.post(`${this.config.apiBaseUrl}/auth/login`, {
        login: this.config.email,
        password: this.config.password
      });
      
      if (!loginResponse.data.success) {
        throw new Error('Failed to get authentication token');
      }
      
      const token = loginResponse.data.token || loginResponse.data.data.token;
      
      // Create API key
      const keyResponse = await axios.post(`${this.config.apiBaseUrl}/users/api-keys`, {
        name: `MCP Server - ${new Date().toISOString().split('T')[0]}`,
        description: 'API key for Model Context Protocol server access'
      }, {
        headers: {
          'Authorization': `Bearer ${token}`
        },
        timeout: 10000
      });
      
      if (keyResponse.data.success) {
        this.config.apiKey = keyResponse.data.data.key;
        console.log('✅ API key created successfully!');
        console.log(`   Key ID: ${keyResponse.data.data.id}`);
        return true;
      } else {
        console.log('❌ Failed to create API key:', keyResponse.data.message);
        return false;
      }
    } catch (error) {
      console.log('❌ Failed to create API key:', error.response?.data?.message || error.message);
      
      // Fallback: ask user to provide existing API key
      console.log('\n💡 Alternatively, you can provide an existing API key:');
      const existingKey = await this.prompt('Enter existing API key (or press Enter to skip): ');
      
      if (existingKey.trim()) {
        this.config.apiKey = existingKey.trim();
        return await this.validateApiKey();
      }
      
      return false;
    }
  }

  async validateApiKey() {
    console.log('\n🔍 Validating API key...');
    
    try {
      const response = await axios.get(`${this.config.apiBaseUrl}/papers`, {
        headers: {
          'X-API-Key': this.config.apiKey
        },
        timeout: 10000,
        params: { limit: 1 } // Just get one paper to test
      });
      
      console.log('✅ API key is valid!');
      return true;
    } catch (error) {
      console.log('❌ API key validation failed:', error.response?.data?.message || error.message);
      return false;
    }
  }

  async writeEnvFile() {
    console.log('\n📁 Creating configuration file...');
    
    const envContent = `# AI-Archive MCP Server Configuration
# Generated on ${new Date().toISOString()}

# API Configuration
API_BASE_URL=${this.config.apiBaseUrl}
MCP_API_KEY=${this.config.apiKey}

# User Credentials (for fallback authentication)
MCP_USER_EMAIL=${this.config.email}
MCP_USER_PASSWORD=${this.config.password}

# Optional: Performance Settings
REQUEST_TIMEOUT=30000
MAX_FILE_SIZE=50MB
MAX_PAPERS_PER_REQUEST=50

# Development Settings (only used in development mode)
NODE_ENV=production
DEBUG=false
`;

    try {
      fs.writeFileSync(envPath, envContent);
      console.log('✅ Configuration saved to .env file');
      return true;
    } catch (error) {
      console.log('❌ Failed to write configuration file:', error.message);
      return false;
    }
  }

  async installComplete() {
    console.log('\n🎉 Installation Complete!\n');
    
    console.log('Your AI-Archive MCP server is now configured and ready to use.');
    console.log('\nNext steps:');
    console.log('1. Start the MCP server: npm start');
    console.log('2. Add to your MCP client configuration');
    console.log('3. Test with: "Search for papers about machine learning"');
    
    console.log('\n📖 For integration instructions, see:');
    console.log('   - README.md for general setup');
    console.log('   - docs/MCP_INTEGRATION_README.md for VS Code setup');
    
    console.log('\n🔧 Configuration:');
    console.log(`   API URL: ${this.config.apiBaseUrl}`);
    console.log(`   User: ${this.config.email}`);
    console.log(`   API Key: ${this.config.apiKey.substring(0, 20)}...`);
    
    console.log('\n🆘 Need help? Check the troubleshooting guide or create an issue.');
  }

  async run() {
    console.log('🚀 AI-Archive MCP Server Installation\n');
    console.log('This installer will help you set up the MCP server for production use.\n');
    
    try {
      // Step 1: Detect and configure environment
      const environment = await this.detectEnvironment();
      await this.configureApiUrl(environment);
      
      // Step 2: Test API connection
      const connected = await this.testConnection();
      if (!connected) {
        console.log('\n❌ Installation aborted due to connection issues.');
        this.rl.close();
        return;
      }
      
      // Step 3: Authenticate user
      const authenticated = await this.authenticateUser();
      if (!authenticated) {
        console.log('\n❌ Authentication failed. Installation aborted.');
        this.rl.close();
        return;
      }
      
      // Step 4: Create API key
      const keyCreated = await this.createApiKey();
      if (!keyCreated) {
        console.log('\n❌ Failed to create/validate API key. Installation aborted.');
        this.rl.close();
        return;
      }
      
      // Step 5: Write configuration
      const configSaved = await this.writeEnvFile();
      if (!configSaved) {
        console.log('\n❌ Failed to save configuration. Installation aborted.');
        this.rl.close();
        return;
      }
      
      // Step 6: Complete
      await this.installComplete();
      
    } catch (error) {
      console.log('\n❌ Installation failed:', error.message);
      console.log('\nFor help, please check the documentation or create an issue.');
    } finally {
      this.rl.close();
    }
  }
}

// Run installer
const installer = new MCPInstaller();
installer.run();