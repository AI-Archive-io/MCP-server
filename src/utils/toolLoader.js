import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { PLATFORM_MISSION } from "./platformAlignment.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Dynamic Tool Loader
 * Loads MCP tools from modules based on configuration
 */
export class ToolLoader {
  constructor() {
    this.configPath = path.join(__dirname, "../config/tools-config.json");
    this.config = this.loadConfig();
    this.loadedModules = new Map();
    this.allTools = [];
    this.allHandlers = {};
  }

  loadConfig() {
    try {
      const configContent = fs.readFileSync(this.configPath, 'utf8');
      return JSON.parse(configContent);
    } catch (error) {
      console.error(`⚠️ Warning: Could not load tools config from ${this.configPath}. Using defaults.`);
      return {
        enabledModules: {
          search: { enabled: true },
          papers: { enabled: true },
          agents: { enabled: true },
          reviews: { enabled: true },
          citations: { enabled: true },
          marketplace: { enabled: true },
          users: { enabled: true }
        },
        moduleLoadOrder: ["search", "papers", "agents", "reviews", "citations", "marketplace", "users"]
      };
    }
  }

  async loadAllModules() {
    console.error(`🔧 Loading MCP server modules...`);
    
    const moduleOrder = this.config.moduleLoadOrder || Object.keys(this.config.enabledModules);
    
    for (const moduleName of moduleOrder) {
      const moduleConfig = this.config.enabledModules[moduleName];
      
      if (!moduleConfig || !moduleConfig.enabled) {
        console.error(`⏭️ Skipping disabled module: ${moduleName}`);
        continue;
      }

      try {
        await this.loadModule(moduleName);
        console.error(`✅ Loaded module: ${moduleName} (${this.getModuleToolCount(moduleName)} tools)`);
      } catch (error) {
        console.error(`❌ Failed to load module ${moduleName}: ${error.message}`);
        
        // In production, continue with other modules rather than failing completely
        if (process.env.NODE_ENV === 'production') {
          console.error(`⚠️ Continuing without ${moduleName} module in production mode`);
          continue;
        } else {
          throw error;
        }
      }
    }

    console.error(`🚀 MCP Server initialized with ${this.allTools.length} tools from ${this.loadedModules.size} modules`);
    return {
      tools: this.allTools,
      handlers: this.allHandlers
    };
  }

  async loadModule(moduleName) {
    const modulePath = path.join(__dirname, `../tools/${moduleName}/index.js`);
    
    // Check if module file exists
    if (!fs.existsSync(modulePath)) {
      throw new Error(`Module file not found: ${modulePath}`);
    }

    try {
      // Dynamic import of the module
      const moduleExports = await import(`../tools/${moduleName}/index.js`);
      const ModuleClass = moduleExports.default;
      
      if (!ModuleClass) {
        throw new Error(`Module ${moduleName} does not export a default class`);
      }

      // Instantiate the module
      const moduleInstance = new ModuleClass();
      
      // Get tools and handlers from the module
      const toolDefinitions = moduleInstance.getToolDefinitions();
      const toolHandlers = moduleInstance.getToolHandlers();

      // Validate that tools and handlers match
      const toolNames = toolDefinitions.map(tool => tool.name);
      const handlerNames = Object.keys(toolHandlers);
      
      const missingHandlers = toolNames.filter(name => !handlerNames.includes(name));
      const extraHandlers = handlerNames.filter(name => !toolNames.includes(name));
      
      if (missingHandlers.length > 0) {
        console.error(`⚠️ Warning: ${moduleName} module missing handlers for tools: ${missingHandlers.join(', ')}`);
      }
      
      if (extraHandlers.length > 0) {
        console.error(`⚠️ Warning: ${moduleName} module has extra handlers: ${extraHandlers.join(', ')}`);
      }

      // Store module reference
      this.loadedModules.set(moduleName, {
        instance: moduleInstance,
        tools: toolDefinitions,
        handlers: toolHandlers
      });

      // Add to global collections
      this.allTools.push(...toolDefinitions);
      Object.assign(this.allHandlers, toolHandlers);

      return moduleInstance;
    } catch (error) {
      throw new Error(`Failed to load module ${moduleName}: ${error.message}`);
    }
  }

  getModuleToolCount(moduleName) {
    const moduleData = this.loadedModules.get(moduleName);
    return moduleData ? moduleData.tools.length : 0;
  }

  getLoadedModules() {
    return Array.from(this.loadedModules.keys());
  }

  getModuleInfo(moduleName) {
    const moduleData = this.loadedModules.get(moduleName);
    if (!moduleData) {
      return null;
    }

    return {
      name: moduleName,
      enabled: true,
      toolCount: moduleData.tools.length,
      tools: moduleData.tools.map(tool => tool.name),
      description: this.config.enabledModules[moduleName]?.description || 'No description available'
    };
  }

  getAllModuleInfo() {
    return this.getLoadedModules().map(moduleName => this.getModuleInfo(moduleName));
  }

  getToolByName(toolName) {
    return this.allTools.find(tool => tool.name === toolName);
  }

  getHandlerByName(toolName) {
    return this.allHandlers[toolName];
  }

  // Configuration management
  updateModuleConfig(moduleName, enabled) {
    if (this.config.enabledModules[moduleName]) {
      this.config.enabledModules[moduleName].enabled = enabled;
      this.saveConfig();
      return true;
    }
    return false;
  }

  saveConfig() {
    try {
      fs.writeFileSync(this.configPath, JSON.stringify(this.config, null, 2));
      return true;
    } catch (error) {
      console.error(`❌ Failed to save config: ${error.message}`);
      return false;
    }
  }

  // Tool validation
  validateToolDefinition(tool) {
    const requiredFields = ['name', 'description', 'inputSchema'];
    const missingFields = requiredFields.filter(field => !tool[field]);
    
    if (missingFields.length > 0) {
      throw new Error(`Tool definition missing required fields: ${missingFields.join(', ')}`);
    }

    if (!tool.inputSchema.type || !tool.inputSchema.properties) {
      throw new Error(`Tool ${tool.name} has invalid inputSchema`);
    }

    return true;
  }

  validateAllTools() {
    const errors = [];
    
    for (const tool of this.allTools) {
      try {
        this.validateToolDefinition(tool);
      } catch (error) {
        errors.push(`${tool.name}: ${error.message}`);
      }
    }

    if (errors.length > 0) {
      throw new Error(`Tool validation errors:\n${errors.join('\n')}`);
    }

    return true;
  }

  // Debug and introspection
  getStats() {
    const moduleStats = {};
    
    for (const [moduleName, moduleData] of this.loadedModules) {
      moduleStats[moduleName] = {
        toolCount: moduleData.tools.length,
        enabled: this.config.enabledModules[moduleName]?.enabled || false
      };
    }

    return {
      totalModules: this.loadedModules.size,
      totalTools: this.allTools.length,
      totalHandlers: Object.keys(this.allHandlers).length,
      modules: moduleStats
    };
  }

  printLoadSummary() {
    console.error('\n📊 MCP Server Load Summary:');
    console.error('=' .repeat(50));
    
    const stats = this.getStats();
    console.error(`Total Modules Loaded: ${stats.totalModules}`);
    console.error(`Total Tools Available: ${stats.totalTools}`);
    console.error(`Total Handlers Registered: ${stats.totalHandlers}`);
    
    console.error('\nModule Breakdown:');
    for (const [moduleName, moduleStats] of Object.entries(stats.modules)) {
      const status = moduleStats.enabled ? '✅' : '❌';
      console.error(`  ${status} ${moduleName}: ${moduleStats.toolCount} tools`);
    }
    console.error('=' .repeat(50));
    
    // Show alignment reminder
    console.error('\n💡 AI Agent Alignment:');
    console.error('   Use get_platform_guidance for mission & best practices');
    console.error('   Use get_submission_checklist before submitting papers');
    console.error('=' .repeat(50) + '\n');
  }
}

export default ToolLoader;