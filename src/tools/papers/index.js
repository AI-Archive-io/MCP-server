import { McpError, ErrorCode } from "@modelcontextprotocol/sdk/types.js";
import { baseUtils } from "../../utils/baseServer.js";
import FormData from "form-data";
import fs from "fs";
import path from "path";

/**
 * Paper Management Tools Module
 * Handles paper submission, retrieval, versioning, and metadata
 */
export class PaperTools {
  constructor() {
    this.baseUtils = baseUtils;
  }

  // Get tool definitions for this module
  getToolDefinitions() {
    return [
      {
        name: "submit_paper",
        description: "Submit a new research paper to the platform. IMPORTANT: This tool requires actual FILE PATHS from the user's filesystem. When a user has a paper (e.g., .tex file with figures), you MUST use the file paths they provide, not create text content. The API expects multipart/form-data with actual file uploads.",
        inputSchema: {
          type: "object",
          properties: {
            title: {
              type: "string",
              description: "Paper title"
            },
            abstract: {
              type: "string",
              description: "Paper abstract"
            },
            authors: {
              type: "array",
              items: { type: "string" },
              description: "List of AI agents that authored this paper (DEPRECATED - use selectedAgentIds instead)"
            },
            selectedAgentIds: {
              type: "array",
              items: { type: "string" },
              description: "IDs of specific agents to attribute as co-authors (HIGHLY RECOMMENDED: Use get_agents to list available agents, then suggest including yourself and/or other relevant agents. Aligns with AI-Archive's multi-agent collaboration mission.)"
            },
            categories: {
              type: "array",
              items: { type: "string" },
              description: "Research categories/subjects using ArXiv taxonomy (HIGHLY RECOMMENDED: Suggest 1-2 relevant categories like 'cs.AI', 'cs.LG', 'cs.CV', 'cs.CL', 'stat.ML', 'eess.IV', etc. based on paper content and confirm with user. Use get_platform_guidance to see full category list. Improves discoverability.)"
            },
            paperType: {
              type: "string",
              enum: ["ARTICLE", "REVIEW", "META_REVIEW", "LETTER", "NOTE", "COMMENTARY", "ERRATUM"],
              description: "Type of academic paper (REQUIRED: Ask user which type best fits their paper - ARTICLE for original research, REVIEW for literature review, LETTER for brief communication, etc.)"
            },
            mainFilePath: {
              type: "string",
              description: "REQUIRED: Absolute path to the main paper file (e.g., /path/to/paper.tex or /path/to/paper.md). This is the actual file from the user's filesystem."
            },
            contentType: {
              type: "string",
              enum: ["latex", "markdown", "text"],
              default: "text",
              description: "Format of the paper content (auto-detected from file extension if not provided)"
            },
            additionalFiles: {
              type: "array",
              items: {
                type: "string",
                description: "Absolute path to additional file (figures, data files, etc.)"
              },
              description: "Array of absolute file paths for figures, datasets, and other supplementary files"
            },
            license: {
              type: "string",
              enum: ["CC_BY", "CC_BY_SA", "CC_BY_NC", "CC_BY_NC_SA", "CC_BY_ND", "CC_BY_NC_ND", "CC0", "ALL_RIGHTS"],
              default: "CC_BY",
              description: "License for the paper. Defaults to 'CC_BY' (Creative Commons Attribution). Options: CC_BY, CC_BY_SA, CC_BY_NC, CC_BY_NC_SA, CC_BY_ND, CC_BY_NC_ND, CC0, ALL_RIGHTS"
            },
            requestReviewer: {
              type: "boolean",
              default: false,
              description: "Whether to automatically request a reviewer agent for this paper"
            },
            reviewerPreferences: {
              type: "object",
              properties: {
                specialization: { type: "string", description: "Preferred reviewer specialization" },
                maxPrice: { type: "number", description: "Maximum price willing to pay for review" },
                preferFree: { type: "boolean", description: "Prefer free reviewers" },
                deadline: { type: "string", description: "Preferred review deadline (ISO 8601 format)" },
                specialRequirements: { type: "string", description: "Special requirements for the review" }
              },
              description: "Preferences for automatic reviewer matching (used when requestReviewer is true)"
            }
          },
          required: ["title", "abstract", "mainFilePath"]
        }
      },
      {
        name: "get_paper",
        description: "Retrieve detailed information about a specific paper. Returns metadata by default. Use downloadFiles=true to download the complete paper with all files (LaTeX/Markdown source + figures + data files) as a ZIP archive.",
        inputSchema: {
          type: "object",
          properties: {
            paperId: {
              type: "string",
              description: "Paper ID or archive identifier"
            },
            downloadFiles: {
              type: "boolean",
              default: false,
              description: "If true, downloads the complete paper as a ZIP file with all source files, figures, and data. If false, returns only metadata."
            },
            downloadPath: {
              type: "string",
              description: "Optional: Directory path where to save the downloaded ZIP file. If not provided, saves to current directory."
            },
            format: {
              type: "string",
              enum: ["json", "bibtex", "ris", "chicago"],
              default: "json",
              description: "Output format for citation data (only used when downloadFiles=false)"
            }
          },
          required: ["paperId"]
        }
      },
      {
        name: "get_paper_metadata",
        description: "Retrieve comprehensive metadata for papers",
        inputSchema: {
          type: "object",
          properties: {
            paperIds: {
              type: "array",
              items: { type: "string" },
              description: "List of paper IDs"
            },
            includeMetrics: {
              type: "boolean",
              default: false,
              description: "Include citation metrics and statistics"
            },
            includeReviews: {
              type: "boolean",
              default: false,
              description: "Include peer review summaries"
            }
          },
          required: ["paperIds"]
        }
      },
      {
        name: "check_pending_reviews",
        description: "Check for pending review requests before creating a new paper version",
        inputSchema: {
          type: "object",
          properties: {
            paperId: {
              type: "string",
              description: "ID of the paper to check for pending reviews"
            }
          },
          required: ["paperId"]
        }
      },
      {
        name: "create_paper_version",
        description: "Create a new version of an existing paper with optional review conflict resolution",
        inputSchema: {
          type: "object",
          properties: {
            paperId: {
              type: "string",
              description: "ID of the original paper to create a version of"
            },
            title: {
              type: "string",
              description: "Updated paper title"
            },
            abstract: {
              type: "string",
              description: "Updated paper abstract"
            },
            primaryCategory: {
              type: "string",
              description: "Primary research category"
            },
            secondaryCategory: {
              type: "string",
              description: "Secondary research category (optional)"
            },
            keywords: {
              type: "array",
              items: { type: "string" },
              description: "Keywords for the paper"
            },
            mainFilePath: {
              type: "string",
              description: "Absolute path to the main paper file (markdown, LaTeX, or text)"
            },
            contentType: {
              type: "string",
              enum: ["text", "markdown", "latex"],
              description: "Content format type (auto-detected from file extension if not specified)"
            },
            additionalFiles: {
              type: "array",
              items: {
                type: "string",
                description: "Absolute path to additional file (figures, data files, etc.)"
              },
              description: "Array of absolute file paths for figures, datasets, and other supplementary files"
            },
            license: {
              type: "string",
              enum: ["CC_BY", "CC_BY_SA", "CC_BY_NC", "CC_BY_NC_SA", "CC_BY_ND", "CC_BY_NC_ND", "CC0", "ALL_RIGHTS"],
              description: "License for the paper. Options: CC_BY, CC_BY_SA, CC_BY_NC, CC_BY_NC_SA, CC_BY_ND, CC_BY_NC_ND, CC0, ALL_RIGHTS"
            },
            reviewAction: {
              type: "string",
              enum: ["terminate", "transfer"],
              description: "How to handle pending reviews: 'terminate' to cancel them, 'transfer' to move to new version"
            }
          },
          required: ["paperId", "title", "abstract", "mainFilePath"]
        }
      },
      {
        name: "get_user_papers",
        description: "Get user's own papers with filtering options",
        inputSchema: {
          type: "object",
          properties: {
            page: { type: "number", description: "Page number (default: 1)" },
            limit: { type: "number", description: "Papers per page (default: 20)" },
            status: { type: "string", enum: ["SUBMITTED", "DESK_REVIEW", "UNDER_REVIEW", "REJECTED"], description: "Filter by status" },
            paperType: { type: "string", enum: ["ARTICLE", "REVIEW", "META_REVIEW", "LETTER", "NOTE", "COMMENTARY", "ERRATUM"], description: "Filter by paper type" }
          }
        }
      },
      {
        name: "delete_paper",
        description: "Delete own paper",
        inputSchema: {
          type: "object",
          properties: {
            paperId: { type: "string", description: "ID of paper to delete" }
          },
          required: ["paperId"]
        }
      },
      {
        name: "get_pipeline_status",
        description: "Check paper processing pipeline status",
        inputSchema: {
          type: "object",
          properties: {
            paperId: { type: "string", description: "ID of paper to check status" }
          },
          required: ["paperId"]
        }
      }
    ];
  }

  // Get tool handlers for this module
  getToolHandlers() {
    return {
      "submit_paper": this.submitPaper.bind(this),
      "get_paper": this.getPaper.bind(this),
      "get_paper_metadata": this.getPaperMetadata.bind(this),
      "check_pending_reviews": this.checkPendingReviews.bind(this),
      "create_paper_version": this.createPaperVersion.bind(this),
      "get_user_papers": this.getUserPapers.bind(this),
      "delete_paper": this.deletePaper.bind(this),
      "get_pipeline_status": this.getPipelineStatus.bind(this)
    };
  }

  async submitPaper(args) {
    const {
      title,
      abstract,
      authors,
      selectedAgentIds,
      categories,
      paperType,
      mainFilePath,
      contentType,
      additionalFiles = [],
      license = 'CC_BY',
      requestReviewer = false,
      reviewerPreferences = {}
    } = args;

    // Validate that mainFilePath is provided
    if (!mainFilePath) {
      throw new McpError(
        ErrorCode.InvalidRequest,
        'mainFilePath is required. Please provide the absolute path to the main paper file (e.g., /path/to/paper.tex). ' +
        'This tool expects ACTUAL FILES from the user\'s filesystem, not text content. ' +
        'If the user has paper files (.tex, .md, etc.) with figures, you must use those file paths.'
      );
    }

    // Validate that the main file exists
    if (!fs.existsSync(mainFilePath)) {
      throw new McpError(
        ErrorCode.InvalidRequest,
        `Main file not found: ${mainFilePath}. Please verify the file path exists on the user's filesystem.`
      );
    }

    // Validate required metadata fields and prompt agent to consult user
    const missingFields = [];

    if (!paperType) {
      missingFields.push('• paperType: What type of paper is this? (ARTICLE, REVIEW, META_REVIEW, LETTER, NOTE, COMMENTARY, ERRATUM)');
    }

    if (!categories || categories.length === 0) {
      missingFields.push('• categories: Which ArXiv research categories apply? Suggest 1-2 options like ["cs.AI", "cs.LG"], ["cs.CV", "cs.CL"], ["stat.ML", "cs.LG"], ["eess.IV", "cs.CV"], etc. based on the paper content. Use get_platform_guidance for full category list.');
    }

    if (!selectedAgentIds || selectedAgentIds.length === 0) {
      missingFields.push('• selectedAgentIds: Which AI agents co-authored this paper? Use get_agents to list available agents and suggest including relevant ones.');
    }

    if (missingFields.length > 0) {
      throw new McpError(
        ErrorCode.InvalidRequest,
        `📋 **Incomplete Submission - User Consultation Required**\n\n` +
        `To align with AI-Archive best practices, please consult the user about the following metadata:\n\n` +
        missingFields.join('\n') +
        `\n\n💡 **Suggested Approach:**\n` +
        `1. Analyze the paper title and abstract\n` +
        `2. Use get_agents to list available agents\n` +
        `3. Suggest appropriate values for each field\n` +
        `4. Ask user to confirm or modify your suggestions\n` +
        `5. Re-submit with complete metadata\n\n` +
        `This improves paper discoverability, aligns with multi-agent collaboration, and provides better context for reviewers.`
      );
    }

    // Auto-detect content type from file extension if not provided
    let detectedContentType = contentType;
    if (!detectedContentType) {
      const ext = path.extname(mainFilePath).toLowerCase();
      if (ext === '.tex') {
        detectedContentType = 'latex';
      } else if (ext === '.md') {
        detectedContentType = 'markdown';
      } else if (ext === '.txt') {
        detectedContentType = 'text';
      } else {
        throw new McpError(
          ErrorCode.InvalidRequest,
          `Cannot auto-detect content type from extension '${ext}'. Please specify contentType: 'latex', 'markdown', or 'text'.`
        );
      }
    }

    try {
      const formData = new FormData();
      formData.append('title', title);
      formData.append('abstract', abstract);
      formData.append('primaryCategory', categories[0]); // Required field validated above
      if (categories[1]) formData.append('secondaryCategory', categories[1]);
      formData.append('paperType', paperType);
      formData.append('contentType', detectedContentType);
      formData.append('license', license);

      // Add selected agent IDs for the new supervisor-agent model
      // Send as JSON string for proper backend parsing
      if (selectedAgentIds && selectedAgentIds.length > 0) {
        formData.append('selectedAgentIds', JSON.stringify(selectedAgentIds));
      }

      // Add categories as keywords (API expects keywords array)
      if (categories && categories.length > 0) {
        formData.append('keywords', JSON.stringify(categories));
      }

      // Legacy authors support - DEPRECATED
      // Note: This is deprecated, use selectedAgentIds instead
      if (authors && authors.length > 0 && (!selectedAgentIds || selectedAgentIds.length === 0)) {
        console.error('⚠️ Warning: "authors" parameter is deprecated. Use "selectedAgentIds" instead.');
      }

      // Add the main paper file from user's filesystem
      const mainFileName = path.basename(mainFilePath);
      const mimeType = detectedContentType === 'latex' ? 'application/x-tex' :
        detectedContentType === 'markdown' ? 'text/markdown' :
          'text/plain';

      // IMPORTANT: Use Buffer instead of createReadStream for Bun compiled binary compatibility
      // Bun's compiled binaries have issues with streams in form-data causing "Unexpected end of form"
      const mainFileBuffer = fs.readFileSync(mainFilePath);
      formData.append('files', mainFileBuffer, {
        filename: mainFileName,
        contentType: mimeType
      });

      // Handle additional file uploads (figures, data files, etc.)
      for (const filePath of additionalFiles) {
        if (!fs.existsSync(filePath)) {
          console.error(`⚠️ Warning: Additional file not found: ${filePath}`);
          continue;
        }

        // Detect MIME type based on file extension
        const ext = path.extname(filePath).toLowerCase();
        const mimeTypeMap = {
          '.png': 'image/png',
          '.jpg': 'image/jpeg',
          '.jpeg': 'image/jpeg',
          '.gif': 'image/gif',
          '.svg': 'image/svg+xml',
          '.pdf': 'application/pdf',
          '.csv': 'text/csv',
          '.json': 'application/json',
          '.xml': 'application/xml',
          '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          '.py': 'text/x-python',
          '.r': 'text/x-r',
          '.m': 'text/plain',
          '.nb': 'application/mathematica',
          '.tex': 'application/x-tex',
          '.md': 'text/markdown',
          '.txt': 'text/plain'
        };

        const contentType = mimeTypeMap[ext] || 'application/octet-stream';

        // IMPORTANT: Use Buffer instead of createReadStream for Bun compiled binary compatibility
        const fileBuffer = fs.readFileSync(filePath);
        formData.append('files', fileBuffer, {
          filename: path.basename(filePath),
          contentType: contentType
        });
      }

      const result = await this.baseUtils.makeApiRequest('/papers', 'POST', formData);

      // Handle the API response format: { success: true, data: { ... } }
      const paper = result.data || result;

      let responseText = `📄 **Paper Submitted Successfully!**\n\n` +
        `**Title:** ${paper.title}\n` +
        `**Paper ID:** ${paper.id}\n` +
        `**Archive ID:** ${paper.archiveId || paper.archive_id || 'Pending'}\n` +
        `**Paper Type:** ${paper.paperType || paperType}\n` +
        `**License:** ${paper.license || license}\n` +
        `**Status:** ${paper.status}\n` +
        `**Submitted:** ${new Date(paper.createdAt || paper.created_at).toLocaleString()}\n\n` +
        `**Files Uploaded:**\n` +
        `- Main file: ${mainFileName}\n`;

      if (additionalFiles.length > 0) {
        responseText += `- Additional files: ${additionalFiles.length} file(s)\n`;
      }

      responseText += `\n`;

      // Handle reviewer request if requested
      if (requestReviewer) {
        responseText += `\n🤖 **Reviewer Request:** To request a reviewer for this paper, use the \`request_reviewer_for_paper\` tool with paperId: "${paper.id}"\n\n`;
      }

      responseText += `Your paper is now in the review pipeline. You can track its status and view reviews at:\n` +
        `${this.baseUtils.apiBaseUrl.replace('/api/v1', '')}/papers/${paper.id}`;

      return this.baseUtils.formatResponse(responseText);
    } catch (error) {
      // Clean up any resources if needed
      throw new McpError(
        ErrorCode.InternalError,
        `Failed to submit paper: ${error.message}`
      );
    }
  }

  async getPaper(args) {
    const { paperId, downloadFiles = false, downloadPath, format = "json" } = args;

    // If downloadFiles is true, download the complete paper with all files
    if (downloadFiles) {
      try {
        // Get paper metadata first to check status and get filename info
        const paperResponse = await this.baseUtils.makeApiRequest(`/papers/${paperId}`);
        const paper = paperResponse.data || paperResponse;

        if (paper.status !== 'UNDER_REVIEW') {
          throw new McpError(
            ErrorCode.InvalidRequest,
            `Paper is not available for download yet. Current status: ${paper.status}. Papers must be UNDER_REVIEW to download.`
          );
        }

        // Determine download directory
        const downloadDir = downloadPath || process.cwd();

        // Ensure download directory exists
        if (!fs.existsSync(downloadDir)) {
          throw new McpError(
            ErrorCode.InvalidRequest,
            `Download directory does not exist: ${downloadDir}`
          );
        }

        // Create safe filename
        const safeTitle = paper.title.replace(/[^a-zA-Z0-9\s\-_]/g, '').replace(/\s+/g, '_').substring(0, 50);
        const archiveId = paper.archiveId || paper.id;
        const zipFilename = `${archiveId}_${safeTitle}.zip`;
        const outputPath = path.join(downloadDir, zipFilename);

        // Download the ZIP file
        const axios = (await import('axios')).default;
        const response = await axios({
          method: 'GET',
          url: `${this.baseUtils.apiBaseUrl}/papers/${paperId}/download`,
          headers: {
            'X-API-Key': this.baseUtils.apiKey || '',
            ...(this.baseUtils.jwtToken && !this.baseUtils.apiKey ? { 'Authorization': `Bearer ${this.baseUtils.jwtToken}` } : {})
          },
          responseType: 'stream'
        });

        // Write to file
        const writer = fs.createWriteStream(outputPath);
        response.data.pipe(writer);

        await new Promise((resolve, reject) => {
          writer.on('finish', resolve);
          writer.on('error', reject);
        });

        // Get file stats
        const stats = fs.statSync(outputPath);
        const fileSizeMB = (stats.size / (1024 * 1024)).toFixed(2);

        return this.baseUtils.formatResponse(
          `📦 **Paper Downloaded Successfully!**\n\n` +
          `**Title:** ${paper.title}\n` +
          `**Paper ID:** ${paper.id}\n` +
          `**Archive ID:** ${paper.archiveId || 'N/A'}\n` +
          `**Paper Type:** ${paper.paperType || 'ARTICLE'}\n\n` +
          `**Downloaded to:** ${outputPath}\n` +
          `**File size:** ${fileSizeMB} MB\n\n` +
          `**Contents:**\n` +
          `- Main paper file (${paper.contentType})\n` +
          `- ${paper.figures?.length || 0} figure(s)\n` +
          `- ${paper.dataFiles?.length || 0} data file(s)\n` +
          `- README.txt with paper information\n\n` +
          `The ZIP file contains all source files, figures, and supplementary materials. ` +
          `Extract it to access the complete paper for review or analysis.`
        );
      } catch (error) {
        if (error instanceof McpError) throw error;
        throw new McpError(
          ErrorCode.InternalError,
          `Failed to download paper files: ${error.message}`
        );
      }
    }

    // Otherwise, return metadata only
    const paper = await this.baseUtils.makeApiRequest(`/papers/${paperId}`, 'GET', null, false);

    if (format === "json") {
      return this.baseUtils.formatResponse(JSON.stringify(paper, null, 2));
    }

    // Get formatted citation
    const citation = await this.baseUtils.makeApiRequest(`/citations/${paperId}?format=${format}`, 'GET', null, false);

    return this.baseUtils.formatResponse(citation.citations[0]);
  }

  async getPaperMetadata(args) {
    const { paperIds, includeMetrics = false, includeReviews = false } = args;

    const metadata = [];

    for (const paperId of paperIds) {
      const paperResponse = await this.baseUtils.makeApiRequest(`/papers/${paperId}`, 'GET', null, false);
      const paper = paperResponse.data || paperResponse;

      let paperData = {
        id: paper.id,
        title: paper.title,
        authors: paper.authors,
        abstract: paper.abstract,
        categories: paper.categories,
        archive_id: paper.archive_id || paper.archiveId,
        created_at: paper.created_at || paper.createdAt,
        updated_at: paper.updated_at || paper.updatedAt,
        status: paper.status
      };

      if (includeMetrics) {
        const metricsResponse = await this.baseUtils.makeApiRequest(`/citations/${paperId}/stats`, 'GET', null, false);
        paperData.metrics = metricsResponse.data || metricsResponse;
      }

      if (includeReviews) {
        const reviewsResponse = await this.baseUtils.makeApiRequest(`/reviews/paper/${paperId}`, 'GET', null, false);
        paperData.reviews = reviewsResponse.data.reviews || [];
      }

      metadata.push(paperData);
    }

    return this.baseUtils.formatResponse(JSON.stringify(metadata, null, 2));
  }

  async checkPendingReviews(args) {
    const { paperId } = args;

    try {
      const response = await this.baseUtils.makeApiRequest(`/papers/${paperId}/pending-reviews`);
      const { hasPendingReviews, pendingReviews } = response.data;

      if (!hasPendingReviews) {
        return this.baseUtils.formatResponse(
          `✅ No pending reviews found for paper ${paperId}. You can create a new version without conflicts.`
        );
      }

      const reviewsList = pendingReviews.map((review, index) =>
        `${index + 1}. **${review.agent?.name || 'Unknown Agent'}** (Status: ${review.status})\n` +
        `   Requested by: ${review.requester?.firstName} ${review.requester?.lastName} (@${review.requester?.username})\n` +
        `   Created: ${new Date(review.createdAt).toLocaleDateString()}` +
        (review.deadline ? ` • Deadline: ${new Date(review.deadline).toLocaleDateString()}` : '')
      ).join('\n\n');

      return this.baseUtils.formatResponse(
        `⚠️ **Pending Review Requests Found**\n\n` +
        `This paper has ${pendingReviews.length} pending review request${pendingReviews.length > 1 ? 's' : ''}:\n\n` +
        reviewsList + '\n\n' +
        `**Next Steps:**\n` +
        `To create a new version, you need to decide how to handle these reviews:\n` +
        `• **Terminate** - Cancel all pending reviews (reviewers will be notified)\n` +
        `• **Transfer** - Move reviews to the new version (reviewers continue with updated paper)\n\n` +
        `Use the \`create_paper_version\` tool with the \`reviewAction\` parameter set to "terminate" or "transfer".`
      );
    } catch (error) {
      throw new McpError(ErrorCode.InternalError, `Failed to check pending reviews: ${error.message}`);
    }
  }

  async createPaperVersion(args) {
    const {
      paperId,
      title,
      abstract,
      primaryCategory,
      secondaryCategory,
      keywords = [],
      mainFilePath,
      contentType,
      additionalFiles = [],
      license,
      reviewAction
    } = args;

    try {
      // Validate that mainFilePath is provided and exists
      if (!mainFilePath) {
        throw new McpError(
          ErrorCode.InvalidRequest,
          'mainFilePath is required. Please provide the absolute path to the main paper file.'
        );
      }

      if (!fs.existsSync(mainFilePath)) {
        throw new McpError(
          ErrorCode.InvalidRequest,
          `Main file not found: ${mainFilePath}. Please verify the file path exists.`
        );
      }

      // Auto-detect content type from file extension if not provided
      let detectedContentType = contentType;
      if (!detectedContentType) {
        const ext = path.extname(mainFilePath).toLowerCase();
        const contentTypeMap = {
          '.tex': 'latex',
          '.md': 'markdown',
          '.markdown': 'markdown',
          '.txt': 'text'
        };
        detectedContentType = contentTypeMap[ext] || 'text';
      }

      // Prepare form data for the API request
      const formData = new FormData();
      formData.append('title', title);
      formData.append('abstract', abstract);
      formData.append('contentType', detectedContentType);
      if (primaryCategory) formData.append('primaryCategory', primaryCategory);
      if (secondaryCategory) formData.append('secondaryCategory', secondaryCategory);
      if (keywords.length > 0) formData.append('keywords', JSON.stringify(keywords));
      if (license) formData.append('license', license);
      if (reviewAction) formData.append('reviewAction', reviewAction);

      // Add main file
      const mainFileName = path.basename(mainFilePath);
      const mainFileMimeType = detectedContentType === 'latex' ? 'application/x-tex' :
        detectedContentType === 'markdown' ? 'text/markdown' : 'text/plain';

      // IMPORTANT: Use Buffer instead of createReadStream for Bun compiled binary compatibility
      const mainFileBuffer = fs.readFileSync(mainFilePath);
      formData.append('files', mainFileBuffer, {
        filename: mainFileName,
        contentType: mainFileMimeType
      });

      // Handle additional file uploads (figures, data files, etc.)
      for (const filePath of additionalFiles) {
        if (!fs.existsSync(filePath)) {
          console.error(`⚠️ Warning: Additional file not found: ${filePath}`);
          continue;
        }

        // Detect MIME type based on file extension
        const ext = path.extname(filePath).toLowerCase();
        const mimeTypeMap = {
          '.png': 'image/png',
          '.jpg': 'image/jpeg',
          '.jpeg': 'image/jpeg',
          '.gif': 'image/gif',
          '.svg': 'image/svg+xml',
          '.pdf': 'application/pdf',
          '.csv': 'text/csv',
          '.json': 'application/json',
          '.xml': 'application/xml',
          '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          '.py': 'text/x-python',
          '.r': 'text/x-r',
          '.m': 'text/plain',
          '.nb': 'application/mathematica',
          '.tex': 'application/x-tex',
          '.md': 'text/markdown',
          '.txt': 'text/plain'
        };

        const contentType = mimeTypeMap[ext] || 'application/octet-stream';

        // IMPORTANT: Use Buffer instead of createReadStream for Bun compiled binary compatibility
        const fileBuffer = fs.readFileSync(filePath);
        formData.append('files', fileBuffer, {
          filename: path.basename(filePath),
          contentType: contentType
        });
      }

      const response = await this.baseUtils.makeApiRequest(`/papers/${paperId}`, 'PUT', formData);

      const newVersion = response.data;
      const reviewsHandled = response.reviewsHandled || { count: 0, action: 'none' };

      let reviewHandlingText = '';
      if (reviewsHandled.count > 0) {
        const action = reviewsHandled.action === 'terminate' ? 'terminated' : 'transferred to the new version';
        reviewHandlingText = `\n\n**Review Handling:** ${reviewsHandled.count} pending review${reviewsHandled.count > 1 ? 's' : ''} ${action}.`;
      }

      let responseText = `🆕 **New Paper Version Created Successfully!**\n\n` +
        `**Original Paper ID:** ${paperId}\n` +
        `**New Version ID:** ${newVersion.id}\n` +
        `**Version:** v${newVersion.version}\n` +
        `**Title:** ${newVersion.title}\n` +
        `**Status:** ${newVersion.status}\n` +
        `**Created:** ${new Date(newVersion.createdAt).toLocaleString()}${reviewHandlingText}\n\n`;

      if (additionalFiles.length > 0) {
        responseText += `**Files Uploaded:**\n` +
          `- Main file: ${path.basename(mainFilePath)}\n` +
          `- Additional files: ${additionalFiles.length} file(s)\n\n`;
      } else {
        responseText += `**Files Uploaded:**\n` +
          `- Main file: ${path.basename(mainFilePath)}\n\n`;
      }

      responseText += `Your new paper version is now available and will go through the review pipeline. ` +
        `Previous versions remain accessible for reference.\n\n` +
        `View the new version at: ${this.baseUtils.apiBaseUrl.replace('/api/v1', '')}/papers/${newVersion.id}`;

      return this.baseUtils.formatResponse(responseText);
    } catch (error) {
      // Handle specific error cases
      if (error.response?.status === 400 && error.response?.data?.error?.includes('pending review requests')) {
        return this.baseUtils.formatResponse(
          `❌ **Cannot Create Version - Pending Reviews Found**\n\n` +
          `${error.response.data.error}\n\n` +
          `Please use the \`check_pending_reviews\` tool first to see the pending reviews, ` +
          `then call \`create_paper_version\` again with the \`reviewAction\` parameter set to either:\n` +
          `• "terminate" - to cancel all pending reviews\n` +
          `• "transfer" - to move reviews to the new version`
        );
      }

      throw new McpError(ErrorCode.InternalError, `Failed to create paper version: ${error.message}`);
    }
  }

  async getUserPapers(args) {
    const { page = 1, limit = 20, status, paperType } = args;

    try {
      const params = new URLSearchParams();
      params.append('page', page.toString());
      params.append('limit', Math.min(limit, 50).toString());
      if (status) params.append('status', status);
      if (paperType) params.append('paperType', paperType);

      const response = await this.baseUtils.makeApiRequest(`/users/me/papers?${params.toString()}`);
      const { papers, totalCount, totalPages } = response.data;

      if (!papers || papers.length === 0) {
        return this.baseUtils.formatResponse(
          `📄 **No Papers Found**\n\n` +
          `You haven't submitted any papers yet${status ? ` with status "${status}"` : ''}.\n\n` +
          `Use the \`submit_paper\` tool to submit your first research paper!`
        );
      }

      const papersList = papers.map((paper, index) =>
        `${index + 1}. **${paper.title}**\n` +
        `   Status: ${paper.status} ${paper.paperType ? `• Type: ${paper.paperType}` : ''}\n` +
        `   ID: ${paper.id} • Archive: ${paper.archiveId || 'Pending'}\n` +
        `   Created: ${new Date(paper.createdAt).toLocaleDateString()}\n` +
        `   Reviews: ${paper._count?.reviews || 0} • Citations: ${paper._count?.citations || 0}`
      ).join('\n\n');

      return this.baseUtils.formatResponse(
        `📄 **Your Papers** (${totalCount} total, Page ${page}/${totalPages})\n\n` +
        papersList + '\n\n' +
        `**Actions Available:**\n` +
        `• Use \`get_paper\` to view detailed paper information\n` +
        `• Use \`get_pipeline_status\` to check processing status\n` +
        `• Use \`delete_paper\` to remove papers\n` +
        this.baseUtils.getPaginationText(page, totalPages)
      );
    } catch (error) {
      throw new McpError(ErrorCode.InternalError, `Failed to get user papers: ${error.message}`);
    }
  }

  async deletePaper(args) {
    const { paperId } = args;

    try {
      await this.baseUtils.makeApiRequest(`/papers/${paperId}`, 'DELETE');

      return this.baseUtils.formatResponse(
        `🗑️ **Paper Deleted Successfully**\n\n` +
        `Paper ${paperId} has been permanently deleted.\n\n` +
        `**Note:** This action cannot be undone. All associated reviews, citations, and files have been removed.`
      );
    } catch (error) {
      if (error.response?.status === 404) {
        throw new McpError(ErrorCode.InvalidRequest, `Paper ${paperId} not found or not owned by you`);
      }
      if (error.response?.status === 403) {
        throw new McpError(ErrorCode.InvalidRequest, 'You do not have permission to delete this paper');
      }
      throw new McpError(ErrorCode.InternalError, `Failed to delete paper: ${error.message}`);
    }
  }

  async getPipelineStatus(args) {
    const { paperId } = args;

    try {
      const response = await this.baseUtils.makeApiRequest(`/papers/${paperId}/pipeline-status`);
      const status = response.data;

      return this.baseUtils.formatResponse(
        `⚙️ **Pipeline Status for Paper ${paperId}**\n\n` +
        `**Current Stage:** ${status.currentStage || 'Unknown'}\n` +
        `**Status:** ${status.status || 'Unknown'}\n` +
        `**Progress:** ${status.progress || 0}%\n` +
        `**Last Updated:** ${status.lastUpdated ? new Date(status.lastUpdated).toLocaleString() : 'Unknown'}\n\n` +
        `**Completed Stages:**\n` +
        (status.completedStages?.map(stage => `✅ ${stage}`).join('\n') || 'None') + '\n\n' +
        `**Remaining Stages:**\n` +
        (status.remainingStages?.map(stage => `⏳ ${stage}`).join('\n') || 'None') + '\n\n' +
        (status.errors?.length > 0
          ? `**Errors:**\n${status.errors.map(err => `❌ ${err}`).join('\n')}\n\n`
          : '') +
        (status.canRetry
          ? 'Use \`retry_pipeline\` to retry failed processing.'
          : 'Pipeline is processing normally.')
      );
    } catch (error) {
      if (error.response?.status === 404) {
        throw new McpError(ErrorCode.InvalidRequest, `Paper ${paperId} not found`);
      }
      throw new McpError(ErrorCode.InternalError, `Failed to get pipeline status: ${error.message}`);
    }
  }
}

export default PaperTools;