import { McpError, ErrorCode } from "@modelcontextprotocol/sdk/types.js";
import { baseUtils } from "../../utils/baseServer.js";

/**
 * User Management Tools Module
 * Handles user profiles, notifications, storage, and account management
 */
export class UserTools {
  constructor() {
    this.baseUtils = baseUtils;
  }

  // Get tool definitions for this module
  getToolDefinitions() {
    return [
      {
        name: "get_user_profile",
        description: "Get current user's complete profile and statistics",
        inputSchema: {
          type: "object",
          properties: {}
        }
      },
      {
        name: "update_user_profile",
        description: "Update user profile information",
        inputSchema: {
          type: "object",
          properties: {
            firstName: { type: "string", description: "First name" },
            lastName: { type: "string", description: "Last name" },
            position: { type: "string", description: "Job title/position" },
            department: { type: "string", description: "Department within institution" },
            organizationType: { type: "string", description: "Type of organization" },
            bio: { type: "string", description: "Professional biography" }
          }
        }
      },
      {
        name: "change_password",
        description: "Change user password",
        inputSchema: {
          type: "object",
          properties: {
            currentPassword: { type: "string", description: "Current password" },
            newPassword: { type: "string", description: "New password" }
          },
          required: ["currentPassword", "newPassword"]
        }
      },
      {
        name: "get_user_storage",
        description: "Check storage usage and quota information",
        inputSchema: {
          type: "object",
          properties: {}
        }
      },
      {
        name: "get_notifications",
        description: "Get user notifications with pagination",
        inputSchema: {
          type: "object",
          properties: {
            page: { type: "number", description: "Page number (default: 1)" },
            limit: { type: "number", description: "Notifications per page (default: 20)" },
            unreadOnly: { type: "boolean", description: "Show only unread notifications" }
          }
        }
      },
      {
        name: "get_unread_count",
        description: "Get count of unread notifications",
        inputSchema: {
          type: "object",
          properties: {}
        }
      },
      {
        name: "mark_notification_read",
        description: "Mark a specific notification as read",
        inputSchema: {
          type: "object",
          properties: {
            notificationId: { type: "string", description: "ID of notification to mark as read" }
          },
          required: ["notificationId"]
        }
      },
      {
        name: "mark_all_read",
        description: "Mark all notifications as read",
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
      "get_user_profile": this.getUserProfile.bind(this),
      "update_user_profile": this.updateUserProfile.bind(this),
      "change_password": this.changePassword.bind(this),
      "get_user_storage": this.getUserStorage.bind(this),
      "get_notifications": this.getNotifications.bind(this),
      "get_unread_count": this.getUnreadCount.bind(this),
      "mark_notification_read": this.markNotificationRead.bind(this),
      "mark_all_read": this.markAllRead.bind(this)
    };
  }

  async getUserProfile(args) {
    try {
      const response = await this.baseUtils.makeApiRequest('/users/me');
      const user = response.data;
      
      return this.baseUtils.formatResponse(
        `👤 **User Profile**\n\n` +
        `**Name:** ${user.firstName} ${user.lastName}\n` +
        `**Username:** @${user.username}\n` +
        `**Email:** ${user.email}\n` +
        `**Verified:** ${user.isVerified ? '✅ Yes' : '❌ No'}\n` +
        `**Position:** ${user.position || 'Not specified'}\n` +
        `**Department:** ${user.department || 'Not specified'}\n` +
        `**Organization Type:** ${user.organizationType || 'Not specified'}\n` +
        `**Member Since:** ${new Date(user.createdAt).toLocaleDateString()}\n\n` +
        `**Statistics:**\n` +
        `• Papers: ${user._count?.papers || 0}\n` +
        `• Reviews: ${user._count?.reviews || 0}\n` +
        `• Citations: ${user._count?.citations || 0}\n` +
        `• API Keys: ${user.apiKeys?.length || 0}\n\n` +
        `**Storage:**\n` +
        `• Used: ${Math.round(parseInt(user.storageUsedBytes || '0') / 1024 / 1024)} MB\n` +
        `• Quota: ${Math.round(parseInt(user.storageQuotaBytes || '10737418240') / 1024 / 1024 / 1024)} GB`
      );
    } catch (error) {
      throw new McpError(ErrorCode.InternalError, `Failed to get user profile: ${error.message}`);
    }
  }

  async updateUserProfile(args) {
    const { firstName, lastName, position, department, organizationType, bio } = args;
    
    try {
      const updateData = {};
      if (firstName) updateData.firstName = firstName;
      if (lastName) updateData.lastName = lastName;
      if (position) updateData.position = position;
      if (department) updateData.department = department;
      if (organizationType) updateData.organizationType = organizationType;
      if (bio) updateData.bio = bio;
      
      const response = await this.baseUtils.makeApiRequest('/users/me', 'PUT', updateData);
      
      const user = response.data;
      
      // Format the date properly, handling null/undefined
      const lastUpdated = user.updatedAt 
        ? new Date(user.updatedAt).toLocaleString()
        : 'Unknown';
      
      return this.baseUtils.formatResponse(
        `✅ **Profile Updated Successfully!**\n\n` +
        `**Updated Information:**\n` +
        `• Name: ${user.firstName} ${user.lastName}\n` +
        `• Position: ${user.position || 'Not specified'}\n` +
        `• Department: ${user.department || 'Not specified'}\n` +
        `• Organization: ${user.organizationType || 'Not specified'}\n` +
        `• Last Updated: ${lastUpdated}`
      );
    } catch (error) {
      throw new McpError(ErrorCode.InternalError, `Failed to update profile: ${error.message}`);
    }
  }

  async changePassword(args) {
    const { currentPassword, newPassword } = args;
    
    try {
      await this.baseUtils.makeApiRequest('/users/me/password', 'PUT', {
        currentPassword,
        newPassword
      });
      
      return this.baseUtils.formatResponse(
        `🔒 **Password Changed Successfully!**\n\n` +
        `Your password has been updated. Please use the new password for future logins.\n\n` +
        `**Security Tips:**\n` +
        `• Use a strong, unique password\n` +
        `• Consider using a password manager\n` +
        `• Enable two-factor authentication if available`
      );
    } catch (error) {
      if (error.response?.status === 400) {
        throw new McpError(ErrorCode.InvalidRequest, `Password change failed: ${error.response.data.error}`);
      }
      throw new McpError(ErrorCode.InternalError, `Failed to change password: ${error.message}`);
    }
  }

  async getUserStorage(args) {
    try {
      const response = await this.baseUtils.makeApiRequest('/users/me/storage');
      const storage = response.data;
      
      const usedMB = Math.round(parseInt(storage.storageUsedBytes || '0') / 1024 / 1024);
      const quotaGB = Math.round(parseInt(storage.storageQuotaBytes || '10737418240') / 1024 / 1024 / 1024);
      const usagePercent = Math.round((parseInt(storage.storageUsedBytes || '0') / parseInt(storage.storageQuotaBytes || '10737418240')) * 100);
      
      return this.baseUtils.formatResponse(
        `💾 **Storage Information**\n\n` +
        `**Usage:** ${usedMB} MB / ${quotaGB} GB (${usagePercent}%)\n` +
        `**Available:** ${quotaGB * 1024 - usedMB} MB remaining\n\n` +
        `**File Breakdown:**\n` +
        `• Papers: ${storage.paperCount || 0} files\n` +
        `• Figures: ${storage.figureCount || 0} files\n` +
        `• Datasets: ${storage.datasetCount || 0} files\n` +
        `• Other: ${storage.otherCount || 0} files\n\n` +
        `${usagePercent > 80 ? '⚠️ **Warning:** Storage usage is high. Consider cleaning up old files.' : '✅ Storage usage is within normal limits.'}`
      );
    } catch (error) {
      throw new McpError(ErrorCode.InternalError, `Failed to get storage information: ${error.message}`);
    }
  }

  async getNotifications(args) {
    const { page = 1, limit = 20, unreadOnly = false } = args;
    
    try {
      const params = new URLSearchParams();
      params.append('page', page.toString());
      params.append('limit', Math.min(limit, 50).toString());
      if (unreadOnly) params.append('unreadOnly', 'true');
      
      const response = await this.baseUtils.makeApiRequest(`/notifications?${params.toString()}`);
      const { notifications, totalCount, unreadCount, totalPages } = response.data;
      
      if (!notifications || notifications.length === 0) {
        return this.baseUtils.formatResponse(
          `🔔 **No Notifications**\n\n` +
          `You have no ${unreadOnly ? 'unread ' : ''}notifications at this time.`
        );
      }
      
      const notificationsList = notifications.map((notif, index) => 
        `${index + 1}. ${notif.isRead ? '📖' : '🔔'} **${notif.title}**\n` +
        `   ${notif.message}\n` +
        `   ${new Date(notif.createdAt).toLocaleString()} • ID: ${notif.id}`
      ).join('\n\n');
      
      return this.baseUtils.formatResponse(
        `🔔 **Notifications** (${totalCount} total, ${unreadCount} unread, Page ${page}/${totalPages})\n\n` +
        notificationsList + '\n\n' +
        `**Actions Available:**\n` +
        `• Use \`mark_notification_read\` to mark specific notifications as read\n` +
        `• Use \`mark_all_read\` to mark all notifications as read\n` +
        this.baseUtils.getPaginationText(page, totalPages)
      );
    } catch (error) {
      throw new McpError(ErrorCode.InternalError, `Failed to get notifications: ${error.message}`);
    }
  }

  async getUnreadCount(args) {
    try {
      const response = await this.baseUtils.makeApiRequest('/notifications/unread-count');
      const { count } = response.data;
      
      // Ensure count is a number, default to 0 if undefined/null
      const unreadCount = (count !== null && count !== undefined) ? count : 0;
      
      return this.baseUtils.formatResponse(
        `🔔 **Unread Notifications: ${unreadCount}**\n\n` +
        (unreadCount > 0 
          ? `You have ${unreadCount} unread notification${unreadCount > 1 ? 's' : ''}. Use \`get_notifications\` to view them.`
          : 'All caught up! No unread notifications.')
      );
    } catch (error) {
      throw new McpError(ErrorCode.InternalError, `Failed to get unread count: ${error.message}`);
    }
  }

  async markNotificationRead(args) {
    const { notificationId } = args;
    
    try {
      await this.baseUtils.makeApiRequest(`/notifications/${notificationId}/read`, 'PUT');
      
      return this.baseUtils.formatResponse(
        `✅ **Notification Marked as Read**\n\n` +
        `Notification ${notificationId} has been marked as read.`
      );
    } catch (error) {
      if (error.response?.status === 404) {
        throw new McpError(ErrorCode.InvalidRequest, `Notification ${notificationId} not found`);
      }
      throw new McpError(ErrorCode.InternalError, `Failed to mark notification as read: ${error.message}`);
    }
  }

  async markAllRead(args) {
    try {
      const response = await this.baseUtils.makeApiRequest('/notifications/read-all', 'PUT');
      
      const { updatedCount } = response.data;
      
      return this.baseUtils.formatResponse(
        `✅ **All Notifications Marked as Read**\n\n` +
        `${updatedCount} notification${updatedCount !== 1 ? 's' : ''} marked as read.`
      );
    } catch (error) {
      throw new McpError(ErrorCode.InternalError, `Failed to mark all notifications as read: ${error.message}`);
    }
  }
}

export default UserTools;