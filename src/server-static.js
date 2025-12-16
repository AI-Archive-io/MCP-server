#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
  ErrorCode,
  McpError
} from "@modelcontextprotocol/sdk/types.js";
import { getPlatformAlignmentMessage } from "./utils/platformAlignment.js";

// Static imports of all tool modules
import SearchModule from "./tools/search/index.js";
import PapersModule from "./tools/papers/index.js";
import AgentsModule from "./tools/agents/index.js";
import ReviewsModule from "./tools/reviews/index.js";
import CitationsModule from "./tools/citations/index.js";
import MarketplaceModule from "./tools/marketplace/index.js";
import UsersModule from "./tools/users/index.js";
import AuthModule from "./tools/auth/index.js";
import PlatformModule from "./tools/platform/index.js";
import CreditsModule from "./tools/credits/index.js";

/**
 * AI-Archive MCP Server (Static Build)
 * All modules imported statically for bundling
 */
class AIarchiveMCPServer {
  constructor() {
    this.server = new Server(
      {
        name: "ai-archive-mcp-server",
        version: "2.0.0",
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.tools = [];
    this.handlers = {};
    this.setupServerHandlers();
  }

  async initialize() {
    const isQuiet = process.env.MCP_QUIET === 'true';

    if (!isQuiet) {
      console.error(getPlatformAlignmentMessage());
      console.error(`🔧 Loading MCP server modules...`);
    }

    // Load all modules statically
    const modules = [
      { name: 'search', Class: SearchModule },
      { name: 'papers', Class: PapersModule },
      { name: 'agents', Class: AgentsModule },
      { name: 'reviews', Class: ReviewsModule },
      { name: 'citations', Class: CitationsModule },
      { name: 'marketplace', Class: MarketplaceModule },
      { name: 'users', Class: UsersModule },
      { name: 'auth', Class: AuthModule },
      { name: 'platform', Class: PlatformModule },
      { name: 'credits', Class: CreditsModule }
    ];

    for (const { name, Class } of modules) {
      try {
        const instance = new Class();
        const tools = instance.getToolDefinitions();
        const handlers = instance.getToolHandlers();

        this.tools.push(...tools);
        Object.assign(this.handlers, handlers);

        if (!isQuiet) {
          console.error(`✅ Loaded module: ${name} (${tools.length} tools)`);
        }
      } catch (error) {
        console.error(`❌ Failed to load module ${name}: ${error.message}`);
      }
    }

    if (!isQuiet) {
      console.error(`🚀 MCP Server initialized with ${this.tools.length} tools`);

      // Show configuration
      const apiKey = process.env.MCP_API_KEY || process.env.API_KEY;
      const authToken = process.env.AI_ARCHIVE_AUTH_TOKEN;
      const hasAuth = !!apiKey || !!authToken;

      console.error(`🔧 MCP Server Configuration:`);
      console.error(`   Environment: ${process.env.NODE_ENV || 'production'}`);
      console.error(`   API URL: ${process.env.API_BASE_URL || 'https://ai-archive.io/api/v1'}`);
      console.error(`   Authentication: ${apiKey ? '✅ API Key' : (authToken ? '✅ Injected Token' : '⚠️ Anonymous (limited features)')}`)

      if (apiKey) {
        console.error(`✅ Full access enabled with API key`);
      } else if (authToken) {
        console.error(`✅ Full access enabled with Injected Auth Token`);
      } else {
        console.error(`⚠️ Limited read-only access without API key`);
      }
    }
  }

  setupServerHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: this.tools,
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      const handler = this.handlers[name];
      if (!handler) {
        throw new McpError(
          ErrorCode.MethodNotFound,
          `Unknown tool: ${name}`
        );
      }

      try {
        const result = await handler(args || {});
        return result;
      } catch (error) {
        if (error instanceof McpError) {
          throw error;
        }

        throw new McpError(
          ErrorCode.InternalError,
          `Tool execution failed: ${error.message}`
        );
      }
    });
  }

  async start() {
    try {
      await this.initialize();

      const transport = new StdioServerTransport();
      await this.server.connect(transport);

      console.error(`🌟 AI-Archive MCP Server running on stdio`);
      console.error(`📊 Serving ${this.tools.length} tools`);

    } catch (error) {
      console.error(`💥 Failed to start server: ${error.message}`);
      process.exit(1);
    }
  }
}

// Error handling
process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 Unhandled Rejection:', reason);
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  console.error('💥 Uncaught Exception:', error);
  process.exit(1);
});

process.on('SIGINT', async () => {
  console.error('\\n⚡ Received SIGINT, shutting down...');
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.error('\\n⚡ Received SIGTERM, shutting down...');
  process.exit(0);
});

// Start the server
const server = new AIarchiveMCPServer();
server.start();

export default AIarchiveMCPServer;
