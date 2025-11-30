import { McpError, ErrorCode } from "@modelcontextprotocol/sdk/types.js";
import { baseUtils } from "../../utils/baseServer.js";

/**
 * Review Management Tools Module
 * Handles submission, retrieval, and management of peer reviews
 */
export class ReviewTools {
  constructor() {
    this.baseUtils = baseUtils;
  }

  // Get tool definitions for this module
  getToolDefinitions() {
    return [
      {
        name: "submit_review",
        description: "Submit a comprehensive peer review for a paper with AI agent scoring system. IMPORTANT: Before submitting, ensure you have read and analyzed the full paper. Suggest thoughtful scores (1-10) and detailed reasoning to the user for their approval.",
        inputSchema: {
          type: "object",
          properties: {
            paperId: {
              type: "string",
              description: "ID of the paper being reviewed"
            },
            summary: {
              type: "string",
              description: "Comprehensive review summary (100-5000 characters)"
            },
            strengths: {
              type: "string",
              description: "Paper strengths analysis (50-3000 characters)"
            },
            weaknesses: {
              type: "string",
              description: "Paper weaknesses and areas for improvement (50-3000 characters)"
            },
            questions: {
              type: "string",
              description: "Questions for paper supervisors (optional, max 2000 characters)"
            },
            scores: {
              type: "object",
              properties: {
                novelty: { type: "number", minimum: 1, maximum: 10 },
                correctness: { type: "number", minimum: 1, maximum: 10 },
                relevanceHuman: { type: "number", minimum: 1, maximum: 10 },
                relevanceMachine: { type: "number", minimum: 1, maximum: 10 },
                clarity: { type: "number", minimum: 1, maximum: 10 },
                significance: { type: "number", minimum: 1, maximum: 10 },
                overall: { type: "number", minimum: 1, maximum: 10 },
                confidence: { type: "number", minimum: 1, maximum: 10 }
              },
              required: ["novelty", "correctness", "relevanceHuman", "relevanceMachine", "clarity", "significance", "overall", "confidence"],
              additionalProperties: false
            },
            scoreReasonings: {
              type: "object",
              properties: {
                novelty: { type: "string", description: "Reasoning for novelty score" },
                correctness: { type: "string", description: "Reasoning for correctness score" },
                relevanceHuman: { type: "string", description: "Reasoning for human relevance score" },
                relevanceMachine: { type: "string", description: "Reasoning for machine relevance score" },
                clarity: { type: "string", description: "Reasoning for clarity score" },
                significance: { type: "string", description: "Reasoning for significance score" },
                overall: { type: "string", description: "Reasoning for overall score" }
              },
              description: "HIGHLY RECOMMENDED: Detailed reasoning for each score helps authors understand your assessment and improves review quality."
            },
            detailedAnalysis: {
              type: "object",
              properties: {
                methodology: { type: "string", description: "Analysis of research methodology" },
                technicalQuality: { type: "string", description: "Assessment of technical quality" },
                reproducibility: { type: "string", description: "Evaluation of reproducibility" },
                significance: { type: "string", description: "Assessment of significance and impact" }
              },
              description: "RECOMMENDED: Structured detailed analysis provides additional context and helps authors improve their work."
            },
            confidenceLevel: {
              type: "number",
              minimum: 1,
              maximum: 5,
              description: "Reviewer confidence level (1-5)"
            },
            modelUsed: {
              type: "string",
              description: "AI model identifier used for review"
            },
            processingTime: {
              type: "number",
              description: "Time taken for review in seconds"
            },
            tags: {
              type: "array",
              items: { type: "string" },
              description: "Review tags/categories"
            }
          },
          required: ["paperId", "summary", "strengths", "weaknesses", "scores"]
        }
      },
      {
        name: "get_reviews",
        description: "List reviews with filtering options",
        inputSchema: {
          type: "object",
          properties: {
            page: { type: "number", description: "Page number (default: 1)" },
            limit: { type: "number", description: "Reviews per page (default: 20)" },
            paperId: { type: "string", description: "Filter by specific paper" },
            reviewerType: { type: "string", enum: ["human", "ai_agent"], description: "Filter by reviewer type" }
          }
        }
      },
      {
        name: "get_paper_reviews",
        description: "Get all reviews for a specific paper",
        inputSchema: {
          type: "object",
          properties: {
            paperId: { type: "string", description: "ID of paper to get reviews for" }
          },
          required: ["paperId"]
        }
      },
      {
        name: "update_review",
        description: "Update an existing review",
        inputSchema: {
          type: "object",
          properties: {
            reviewId: { type: "string", description: "ID of review to update" },
            summary: { type: "string", description: "Updated review summary" },
            strengths: { type: "string", description: "Updated strengths analysis" },
            weaknesses: { type: "string", description: "Updated weaknesses analysis" },
            questions: { type: "string", description: "Updated questions" },
            scores: {
              description: "Comprehensive scoring system (all 1-10 scale). JSON object or string with fields: novelty, correctness, relevanceHuman, relevanceMachine, clarity, significance, overall, confidence.",
              type: ["object", "string"]
            },
          },
          required: ["reviewId"]
        }
      }
    ];
  }

  // Get tool handlers for this module
  getToolHandlers() {
    return {
      "submit_review": this.submitReview.bind(this),
      "get_reviews": this.getReviews.bind(this),
      "get_paper_reviews": this.getPaperReviews.bind(this),
      "update_review": this.updateReview.bind(this)
    };
  }

  async submitReview(args) {
    console.log("submitReview received args:", JSON.stringify(args, null, 2));
    const { 
      paperId, 
      summary,
      strengths, 
      weaknesses, 
      questions,
      scores,
      scoreReasonings,
      detailedAnalysis,
      modelUsed,
      processingTime,
      tags = []
    } = args;
    
    // Validate scores
    let processedScores = scores;
    if (!processedScores) {
      console.error("Missing scores parameter in args:", args);
      throw new McpError(ErrorCode.InvalidParams, "Missing required 'scores' parameter");
    }
    
    // Handle case where scores is passed as a string
    if (typeof processedScores === 'string') {
      try {
        processedScores = JSON.parse(processedScores);
      } catch (e) {
        throw new McpError(ErrorCode.InvalidParams, "Invalid 'scores' format. Expected JSON object.");
      }
    }

    // Map to API format with the new 8-score system
    const reviewData = {
      paperId,
      summary,
      strengths,
      weaknesses,
      questions,
      
      // All scores on 1-10 scale
      noveltyScore: processedScores.novelty,
      correctnessScore: processedScores.correctness,
      relevanceHumanScore: processedScores.relevanceHuman,
      relevanceMachineScore: processedScores.relevanceMachine,
      clarityScore: processedScores.clarity,
      significanceScore: processedScores.significance,
      overallScore: processedScores.overall,
      confidenceLevel: processedScores.confidence,
      
      // AI-specific metadata
      reviewerType: 'ai_agent',
      modelUsed,
      processingTime,
      automated: true,
      humanValidated: false,
      detailedAnalysis,
      scoreReasonings,
      tags
    };

    const review = await this.baseUtils.makeApiRequest('/reviews', 'POST', reviewData);

    return this.baseUtils.formatResponse(
      `🤖 AI Review submitted successfully!\n\n` +
      `**Paper:** ${review.data.paper.title}\n` +
      `**Review ID:** ${review.data.id}\n\n` +
      `**Comprehensive Scoring (1-10 scale):**\n` +
      `• 🆕 Novelty: ${processedScores.novelty}/10\n` +
      `• ✅ Correctness: ${processedScores.correctness}/10\n` +
      `• 👥 Human Relevance: ${processedScores.relevanceHuman}/10\n` +
      `• 🤖 Machine Relevance: ${processedScores.relevanceMachine}/10\n` +
      `• 📝 Clarity: ${processedScores.clarity}/10\n` +
      `• 🎯 Significance: ${processedScores.significance}/10\n` +
      `• 🏆 Overall: ${processedScores.overall}/10\n` +
      `• 💪 Confidence: ${processedScores.confidence}/10\n\n` +
      `**Model Used:** ${modelUsed || 'Not specified'}\n` +
      `**Processing Time:** ${processingTime ? `${processingTime.toFixed(2)}s` : 'Not recorded'}\n` +
      `**Tags:** ${tags.length > 0 ? tags.join(', ') : 'None'}\n` +
      `**Submitted:** ${new Date(review.data.createdAt).toLocaleString()}\n\n` +
      `The comprehensive AI review has been integrated into the peer review system! 🚀`
    );
  }

  async getReviews(args) {
    const { page = 1, limit = 20, paperId, reviewerType } = args;
    
    try {
      const params = new URLSearchParams();
      params.append('page', page.toString());
      params.append('limit', Math.min(limit, 50).toString());
      if (paperId) params.append('paperId', paperId);
      if (reviewerType) params.append('reviewerType', reviewerType);
      
      const response = await this.baseUtils.makeApiRequest(`/reviews?${params.toString()}`);
      const responseData = response.data || response;
      const reviews = responseData.reviews || [];
      const pagination = responseData.pagination || {};
      const totalCount = pagination.totalCount || 0;
      const totalPages = Math.ceil(totalCount / limit);
      
      if (!reviews || reviews.length === 0) {
        return this.baseUtils.formatResponse(
          `📝 **No Reviews Found**\n\n` +
          `No reviews found matching your criteria.`
        );
      }
      
      const reviewsList = reviews.map((review, index) => 
        `${index + 1}. **${review.paper?.title || 'Unknown Paper'}**\n` +
        `   Reviewer: ${review.reviewerType === 'ai_agent' ? '🤖 AI Agent' : '👤 Human'} • Overall: ${review.overallScore || 'N/A'}/10\n` +
        `   ID: ${review.id} • Created: ${new Date(review.createdAt).toLocaleDateString()}\n` +
        `   Summary: ${review.summary ? review.summary.substring(0, 100) + '...' : 'No summary'}`
      ).join('\n\n');
      
      return this.baseUtils.formatResponse(
        `📝 **Reviews** (${totalCount} total, Page ${page}/${totalPages})\n\n` +
        reviewsList + '\n\n' +
        `**Actions Available:**\n` +
        `• Use \`update_review\` to modify existing reviews\n` +
        `• Use \`get_paper_reviews\` to see all reviews for a specific paper\n` +
        this.baseUtils.getPaginationText(page, totalPages)
      );
    } catch (error) {
      throw new McpError(ErrorCode.InternalError, `Failed to get reviews: ${error.message}`);
    }
  }

  async getPaperReviews(args) {
    const { paperId } = args;
    
    try {
      const response = await this.baseUtils.makeApiRequest(`/reviews/paper/${paperId}`);
      const responseData = response.data || response;
      const reviews = responseData.reviews || [];
      
      if (!reviews || reviews.length === 0) {
        return this.baseUtils.formatResponse(
          `📝 **No Reviews Found**\n\n` +
          `Paper ${paperId} has no reviews yet.`
        );
      }
      
      const reviewsList = reviews.map((review, index) => 
        `${index + 1}. ${review.reviewerType === 'ai_agent' ? '🤖 AI Agent' : '👤 Human'} Review\n` +
        `   Overall: ${review.overallScore || 'N/A'}/10 • Confidence: ${review.confidenceLevel || 'N/A'}/10\n` +
        `   Scores: N:${review.noveltyScore || 'N/A'} C:${review.correctnessScore || 'N/A'} RH:${review.relevanceHumanScore || 'N/A'} RM:${review.relevanceMachineScore || 'N/A'} Cl:${review.clarityScore || 'N/A'} S:${review.significanceScore || 'N/A'}\n` +
        `   Created: ${new Date(review.createdAt).toLocaleDateString()} • ID: ${review.id}\n` +
        `   Summary: ${review.summary || 'No summary provided'}`
      ).join('\n\n');
      
      return this.baseUtils.formatResponse(
        `📝 **Reviews for Paper ${paperId}** (${reviews.length} total)\n\n` +
        reviewsList
      );
    } catch (error) {
      if (error.response?.status === 404) {
        throw new McpError(ErrorCode.InvalidRequest, `Paper ${paperId} not found`);
      }
      throw new McpError(ErrorCode.InternalError, `Failed to get paper reviews: ${error.message}`);
    }
  }

  async updateReview(args) {
    const { reviewId, summary, strengths, weaknesses, questions, scores } = args;
    
    try {
      const updateData = {};
      if (summary) updateData.summary = summary;
      if (strengths) updateData.strengths = strengths;
      if (weaknesses) updateData.weaknesses = weaknesses;
      if (questions) updateData.questions = questions;
      
      if (scores) {
        let processedScores = scores;
        if (typeof processedScores === 'string') {
          try {
            processedScores = JSON.parse(processedScores);
          } catch (e) {
            // If parsing fails, ignore scores or throw? 
            // For update, maybe we can just log or ignore, but throwing is safer to alert the user.
            throw new McpError(ErrorCode.InvalidParams, "Invalid 'scores' format. Expected JSON object.");
          }
        }

        if (processedScores.novelty) updateData.noveltyScore = processedScores.novelty;
        if (processedScores.correctness) updateData.correctnessScore = processedScores.correctness;
        if (processedScores.relevanceHuman) updateData.relevanceHumanScore = processedScores.relevanceHuman;
        if (processedScores.relevanceMachine) updateData.relevanceMachineScore = processedScores.relevanceMachine;
        if (processedScores.clarity) updateData.clarityScore = processedScores.clarity;
        if (processedScores.significance) updateData.significanceScore = processedScores.significance;
        if (processedScores.overall) updateData.overallScore = processedScores.overall;
        if (processedScores.confidence) updateData.confidenceLevel = processedScores.confidence;
      }
      
      const response = await this.baseUtils.makeApiRequest(`/reviews/${reviewId}`, 'PUT', updateData);
      
      const review = response.data;
      
      return this.baseUtils.formatResponse(
        `✅ **Review Updated Successfully!**\n\n` +
        `**Review ID:** ${review.id}\n` +
        `**Paper:** ${review.paper?.title || 'Unknown'}\n` +
        `**Overall Score:** ${review.overallScore || 'N/A'}/10\n` +
        `**Confidence:** ${review.confidenceLevel || 'N/A'}/10\n` +
        `**Last Updated:** ${new Date(review.updatedAt).toLocaleString()}`
      );
    } catch (error) {
      if (error.response?.status === 404) {
        throw new McpError(ErrorCode.InvalidRequest, `Review ${reviewId} not found`);
      }
      if (error.response?.status === 403) {
        throw new McpError(ErrorCode.InvalidRequest, 'You do not have permission to update this review');
      }
      throw new McpError(ErrorCode.InternalError, `Failed to update review: ${error.message}`);
    }
  }
}

export default ReviewTools;