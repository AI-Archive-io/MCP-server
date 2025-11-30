import { McpError, ErrorCode } from "@modelcontextprotocol/sdk/types.js";
import { baseUtils } from "../../utils/baseServer.js";

/**
 * Citation Analysis Tools Module
 * Handles citations, references, citation graphs, and citation statistics
 */
export class CitationTools {
  constructor() {
    this.baseUtils = baseUtils;
  }

  // Get tool definitions for this module
  getToolDefinitions() {
    return [
      {
        name: "get_citations",
        description: "Get citation data for papers in various formats",
        inputSchema: {
          type: "object",
          properties: {
            paperId: {
              type: "string",
              description: "Single paper ID to cite"
            },
            paperIds: {
              type: "array",
              items: { type: "string" },
              description: "List of paper IDs to cite (alternative to paperId)"
            },
            format: {
              type: "string",
              enum: ["bibtex", "apa", "mla", "chicago", "harvard", "ieee"],
              default: "bibtex",
              description: "Citation format"
            }
          },
          description: "Either paperId (single) or paperIds (multiple) must be provided"
        }
      },
      {
        name: "get_citing_papers",
        description: "Get papers that cite a specific paper",
        inputSchema: {
          type: "object",
          properties: {
            paperId: { type: "string", description: "ID of paper to find citations for" },
            page: { type: "number", description: "Page number (default: 1)" },
            limit: { type: "number", description: "Results per page (default: 20)" }
          },
          required: ["paperId"]
        }
      },
      {
        name: "get_paper_references",
        description: "Get papers referenced by a specific paper",
        inputSchema: {
          type: "object",
          properties: {
            paperId: { type: "string", description: "ID of paper to get references for" },
            page: { type: "number", description: "Page number (default: 1)" },
            limit: { type: "number", description: "Results per page (default: 20)" }
          },
          required: ["paperId"]
        }
      },
      {
        name: "get_citation_graph",
        description: "Get citation network graph for a paper",
        inputSchema: {
          type: "object",
          properties: {
            paperId: { type: "string", description: "ID of paper to get citation graph for" },
            depth: { type: "number", description: "Graph depth (default: 2)" }
          },
          required: ["paperId"]
        }
      },
      {
        name: "get_citation_stats",
        description: "Get detailed citation statistics for a paper",
        inputSchema: {
          type: "object",
          properties: {
            paperId: { type: "string", description: "ID of paper to get citation stats for" }
          },
          required: ["paperId"]
        }
      }
    ];
  }

  // Get tool handlers for this module
  getToolHandlers() {
    return {
      "get_citations": this.getCitations.bind(this),
      "get_citing_papers": this.getCitingPapers.bind(this),
      "get_paper_references": this.getPaperReferences.bind(this),
      "get_citation_graph": this.getCitationGraph.bind(this),
      "get_citation_stats": this.getCitationStats.bind(this)
    };
  }

  async getCitations(args) {
    const { paperId, paperIds, format = "bibtex" } = args;
    
    // Handle single paperId or multiple paperIds
    const ids = paperId ? [paperId] : (paperIds || []);
    
    if (ids.length === 0) {
      throw new McpError(
        ErrorCode.InvalidParams,
        'Either paperId or paperIds must be provided'
      );
    }

    const citations = [];
    for (const id of ids) {
      try {
        const citation = await this.baseUtils.makeApiRequest(`/citations/${id}?format=${format}`, 'GET', null, false);
        citations.push(citation.citation);
      } catch (error) {
        citations.push(`Error getting citation for paper ${id}: ${error.message}`);
      }
    }

    return this.baseUtils.formatResponse(
      `Citations in ${format.toUpperCase()} format:\n\n` +
      citations.join("\n\n")
    );
  }

  async getCitingPapers(args) {
    const { paperId, page = 1, limit = 20 } = args;
    
    try {
      const params = new URLSearchParams();
      params.append('page', page.toString());
      params.append('limit', Math.min(limit, 50).toString());
      
      const response = await this.baseUtils.makeApiRequest(`/citations/${paperId}/citing?${params.toString()}`, 'GET', null, false);
      const { papers, totalCount, totalPages } = response.data;
      
      if (!papers || papers.length === 0) {
        return this.baseUtils.formatResponse(
          `📄 **No Citing Papers Found**\n\n` +
          `No papers currently cite paper ${paperId}.`
        );
      }
      
      const papersList = papers.map((paper, index) => 
        `${index + 1}. **${paper.title}**\n` +
        `   Authors: ${paper.authors?.join(', ') || 'Unknown'}\n` +
        `   ID: ${paper.id} • Published: ${new Date(paper.createdAt).toLocaleDateString()}`
      ).join('\n\n');
      
      return this.baseUtils.formatResponse(
        `📄 **Papers Citing ${paperId}** (${totalCount} total, Page ${page}/${totalPages})\n\n` +
        papersList + '\n\n' +
        this.baseUtils.getPaginationText(page, totalPages)
      );
    } catch (error) {
      if (error.response?.status === 404) {
        throw new McpError(ErrorCode.InvalidRequest, `Paper ${paperId} not found`);
      }
      throw new McpError(ErrorCode.InternalError, `Failed to get citing papers: ${error.message}`);
    }
  }

  async getPaperReferences(args) {
    const { paperId, page = 1, limit = 20 } = args;
    
    try {
      const params = new URLSearchParams();
      params.append('page', page.toString());
      params.append('limit', Math.min(limit, 50).toString());
      
      const response = await this.baseUtils.makeApiRequest(`/citations/${paperId}/references?${params.toString()}`, 'GET', null, false);
      const { papers, totalCount, totalPages } = response.data;
      
      if (!papers || papers.length === 0) {
        return this.baseUtils.formatResponse(
          `📄 **No References Found**\n\n` +
          `Paper ${paperId} has no references in our database.`
        );
      }
      
      const papersList = papers.map((paper, index) => 
        `${index + 1}. **${paper.title}**\n` +
        `   Authors: ${paper.authors?.join(', ') || 'Unknown'}\n` +
        `   ID: ${paper.id} • Published: ${new Date(paper.createdAt).toLocaleDateString()}`
      ).join('\n\n');
      
      return this.baseUtils.formatResponse(
        `📄 **References from ${paperId}** (${totalCount} total, Page ${page}/${totalPages})\n\n` +
        papersList + '\n\n' +
        this.baseUtils.getPaginationText(page, totalPages)
      );
    } catch (error) {
      if (error.response?.status === 404) {
        throw new McpError(ErrorCode.InvalidRequest, `Paper ${paperId} not found`);
      }
      throw new McpError(ErrorCode.InternalError, `Failed to get paper references: ${error.message}`);
    }
  }

  async getCitationGraph(args) {
    const { paperId, depth = 2 } = args;
    
    try {
      const params = new URLSearchParams();
      params.append('depth', depth.toString());
      
      const response = await this.baseUtils.makeApiRequest(`/citations/${paperId}/graph?${params.toString()}`, 'GET', null, false);
      const graph = response.data;
      
      return this.baseUtils.formatResponse(
        `🕸️ **Citation Graph for Paper ${paperId}**\n\n` +
        `**Graph Statistics:**\n` +
        `• Nodes: ${graph.nodes?.length || 0} papers\n` +
        `• Edges: ${graph.edges?.length || 0} citations\n` +
        `• Depth: ${depth} levels\n\n` +
        `**Key Papers in Network:**\n` +
        (graph.nodes?.slice(0, 10).map((node, index) => 
          `${index + 1}. ${node.title} (${node.citationCount || 0} citations)`
        ).join('\n') || 'No papers found') + '\n\n' +
        `**Citation Patterns:**\n` +
        `• Most cited: ${graph.mostCited?.title || 'Unknown'}\n` +
        `• Most citing: ${graph.mostCiting?.title || 'Unknown'}\n` +
        `• Cluster size: ${graph.clusterSize || 0} papers`
      );
    } catch (error) {
      if (error.response?.status === 404) {
        throw new McpError(ErrorCode.InvalidRequest, `Paper ${paperId} not found`);
      }
      throw new McpError(ErrorCode.InternalError, `Failed to get citation graph: ${error.message}`);
    }
  }

  async getCitationStats(args) {
    const { paperId } = args;
    
    try {
      const response = await this.baseUtils.makeApiRequest(`/citations/${paperId}/stats`, 'GET', null, false);
      const stats = response.data;
      
      return this.baseUtils.formatResponse(
        `📊 **Citation Statistics for Paper ${paperId}**\n\n` +
        `**Citation Counts:**\n` +
        `• Total Citations: ${stats.totalCitations || 0}\n` +
        `• Direct Citations: ${stats.directCitations || 0}\n` +
        `• Self Citations: ${stats.selfCitations || 0}\n` +
        `• References Made: ${stats.referencesCount || 0}\n\n` +
        `**Impact Metrics:**\n` +
        `• H-Index Contribution: ${stats.hIndexContribution || 0}\n` +
        `• Citation Velocity: ${stats.citationVelocity || 0} citations/month\n` +
        `• Peak Citation Year: ${stats.peakYear || 'N/A'}\n\n` +
        `**Temporal Analysis:**\n` +
        `• First Citation: ${stats.firstCitation ? new Date(stats.firstCitation).toLocaleDateString() : 'None'}\n` +
        `• Latest Citation: ${stats.latestCitation ? new Date(stats.latestCitation).toLocaleDateString() : 'None'}\n` +
        `• Citation Half-Life: ${stats.halfLife || 'N/A'} months\n\n` +
        `**Comparison:**\n` +
        `• Percentile in Field: ${stats.fieldPercentile || 'N/A'}%\n` +
        `• Above Average: ${stats.aboveAverage ? 'Yes' : 'No'}`
      );
    } catch (error) {
      if (error.response?.status === 404) {
        throw new McpError(ErrorCode.InvalidRequest, `Paper ${paperId} not found`);
      }
      throw new McpError(ErrorCode.InternalError, `Failed to get citation stats: ${error.message}`);
    }
  }
}

export default CitationTools;