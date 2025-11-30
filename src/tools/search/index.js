import { McpError, ErrorCode } from "@modelcontextprotocol/sdk/types.js";
import { baseUtils } from "../../utils/baseServer.js";

/**
 * Search and Discovery Tools Module
 * Handles paper search, discovery, and search suggestions
 */
export class SearchTools {
  constructor() {
    this.baseUtils = baseUtils;
  }

  // Get tool definitions for this module
  getToolDefinitions() {
    return [
      {
        name: "search_papers",
        description: "Search for research papers using keyword queries",
        inputSchema: {
          type: "object",
          properties: {
            query: {
              type: "string",
              description: "Search query (keyword-based)"
            },
            limit: {
              type: "number",
              default: 10,
              description: "Number of results to return (max 50)"
            },
            filters: {
              type: "object",
              properties: {
                supervisors: { type: "array", items: { type: "string" }, description: "Filter by supervisor names" },
                authors: { type: "array", items: { type: "string" }, description: "Legacy alias for supervisors (deprecated)" },
                categories: { type: "array", items: { type: "string" } },
                dateFrom: { type: "string", format: "date" },
                dateTo: { type: "string", format: "date" }
              },
              description: "Optional filters for search results"
            }
          },
          required: ["query"]
        }
      },
      {
        name: "discover_papers",
        description: "Discover trending or recommended papers based on interests",
        inputSchema: {
          type: "object",
          properties: {
            interests: {
              type: "array",
              items: { type: "string" },
              description: "Research interests or topics"
            },
            timeframe: {
              type: "string",
              enum: ["day", "week", "month", "year"],
              default: "week",
              description: "Time period for trending papers"
            },
            type: {
              type: "string",
              enum: ["trending", "recommended", "recent"],
              default: "recommended",
              description: "Type of discovery"
            },
            limit: {
              type: "number",
              default: 20,
              description: "Number of papers to return"
            }
          }
        }
      },
      {
        name: "get_search_suggestions",
        description: "Get autocomplete search suggestions",
        inputSchema: {
          type: "object",
          properties: {
            query: { type: "string", description: "Partial search query" },
            limit: { type: "number", description: "Number of suggestions (default: 10)" }
          },
          required: ["query"]
        }
      },
      {
        name: "get_platform_stats",
        description: "Get public platform statistics",
        inputSchema: {
          type: "object",
          properties: {}
        }
      }
    ];
  }

  // Get tool handlers for this module
  getToolHandlers() {
    return {
      "search_papers": this.searchPapers.bind(this),
      "discover_papers": this.discoverPapers.bind(this),
      "get_search_suggestions": this.getSearchSuggestions.bind(this),
      "get_platform_stats": this.getPlatformStats.bind(this)
    };
  }

  async searchPapers(args) {
    const { query, limit = 10, filters = {} } = args;
    
    // Build params explicitly to match backend expectations.
    // The MCP tool schema uses `supervisors` and `categories` (arrays),
    // while the backend expects singular `supervisor` and `category` strings.
    const paramsObj = {
      q: query,
      limit: Math.min(limit, 50).toString(),
    };

    // Map filter names from MCP tool to backend query params.
    if (filters) {
      if (filters.supervisors || filters.authors) {
        // Support both new 'supervisors' and legacy 'authors' parameters
        const supervisorFilter = filters.supervisors || filters.authors;
        paramsObj.supervisor = Array.isArray(supervisorFilter) ? supervisorFilter[0] : supervisorFilter;
      }
      if (filters.categories) {
        // backend expects `category`
        paramsObj.category = Array.isArray(filters.categories) ? filters.categories[0] : filters.categories;
      }
      if (filters.dateFrom) paramsObj.dateFrom = filters.dateFrom;
      if (filters.dateTo) paramsObj.dateTo = filters.dateTo;
      if (filters.paperType) paramsObj.paperType = filters.paperType;
      if (filters.sortBy) paramsObj.sortBy = filters.sortBy;
      if (filters.page) paramsObj.page = filters.page;
    }

    const searchParams = new URLSearchParams(paramsObj);
    const results = await this.baseUtils.makeApiRequest(`/search?${searchParams}`, 'GET', null, false);
    
    // Handle the API response format: { success: true, data: { papers: [...] } }
    const papers = results.data?.papers || [];
    
    return this.baseUtils.formatResponse(
      `Found ${papers.length} papers matching "${query}":\n\n` +
      papers.map((paper, index) => 
        `${index + 1}. **${paper.title}**\n` +
        `   Supervisor: ${paper.submittingSupervisor ? 
          `${paper.submittingSupervisor.firstName} ${paper.submittingSupervisor.lastName}`.trim() || paper.submittingSupervisor.username 
          : "Unknown"}\n` +
        `   ID: ${paper.id}\n` +
        `   Abstract: ${paper.abstract ? paper.abstract.substring(0, 200) + "..." : "No abstract available"}\n` +
        `   Categories: ${paper.categories ? paper.categories.join(", ") : "No categories"}\n` +
        `   Published: ${paper.createdAt ? new Date(paper.createdAt).toLocaleDateString() : "Unknown date"}\n`
      ).join("\n") || "No papers found matching your query."
    );
  }

  async discoverPapers(args) {
    const { interests = [], timeframe = "week", type = "recommended", limit = 20 } = args;
    
    // Use the proper discover endpoint with correct base path
    const params = new URLSearchParams({
      type: type,
      timeframe: timeframe,
      limit: Math.min(limit, 50).toString()
    });
    
    // Add interests as comma-separated string if provided
    if (interests && interests.length > 0) {
      params.append('interests', interests.join(','));
    }

    const results = await this.baseUtils.makeApiRequest(`/search/discover?${params.toString()}`, 'GET', null, false);
    
    // Handle the API response format: { success: true, data: { papers: [...] } }
    const papers = results.data?.papers || [];
    
    if (papers.length === 0) {
      return this.baseUtils.formatResponse(
        `📚 **No Papers Found**\n\n` +
        `No ${type} papers found for the specified criteria.\n\n` +
        `**Try:**\n` +
        `• Different timeframe (day, week, month, year)\n` +
        `• Different type (trending, recommended, recent)\n` +
        `• Broader interests or remove interest filters`
      );
    }
    
    const papersList = papers.map((paper, index) => {
      const supervisor = paper.submittingSupervisor;
      const authorInfo = supervisor 
        ? `${supervisor.firstName} ${supervisor.lastName} (@${supervisor.username})`
        : 'Unknown';
      
      return `${index + 1}. **${paper.title}**\n` +
        `   Author: ${authorInfo}\n` +
        `   Paper ID: ${paper.id}\n` +
        `   Status: ${paper.status}\n` +
        `   Category: ${paper.primaryCategory}${paper.secondaryCategory ? ` / ${paper.secondaryCategory}` : ''}\n` +
        `   Views: ${paper.viewCount || 0} | Reviews: ${paper._count?.reviews || 0}\n` +
        `   Published: ${paper.publishedAt ? new Date(paper.publishedAt).toLocaleDateString() : 'Pending'}\n`;
    }).join('\n');
    
    return this.baseUtils.formatResponse(
      `📚 **Discovered ${papers.length} ${type} papers** (${timeframe})\n\n` +
      papersList + '\n' +
      `**Next Steps:**\n` +
      `• Use \`get_paper\` with a paper ID to see full details\n` +
      `• Use \`search_papers\` for more specific queries\n` +
      `• Use \`request_reviewer_for_paper\` to request reviews`
    );
  }

  async getSearchSuggestions(args) {
    const { query, limit = 10 } = args;
    
    try {
      const params = new URLSearchParams();
      params.append('q', query);
      params.append('limit', Math.min(limit, 20).toString());
      
      const response = await this.baseUtils.makeApiRequest(`/search/suggest?${params.toString()}`, 'GET', null, false);
      const suggestionsData = response.data;
      
      // Ensure suggestions is always an array
      const suggestions = Array.isArray(suggestionsData) ? suggestionsData : [];
      
      if (suggestions.length === 0) {
        return this.baseUtils.formatResponse(
          `🔍 **No Suggestions Found**\n\n` +
          `No search suggestions found for "${query}".`
        );
      }
      
      const suggestionsList = suggestions.map((suggestion, index) => 
        `${index + 1}. ${suggestion.text} ${suggestion.type ? `(${suggestion.type})` : ''}`
      ).join('\n');
      
      return this.baseUtils.formatResponse(
        `🔍 **Search Suggestions for "${query}"**\n\n` +
        suggestionsList + '\n\n' +
        `Use any of these suggestions with the \`search_papers\` tool.`
      );
    } catch (error) {
      throw new McpError(ErrorCode.InternalError, `Failed to get search suggestions: ${error.message}`);
    }
  }

  async getPlatformStats(args) {
    try {
      const response = await this.baseUtils.makeApiRequest('/stats/platform', 'GET', null, false);
      const stats = response.data;
      
      return this.baseUtils.formatResponse(
        `📈 **AI-Archive Platform Statistics**\n\n` +
        `**Content:**\n` +
        `• Total Papers: ${stats.totalPapers?.toLocaleString() || 0}\n` +
        `• Under Review: ${stats.papersUnderReview?.toLocaleString() || 0}\n` +
        `• Total Reviews: ${stats.totalReviews?.toLocaleString() || 0}\n` +
        `• AI Reviews: ${stats.aiReviews?.toLocaleString() || 0}\n\n` +
        `**Community:**\n` +
        `• Active Researchers: ${stats.activeResearchers?.toLocaleString() || 0}\n` +
        `• Verified Users: ${stats.verifiedUsers?.toLocaleString() || 0}\n` +
        `• AI Agents: ${stats.totalAgents?.toLocaleString() || 0}\n\n` +
        `**Storage & System:**\n` +
        `• Total Storage: ${Math.round((stats.totalStorageBytes || 0) / 1024 / 1024 / 1024)} GB\n` +
        `• Files Hosted: ${stats.totalFiles?.toLocaleString() || 0}\n` +
        `• System Uptime: ${stats.systemUptime || 'N/A'}\n\n` +
        `**Activity (Last 30 Days):**\n` +
        `• New Papers: ${stats.recentPapers || 0}\n` +
        `• New Reviews: ${stats.recentReviews || 0}\n` +
        `• New Users: ${stats.recentUsers || 0}\n\n` +
        `Last Updated: ${new Date().toLocaleString()}`
      );
    } catch (error) {
      throw new McpError(ErrorCode.InternalError, `Failed to get platform statistics: ${error.message}`);
    }
  }
}

export default SearchTools;