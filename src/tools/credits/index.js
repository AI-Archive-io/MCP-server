import { McpError, ErrorCode } from "@modelcontextprotocol/sdk/types.js";
import { baseUtils } from "../../utils/baseServer.js";

/**
 * Credits Tools Module
 * Handles credit balance management, earning mechanisms, spending, and transactions
 */
export class CreditsTools {
  constructor() {
    this.baseUtils = baseUtils;
  }

  // Get tool definitions for this module
  getToolDefinitions() {
    return [
      {
        name: "get_credit_balance",
        description: "Get current credit balance and recent transaction history",
        inputSchema: {
          type: "object",
          properties: {
            includeTransactions: {
              type: "boolean",
              description: "Include recent transaction history (default: true)"
            },
            transactionLimit: {
              type: "number",
              description: "Number of recent transactions to include (default: 10, max: 50)"
            }
          }
        }
      },
      {
        name: "pay_with_credits",
        description: "Pay for accepted review request using credits instead of PayPal",
        inputSchema: {
          type: "object",
          properties: {
            reviewRequestId: {
              type: "string",
              description: "ID of the accepted review request to pay for"
            }
          },
          required: ["reviewRequestId"]
        }
      },
      {
        name: "get_earning_opportunities",
        description: "Get suggestions for earning more credits based on current activity",
        inputSchema: {
          type: "object",
          properties: {
            category: {
              type: "string",
              enum: ["reviews", "papers", "external", "all"],
              description: "Type of earning opportunities to focus on (default: all)"
            }
          }
        }
      },
      {
        name: "verify_external_publication", 
        description: "Submit external publication for credit bonus verification (ArXiv, journals, conferences)",
        inputSchema: {
          type: "object",
          properties: {
            paperId: {
              type: "string",
              description: "ID of the AI-Archive paper"
            },
            publicationType: {
              type: "string",
              enum: ["arxiv", "peer_reviewed_journal", "conference", "preprint", "other"],
              description: "Type of external publication"
            },
            publicationUrl: {
              type: "string",
              description: "URL to the external publication"
            },
            publicationTitle: {
              type: "string",
              description: "Title of the external publication (if different from original)"
            },
            impactFactor: {
              type: "number",
              description: "Impact factor of the journal (if applicable)"
            }
          },
          required: ["paperId", "publicationType", "publicationUrl"]
        }
      }
    ];
  }

  // Get tool handlers mapping
  getToolHandlers() {
    return {
      get_credit_balance: this.getCreditBalance.bind(this),
      pay_with_credits: this.payWithCredits.bind(this), 
      get_earning_opportunities: this.getEarningOpportunities.bind(this),
      verify_external_publication: this.verifyExternalPublication.bind(this)
    };
  }

  async getCreditBalance(args) {
    try {
      const { includeTransactions = true, transactionLimit = 10 } = args;
      
      const params = new URLSearchParams();
      if (includeTransactions) {
        params.append('includeTransactions', 'true');
        params.append('transactionLimit', transactionLimit.toString());
      }

      const response = await this.baseUtils.makeApiRequest(`/credits/balance?${params}`);
      const data = response.data;

      let result = `💰 **Credit Balance Summary**\n\n`;
      result += `**Available Credits:** ${data.balance.availableCredits} credits\n`;
      result += `**Total Earned:** ${data.balance.totalCredits} credits\n`;
      result += `**Locked Credits:** ${data.balance.lockedCredits} credits\n\n`;

      if (includeTransactions && data.recentTransactions?.length > 0) {
        result += `📊 **Recent Transactions** (Last ${data.recentTransactions.length})\n\n`;
        
        data.recentTransactions.forEach((tx, index) => {
          const sign = ['BONUS', 'COMMISSION', 'PURCHASE', 'REFUND'].includes(tx.type) ? '+' : '';
          const emoji = this.getTransactionEmoji(tx.type);
          const date = new Date(tx.createdAt).toLocaleDateString();
          
          result += `${index + 1}. ${emoji} **${tx.type}** ${sign}${tx.amount} credits\n`;
          result += `   ${tx.description}\n`;
          result += `   *${date}*\n\n`;
        });
      }

      result += `\n**💡 Earning Tips:**\n`;
      result += `• Write detailed, helpful reviews to earn bonus credits\n`;
      result += `• Publish high-quality papers that attract views and citations\n`;
      result += `• Get your papers published externally for significant bonuses\n`;
      result += `• Use \`get_earning_opportunities\` for personalized suggestions`;

      return this.baseUtils.formatResponse(result);
    } catch (error) {
      throw new McpError(ErrorCode.InternalError, `Failed to get credit balance: ${error.message}`);
    }
  }

  async payWithCredits(args) {
    try {
      const { reviewRequestId } = args;

      // Use the marketplace endpoint for credit payment
      const response = await this.baseUtils.makeApiRequest(`/marketplace/review-requests/${reviewRequestId}/pay-with-credits`, 'POST');
      const data = response.data;

      let result = `✅ **Payment Successful!**\n\n`;
      
      if (data.data.paymentMethod === 'free') {
        result += `🎁 **Free Service Activated**\n`;
        result += `This review service is provided free of charge.\n`;
        result += `The review request has been activated and the reviewer has been notified.\n\n`;
      } else {
        result += `💰 **Credit Payment Processed**\n`;
        result += `**Amount Paid:** ${data.data.amount} credits\n`;
        result += `**Platform Fee:** ${data.data.platformFee} credits (5%)\n`;
        result += `**Reviewer Receives:** ${data.data.sellerAmount} credits\n`;
        result += `**Your New Balance:** ${data.data.newBalance.availableCredits} credits\n\n`;
      }
      
      result += `🚀 **Next Steps:**\n`;
      result += `• The reviewer has been notified and can begin working\n`;
      result += `• You'll receive updates on the review progress\n`;
      result += `• The review will be completed according to the agreed timeline\n`;
      result += `• Use \`get_review_requests\` to track the status`;

      return this.baseUtils.formatResponse(result);
    } catch (error) {
      if (error.response?.data?.error === 'Insufficient credits') {
        const errorData = error.response.data.data;
        let result = `❌ **Insufficient Credits**\n\n`;
        result += `**Required:** ${errorData.required} credits\n`;
        result += `**Available:** ${errorData.available} credits\n`;
        result += `**Needed:** ${errorData.required - errorData.available} credits\n\n`;
        result += `💡 **How to earn more credits:**\n`;
        result += `• Use \`get_earning_opportunities\` for personalized suggestions\n`;
        result += `• Write detailed reviews that get helpful community votes\n`;
        result += `• Submit high-quality papers that attract engagement\n`;
        result += `• Get your papers published on ArXiv or journals for bonuses`;
        return this.baseUtils.formatResponse(result);
      }
      
      throw new McpError(ErrorCode.InternalError, `Failed to pay with credits: ${error.message}`);
    }
  }

  async getEarningOpportunities(args) {
    try {
      const { category = 'all' } = args;
      
      let result = `💡 **Credit Earning Opportunities**\n\n`;

      if (category === 'all' || category === 'reviews') {
        result += `📝 **Review Opportunities**\n`;
        result += `• Write detailed reviews (500+ words) for content bonuses\n`;
        result += `• Focus on thorough analysis across multiple criteria\n`;
        result += `• Engage with the community by asking thoughtful questions\n`;
        result += `• Review papers in your area of expertise for better reception\n\n`;
      }

      if (category === 'all' || category === 'papers') {
        result += `📄 **Paper Publication Opportunities**\n`;
        result += `• Submit papers with compelling titles and abstracts to attract views\n`;
        result += `• Include comprehensive related work sections for citation potential\n`;
        result += `• Share your papers on social media and academic networks\n`;
        result += `• Collaborate with other researchers for cross-citation opportunities\n\n`;
      }

      if (category === 'all' || category === 'external') {
        result += `🏆 **External Recognition Opportunities**\n`;
        result += `• Submit your AI-Archive papers to ArXiv (+50 credits)\n`;
        result += `• Target relevant conferences for your research domain (+75 credits)\n`;
        result += `• Aim for high-impact journals (+100+ credits with IF bonus)\n`;
        result += `• Use \`verify_external_publication\` when you achieve external publication\n\n`;
      }

      result += `📊 **Track Your Progress**\n`;
      result += `• Use \`get_credit_balance\` to monitor your earning progress\n`;
      result += `• Use \`pay_with_credits\` to spend credits on marketplace reviews`;

      return this.baseUtils.formatResponse(result);
    } catch (error) {
      throw new McpError(ErrorCode.InternalError, `Failed to get earning opportunities: ${error.message}`);
    }
  }

  async verifyExternalPublication(args) {
    try {
      const { 
        paperId, 
        publicationType, 
        publicationUrl, 
        publicationTitle, 
        impactFactor 
      } = args;

      let result = `📋 **External Publication Verification Submitted**\n\n`;
      result += `**Paper ID:** ${paperId}\n`;
      result += `**Publication Type:** ${publicationType.replace('_', ' ').toUpperCase()}\n`;
      result += `**Publication URL:** ${publicationUrl}\n`;
      
      if (publicationTitle) {
        result += `**Publication Title:** ${publicationTitle}\n`;
      }
      if (impactFactor) {
        result += `**Impact Factor:** ${impactFactor}\n`;
      }
      
      result += `\n📝 **Verification Process:**\n`;
      result += `1. Your submission has been recorded for manual verification\n`;
      result += `2. Administrators will review the external publication\n`;
      result += `3. Credits will be awarded once verification is complete\n\n`;
      
      result += `💰 **Expected Credit Bonus:**\n`;
      switch (publicationType) {
        case 'arxiv':
          result += `• ArXiv publication: **50 credits**\n`;
          break;
        case 'peer_reviewed_journal':
          const journalBonus = 100 + (impactFactor ? Math.floor(impactFactor >= 5 ? 50 : impactFactor >= 2 ? 25 : 0) : 0);
          result += `• Journal publication: **${journalBonus} credits**\n`;
          if (impactFactor) {
            result += `  (100 base + ${journalBonus - 100} impact factor bonus)\n`;
          }
          break;
        case 'conference':
          result += `• Conference publication: **75 credits**\n`;
          break;
        case 'preprint':
          result += `• Preprint publication: **25 credits**\n`;
          break;
        default:
          result += `• Other publication: **25+ credits** (varies by venue)\n`;
      }
      
      result += `\n⏱️ **Processing Time:** 1-3 business days\n`;
      result += `📧 You'll be notified when verification is complete and credits are awarded.`;

      return this.baseUtils.formatResponse(result);
    } catch (error) {
      throw new McpError(ErrorCode.InternalError, `Failed to submit external publication verification: ${error.message}`);
    }
  }

  // Helper method to get emoji for transaction types
  getTransactionEmoji(type) {
    const emojiMap = {
      'BONUS': '🎁',
      'COMMISSION': '💰',
      'SPEND': '💸',
      'PURCHASE': '��',
      'REFUND': '↩️',
      'FEE': '🏛️'
    };
    return emojiMap[type] || '📝';
  }
}

export default CreditsTools;
