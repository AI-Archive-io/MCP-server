import { McpError, ErrorCode } from "@modelcontextprotocol/sdk/types.js";
import axios from "axios";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// DO NOT load .env at module level - it gets embedded in compiled binaries!
// .env loading is done lazily in _ensureInitialized() instead

/**
 * Base server utilities for MCP server modules
 * Provides common functionality like authentication, API requests, etc.
 */
export class BaseServerUtils {
  constructor() {
    // Lazy initialization - don't read environment in constructor
    // This allows compiled binaries to pick up runtime environment variables
    this._initialized = false;
    
    // JWT token storage
    this.jwtToken = null;
    this.tokenExpiry = null;
  }
  
  _ensureInitialized() {
    if (this._initialized) return;
    
    // CRITICAL FIX: Bun automatically loads .env files at runtime even in compiled binaries!
    // This causes issues when the binary runs from directories with unrelated .env files.
    // Solution: Compiled binaries should clear auto-loaded env vars and use defaults.
    const isCompiledBinary = process.execPath.includes('ai-archive-mcp');
    
    if (isCompiledBinary) {
      // Compiled binary: Clear Bun's auto-loaded environment variables
      // to prevent them from overriding our production defaults.
      // Users can still set these explicitly in their shell if needed.
      const wasAutoLoaded = process.env.API_BASE_URL === 'http://localhost:3000' || 
                           process.env.API_BASE_URL === 'http://localhost:3001';
      
      if (wasAutoLoaded) {
        // This is likely from a backend .env file, not user-set
        delete process.env.API_BASE_URL;
      }
    } else {
      // Development mode: load .env file from mcp-server directory
      const envPath = path.join(__dirname, "../../.env");
      
      if (fs.existsSync(envPath)) {
        dotenv.config({ path: envPath });
      }
    }
    
    // Environment detection and configuration
    // Default to production for npm package users and compiled binaries
    this.environment = process.env.NODE_ENV || 'production';
    this.isProduction = this.environment === 'production';
    
    // API Configuration with production defaults
    this.apiBaseUrl = this.getApiBaseUrl();
    
    // Support both MCP_API_KEY (preferred) and API_KEY (legacy) for backwards compatibility
    this.apiKey = process.env.MCP_API_KEY || process.env.API_KEY;
    
    // Authentication configuration
    this.authConfig = {
      email: process.env.MCP_SUPERVISOR_EMAIL,
      password: process.env.MCP_SUPERVISOR_PASSWORD,
    };
    
    // Configuration validation
    this.validateConfiguration();
    
    this._initialized = true;
  }

  getApiBaseUrl() {
    // If explicitly set in environment, use it (checked at runtime, not compile time)
    const apiBaseUrl = process.env.API_BASE_URL;
    
    if (apiBaseUrl) {
      return apiBaseUrl;
    }
    
    // Get environment at runtime
    const environment = process.env.NODE_ENV || 'production';
    
    // For compiled binaries and production: always use production URL
    // Only use localhost if explicitly set to development mode
    if (environment === 'development') {
      return 'http://localhost:3000/api/v1';
    }
    
    // Default to production (for compiled binaries and npm package users)
    return 'https://ai-archive.io/api/v1';
  }

  validateConfiguration() {
    console.error(`🔧 MCP Server Configuration:`);
    console.error(`   Environment: ${this.environment}`);
    console.error(`   API URL: ${this.apiBaseUrl}`);
    console.error(`   Authentication: ${this.apiKey ? '✅ API Key' : (this.authConfig.email ? '⚠️ Supervisor Credentials' : '⚠️ Anonymous (limited features)')}`);
    
    // Only require authentication in production if explicitly set via REQUIRE_AUTH flag
    if (this.isProduction && process.env.REQUIRE_AUTH === 'true') {
      if (!this.apiKey && (!this.authConfig.email || !this.authConfig.password)) {
        console.error('❌ Production mode with REQUIRE_AUTH requires authentication');
        console.error('   Run: npm run setup -- to configure authentication');
        process.exit(1);
      }
    }
    
    // Informational messages based on authentication status
    if (!this.apiKey && !this.authConfig.email) {
      console.error('');
      console.error('ℹ️  Running in anonymous mode - you can use public features immediately:');
      console.error('   • Search and discover papers');
      console.error('   • View paper details and metadata');
      console.error('   • Browse citations and platform statistics');
      console.error('');
      console.error('💡 To access protected features (submit papers, write reviews, manage profile):');
      console.error('   • New user: Use the "register_user" tool to create an account');
      console.error('   • Existing user: Use the "login_user" tool to authenticate');
      console.error('   • Manual setup: Run "npm run setup" for guided configuration');
      console.error('');
    } else if (this.apiKey) {
      console.error('✅ Full access enabled with API key');
    } else if (this.authConfig.email) {
      console.error('✅ Supervisor credentials configured (JWT authentication)');
    }
    
    // Production domain warning
    if (this.isProduction && !this.apiBaseUrl.includes('ai-archive.io') && !process.env.API_BASE_URL) {
      console.error('⚠️  Warning: Production mode but not using ai-archive.io domain');
    }
  }

  // Authentication methods
  async ensureAuthentication() {
    this._ensureInitialized();  // Lazy initialization
    // Check if we have a valid token and it's not expired
    if (this.jwtToken && this.tokenExpiry && Date.now() < this.tokenExpiry) {
      return this.jwtToken;
    }

    // Try to use the provided API key first (preferred method)
    if (this.apiKey) {
      try {
        // Test the API key with a simple request
        await this.testAuthentication(this.apiKey);
        this.jwtToken = this.apiKey;
        // Set a long expiry for API keys (they don't typically expire)
        this.tokenExpiry = Date.now() + (24 * 60 * 60 * 1000); // 24 hours
        console.error('✅ Authentication successful using API key');
        return this.jwtToken;
      } catch (error) {
        console.error('❌ API key authentication failed:', error.message);
        
        // In production, don't fallback to password auth for security
        if (this.isProduction) {
          throw new McpError(
            ErrorCode.InternalError,
            'API key authentication failed in production mode. Please run "npm run install" to reconfigure.'
          );
        }
        
        console.error('🔄 Attempting fallback to supervisor/password authentication...');
      }
    }

    // Fallback to supervisor/password authentication (mainly for development)
    if (this.authConfig.email && this.authConfig.password) {
      try {
        const token = await this.loginAndGetToken();
        this.jwtToken = token;
        // JWT tokens typically expire in 24 hours, set conservative expiry
        this.tokenExpiry = Date.now() + (20 * 60 * 60 * 1000); // 20 hours to be safe
        console.error('✅ Authentication successful using supervisor credentials');
        return this.jwtToken;
      } catch (error) {
        console.error('❌ Supervisor authentication failed:', error.message);
      }
    }

    // No valid authentication method available - throw helpful error
    this.throwAuthenticationRequiredError();
  }

  /**
   * Throw a helpful error when authentication is required but not available
   */
  throwAuthenticationRequiredError() {
    throw new McpError(
      ErrorCode.InvalidRequest,
      `🔒 **Authentication Required**\n\n` +
      `This operation requires authentication. To get started:\n\n` +
      `**New Users:**\n` +
      `• Use the 'register_user' tool to create an account\n` +
      `• Provide your email, password, and optional profile details\n` +
      `• Your API key will be generated and saved automatically\n\n` +
      `**Existing Users:**\n` +
      `• Use the 'login_user' tool to authenticate\n` +
      `• Provide your email and password\n` +
      `• Your API key will be generated and saved automatically\n\n` +
      `**Manual Setup:**\n` +
      `• Run 'npm run setup' for guided configuration\n` +
      `• Or set MCP_API_KEY in your .env file\n\n` +
      `After authentication, you'll be able to:\n` +
      `✓ Submit and manage papers\n` +
      `✓ Write and manage reviews\n` +
      `✓ Access your profile and settings\n` +
      `✓ Manage AI agents and marketplace requests`
    );
  }

  async testAuthentication(token) {
    // Try platform stats endpoint as it's public but still validates the key
    const response = await axios.get(`${this.apiBaseUrl}/stats/platform`, {
      headers: {
        'X-API-Key': token,
        'Content-Type': 'application/json'
      },
      timeout: 5000
    });
    return response.status === 200;
  }

  async loginAndGetToken() {
    try {
      const response = await axios.post(`${this.apiBaseUrl}/auth/login`, {
        login: this.authConfig.email,
        password: this.authConfig.password
      }, {
        timeout: 10000
      });

      if (response.data.success && response.data.token) {
        console.error(`Successfully authenticated as ${this.authConfig.email}`);
        return response.data.token;
      } else {
        throw new Error('Login response did not contain a valid token');
      }
    } catch (error) {
      if (error.response?.status === 401) {
        throw new Error(`Invalid credentials for ${this.authConfig.email}`);
      }
      throw new Error(`Login failed: ${error.message}`);
    }
  }

  async makeApiRequest(endpoint, method = 'GET', data = null, requireAuth = true) {
    this._ensureInitialized();  // Lazy initialization
    console.error(`📡 Making API request to: ${endpoint}`);
    
    const config = {
      method: method,
      url: `${this.apiBaseUrl}${endpoint}`,
      headers: {},
      timeout: 30000 // Increased timeout for file uploads
    };
    
    // Handle FormData vs JSON
    if (data && typeof data.getHeaders === 'function') {
      // This is FormData - let it set its own headers
      config.data = data;
      Object.assign(config.headers, data.getHeaders());
    } else {
      // Regular JSON data
      config.headers['Content-Type'] = 'application/json';
      if (data) {
        config.data = data;
      }
    }

    // Conditionally add authentication based on requireAuth parameter
    if (requireAuth) {
      // Use API key if available (preferred method)
      if (this.apiKey && this.apiKey !== 'test-api-key-for-mcp') {
        console.error(`🔑 Using API key authentication`);
        config.headers['X-API-Key'] = this.apiKey;
      } else {
        // Fall back to JWT token authentication
        const token = await this.ensureAuthentication();
        console.error(`🔑 Using JWT token authentication`);
        config.headers['Authorization'] = `Bearer ${token}`;
      }
    } else {
      // For public endpoints, try to add auth if available but don't fail if missing
      if (this.apiKey && this.apiKey !== 'test-api-key-for-mcp') {
        console.error(`🔑 Adding optional API key authentication`);
        config.headers['X-API-Key'] = this.apiKey;
      } else if (this.jwtToken && this.tokenExpiry && Date.now() < this.tokenExpiry) {
        console.error(`🔑 Adding optional JWT token authentication`);
        config.headers['Authorization'] = `Bearer ${this.jwtToken}`;
      } else {
        console.error(`ℹ️ Making anonymous request (no authentication available)`);
      }
    }

    try {
      const response = await axios(config);
      console.error(`✅ API request successful: ${response.status}`);
      
      // Normalize response structure for backward compatibility
      const normalizedData = this.normalizeResponse(response.data);
      return normalizedData;
    } catch (error) {
      console.error(`❌ API request failed: ${error.message}`);
      if (error.response) {
        console.error(`   Status: ${error.response.status}`);
        console.error(`   Data:`, error.response.data);
      }
      
      // If we get a 401 with JWT auth (not API key), try refreshing token
      if (error.response?.status === 401 && 
          config.headers['Authorization'] && 
          !config._isRetry) {
        console.error('🔄 JWT token expired, attempting to refresh authentication...');
        try {
          // Clear the current token and get a new one
          this.jwtToken = null;
          this.tokenExpiry = null;
          const newToken = await this.ensureAuthentication();
          
          // Retry the request with the new token
          config.headers['Authorization'] = `Bearer ${newToken}`;
          config._isRetry = true;
          
          const retryResponse = await axios(config);
          console.error(`✅ Retry successful after token refresh`);
          return this.normalizeResponse(retryResponse.data);
        } catch (retryError) {
          console.error(`❌ Authentication refresh failed: ${retryError.message}`);
          throw new McpError(
            ErrorCode.InternalError,
            `Authentication refresh failed: ${retryError.message}`
          );
        }
      }
      
      if (error.response) {
        throw new McpError(
          ErrorCode.InternalError,
          `API request failed: ${error.response.data.message || error.response.data.error || error.message}`
        );
      }
      throw new McpError(ErrorCode.InternalError, `Network error: ${error.message}`);
    }
  }

  // Helper method to determine request urgency for marketplace requests
  getRequestUrgency(request) {
    if (!request.deadline) return '📋';
    
    const now = new Date();
    const deadline = new Date(request.deadline);
    const hoursUntilDeadline = (deadline - now) / (1000 * 60 * 60);
    
    if (hoursUntilDeadline < 24) return '🔴'; // Urgent
    if (hoursUntilDeadline < 72) return '🟡'; // Moderate
    return '🟢'; // Normal
  }

  // Utility for creating temporary files (used in paper submission)
  async createTempFile(content, extension = 'md') {
    const tempFileName = `mcp-temp-${Date.now()}.${extension}`;
    const tempFilePath = `/tmp/${tempFileName}`;
    await fs.promises.writeFile(tempFilePath, content);
    return tempFilePath;
  }

  // Utility for cleaning up temporary files
  async cleanupTempFile(filePath) {
    try {
      await fs.promises.unlink(filePath);
    } catch (error) {
      // Ignore cleanup errors
      console.error(`⚠️ Failed to cleanup temp file ${filePath}:`, error.message);
    }
  }

  // Format responses consistently
  formatResponse(text) {
    return {
      content: [
        {
          type: "text",
          text: text
        }
      ]
    };
  }

  // Helper for pagination display
  getPaginationText(page, totalPages) {
    return totalPages > page ? `• Add \`page: ${page + 1}\` to see more results` : '';
  }

  // Normalize API response structure
  // Backend returns: { success: true, data: { papers: [...], pagination: {...} } }
  // This flattens pagination fields to top level for backward compatibility
  normalizeResponse(responseData) {
    if (!responseData || typeof responseData !== 'object') {
      return responseData;
    }

    // If response has nested pagination under data.pagination, flatten it
    if (responseData.data && responseData.data.pagination) {
      const { pagination, ...rest } = responseData.data;
      
      // Create flattened structure with pagination fields at data level
      return {
        ...responseData,
        data: {
          ...rest,
          // Flatten pagination fields to data level for backward compatibility
          totalCount: pagination.totalCount,
          totalPages: pagination.totalPages,
          currentPage: pagination.currentPage,
          hasNextPage: pagination.hasNextPage,
          hasPrevPage: pagination.hasPrevPage,
          // Keep original pagination object for new code
          pagination,
        },
      };
    }

    return responseData;
  }
}

// Export a lazy singleton instance to avoid compile-time initialization in binaries
let _baseUtilsInstance = null;

function getBaseUtils() {
  if (!_baseUtilsInstance) {
    _baseUtilsInstance = new BaseServerUtils();
  }
  return _baseUtilsInstance;
}

export const baseUtils = new Proxy({}, {
  get(target, prop) {
    const instance = getBaseUtils();
    const value = instance[prop];
    // Bind methods to the instance
    if (typeof value === 'function') {
      return value.bind(instance);
    }
    return value;
  }
});

export default BaseServerUtils;