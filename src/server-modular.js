#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
  McpError,
  ErrorCode,
} from "@modelcontextprotocol/sdk/types.js";
import { ToolLoader } from "./utils/toolLoader.js";
import { getPlatformAlignmentMessage } from "./utils/platformAlignment.js";

/**
 * AI-Archive MCP Server (Modular Version)
 * 
 * This is the main server entry point that coordinates multiple tool modules:
 * - Search and Discovery
 * - Paper Management  
 * - AI Agent Management
 * - Review System
 * - Citation Analysis
 * - Marketplace Operations
 * - User Management
 * 
 * Each module can be enabled/disabled via tools-config.json
 */
class AIarchiveMCPServer {
  constructor() {
    this.server = new Server(
      {
        name: "ai-archive-mcp-server",
        version: "2.0.0", // Updated version for modular architecture
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    // Initialize the tool loader
    this.toolLoader = new ToolLoader();
    this.tools = [];
    this.handlers = {};

    this.setupServerHandlers();
  }

  async initialize() {
    const isQuiet = process.env.MCP_QUIET === 'true';
    
    if (!isQuiet) {
      console.error(`🚀 Initializing AI-Archive MCP Server v2.0.0 (Modular)`);
      
      // Display platform alignment message on startup
      console.error('\n' + getPlatformAlignmentMessage('brief') + '\n');
    }
    
    try {
      // Load all enabled modules
      const { tools, handlers } = await this.toolLoader.loadAllModules();
      
      this.tools = tools;
      this.handlers = handlers;

      // Validate all loaded tools
      this.toolLoader.validateAllTools();
      
      // Print load summary (only if not quiet)
      if (!isQuiet) {
        this.toolLoader.printLoadSummary();
      }
      
      if (!isQuiet) {
        console.error(`✅ Server initialization complete`);
      }
      
    } catch (error) {
      console.error(`❌ Server initialization failed: ${error.message}`);
      throw error;
    }
  }

  logStartup() {
    const isQuiet = process.env.MCP_QUIET === 'true';
    if (!isQuiet) {
      console.error(`🌟 AI-Archive MCP Server running on stdio`);
      console.error(`📊 Serving ${this.tools.length} tools from ${this.toolLoader.modules.size} modules`);
      console.error('');
    }
  }

  setupServerHandlers() {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: this.tools
      };
    });

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        // Find the handler for this tool
        const handler = this.handlers[name];
        
        if (!handler) {
          throw new McpError(
            ErrorCode.MethodNotFound,
            `Unknown tool: ${name}`
          );
        }

        // Execute the tool handler
        const result = await handler(args);
        return result;
        
      } catch (error) {
        console.error(`❌ Tool execution failed for ${name}:`, error.message);
        
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

  // Server lifecycle methods
  async start() {
    try {
      // Initialize modules first
      await this.initialize();
      
      // Connect to stdio transport
      const transport = new StdioServerTransport();
      await this.server.connect(transport);
      
      console.error(`🌟 AI-Archive MCP Server running on stdio`);
      console.error(`📊 Serving ${this.tools.length} tools from ${this.toolLoader.getLoadedModules().length} modules`);
      
    } catch (error) {
      console.error(`💥 Failed to start server: ${error.message}`);
      process.exit(1);
    }
  }

  // Debug and management methods
  getServerInfo() {
    return {
      name: "ai-archive-mcp-server",
      version: "2.0.0",
      architecture: "modular",
      stats: this.toolLoader.getStats(),
      modules: this.toolLoader.getAllModuleInfo(),
      environment: process.env.NODE_ENV || 'production'
    };
  }

  async shutdown() {
    console.error(`🛑 Shutting down AI-Archive MCP Server...`);
    
    try {
      // Perform any cleanup needed by modules
      // (This could be extended to call cleanup methods on modules)
      
      console.error(`✅ Server shutdown complete`);
    } catch (error) {
      console.error(`⚠️ Error during shutdown: ${error.message}`);
    }
  }
}

// Error handling for the server process
process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  console.error('💥 Uncaught Exception:', error);
  process.exit(1);
});

// Graceful shutdown handling
process.on('SIGINT', async () => {
  console.error('\\n⚡ Received SIGINT, initiating graceful shutdown...');
  if (global.mcpServer) {
    await global.mcpServer.shutdown();
  }
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.error('\\n⚡ Received SIGTERM, initiating graceful shutdown...');
  if (global.mcpServer) {
    await global.mcpServer.shutdown();
  }
  process.exit(0);
});

// Start the server
const server = new AIarchiveMCPServer();
global.mcpServer = server; // Store reference for shutdown handling

server.start().catch((error) => {
  console.error(`💥 Server startup failed: ${error.message}`);
  process.exit(1);
});

export default AIarchiveMCPServer;