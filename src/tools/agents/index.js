import { McpError, ErrorCode } from "@modelcontextprotocol/sdk/types.js";
import { baseUtils } from "../../utils/baseServer.js";

/**
 * AI Agent Management Tools Module
 * Handles creation, updating, and listing of AI agents under supervisor control
 */
export class AgentTools {
  constructor() {
    this.baseUtils = baseUtils;
  }

  // Get tool definitions for this module
  getToolDefinitions() {
    return [
      {
        name: "get_agents",
        description: "Get all agents managed by the authenticated supervisor",
        inputSchema: {
          type: "object",
          properties: {}
        }
      },
      {
        name: "create_agent",
        description: "Create a new AI agent under supervisor management. RECOMMENDED: Provide model and systemPrompt to define agent behavior clearly. Ask user about the agent's purpose and capabilities.",
        inputSchema: {
          type: "object",
          properties: {
            name: {
              type: "string",
              description: "Human-readable name for the agent"
            },
            model: {
              type: "string",
              description: "RECOMMENDED: AI model used (e.g., 'gpt-4', 'claude-3-opus', 'claude-3.5-sonnet'). Helps users understand agent capabilities."
            },
            systemPrompt: {
              type: "string",
              description: "RECOMMENDED: System prompt defining the agent's behavior, expertise, and review style. A well-defined prompt ensures consistent, high-quality output."
            },
            additionalInfo: {
              type: "string",
              description: "Additional configuration or description (e.g., specializations, limitations, intended use cases)."
            }
          },
          required: ["name"]
        }
      },
      {
        name: "update_agent",
        description: "Update an existing agent's configuration",
        inputSchema: {
          type: "object",
          properties: {
            agentId: {
              type: "string",
              description: "ID of the agent to update"
            },
            name: {
              type: "string",
              description: "Human-readable name for the agent"
            },
            model: {
              type: "string",
              description: "AI model used"
            },
            systemPrompt: {
              type: "string",
              description: "System prompt defining the agent's behavior"
            },
            additionalInfo: {
              type: "string",
              description: "Additional configuration or description"
            },
            isActive: {
              type: "boolean",
              description: "Whether the agent is active"
            }
          },
          required: ["agentId"]
        }
      }
    ];
  }

  // Get tool handlers for this module
  getToolHandlers() {
    return {
      "get_agents": this.getAgents.bind(this),
      "create_agent": this.createAgent.bind(this),
      "update_agent": this.updateAgent.bind(this)
    };
  }

  async getAgents(args) {
    try {
      const response = await this.baseUtils.makeApiRequest('/agents');
      const agents = response.data || [];
      
      return this.baseUtils.formatResponse(
        `You have ${agents.length} agents:\n\n` +
        agents.map((agent, index) => 
          `${index + 1}. **${agent.name}** (ID: ${agent.id})\n` +
          `   Model: ${agent.model || 'Not specified'}\n` +
          `   Default: ${agent.isDefault ? 'Yes' : 'No'}\n` +
          `   Active: ${agent.isActive ? 'Yes' : 'No'}\n` +
          `   Created: ${new Date(agent.createdAt).toLocaleDateString()}\n` +
          `   ${agent.systemPrompt ? 'System Prompt: ' + agent.systemPrompt.substring(0, 100) + '...' : 'No system prompt'}\n`
        ).join('\n') || 'No agents found.'
      );
    } catch (error) {
      throw new McpError(ErrorCode.InternalError, `Failed to get agents: ${error.message}`);
    }
  }

  async createAgent(args) {
    const { name, model, systemPrompt, additionalInfo } = args;
    
    try {
      const response = await this.baseUtils.makeApiRequest('/agents', 'POST', {
        name,
        model,
        systemPrompt,
        additionalInfo
      });
      
      const agent = response.data;
      
      return this.baseUtils.formatResponse(
        `✅ Agent "${agent.name}" created successfully!\n\n` +
        `**Agent Details:**\n` +
        `- ID: ${agent.id}\n` +
        `- Name: ${agent.name}\n` +
        `- Model: ${agent.model || 'Not specified'}\n` +
        `- Active: ${agent.isActive ? 'Yes' : 'No'}\n` +
        `- Created: ${new Date(agent.createdAt).toLocaleDateString()}\n\n` +
        `You can now use this agent when submitting papers by including its ID in the selectedAgentIds parameter.`
      );
    } catch (error) {
      throw new McpError(ErrorCode.InternalError, `Failed to create agent: ${error.message}`);
    }
  }

  async updateAgent(args) {
    const { agentId, ...updateData } = args;
    
    try {
      const response = await this.baseUtils.makeApiRequest(`/agents/${agentId}`, 'PUT', updateData);
      
      const agent = response.data;
      
      return this.baseUtils.formatResponse(
        `✅ Agent "${agent.name}" updated successfully!\n\n` +
        `**Updated Agent Details:**\n` +
        `- ID: ${agent.id}\n` +
        `- Name: ${agent.name}\n` +
        `- Model: ${agent.model || 'Not specified'}\n` +
        `- Active: ${agent.isActive ? 'Yes' : 'No'}\n` +
        `- Last Updated: ${new Date(agent.updatedAt).toLocaleDateString()}`
      );
    } catch (error) {
      throw new McpError(ErrorCode.InternalError, `Failed to update agent: ${error.message}`);
    }
  }
}

export default AgentTools;