'use strict';

const { Tenant, Payment, Lease } = require('../models/index');
const NotificationService = require('./notificationService');
const EmailService        = require('./emailService');
const logger              = require('../utils/logger');

/**
 * ReminderScheduler — runs recurring jobs.
 * In production, use a proper scheduler (node-cron, Agenda, Bull).
 * This module exposes individual job functions that can be triggered by:
 *   - A cron job: `0 9 * * * node -e "require('./services/reminderScheduler').runDaily()"`
 *   - An API endpoint: POST /api/admin/run-jobs
 *   - A cloud scheduler (AWS EventBridge, GCP Cloud Scheduler)
 */
const ReminderScheduler = {
  // ── Run all daily jobs ──────────────────────────────────────────────────
  async runDaily() {
    logger.info('🕘 Running daily reminder jobs…');
    await Promise.all([
      this.checkPendingPayments(),
      this.checkExpiringLeases(),
      this.checkOverduePayments(),
    ]);
    await NotificationService.cleanup();
    logger.info('✅ Daily jobs complete');
  },

  // ── Pending payment reminders (runs on 1st of each month) ───────────────
  async checkPendingPayments() {
    try {
      const now    = new Date();
      const month  = now.toLocaleString('en-US', { month: 'long', year: 'numeric' });
      const pending = await Payment.find({ status: 'Pending', month })
        .populate({ path: 'tenantId', populate: { path: 'userId' } })
        .populate('propertyId', 'name');

      let sent = 0;
      for (const p of pending) {
        const userId = p.tenantId?.userId?._id;
        if (!userId) continue;
        await NotificationService.paymentReminder(
          userId, p.tenantId.name, p.propertyId?.name || 'your property', p.amount, month
        );
        sent++;
      }
      logger.info(`Payment reminders: ${sent} sent`);
      return sent;
    } catch (err) {
      logger.error('checkPendingPayments error:', err.message);
      return 0;
    }
  },

  // ── Overdue payment alerts ──────────────────────────────────────────────
  async checkOverduePayments() {
    try {
      const overdue = await Payment.find({ status: 'Overdue' })
        .populate({ path: 'tenantId', populate: { path: 'userId' } })
        .populate('propertyId', 'name');

      let alerted = 0;
      for (const p of overdue) {
        const userId = p.tenantId?.userId?._id;
        if (!userId) continue;
        const daysOverdue = p.dueDate
          ? Math.floor((Date.now() - new Date(p.dueDate)) / 86400000)
          : 0;
        await NotificationService.overdueAlert(
          userId, p.tenantId.name, p.propertyId?.name || 'your property', p.amount, p.month, daysOverdue
        );
        alerted++;
      }
      logger.info(`Overdue alerts: ${alerted} sent`);
      return alerted;
    } catch (err) {
      logger.error('checkOverduePayments error:', err.message);
      return 0;
    }
  },

  // ── Mark payments overdue if past due date ──────────────────────────────
  async markOverduePayments() {
    try {
      const result = await Payment.updateMany(
        { status: 'Pending', dueDate: { $lt: new Date() } },
        { status: 'Overdue' }
      );
      logger.info(`Marked overdue: ${result.modifiedCount} payments`);
      return result.modifiedCount;
    } catch (err) {
      logger.error('markOverduePayments error:', err.message);
      return 0;
    }
  },

  // ── Expiring lease reminders ────────────────────────────────────────────
  async checkExpiringLeases() {
    try {
      const reminderDays = [30, 14, 7, 1];
      let sent = 0;

      for (const days of reminderDays) {
        const targetDate = new Date();
        targetDate.setDate(targetDate.getDate() + days);
        const startOfDay = new Date(targetDate.setHours(0,0,0,0));
        const endOfDay   = new Date(targetDate.setHours(23,59,59,999));

        const leases = await Lease.find({
          status: 'Active',
          endDate: { $gte: startOfDay, $lte: endOfDay },
          renewalReminder: true,
        })
        .populate({ path: 'tenantId', populate: { path: 'userId' } })
        .populate('propertyId', 'name');

        for (const l of leases) {
          const userId = l.tenantId?.userId?._id;
          if (!userId) continue;
          await NotificationService.leaseRenewalReminder(
            userId, l.propertyId?.name || 'your property', l.endDate, days
          );
          sent++;
        }
      }

      logger.info(`Lease renewal reminders: ${sent} sent`);
      return sent;
    } catch (err) {
      logger.error('checkExpiringLeases error:', err.message);
      return 0;
    }
  },
};

module.exports = ReminderScheduler;
