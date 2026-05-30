'use strict';

const { Notification } = require('../models/index');
const logger = require('../utils/logger');

/**
 * NotificationService — creates in-app notifications and optionally sends email.
 * Email sending uses Nodemailer and requires EMAIL_* env vars.
 */
class NotificationService {
  // ── Create in-app notification ──────────────────────────────────────────
  static async create({ userId, title, message, type = 'system', priority = 'medium', actionUrl, metadata, expiresAt }) {
    try {
      if (!userId) return null;
      const notif = await Notification.create({ userId, title, message, type, priority, actionUrl, metadata, expiresAt });
      logger.info(`Notification created → user ${userId}: ${title}`);
      return notif;
    } catch (err) {
      logger.error('NotificationService.create error:', err.message);
      return null;
    }
  }

  // ── Bulk create ─────────────────────────────────────────────────────────
  static async createBulk(notifications) {
    try {
      const valid = notifications.filter(n => n.userId);
      if (!valid.length) return [];
      const result = await Notification.insertMany(valid);
      logger.info(`Bulk notifications created: ${result.length}`);
      return result;
    } catch (err) {
      logger.error('NotificationService.createBulk error:', err.message);
      return [];
    }
  }

  // ── Payment reminder ────────────────────────────────────────────────────
  static async paymentReminder(tenantUserId, tenantName, propertyName, amount, month) {
    return this.create({
      userId:    tenantUserId,
      title:     '💰 Rent Due Reminder',
      message:   `Your rent of ₹${amount.toLocaleString('en-IN')} for ${propertyName} (${month}) is due. Please pay by the 5th to avoid late fees.`,
      type:      'payment',
      priority:  'high',
      actionUrl: '/payments.html',
      metadata:  { amount, month, propertyName },
    });
  }

  // ── Overdue alert ───────────────────────────────────────────────────────
  static async overdueAlert(tenantUserId, tenantName, propertyName, amount, month, daysOverdue) {
    return this.create({
      userId:    tenantUserId,
      title:     '⚠️ Overdue Rent Alert',
      message:   `Your rent of ₹${amount.toLocaleString('en-IN')} for ${propertyName} (${month}) is ${daysOverdue} days overdue. Please contact your property manager immediately.`,
      type:      'alert',
      priority:  'high',
      actionUrl: '/payments.html',
    });
  }

  // ── Lease renewal reminder ──────────────────────────────────────────────
  static async leaseRenewalReminder(tenantUserId, propertyName, expiryDate, daysLeft) {
    return this.create({
      userId:    tenantUserId,
      title:     '⏰ Lease Expiring Soon',
      message:   `Your lease for ${propertyName} expires in ${daysLeft} days (${new Date(expiryDate).toLocaleDateString('en-IN', { day:'2-digit', month:'long', year:'numeric' })}). Please contact your property manager to discuss renewal.`,
      type:      'lease',
      priority:  daysLeft <= 7 ? 'high' : 'medium',
      actionUrl: '/leases.html',
    });
  }

  // ── Maintenance update ──────────────────────────────────────────────────
  static async maintenanceUpdate(tenantUserId, ticketTitle, newStatus, propertyName) {
    const statusEmoji = { 'Acknowledged':'👀', 'In Progress':'🔧', 'Completed':'✅', 'Escalated':'🚨' };
    return this.create({
      userId:    tenantUserId,
      title:     `${statusEmoji[newStatus] || '🔧'} Maintenance Update`,
      message:   `Your ticket "${ticketTitle}" at ${propertyName} has been updated to: ${newStatus}.`,
      type:      'maintenance',
      priority:  newStatus === 'Escalated' ? 'high' : 'medium',
      actionUrl: '/maintenance.html',
    });
  }

  // ── Aadhaar verification result ─────────────────────────────────────────
  static async aadhaarResult(tenantUserId, status, rejectionReason) {
    const approved = status === 'Verified';
    return this.create({
      userId:    tenantUserId,
      title:     approved ? '🪪 Aadhaar Verified ✓' : '❌ Aadhaar Verification Failed',
      message:   approved
        ? 'Your Aadhaar identity has been successfully verified. You are now fully onboarded.'
        : `Your Aadhaar verification was rejected. Reason: ${rejectionReason || 'Please resubmit with a clearer document.'}`,
      type:      'verification',
      priority:  'high',
      actionUrl: '/verification.html',
    });
  }

  // ── Mark notifications read ─────────────────────────────────────────────
  static async markRead(notifId, userId) {
    try {
      await Notification.findOneAndUpdate(
        { _id: notifId, userId },
        { isRead: true, readAt: new Date() }
      );
    } catch (err) {
      logger.error('NotificationService.markRead error:', err.message);
    }
  }

  // ── Get unread count ────────────────────────────────────────────────────
  static async unreadCount(userId) {
    try {
      return await Notification.countDocuments({ userId, isRead: false });
    } catch {
      return 0;
    }
  }

  // ── Cleanup expired ─────────────────────────────────────────────────────
  static async cleanup() {
    try {
      const result = await Notification.deleteMany({
        expiresAt: { $lt: new Date() },
      });
      logger.info(`Notification cleanup: ${result.deletedCount} expired removed`);
    } catch (err) {
      logger.error('NotificationService.cleanup error:', err.message);
    }
  }
}

module.exports = NotificationService;
