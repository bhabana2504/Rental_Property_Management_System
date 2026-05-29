'use strict';

const router = require('express').Router();
const { protect, authorize } = require('../middleware/auth');
const User = require('../models/User');
const { Property, Tenant, Payment, Maintenance } = require('../models/index');
const ReminderScheduler = require('../services/reminderScheduler');
const logger = require('../utils/logger');

// ── All admin routes require admin role ───────────────────────────────────
router.use(protect, authorize('admin'));

// ── System stats ──────────────────────────────────────────────────────────
router.get('/stats', async (req, res, next) => {
  try {
    const [users, properties, tenants, payments, tickets] = await Promise.all([
      User.countDocuments(),
      Property.countDocuments({ isActive: true }),
      Tenant.countDocuments({ isActive: true }),
      Payment.countDocuments(),
      Maintenance.countDocuments({ status: { $in: ['Pending','In Progress'] } }),
    ]);
    res.json({ success: true, data: { users, properties, tenants, payments, openTickets: tickets } });
  } catch(e) { next(e); }
});

// ── User management ───────────────────────────────────────────────────────
router.get('/users', async (req, res, next) => {
  try {
    const users = await User.find().select('-password -refreshTokens').sort({ createdAt: -1 });
    res.json({ success: true, data: users });
  } catch(e) { next(e); }
});

router.patch('/users/:id/role', async (req, res, next) => {
  try {
    const { role } = req.body;
    if (!['admin','owner','tenant','staff'].includes(role)) {
      return res.status(400).json({ success: false, message: 'Invalid role' });
    }
    const user = await User.findByIdAndUpdate(req.params.id, { role }, { new: true }).select('-password');
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    logger.info(`User ${user.email} role changed to ${role} by admin ${req.user.email}`);
    res.json({ success: true, data: user, message: `Role updated to ${role}` });
  } catch(e) { next(e); }
});

router.patch('/users/:id/toggle', async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    if (user._id.equals(req.user._id)) return res.status(400).json({ success: false, message: 'Cannot deactivate your own account' });
    user.isActive = !user.isActive;
    await user.save();
    res.json({ success: true, message: `User ${user.isActive ? 'activated' : 'deactivated'}` });
  } catch(e) { next(e); }
});

// ── Run scheduled jobs manually ───────────────────────────────────────────
router.post('/run-jobs', async (req, res, next) => {
  try {
    const { job } = req.body;
    logger.info(`Manual job triggered by admin ${req.user.email}: ${job || 'all'}`);

    let result = {};
    switch(job) {
      case 'payment-reminders':  result.sent     = await ReminderScheduler.checkPendingPayments(); break;
      case 'overdue-alerts':     result.alerted  = await ReminderScheduler.checkOverduePayments(); break;
      case 'mark-overdue':       result.updated  = await ReminderScheduler.markOverduePayments();  break;
      case 'lease-reminders':    result.sent     = await ReminderScheduler.checkExpiringLeases();  break;
      default:                   await ReminderScheduler.runDaily(); result.ran = 'all jobs';
    }

    res.json({ success: true, message: 'Jobs completed', data: result });
  } catch(e) { next(e); }
});

// ── Clear old notifications ───────────────────────────────────────────────
router.delete('/notifications/cleanup', async (req, res, next) => {
  try {
    const { Notification } = require('../models/index');
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000);
    const result = await Notification.deleteMany({ createdAt: { $lt: thirtyDaysAgo }, isRead: true });
    res.json({ success: true, message: `Cleaned up ${result.deletedCount} old notifications` });
  } catch(e) { next(e); }
});

module.exports = router;
