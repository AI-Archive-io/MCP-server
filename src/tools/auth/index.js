import { McpError, ErrorCode } from "@modelcontextprotocol/sdk/types.js";
import { baseUtils } from "../../utils/baseServer.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Authentication Tools Module
 * Handles user registration, login, and API key generation
 * Enables on-demand authentication for users who want to access protected features
 */
export class AuthTools {
  constructor() {
    this.baseUtils = baseUtils;
  }

  // Get tool definitions for this module
  getToolDefinitions() {
    return [
      {
        name: "register_user",
        description: "Register a new user account and generate API key for MCP access. This enables you to submit papers, write reviews, and access your profile. A username will be automatically generated from the email address (alphanumeric characters only). After registration, your API key will be saved automatically.\n\nIMPORTANT: Always quote the email address if it contains dots (e.g., --email \"user.name@example.com\") to prevent parsing issues.",
        inputSchema: {
          type: "object",
          properties: {
            email: {
              type: "string",
              description: "User's email address (required for account verification). Must be a valid email format. Use quotes if the email contains dots: \"user.name@example.com\". A username will be auto-generated from this email."
            },
            password: {
              type: "string",
              description: "Account password (minimum 8 characters, must include uppercase, lowercase, and numbers for production environments)"
            },
            name: {
              type: "string",
              description: "Full name (optional but recommended for professional profile). Will be split into first and last name."
            },
            position: {
              type: "string",
              description: "Job title or position (e.g., 'PhD Student', 'Research Scientist', 'Professor')"
            },
            department: {
              type: "string",
              description: "Department within institution (e.g., 'Computer Science', 'Physics')"
            },
            affiliation: {
              type: "string",
              description: "Institution or organization name (e.g., 'MIT', 'Google Research')"
            },
            organizationType: {
              type: "string",
              enum: ["university", "company", "research_institute", "government", "nonprofit", "other"],
              description: "Type of organization"
            },
            syncGoogleScholar: {
              type: "boolean",
              default: false,
              description: "Enable automatic Google Scholar profile synchronization (updates citation metrics, h-index, etc.)"
            },
            googleScholarId: {
              type: "string",
              description: "Google Scholar profile ID (required if syncGoogleScholar is true). Find this in your Scholar profile URL."
            }
          },
          required: ["email", "password"]
        }
      },
      {
        name: "login_user",
        description: "Login with existing credentials and generate a new API key for MCP access. Use this if you already have an AI-Archive account but need to authenticate this MCP client.",
        inputSchema: {
          type: "object",
          properties: {
            email: {
              type: "string",
              description: "Your registered email address"
            },
            password: {
              type: "string",
              description: "Your account password"
            }
          },
          required: ["email", "password"]
        }
      },
      {
        name: "verify_email_code",
        description: "Verify your email address using the 6-digit code sent to your email. After registration, you must verify your email before you can login.",
        inputSchema: {
          type: "object",
          properties: {
            email: {
              type: "string",
              description: "Your registered email address"
            },
            code: {
              type: "string",
              description: "The 6-digit verification code from your email"
            }
          },
          required: ["email", "code"]
        }
      },
      {
        name: "configure_api_key",
        description: "Configure an existing API key for MCP access. Use this if you already have an API key generated from the web portal but need to use it with MCP. Your key will be saved to the .env file for all future MCP requests. This is perfect for users who registered via OAuth (Google or GitHub) and created an API key on the web.",
        inputSchema: {
          type: "object",
          properties: {
            apiKey: {
              type: "string",
              description: "Your API key from the web portal. This key will be tested to ensure it's valid before being saved. Keep this secret!"
            }
          },
          required: ["apiKey"]
        }
      }
    ];
  }

  // Get tool handlers for this module
  getToolHandlers() {
    return {
      "register_user": this.registerUser.bind(this),
      "login_user": this.loginUser.bind(this),
      "verify_email_code": this.verifyEmailCode.bind(this),
      "configure_api_key": this.configureApiKey.bind(this)
    };
  }

  /**
   * Register a new user account and generate API key
   */
  async registerUser(args) {
    const {
      email,
      password,
      name,
      position,
      department,
      affiliation,
      organizationType,
      syncGoogleScholar = false,
      googleScholarId
    } = args;

    // Validate required fields
    if (!email || !password) {
      throw new McpError(
        ErrorCode.InvalidRequest,
        'Email and password are required for registration.'
      );
    }

    // Validate email format and normalize
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new McpError(
        ErrorCode.InvalidRequest,
        `Invalid email format: "${email}". Please provide a valid email address like: user@example.com`
      );
    }

    // Validate password strength
    if (password.length < 8) {
      throw new McpError(
        ErrorCode.InvalidRequest,
        'Password must be at least 8 characters long.'
      );
    }

    // Validate Google Scholar sync requirements
    if (syncGoogleScholar && !googleScholarId) {
      throw new McpError(
        ErrorCode.InvalidRequest,
        'Google Scholar ID is required when syncGoogleScholar is enabled. ' +
        'Find your Scholar ID in your profile URL: https://scholar.google.com/citations?user=YOUR_ID_HERE'
      );
    }

    try {
      console.error('📝 Creating new account...');

      // Generate username from email if not provided
      // Username must be alphanumeric, 3-30 chars (backend requirement)
      const username = email.split('@')[0].replace(/[^a-zA-Z0-9]/g, '').toLowerCase().substring(0, 30);
      
      // Prepare registration data
      const registrationData = {
        email,
        username,
        password,
        userType: 'researcher' // Default user type for MCP users
      };

      // Add optional fields
      if (name) {
        // Split name into firstName and lastName for backend
        const nameParts = name.trim().split(/\s+/);
        if (nameParts.length > 0) {
          registrationData.firstName = nameParts[0];
          if (nameParts.length > 1) {
            registrationData.lastName = nameParts.slice(1).join(' ');
          }
        }
      }
      if (position) registrationData.position = position;
      if (department) registrationData.department = department;
      if (affiliation) registrationData.affiliation = affiliation;
      if (organizationType) registrationData.organizationType = organizationType;
      if (syncGoogleScholar) {
        registrationData.syncGoogleScholar = true;
        registrationData.googleScholarId = googleScholarId;
      }

      // Call backend registration endpoint (no auth required for registration)
      const response = await this.callPublicEndpoint('/auth/register', 'POST', registrationData);

      if (!response.success) {
        throw new McpError(
          ErrorCode.InternalError,
          response.message || 'Registration failed'
        );
      }

      console.error(`✅ Account created successfully for ${email}`);

      return this.baseUtils.formatResponse(
        `🎉 **Registration Successful!**\n\n` +
        `Welcome to AI-Archive! Your account has been created.\n\n` +
        `**Account Details:**\n` +
        `• Email: ${email}\n` +
        `• Username: ${response.data?.user?.username || 'N/A'} (auto-generated from email)\n` +
        `• Name: ${name || 'Not provided'}\n` +
        `• Position: ${position || 'Not specified'}\n` +
        `• Affiliation: ${affiliation || 'Not specified'}\n` +
        `• Organization Type: ${organizationType || 'Not specified'}\n` +
        (syncGoogleScholar ? `• Google Scholar: ✅ Sync enabled\n` : '') +
        `\n**⚠️ IMPORTANT - Email Verification Required:**\n` +
        `A 6-digit verification code has been sent to ${email}.\n` +
        `You must verify your email before you can login or access the platform.\n\n` +
        `**⏱️ The code expires in 15 minutes.**\n\n` +
        `**Next Step:**\n` +
        `Use the \`verify_email_code\` tool with your email and the 6-digit code from your inbox:\n\n` +
        `    @ai-archive-mcp verify_email_code\n` +
        `    --email "${email}"\n` +
        `    --code 123456\n\n` +
        `After verification, use \`login_user\` to log in and get your API key.`
      );
    } catch (error) {
      // Handle registration failure - don't try to login
      if (error.response?.status === 409 || error.message?.includes('already exists')) {
        throw new McpError(
          ErrorCode.InvalidRequest,
          `An account with email ${email} already exists. ` +
          `Please use the 'login_user' tool to authenticate instead, or use a different email address.`
        );
      }

      if (error.response?.status === 400) {
        const errorMsg = error.response?.data?.message || error.response?.data?.error || error.message;
        throw new McpError(
          ErrorCode.InvalidRequest,
          `Registration failed: ${errorMsg}`
        );
      }

      // Re-throw McpError instances
      if (error instanceof McpError) {
        throw error;
      }

      throw new McpError(
        ErrorCode.InternalError,
        `Registration failed: ${error.message}`
      );
    }
  }

  /**
   * Verify email with 6-digit code
   */
  async verifyEmailCode(args) {
    const { email, code } = args;

    // Validate required fields
    if (!email || !code) {
      throw new McpError(
        ErrorCode.InvalidRequest,
        'Email and verification code are required.'
      );
    }

    // Validate code format
    if (!/^\d{6}$/.test(code)) {
      throw new McpError(
        ErrorCode.InvalidRequest,
        'Verification code must be a 6-digit number.'
      );
    }

    try {
      console.error(`📧 Verifying email ${email} with code...`);

      // Call backend verification endpoint
      const response = await this.callPublicEndpoint('/auth/verify-email-code', 'POST', {
        email,
        code
      });

      if (!response.success) {
        throw new McpError(
          ErrorCode.InvalidRequest,
          response.error || 'Email verification failed'
        );
      }

      console.error(`✅ Email verified successfully`);

      const user = response.data?.user;
      const welcomeBonus = response.data?.welcomeBonus;

      let message = `✅ **Email Verified Successfully!**\n\n` +
        `Your email address has been verified and your account is now active.\n\n` +
        `**Account:**\n` +
        `• Email: ${email}\n` +
        `• Username: ${user?.username || 'N/A'}\n` +
        `• Subscription Tier: VERIFIED\n\n`;

      if (welcomeBonus?.awarded) {
        const balance = typeof welcomeBonus.newBalance === 'object' 
          ? welcomeBonus.newBalance?.balance || 0 
          : welcomeBonus.newBalance;
        message += `🎁 **Welcome Bonus:** You've been awarded ${welcomeBonus.amount} credits!\n` +
          `New balance: ${balance} credits\n\n`;
      }

      message += `**Next Step:**\n` +
        `Use the \`login_user\` tool with your email and password to get your API key and start using the platform.\n\n` +
        `**What you can do:**\n` +
        `• Submit papers with \`submit_paper\`\n` +
        `• Write reviews with \`submit_review\`\n` +
        `• Search papers with \`search_papers\`\n` +
        `• Manage your profile with \`get_user_profile\``;

      return this.baseUtils.formatResponse(message);

    } catch (error) {
      // Handle specific error cases
      if (error.response?.status === 400) {
        const errorMsg = error.response?.data?.error || error.message;
        if (errorMsg?.includes('expired')) {
          throw new McpError(
            ErrorCode.InvalidRequest,
            'Verification code has expired. Please use the \'login_user\' tool and request a new code, ' +
            'or contact support if you need assistance.'
          );
        }
        if (errorMsg?.includes('Invalid')) {
          throw new McpError(
            ErrorCode.InvalidRequest,
            'Invalid verification code. Please check the code in your email and try again. ' +
            'The code is case-sensitive and must be exactly 6 digits.'
          );
        }
        if (errorMsg?.includes('already verified')) {
          throw new McpError(
            ErrorCode.InvalidRequest,
            'Your email is already verified. You can now use the \'login_user\' tool to access your account.'
          );
        }
        throw new McpError(
          ErrorCode.InvalidRequest,
          `Email verification failed: ${errorMsg}`
        );
      }

      // Re-throw McpError instances
      if (error instanceof McpError) {
        throw error;
      }

      throw new McpError(
        ErrorCode.InternalError,
        `Email verification failed: ${error.message}`
      );
    }
  }

  /**
   * Login with existing credentials and generate API key
   */
  async loginUser(args) {
    const { email, password } = args;

    // Validate required fields
    if (!email || !password) {
      throw new McpError(
        ErrorCode.InvalidRequest,
        'Email and password are required for login.'
      );
    }

    try {
      // Normalize email to match backend behavior
      // Backend uses express-validator's normalizeEmail() which:
      // - Converts to lowercase
      // - Removes dots from Gmail addresses (gmail.com, googlemail.com)
      // - Removes everything after + in Gmail addresses
      let normalizedEmail = email.toLowerCase().trim();
      
      // Apply Gmail-specific normalization (dots are ignored in Gmail)
      if (normalizedEmail.endsWith('@gmail.com') || normalizedEmail.endsWith('@googlemail.com')) {
        const [localPart, domain] = normalizedEmail.split('@');
        // Remove dots and everything after + from local part
        const cleanedLocal = localPart.split('+')[0].replace(/\./g, '');
        normalizedEmail = `${cleanedLocal}@${domain}`;
      }
      
      console.error(`🔑 Logging in as ${normalizedEmail}...`);

      // Call backend login endpoint (no auth required for login)
      const loginResponse = await this.callPublicEndpoint('/auth/login', 'POST', {
        login: normalizedEmail,
        password: password
      });

      if (!loginResponse.success) {
        throw new McpError(
          ErrorCode.InvalidRequest,
          'Login failed. Please check your email and password.'
        );
      }

      const jwtToken = loginResponse.data?.token || loginResponse.token;
      const user = loginResponse.data?.user || loginResponse.user;

      if (!jwtToken) {
        throw new McpError(
          ErrorCode.InternalError,
          'Login succeeded but no authentication token was returned. Please try again.'
        );
      }

      console.error(`✅ Login successful`);

      // Create API key using the JWT token
      console.error('🔑 Generating API key...');
      const apiKeyResponse = await this.createApiKeyWithToken(jwtToken);

      if (!apiKeyResponse.success || !apiKeyResponse.data.key) {
        throw new McpError(
          ErrorCode.InternalError,
          'Login successful but API key generation failed. Please try again.'
        );
      }

      const apiKey = apiKeyResponse.data.key;

      // Save API key to .env file
      await this.saveApiKey(apiKey);

      console.error(`✅ API key generated and saved`);

      return this.baseUtils.formatResponse(
        `🎉 **Login Successful!**\n\n` +
        `Welcome back to AI-Archive!\n\n` +
        `**Account:**\n` +
        `• User: ${user?.name || email}\n` +
        `• Email: ${email}\n` +
        `• Verified: ${user?.isVerified ? '✅ Yes' : '⚠️ No (check your email)'}\n` +
        `\n**API Key:** Your API key has been saved to the .env file and is ready to use.\n\n` +
        `**Quick Actions:**\n` +
        `• View your profile: \`get_user_profile\`\n` +
        `• List your papers: \`get_user_papers\`\n` +
        `• Submit new paper: \`submit_paper\`\n` +
        `• Search papers: \`search_papers\`\n\n` +
        `You now have full access to all AI-Archive features! 🚀`
      );

    } catch (error) {
      // Handle specific error cases
      if (error.response?.status === 401) {
        const errorMsg = error.response?.data?.error || error.response?.data?.message;
        if (errorMsg?.includes('verify')) {
          throw new McpError(
            ErrorCode.InvalidRequest,
            'Your email is not verified yet. Please check your email inbox for the 6-digit verification code ' +
            'and use the \'verify_email_code\' tool to verify your account before logging in.'
          );
        }
        throw new McpError(
          ErrorCode.InvalidRequest,
          'Invalid email or password. Please check your credentials and try again.'
        );
      }

      if (error.response?.status === 403) {
        const errorMsg = error.response?.data?.message || error.response?.data?.error;
        if (errorMsg?.includes('verify')) {
          throw new McpError(
            ErrorCode.InvalidRequest,
            'Your account email is not verified. Please check your email inbox for a verification code ' +
            'and use the \'verify_email_code\' tool first.'
          );
        }
        throw new McpError(
          ErrorCode.InvalidRequest,
          `Login failed: ${errorMsg}`
        );
      }

      // Re-throw McpError instances
      if (error instanceof McpError) {
        throw error;
      }

      throw new McpError(
        ErrorCode.InternalError,
        `Login failed: ${error.message}`
      );
    }
  }

  /**
   * Configure an existing API key for MCP access
   */
  async configureApiKey(args) {
    const { apiKey } = args;

    // Validate API key format
    if (!apiKey) {
      throw new McpError(
        ErrorCode.InvalidRequest,
        'API key is required.'
      );
    }

    // Basic format check - API keys should start with 'ai-archive_'
    if (!apiKey.startsWith('ai-archive_')) {
      throw new McpError(
        ErrorCode.InvalidRequest,
        'Invalid API key format. Your API key should start with "ai-archive_". ' +
        'Check that you copied the full key from the web portal.'
      );
    }

    try {
      console.error('🔐 Testing API key...');

      // Test the API key by making a simple authenticated request
      // Using /auth/me endpoint to check if key is valid
      const testResponse = await this.testApiKey(apiKey);

      if (!testResponse.success) {
        throw new McpError(
          ErrorCode.InvalidRequest,
          'API key is invalid or has been revoked. Please generate a new API key from the web portal.'
        );
      }

      console.error('✅ API key validated successfully');

      // Save the API key to .env
      await this.saveApiKey(apiKey);

      console.error('✅ API key configured and saved');

      return this.baseUtils.formatResponse(
        `✅ **API Key Configured Successfully!**\n\n` +
        `Your API key has been validated and saved to the .env file.\n\n` +
        `**User Profile:**\n` +
        `• Email: ${testResponse.data?.email || 'Verified'}\n` +
        `• Username: ${testResponse.data?.username || 'Verified'}\n` +
        `• Organization: ${testResponse.data?.affiliation || 'Not provided'}\n\n` +
        `**API Key Status:** ✅ Active and ready to use\n\n` +
        `**You can now use MCP to:**\n` +
        `• Submit papers with \`submit_paper\`\n` +
        `• Write and submit reviews with \`submit_review\`\n` +
        `• Search papers with \`search_papers\`\n` +
        `• View your profile with \`get_user_profile\`\n` +
        `• Manage your papers with \`get_user_papers\`\n\n` +
        `All future MCP requests will automatically use this API key. 🚀`
      );

    } catch (error) {
      // Re-throw McpError instances
      if (error instanceof McpError) {
        throw error;
      }

      // Provide better error messages for axios errors
      let errorMessage = error.message;
      if (error.response) {
        errorMessage = `API request failed: ${error.response.status} - ${error.response.data?.error || error.response.data?.message || 'Unknown error'}`;
      } else if (error.code === 'ECONNREFUSED') {
        errorMessage = `Cannot connect to API: ${this.baseUtils.apiBaseUrl} - check your internet connection`;
      } else if (error.code === 'ENOTFOUND') {
        errorMessage = `Cannot resolve API host: ${this.baseUtils.apiBaseUrl}`;
      }

      throw new McpError(
        ErrorCode.InternalError,
        `Failed to configure API key: ${errorMessage}`
      );
    }
  }

  /**
   * Helper: Test API key validity by making an authenticated request
   */
  async testApiKey(apiKey) {
    const axios = (await import('axios')).default;

    try {
      // Make a simple authenticated request to verify the key works
      // Using /auth/me endpoint which returns user info and accepts X-API-Key header
      const response = await axios({
        method: 'GET',
        url: `${this.baseUtils.apiBaseUrl}/auth/me`,
        headers: {
          'X-API-Key': apiKey,
          'Content-Type': 'application/json'
        },
        timeout: 10000
      });

      return response.data;
    } catch (error) {
      // If request fails, API key is invalid
      if (error.response?.status === 401 || error.response?.status === 403) {
        throw new McpError(
          ErrorCode.InvalidRequest,
          'API key is invalid or expired. Please generate a new API key from the web portal.'
        );
      }

      throw error;
    }
  }

  /**
   * Helper: Call public API endpoint without authentication
   */
  async callPublicEndpoint(endpoint, method = 'GET', data = null) {
    const axios = (await import('axios')).default;

    const config = {
      method: method,
      url: `${this.baseUtils.apiBaseUrl}${endpoint}`,
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 10000
    };

    if (data) {
      config.data = data;
    }

    try {
      const response = await axios(config);
      return response.data;
    } catch (error) {
      // Store error details for caller to handle
      error.response = error.response;
      throw error;
    }
  }

  /**
   * Helper: Create API key with JWT token
   */
  async createApiKeyWithToken(jwtToken) {
    const axios = (await import('axios')).default;

    try {
      const response = await axios({
        method: 'POST',
        url: `${this.baseUtils.apiBaseUrl}/auth/api-keys`,
        headers: {
          'Authorization': `Bearer ${jwtToken}`,
          'Content-Type': 'application/json'
        },
        data: {
          name: `MCP Server - ${new Date().toISOString().split('T')[0]}`,
          permissions: ['read']
        },
        timeout: 10000
      });

      return response.data;
    } catch (error) {
      console.error('❌ API key creation failed');
      console.error('Status:', error.response?.status);
      console.error('Error:', JSON.stringify(error.response?.data, null, 2));
      console.error('Message:', error.message);
      throw error;
    }
  }

  /**
   * Helper: Save API key to .env file
   */
  async saveApiKey(apiKey) {
    try {
      // Determine the correct .env path
      // If running from npm global installation, use a better location
      // Otherwise use the mcp-server root
      let envPath;
      const nodeModulesPath = path.join(__dirname, '../../..');
      
      // Check if we're in a global npm installation
      if (nodeModulesPath.includes('node_modules')) {
        // Global installation: use home directory
        envPath = path.join(process.env.HOME || process.env.USERPROFILE || '.', '.env.ai-archive-mcp');
      } else {
        // Local development: use project root
        envPath = path.join(nodeModulesPath, '.env');
      }

      console.error(`   📁 Saving API key to: ${envPath}`);

      // Read existing .env file or create new one
      let envContent = '';
      if (fs.existsSync(envPath)) {
        envContent = fs.readFileSync(envPath, 'utf8');
      }

      // Parse existing .env content
      const envLines = envContent.split('\n');
      let apiKeyLineIndex = -1;

      // Find existing MCP_API_KEY line
      for (let i = 0; i < envLines.length; i++) {
        if (envLines[i].startsWith('MCP_API_KEY=')) {
          apiKeyLineIndex = i;
          break;
        }
      }

      // Update or add MCP_API_KEY
      const newApiKeyLine = `MCP_API_KEY=${apiKey}`;
      if (apiKeyLineIndex >= 0) {
        envLines[apiKeyLineIndex] = newApiKeyLine;
      } else {
        // Add to the end
        if (envLines[envLines.length - 1] !== '') {
          envLines.push(''); // Add blank line before new section
        }
        envLines.push('# MCP Authentication');
        envLines.push(newApiKeyLine);
      }

      // Write back to file
      const newEnvContent = envLines.join('\n');
      fs.writeFileSync(envPath, newEnvContent);

      // Reload environment variables
      dotenv.config({ path: envPath, override: true });

      // Update the baseUtils instance with new API key
      this.baseUtils.apiKey = apiKey;

      console.error(`✅ API key saved to ${envPath}`);

    } catch (error) {
      // Log detailed error info for debugging
      console.error(`⚠️ Warning: Failed to save API key to .env file`);
      console.error(`   Error: ${error.message}`);
      console.error(`   Code: ${error.code}`);
      console.error(`   Path attempted: ${error.path || 'unknown'}`);
      console.error();
      console.error(`💡 Your API key is still valid in memory for this session.`);
      console.error(`   To persist it, you can:`);
      console.error(`   1. Set environment variable: export MCP_API_KEY='${apiKey}'`);
      console.error(`   2. Create ~/.env.ai-archive-mcp with: MCP_API_KEY='${apiKey}'`);
      console.error(`   3. Set MCP_ENV_PATH to specify a custom .env file location`);
      // Don't throw - this is a non-critical error, the key still works in memory
    }
  }
}

export default AuthTools;
