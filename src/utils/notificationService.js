/**
 * Notification Service
 * Handles notifications when email service is disabled
 */

class NotificationService {
  constructor() {
    this.notifications = [];
  }

  // Add a notification to the queue
  addNotification(type, message, data = {}) {
    const notification = {
      id: Date.now() + Math.random(),
      type, // 'email', 'sms', 'push', etc.
      message,
      data,
      timestamp: new Date(),
      status: 'pending'
    };

    this.notifications.push(notification);
    console.log(`📝 Notification queued: ${type} - ${message}`);
    
    return notification;
  }

  // Get all notifications
  getNotifications() {
    return this.notifications;
  }

  // Get notifications by type
  getNotificationsByType(type) {
    return this.notifications.filter(n => n.type === type);
  }

  // Clear notifications
  clearNotifications() {
    this.notifications = [];
    console.log('🗑️  Notifications cleared');
  }

  // Handle password reset notification when email is disabled
  notifyPasswordReset(email, newPassword) {
    const message = `Password reset requested for ${email}. New password: ${newPassword}`;
    
    this.addNotification('password_reset', message, {
      email,
      newPassword,
      action: 'password_reset'
    });

    // In a real application, you might:
    // - Store this in a database
    // - Send to an admin dashboard
    // - Log to a monitoring service
    // - Send via alternative communication method

    console.log('🔑 Password reset notification created:');
    console.log(`   Email: ${email}`);
    console.log(`   New Password: ${newPassword}`);
    console.log('   Note: Email service is disabled. User will need to be notified manually.');
    
    return {
      success: true,
      message: 'Password reset notification created. Email service is disabled - manual notification required.',
      newPassword
    };
  }

  // Handle welcome notification when email is disabled
  notifyWelcome(email, userName, userDetails) {
    const message = `Welcome notification for new user: ${userName} (${email})`;
    
    this.addNotification('welcome', message, {
      email,
      userName,
      userDetails,
      action: 'welcome'
    });

    console.log('🎉 Welcome notification created:');
    console.log(`   User: ${userName}`);
    console.log(`   Email: ${email}`);
    console.log('   Note: Email service is disabled. User will need to be welcomed manually.');
    
    return {
      success: true,
      message: 'Welcome notification created. Email service is disabled - manual notification required.'
    };
  }

  // Export notifications to a file (for manual processing)
  exportNotifications() {
    const fs = require('fs');
    const path = require('path');
    
    const exportData = {
      exportDate: new Date().toISOString(),
      totalNotifications: this.notifications.length,
      notifications: this.notifications
    };

    const filename = `notifications_export_${Date.now()}.json`;
    const filepath = path.join(process.cwd(), 'logs', filename);

    try {
      // Create logs directory if it doesn't exist
      const logsDir = path.join(process.cwd(), 'logs');
      if (!fs.existsSync(logsDir)) {
        fs.mkdirSync(logsDir, { recursive: true });
      }

      fs.writeFileSync(filepath, JSON.stringify(exportData, null, 2));
      console.log(`📄 Notifications exported to: ${filepath}`);
      
      return {
        success: true,
        filepath,
        count: this.notifications.length
      };
    } catch (error) {
      console.error('❌ Failed to export notifications:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

// Create and export a singleton instance
const notificationService = new NotificationService();

module.exports = notificationService;