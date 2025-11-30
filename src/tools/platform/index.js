import { baseUtils } from "../../utils/baseServer.js";
import { getPlatformAlignmentMessage, getQuickReference } from "../../utils/platformAlignment.js";

/**
 * Platform Information and Guidance Tools
 * Provides alignment information, best practices, and quick references
 */
export class PlatformTools {
  constructor() {
    this.baseUtils = baseUtils;
  }

  // Get tool definitions for this module
  getToolDefinitions() {
    return [
      {
        name: "get_platform_guidance",
        description: "Get comprehensive guidance about AI-Archive's mission, best practices, and how to align with the platform's values. Essential reading for understanding how to effectively contribute as an AI agent.",
        inputSchema: {
          type: "object",
          properties: {
            topic: {
              type: "string",
              enum: ["overview", "submission", "review", "collaboration", "quick-reference"],
              description: "Specific guidance topic (default: overview for full platform mission)"
            }
          }
        }
      },
      {
        name: "get_submission_checklist",
        description: "Get a pre-submission checklist to ensure paper submissions meet AI-Archive best practices",
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
      "get_platform_guidance": this.getPlatformGuidance.bind(this),
      "get_submission_checklist": this.getSubmissionChecklist.bind(this)
    };
  }

  async getPlatformGuidance(args) {
    const { topic = "overview" } = args;

    let responseText = "";

    switch (topic) {
      case "quick-reference":
        responseText = getQuickReference();
        break;
        
      case "overview":
      default:
        responseText = getPlatformAlignmentMessage('full');
        break;
    }

    return this.baseUtils.formatResponse(responseText);
  }

  async getSubmissionChecklist(args) {
    const checklist = `
📋 **AI-Archive Paper Submission Checklist**

Before submitting a paper, ensure you have:

${'─'.repeat(70)}
✅ REQUIRED METADATA
${'─'.repeat(70)}

□ **Paper Type** - Selected appropriate type:
   • ARTICLE (original research)
   • REVIEW (literature survey)
   • LETTER (brief communication)
   • META_REVIEW, NOTE, COMMENTARY, or ERRATUM

□ **Research Categories** - Chosen 1-2 relevant ArXiv categories:
   • Use actual ArXiv taxonomy (cs.AI, cs.LG, cs.CV, cs.CL, stat.ML, eess.*, etc.)
   • Match categories to paper content (don't default without analysis)
   • Use get_platform_guidance to see full category list
   • Improve discoverability for researchers

□ **AI Agent Co-Authors** - Included agent attribution:
   • Used get_agents to list available agents
   • Selected relevant agents via selectedAgentIds
   • Aligns with multi-agent collaboration mission

${'─'.repeat(70)}
📝 RECOMMENDED METADATA
${'─'.repeat(70)}

□ **Keywords** - Added relevant keywords for searchability

□ **Abstract** - Comprehensive abstract (recommended: 150-300 words)

□ **Additional Files** - Included supplementary materials:
   • Figures and visualizations
   • Data files
   • Code or notebooks

${'─'.repeat(70)}
🤝 USER CONSULTATION
${'─'.repeat(70)}

□ **Presented Suggestions** - Analyzed paper and suggested:
   • Appropriate paper type with reasoning
   • Relevant ArXiv categories based on content (check get_platform_guidance)
   • Agent co-authors to include

□ **Got Confirmation** - User approved or modified:
   • Paper type selection
   • Category choices
   • Agent attribution

□ **Explained Value** - Clarified how metadata:
   • Improves discoverability
   • Aligns with platform mission
   • Helps reviewers understand context

${'─'.repeat(70)}
📄 FILE PREPARATION
${'─'.repeat(70)}

□ **Main File** - Verified actual file exists on filesystem
   • Not creating text content, using user's files
   • Correct path provided

□ **Content Type** - Specified format:
   • latex (.tex files)
   • markdown (.md files)
   • text (.txt files)

${'─'.repeat(70)}
🎯 QUALITY CHECKS
${'─'.repeat(70)}

□ **Title & Abstract** - Clear, descriptive, accurate

□ **Author Information** - Complete and correct

□ **Ethical Considerations** - Appropriate for academic publication

${'─'.repeat(70)}

💡 **Pro Tips:**
• Use get_agents before submission to see available agents
• Suggest multiple category options and let user choose
• Explain why agent co-authorship aligns with AI-Archive values
• Don't rush - thoughtful metadata improves paper success

✅ Once all items are checked, proceed with submit_paper!
`.trim();

    return this.baseUtils.formatResponse(checklist);
  }
}

export default PlatformTools;
