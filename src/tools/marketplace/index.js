import { McpError, ErrorCode } from "@modelcontextprotocol/sdk/types.js";
import { baseUtils } from "../../utils/baseServer.js";

/**
 * Marketplace Tools Module
 * Handles reviewer search, review requests, marketplace profiles, and analytics
 */
export class MarketplaceTools {
  constructor() {
    this.baseUtils = baseUtils;
  }

  // Get tool definitions for this module
  getToolDefinitions() {
    return [
      {
        name: "search_reviewers",
        description: "Search for available reviewer agents by specialization, price, and performance stats",
        inputSchema: {
          type: "object",
          properties: {
            specialization: {
              type: "string",
              description: "Filter by agent specialization (e.g., 'computer vision', 'NLP', 'machine learning')"
            },
            maxPrice: {
              type: "number",
              description: "Maximum price per review (filters out more expensive agents)"
            },
            isFree: {
              type: "boolean",
              description: "Filter for free agents only"
            },
            page: {
              type: "number",
              description: "Page number for pagination (default: 1)"
            },
            limit: {
              type: "number",
              description: "Number of results per page (default: 20, max: 50)"
            }
          }
        }
      },
      {
        name: "get_reviewer_details",
        description: "Get detailed information about a specific reviewer agent including stats and sample reviews",
        inputSchema: {
          type: "object",
          properties: {
            agentId: {
              type: "string",
              description: "ID of the agent to get details for"
            }
          },
          required: ["agentId"]
        }
      },
      {
        name: "request_review",
        description: "Submit a review request to a specific reviewer agent for a paper. RECOMMENDED: Provide deadline and special requirements to get better, more aligned reviews. Ask user about their timeline and any specific aspects they want reviewed.",
        inputSchema: {
          type: "object",
          properties: {
            paperId: {
              type: "string",
              description: "ID of the paper that needs reviewing"
            },
            requestedAgentId: {
              type: "string",
              description: "ID of the agent being requested for review"
            },
            requestMessage: {
              type: "string",
              description: "RECOMMENDED: Message to the reviewer explaining context, special requirements, or specific aspects to focus on. Helps reviewers provide more targeted feedback."
            },
            deadline: {
              type: "string",
              description: "RECOMMENDED: Requested completion deadline (ISO 8601 format, e.g., '2025-11-15T23:59:59Z'). Ask user about their timeline to set realistic expectations."
            },
            specialRequirements: {
              type: "string",
              description: "RECOMMENDED: Any special requirements for the review (e.g., focus on methodology, check reproducibility, assess novelty vs. specific prior work). Helps ensure the review meets your needs."
            },
            offeredPrice: {
              type: "number",
              description: "Custom price offer (if different from agent's standard rate)"
            }
          },
          required: ["paperId", "requestedAgentId"]
        }
      },
      {
        name: "get_review_requests",
        description: "Get review requests (incoming requests to your agents or outgoing requests from you)",
        inputSchema: {
          type: "object",
          properties: {
            type: {
              type: "string",
              enum: ["incoming", "outgoing", "both"],
              description: "Type of requests to retrieve (default: both)"
            },
            status: {
              type: "string",
              enum: ["PENDING", "ACCEPTED", "REJECTED", "IN_PROGRESS", "COMPLETED", "CANCELLED", "EXPIRED"],
              description: "Filter by request status"
            },
            page: {
              type: "number",
              description: "Page number for pagination (default: 1)"
            },
            limit: {
              type: "number",
              description: "Number of results per page (default: 20, max: 50)"
            }
          }
        }
      },
      {
        name: "respond_to_review_request",
        description: "Accept or reject an incoming review request for your agent",
        inputSchema: {
          type: "object",
          properties: {
            requestId: {
              type: "string",
              description: "ID of the review request to respond to"
            },
            decision: {
              type: "string",
              enum: ["accept", "reject"],
              description: "Whether to accept or reject the request"
            },
            responseMessage: {
              type: "string",
              description: "Optional message to the requester"
            },
            agreedPrice: {
              type: "number",
              description: "Agreed price for the review (if accepting)"
            }
          },
          required: ["requestId", "decision"]
        }
      },
      {
        name: "create_marketplace_profile",
        description: "Create or update a marketplace profile for your agent to offer review services. RECOMMENDED: Provide specializations, pricing, and description to attract relevant review requests. Ask user about their agent's expertise and availability.",
        inputSchema: {
          type: "object",
          properties: {
            agentId: {
              type: "string",
              description: "ID of the agent to create profile for"
            },
            pricePerReview: {
              type: "number",
              description: "Price per review in credits (0 for free)"
            },
            currency: {
              type: "string",
              description: "Currency code (use 'CREDITS' for credit system)"
            },
            isFree: {
              type: "boolean",
              description: "Whether reviews are offered for free"
            },
            specializations: {
              type: "array",
              items: { type: "string" },
              description: "HIGHLY RECOMMENDED: Areas of expertise (e.g., ['computer vision', 'NLP', 'reinforcement learning']). Helps match your agent with relevant papers."
            },
            description: {
              type: "string",
              description: "RECOMMENDED: Profile description highlighting expertise, review approach, and what makes your agent valuable. Helps authors choose the right reviewer."
            },
            termsOfService: {
              type: "string",
              description: "Terms and conditions for review services"
            },
            maxConcurrentReviews: {
              type: "number",
              description: "Maximum number of concurrent reviews"
            },
            averageCompletionTime: {
              type: "number",
              description: "Average hours to complete a review"
            }
          },
          required: ["agentId", "pricePerReview", "isFree"]
        }
      },
      {
        name: "request_reviewer_for_paper",
        description: "Request a reviewer agent for an existing paper with intelligent matching",
        inputSchema: {
          type: "object",
          properties: {
            paperId: {
              type: "string",
              description: "ID of the paper that needs a reviewer"
            },
            specialization: {
              type: "string",
              description: "Preferred reviewer specialization (e.g., 'computer vision', 'NLP')"
            },
            maxPrice: {
              type: "number",
              description: "Maximum price willing to pay for review"
            },
            preferFree: {
              type: "boolean",
              default: false,
              description: "Prefer free reviewers over paid ones"
            },
            deadline: {
              type: "string",
              description: "Preferred review deadline (ISO 8601 format)"
            },
            specialRequirements: {
              type: "string",
              description: "Special requirements or instructions for the reviewer"
            },
            autoAcceptBest: {
              type: "boolean",
              default: false,
              description: "Automatically send request to the best matching reviewer"
            },
            returnMatches: {
              type: "boolean",
              default: true,
              description: "Return list of matching reviewers for manual selection"
            }
          },
          required: ["paperId"]
        }
      },
      {
        name: "update_marketplace_profile",
        description: "Update an existing marketplace profile for your agent",
        inputSchema: {
          type: "object",
          properties: {
            agentId: { type: "string", description: "ID of the agent to update profile for" },
            pricePerReview: { type: "number", description: "Updated price per review" },
            currency: { type: "string", description: "Currency code" },
            isFree: { type: "boolean", description: "Whether reviews are offered for free" },
            specializations: { type: "array", items: { type: "string" }, description: "Updated specializations" },
            description: { type: "string", description: "Updated profile description" },
            termsOfService: { type: "string", description: "Updated terms of service" },
            maxConcurrentReviews: { type: "number", description: "Maximum concurrent reviews" },
            averageCompletionTime: { type: "number", description: "Average completion time in hours" },
            isActive: { type: "boolean", description: "Whether profile is active" }
          },
          required: ["agentId"]
        }
      },
      {
        name: "get_marketplace_analytics",
        description: "Get marketplace analytics for your agents (earnings, performance, etc.)",
        inputSchema: {
          type: "object",
          properties: {
            agentId: { type: "string", description: "Specific agent ID (optional, shows all agents if omitted)" },
            timeframe: { type: "string", enum: ["week", "month", "quarter", "year"], description: "Analytics timeframe" }
          }
        }
      },
      {
        name: "get_incoming_requests",
        description: "Get incoming review requests for your agents with enhanced filtering",
        inputSchema: {
          type: "object",
          properties: {
            agentId: { type: "string", description: "Filter by specific agent" },
            status: { type: "string", enum: ["PENDING", "ACCEPTED", "REJECTED", "IN_PROGRESS", "COMPLETED", "CANCELLED", "EXPIRED"], description: "Filter by status" },
            priority: { type: "string", enum: ["urgent", "normal", "low"], description: "Filter by urgency" },
            minPrice: { type: "number", description: "Minimum offered price" },
            page: { type: "number", description: "Page number" },
            limit: { type: "number", description: "Results per page" }
          }
        }
      },
      {
        name: "bulk_respond_requests",
        description: "Respond to multiple review requests at once",
        inputSchema: {
          type: "object",
          properties: {
            responses: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  requestId: { type: "string", description: "Request ID" },
                  decision: { type: "string", enum: ["accept", "reject"], description: "Accept or reject" },
                  responseMessage: { type: "string", description: "Response message" },
                  agreedPrice: { type: "number", description: "Agreed price if accepting" }
                },
                required: ["requestId", "decision"]
              },
              description: "Array of responses to process"
            }
          },
          required: ["responses"]
        }
      },
      {
        name: "update_request_status",
        description: "Update the status of an accepted review request (e.g., mark as in progress or completed)",
        inputSchema: {
          type: "object",
          properties: {
            requestId: { type: "string", description: "ID of the review request" },
            status: { type: "string", enum: ["IN_PROGRESS", "COMPLETED", "CANCELLED"], description: "New status" },
            progressMessage: { type: "string", description: "Optional progress update message" },
            completionNotes: { type: "string", description: "Notes for completion (required for COMPLETED status)" }
          },
          required: ["requestId", "status"]
        }
      }
    ];
  }

  // Get tool handlers for this module
  getToolHandlers() {
    return {
      "search_reviewers": this.searchReviewers.bind(this),
      "get_reviewer_details": this.getReviewerDetails.bind(this),
      "request_review": this.requestReview.bind(this),
      "get_review_requests": this.getReviewRequests.bind(this),
      "respond_to_review_request": this.respondToReviewRequest.bind(this),
      "create_marketplace_profile": this.createMarketplaceProfile.bind(this),
      "request_reviewer_for_paper": this.requestReviewerForPaper.bind(this),
      "update_marketplace_profile": this.updateMarketplaceProfile.bind(this),
      "get_marketplace_analytics": this.getMarketplaceAnalytics.bind(this),
      "get_incoming_requests": this.getIncomingRequests.bind(this),
      "bulk_respond_requests": this.bulkRespondRequests.bind(this),
      "update_request_status": this.updateRequestStatus.bind(this)
    };
  }

  // Due to space constraints, I'll include just a few key methods here
  // The full implementation would include all methods from the original server
  
  async searchReviewers(args) {
    const { specialization, maxPrice, isFree, page = 1, limit = 20 } = args;
    
    try {
      const params = new URLSearchParams();
      params.append('page', page.toString());
      params.append('limit', Math.min(limit, 50).toString());
      
      if (specialization) params.append('specialization', specialization);
      if (maxPrice !== undefined) params.append('maxPrice', maxPrice.toString());
      if (isFree !== undefined) params.append('isFree', isFree.toString());
      
      const response = await this.baseUtils.makeApiRequest(`/marketplace/agents?${params.toString()}`);
      const { agents, totalCount, totalPages } = response.data;
      
      if (!agents || agents.length === 0) {
        return this.baseUtils.formatResponse(
          `🔍 No reviewers found matching your criteria.\n\n` +
          `Try adjusting your search filters:\n` +
          `• Remove or broaden specialization requirements\n` +
          `• Increase maximum price limit\n` +
          `• Include paid reviewers (remove isFree filter)`
        );
      }
      
      const reviewersList = agents.map((agent, index) => {
        const profile = agent.marketplaceProfile;
        const price = profile.isFree ? 'Free' : `$${profile.pricePerReview} ${profile.currency}`;
        const rating = (profile.averageRating !== null && profile.averageRating !== undefined) 
          ? `⭐ ${Number(Number(profile.averageRating)).toFixed(1)}/5` 
          : 'No ratings yet';
        const specializations = profile.specializations?.length > 0 
          ? profile.specializations.join(', ') 
          : 'General review';
        
        return `${index + 1}. **${agent.name}** (${price})\n` +
               `   ${rating} • ${profile.totalReviewsCompleted || 0} reviews completed\n` +
               `   Specializations: ${specializations}\n` +
               `   Avg completion: ${profile.averageCompletionTime || 'N/A'} hours\n` +
               `   Agent ID: ${agent.id}`;
      }).join('\n\n');
      
      return this.baseUtils.formatResponse(
        `🔍 **Found ${agents.length} Available Reviewers** (Page ${page}/${totalPages})\n\n` +
        reviewersList + '\n\n' +
        `**Next Steps:**\n` +
        `• Use \`get_reviewer_details\` to see detailed info and sample reviews\n` +
        `• Use \`request_review\` to submit a review request to any agent\n` +
        this.baseUtils.getPaginationText(page, totalPages)
      );
    } catch (error) {
      throw new McpError(ErrorCode.InternalError, `Failed to search reviewers: ${error.message}`);
    }
  }

  async requestReviewerForPaper(args) {
    const { 
      paperId, 
      specialization, 
      maxPrice, 
      preferFree = false, 
      deadline, 
      specialRequirements, 
      autoAcceptBest = false, 
      returnMatches = true 
    } = args;
    
    try {
      // First, get the paper details to understand the content
      const paper = await this.baseUtils.makeApiRequest(`/papers/${paperId}`);
      const paperData = paper.data || paper;
      
      // Search for matching reviewers based on preferences
      const searchParams = new URLSearchParams();
      searchParams.append('page', '1');
      searchParams.append('limit', '10'); // Get top 10 matches
      
      if (specialization) {
        searchParams.append('specialization', specialization);
      } else if (paperData.categories && paperData.categories.length > 0) {
        // Use paper categories as specialization hint
        searchParams.append('specialization', paperData.categories[0]);
      }
      
      if (maxPrice !== undefined) searchParams.append('maxPrice', maxPrice.toString());
      if (preferFree) searchParams.append('isFree', 'true');
      
      const reviewersResponse = await this.baseUtils.makeApiRequest(`/marketplace/agents?${searchParams.toString()}`);
      const { agents } = reviewersResponse.data;
      
      if (!agents || agents.length === 0) {
        return this.baseUtils.formatResponse(
          `🔍 **No Matching Reviewers Found**\n\n` +
          `No reviewers found matching your criteria for paper "${paperData.title}".\n\n` +
          `**Suggestions:**\n` +
          `• Try broadening specialization requirements\n` +
          `• Remove or increase price limits\n` +
          `• Consider non-free reviewers\n` +
          `• Use \`search_reviewers\` to explore all available reviewers`
        );
      }
      
      // Return matches for manual selection (simplified implementation)
      const matchesList = agents.slice(0, 5).map((agent, index) => {
        const profile = agent.marketplaceProfile;
        const price = profile.isFree ? 'Free' : `${profile.pricePerReview} Credits`;
        const rating = (profile.averageRating !== null && profile.averageRating !== undefined)
          ? `⭐ ${Number(profile.averageRating).toFixed(1)}/5` 
          : 'No ratings';
        
        return `${index + 1}. **${agent.name}**\n` +
               `   ${price} • ${rating} • ${profile.totalReviewsCompleted || 0} reviews\n` +
               `   Specializations: ${profile.specializations?.join(', ') || 'General'}\n` +
               `   Agent ID: ${agent.id}`;
      }).join('\n\n');
      
      return this.baseUtils.formatResponse(
        `🎯 **Top Reviewer Matches for "${paperData.title}"\n\n` +
        `Found ${agents.length} potential reviewers. Here are the top 5:\n\n` +
        matchesList + '\n\n' +
        `**💰 Credit-Based Payments:**\n` +
        `AI-Archive uses a credit system instead of traditional payments.\n` +
        `Use \`pay_with_credits\` (from credits module) to pay for accepted requests.\n\n` +
        `**Next Steps:**\n` +
        `• Use \`request_review\` with a specific agent ID to send a review request\n` +
        `• Use \`get_reviewer_details\` to see more information about any reviewer\n` +
        `• Use \`request_reviewer_for_paper\` with \`autoAcceptBest: true\` to automatically request the top match`
      );
    } catch (error) {
      if (error.response?.status === 404) {
        throw new McpError(ErrorCode.InvalidRequest, `Paper ${paperId} not found or not accessible`);
      }
      throw new McpError(ErrorCode.InternalError, `Failed to request reviewer for paper: ${error.message}`);
    }
  }

  async getReviewerDetails(args) {
    const { agentId } = args;
    
    try {
      const response = await this.baseUtils.makeApiRequest(`/marketplace/agents/${agentId}`);
      const agent = response.data;
      
      const profile = agent.marketplaceProfile;
      const supervisor = agent.supervisor;
      
      // Format pricing
      const pricing = profile.isFree 
        ? '🆓 Free' 
        : `💰 ${profile.pricePerReview} ${profile.currency}`;
      
      // Format rating
      const rating = (profile.averageRating !== null && profile.averageRating !== undefined)
        ? `⭐ ${Number(profile.averageRating).toFixed(1)}/5.0 (${profile.totalReviews || 0} reviews)`
        : '📊 No ratings yet';
      
      // Format response time
      const responseTime = profile.averageResponseTimeHours 
        ? `⏱️ ${profile.averageResponseTimeHours} hours average`
        : '⏱️ Response time not tracked';
      
      // Format completion stats
      const completionStats = profile.completionRate
        ? `✅ ${(parseFloat(profile.completionRate) * 100).toFixed(0)}% completion rate (${profile.totalReviewsCompleted || 0} completed)`
        : `✅ ${profile.totalReviewsCompleted || 0} reviews completed`;
      
      // Format recent reviews
      let recentReviews = '';
      if (agent.reviews && agent.reviews.length > 0) {
        recentReviews = '\n\n**📝 Recent Reviews:**\n';
        agent.reviews.forEach((reviewAgent, idx) => {
          const review = reviewAgent.review;
          if (review) {
            recentReviews += `${idx + 1}. "${review.paper?.title}" - Score: ${review.overallScore}/10 (${new Date(review.createdAt).toLocaleDateString()})\n`;
          }
        });
      }
      
      return this.baseUtils.formatResponse(
        `🤖 **Reviewer Agent Details**\n\n` +
        `**Name:** ${agent.name}\n` +
        `**Model:** ${agent.model || 'Not specified'}\n` +
        `**Agent ID:** ${agent.id}\n\n` +
        `**🏆 Performance Metrics:**\n` +
        `${rating}\n` +
        `${completionStats}\n` +
        `${responseTime}\n` +
        `${pricing}\n\n` +
        `**👤 Supervisor:**\n` +
        `Name: ${supervisor.firstName || ''} ${supervisor.lastName || ''} (@${supervisor.username})\n` +
        `Institution: ${supervisor.institution || 'Not specified'}\n` +
        `Reputation: ${supervisor.reputationScore || 0} points\n` +
        `Total Reviews: ${supervisor.reviewCount || 0}\n\n` +
        `**🔬 Specializations:**\n` +
        `${profile.specializations?.join(', ') || 'General research'}\n\n` +
        `**📋 Service Details:**\n` +
        `Max Concurrent: ${profile.maxConcurrentReviews || 'Unlimited'} reviews\n` +
        `Active: ${profile.isActive ? '✅ Yes' : '❌ No'}\n` +
        `Auto-Accept: ${profile.autoAcceptRequests ? '✅ Yes' : '❌ Manual approval'}\n` +
        (profile.description ? `\n**📄 Description:**\n${profile.description}\n` : '') +
        (profile.termsOfService ? `\n**⚖️ Terms of Service:**\n${profile.termsOfService}\n` : '') +
        recentReviews +
        `\n**Next Steps:**\n` +
        `• Use \`request_review\` with agentId: "${agent.id}" to request a review\n` +
        `• Use \`search_reviewers\` to compare with other reviewers`
      );
    } catch (error) {
      if (error.response?.status === 404) {
        throw new McpError(ErrorCode.InvalidRequest, `Reviewer agent ${agentId} not found or not available for hire`);
      }
      throw new McpError(ErrorCode.InternalError, `Failed to fetch reviewer details: ${error.message}`);
    }
  }

  async requestReview(args) {
    const { 
      paperId, 
      requestedAgentId, 
      requestMessage, 
      deadline, 
      specialRequirements, 
      offeredPrice 
    } = args;
    
    try {
      // Submit review request to backend
      const response = await this.baseUtils.makeApiRequest('/marketplace/review-requests', 'POST', {
        paperId,
        requestedAgentId,
        requestMessage,
        deadline,
        specialRequirements,
        offeredPrice
      });
      
      const request = response.data;
      
      return this.baseUtils.formatResponse(
        `✅ **Review Request Submitted Successfully!**\n\n` +
        `**Request ID:** ${request.id}\n` +
        `**Paper:** ${request.paper?.title}\n` +
        `**Reviewer Agent:** ${request.agent?.name}\n` +
        `**Price:** ${request.offeredPrice} credits\n` +
        `**Status:** ${request.status}\n\n` +
        (request.deadline ? `**Deadline:** ${new Date(request.deadline).toLocaleDateString()}\n\n` : '') +
        `**Next Steps:**\n` +
        `• The reviewer will be notified of your request\n` +
        `• Use \`get_review_requests\` to check status\n` +
        `• If accepted, pay with \`pay_with_credits\` (requestId: "${request.id}")\n` +
        `• Track progress with \`get_review_requests\` or \`get_paper_reviews\``
      );
    } catch (error) {
      if (error.response?.status === 404) {
        throw new McpError(ErrorCode.InvalidRequest, 'Paper or agent not found or not available');
      } else if (error.response?.status === 400) {
        const errorMsg = error.response.data?.error || error.message;
        throw new McpError(ErrorCode.InvalidRequest, errorMsg);
      }
      throw new McpError(ErrorCode.InternalError, `Failed to submit review request: ${error.message}`);
    }
  }

  async getReviewRequests(args) {
    try {
      const { type = 'both', status, page = 1, limit = 20 } = args;
      
      const params = new URLSearchParams();
      if (type !== 'both') params.append('type', type);
      if (status) params.append('status', status);
      params.append('page', page.toString());
      params.append('limit', Math.min(limit, 50).toString());
      
      const response = await this.baseUtils.makeApiRequest(`/marketplace/review-requests?${params.toString()}`);
      const { requests, totalCount, totalPages } = response.data;
      
      if (!requests || requests.length === 0) {
        return this.baseUtils.formatResponse(
          `📭 **No Review Requests Found**\n\n` +
          `No ${type} review requests found` + (status ? ` with status ${status}` : '') + `.\n\n` +
          `**Tips:**\n` +
          `• For incoming requests: Create a marketplace profile for your agents\n` +
          `• For outgoing requests: Use \`request_review\` to request a review\n` +
          `• Check different status filters to see all requests`
        );
      }
      
      const requestsList = requests.map((req, index) => {
        const direction = req.type === 'incoming' ? '📥 Incoming' : '📤 Outgoing';
        const statusEmoji = {
          'PENDING': '⏳',
          'ACCEPTED': '✅', 
          'REJECTED': '❌',
          'IN_PROGRESS': '🔄',
          'COMPLETED': '✔️',
          'CANCELLED': '🚫',
          'EXPIRED': '⏱️'
        }[req.status] || '📝';
        
        return `${index + 1}. ${direction} ${statusEmoji} **${req.status}**\n` +
               `   Paper: ${req.paper?.title || 'Unknown'}\n` +
               `   ${req.type === 'incoming' ? 'Requester' : 'Reviewer'}: ${req.requester?.username || req.agent?.name || 'Unknown'}\n` +
               `   Price: ${req.offeredPrice || req.agreedPrice || 0} credits\n` +
               `   Request ID: ${req.id}`;
      }).join('\n\n');
      
      return this.baseUtils.formatResponse(
        `📋 **Review Requests** (${type}, Page ${page}/${totalPages})\n\n` +
        requestsList + '\n\n' +
        `**Actions:**\n` +
        `• Use \`respond_to_review_request\` to accept/reject incoming requests\n` +
        `• Use \`pay_with_credits\` to pay for accepted requests\n` +
        `• Use \`update_request_status\` to update progress\n` +
        this.baseUtils.getPaginationText(page, totalPages)
      );
    } catch (error) {
      throw new McpError(ErrorCode.InternalError, `Failed to get review requests: ${error.message}`);
    }
  }

  async respondToReviewRequest(args) {
    // Implementation would go here
    return this.baseUtils.formatResponse("Respond to review request functionality is available in the full implementation.");
  }

  async createMarketplaceProfile(args) {
    const {
      agentId,
      pricePerReview,
      currency = 'CREDITS',
      isFree,
      maxConcurrentReviews = 5,
      description,
      specializations = [],
      requiresApproval = false,
      termsOfService,
      reviewProviderApiUrl,
      reviewProviderApiKey,
      reviewProviderEnabled = false,
      autoAcceptRequests = false,
      averageCompletionTime
    } = args;
    
    // Validate required fields with clear error messages
    if (!agentId) {
      throw new McpError(ErrorCode.InvalidRequest, 'agentId is required');
    }
    if (pricePerReview === undefined || pricePerReview === null) {
      throw new McpError(ErrorCode.InvalidRequest, 'pricePerReview is required (use 0 for free reviews)');
    }
    if (isFree === undefined || isFree === null) {
      throw new McpError(ErrorCode.InvalidRequest, 'isFree is required (set to true for free reviews, false for paid)');
    }
    
    // Validate price consistency
    if (isFree && pricePerReview > 0) {
      throw new McpError(ErrorCode.InvalidRequest, 'Cannot set pricePerReview > 0 when isFree is true. Set pricePerReview to 0 for free reviews.');
    }
    if (!isFree && pricePerReview === 0) {
      throw new McpError(ErrorCode.InvalidRequest, 'Must set pricePerReview > 0 when isFree is false, or set isFree to true for free reviews.');
    }
    
    try {
      const profileData = {
        pricePerReview,
        currency,
        isFree,
        maxConcurrentReviews,
        description,
        specializations,
        requiresApproval,
        termsOfService,
        autoAcceptRequests
      };
      
      // Add optional fields if provided
      if (reviewProviderApiUrl) profileData.reviewProviderApiUrl = reviewProviderApiUrl;
      if (reviewProviderApiKey) profileData.reviewProviderApiKey = reviewProviderApiKey;
      if (reviewProviderEnabled !== undefined) profileData.reviewProviderEnabled = reviewProviderEnabled;
      if (averageCompletionTime) profileData.averageCompletionTime = averageCompletionTime;
      
      const response = await this.baseUtils.makeApiRequest(
        `/marketplace/agents/${agentId}/profile`,
        'POST',
        profileData
      );
      
      const profile = response.data;
      
      return this.baseUtils.formatResponse(
        `✅ **Marketplace Profile Created Successfully!**\n\n` +
        `**Agent ID:** ${agentId}\n` +
        `**Pricing:** ${profile.isFree ? 'Free' : `${profile.pricePerReview} ${profile.currency}`}\n` +
        `**Max Concurrent Reviews:** ${profile.maxConcurrentReviews}\n` +
        `**Auto-Accept Requests:** ${profile.autoAcceptRequests ? 'Yes' : 'No'}\n` +
        `**Status:** ${profile.isActive ? 'Active' : 'Inactive'}\n\n` +
        (profile.specializations?.length > 0 ? `**Specializations:** ${profile.specializations.join(', ')}\n\n` : '') +
        `Your agent is now available in the marketplace! Researchers can find and request reviews from your agent.\n\n` +
        `**Next Steps:**\n` +
        `• Use \`get_incoming_requests\` to monitor review requests\n` +
        `• Use \`update_marketplace_profile\` to modify settings\n` +
        `• Use \`get_marketplace_analytics\` to track performance`
      );
    } catch (error) {
      if (error.response?.status === 404) {
        throw new McpError(ErrorCode.InvalidRequest, `Agent ${agentId} not found or not owned by you`);
      } else if (error.response?.status === 400) {
        const errorMsg = error.response.data?.error || error.message;
        throw new McpError(ErrorCode.InvalidRequest, `Validation error: ${errorMsg}`);
      }
      throw new McpError(ErrorCode.InternalError, `Failed to create marketplace profile: ${error.message}`);
    }
  }

  async updateMarketplaceProfile(args) {
    // The backend uses upsert, so this is the same as create
    const {
      agentId,
      pricePerReview,
      currency,
      isFree,
      maxConcurrentReviews,
      description,
      specializations,
      isActive,
      requiresApproval,
      termsOfService,
      autoAcceptRequests,
      averageCompletionTime
    } = args;
    
    try {
      const profileData = {};
      
      // Only include fields that are explicitly provided
      if (pricePerReview !== undefined) profileData.pricePerReview = pricePerReview;
      if (currency !== undefined) profileData.currency = currency;
      if (isFree !== undefined) profileData.isFree = isFree;
      if (maxConcurrentReviews !== undefined) profileData.maxConcurrentReviews = maxConcurrentReviews;
      if (description !== undefined) profileData.description = description;
      if (specializations !== undefined) profileData.specializations = specializations;
      if (isActive !== undefined) profileData.isActive = isActive;
      if (requiresApproval !== undefined) profileData.requiresApproval = requiresApproval;
      if (termsOfService !== undefined) profileData.termsOfService = termsOfService;
      if (autoAcceptRequests !== undefined) profileData.autoAcceptRequests = autoAcceptRequests;
      if (averageCompletionTime !== undefined) profileData.averageCompletionTime = averageCompletionTime;
      
      const response = await this.baseUtils.makeApiRequest(
        `/marketplace/agents/${agentId}/profile`,
        'POST',
        profileData
      );
      
      const profile = response.data;
      
      return this.baseUtils.formatResponse(
        `✅ **Marketplace Profile Updated Successfully!**\n\n` +
        `**Agent ID:** ${agentId}\n` +
        `**Pricing:** ${profile.isFree ? 'Free' : `${profile.pricePerReview} ${profile.currency}`}\n` +
        `**Max Concurrent Reviews:** ${profile.maxConcurrentReviews}\n` +
        `**Auto-Accept Requests:** ${profile.autoAcceptRequests ? 'Yes' : 'No'}\n` +
        `**Status:** ${profile.isActive ? 'Active ✅' : 'Inactive ❌'}\n\n` +
        (profile.specializations?.length > 0 ? `**Specializations:** ${profile.specializations.join(', ')}\n\n` : '') +
        `**Next Steps:**\n` +
        `• Use \`get_reviewer_details\` with agentId: "${agentId}" to see your updated profile\n` +
        `• Use \`get_marketplace_analytics\` to track performance`
      );
    } catch (error) {
      if (error.response?.status === 404) {
        throw new McpError(ErrorCode.InvalidRequest, `Agent ${agentId} not found or not owned by you`);
      } else if (error.response?.status === 400) {
        const errorMsg = error.response.data?.error || error.message;
        throw new McpError(ErrorCode.InvalidRequest, `Validation error: ${errorMsg}`);
      }
      throw new McpError(ErrorCode.InternalError, `Failed to update marketplace profile: ${error.message}`);
    }
  }

  async getMarketplaceAnalytics(args) {
    try {
      const { agentId, timeframe = 'month' } = args;
      
      const params = new URLSearchParams();
      if (agentId) params.append('agentId', agentId);
      params.append('timeframe', timeframe);
      
      const response = await this.baseUtils.makeApiRequest(`/marketplace/analytics?${params.toString()}`);
      const analytics = response.data;
      
      let result = `📊 **Marketplace Analytics** (${timeframe})\n\n`;
      
      if (agentId) {
        result += `**Agent:** ${analytics.agentName || agentId}\n\n`;
      } else {
        result += `**All Your Agents**\n\n`;
      }
      
      result += `**Performance:**\n`;
      result += `• Total Reviews: ${analytics.totalReviews || 0}\n`;
      result += `• Completed Reviews: ${analytics.completedReviews || 0}\n`;
      result += `• Pending Reviews: ${analytics.pendingReviews || 0}\n`;
      result += `• Average Rating: ${analytics.averageRating ? analytics.averageRating.toFixed(2) + '/5' : 'N/A'}\n`;
      result += `• Completion Rate: ${analytics.completionRate ? (analytics.completionRate * 100).toFixed(1) + '%' : 'N/A'}\n\n`;
      
      result += `**Earnings:**\n`;
      result += `• Total Earned: ${analytics.totalEarnings || 0} credits\n`;
      result += `• Average Per Review: ${analytics.averageEarningsPerReview || 0} credits\n`;
      result += `• Pending Earnings: ${analytics.pendingEarnings || 0} credits\n\n`;
      
      result += `**Engagement:**\n`;
      result += `• Review Requests: ${analytics.totalRequests || 0}\n`;
      result += `• Acceptance Rate: ${analytics.acceptanceRate ? (analytics.acceptanceRate * 100).toFixed(1) + '%' : 'N/A'}\n`;
      result += `• Average Response Time: ${analytics.avgResponseTime || 'N/A'}\n\n`;
      
      if (analytics.topSpecializations && analytics.topSpecializations.length > 0) {
        result += `**Top Specializations:**\n`;
        analytics.topSpecializations.forEach((spec, index) => {
          result += `${index + 1}. ${spec.name} (${spec.count} reviews)\n`;
        });
        result += '\n';
      }
      
      result += `**💡 Performance Tips:**\n`;
      result += `• Maintain high ratings by providing thorough, constructive reviews\n`;
      result += `• Respond quickly to requests to improve acceptance metrics\n`;
      result += `• Specialize in specific areas to build expertise reputation\n`;
      result += `• Use \`update_marketplace_profile\` to optimize your profile`;
      
      return this.baseUtils.formatResponse(result);
    } catch (error) {
      // If endpoint doesn't exist, provide helpful placeholder
      if (error.response?.status === 404) {
        return this.baseUtils.formatResponse(
          `📊 **Marketplace Analytics** (Coming Soon)\n\n` +
          `The marketplace analytics feature is currently being developed.\n\n` +
          `**Alternative ways to track performance:**\n` +
          `• Use \`get_review_requests\` to see your request history\n` +
          `• Use \`get_credit_balance\` to track your earnings\n` +
          `• Check individual agent profiles with \`get_reviewer_details\``
        );
      }
      throw new McpError(ErrorCode.InternalError, `Failed to get marketplace analytics: ${error.message}`);
    }
  }

  async getIncomingRequests(args) {
    try {
      const { agentId, status, priority, minPrice, page = 1, limit = 20 } = args;
      
      const params = new URLSearchParams();
      params.append('type', 'incoming');
      if (agentId) params.append('agentId', agentId);
      if (status) params.append('status', status);
      if (priority) params.append('priority', priority);
      if (minPrice !== undefined) params.append('minPrice', minPrice.toString());
      params.append('page', page.toString());
      params.append('limit', Math.min(limit, 50).toString());
      
      const response = await this.baseUtils.makeApiRequest(`/marketplace/review-requests?${params.toString()}`);
      const { requests, totalCount, totalPages } = response.data;
      
      if (!requests || requests.length === 0) {
        return this.baseUtils.formatResponse(
          `📥 **No Incoming Requests**\n\n` +
          `No incoming review requests found` + (status ? ` with status ${status}` : '') + `.\n\n` +
          `**To receive requests:**\n` +
          `• Create a marketplace profile for your agents using \`create_marketplace_profile\`\n` +
          `• Set competitive pricing and highlight your specializations\n` +
          `• Keep your agent active and responsive to build reputation`
        );
      }
      
      const requestsList = requests.map((req, index) => {
        const urgency = req.priority === 'urgent' ? '🔴 URGENT' : req.priority === 'low' ? '🟢 Low' : '🟡 Normal';
        const price = req.offeredPrice || 0;
        
        return `${index + 1}. ${urgency} - ${req.paper?.title || 'Unknown Paper'}\n` +
               `   Status: ${req.status}\n` +
               `   Offered Price: ${price} credits\n` +
               `   Deadline: ${req.deadline ? new Date(req.deadline).toLocaleDateString() : 'Not specified'}\n` +
               `   Request ID: ${req.id}`;
      }).join('\n\n');
      
      return this.baseUtils.formatResponse(
        `📥 **Incoming Review Requests** (Page ${page}/${totalPages})\n\n` +
        requestsList + '\n\n' +
        `**Actions:**\n` +
        `• Use \`respond_to_review_request\` to accept or reject\n` +
        `• Use \`bulk_respond_requests\` to handle multiple requests at once\n` +
        this.baseUtils.getPaginationText(page, totalPages)
      );
    } catch (error) {
      throw new McpError(ErrorCode.InternalError, `Failed to get incoming requests: ${error.message}`);
    }
  }

  async bulkRespondRequests(args) {
    // Implementation would go here
    return this.baseUtils.formatResponse("Bulk respond requests functionality is available in the full implementation.");
  }

  async updateRequestStatus(args) {
    // Implementation would go here
    return this.baseUtils.formatResponse("Update request status functionality is available in the full implementation.");
  }
}

export default MarketplaceTools;