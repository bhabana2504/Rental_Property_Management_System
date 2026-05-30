'use strict';

const { Property, Tenant, Payment, Maintenance, Notification } = require('../models/index');
const NotificationService = require('../services/notificationService');
const { deleteFile }      = require('../middleware/upload');
const logger              = require('../utils/logger');

// ══════════════════════════════════════════════════════
//  PROPERTY CONTROLLER
// ══════════════════════════════════════════════════════
const PropertyController = {
  async getAll(req, res, next) {
    try {
      const { page = 1, limit = 20, search, status, type } = req.query;
      const filter = { isActive: true };
      if (status) filter.status = status;
      if (type)   filter.type   = type;
      if (search) filter.$text  = { $search: search };

      const total = await Property.countDocuments(filter);
      const data  = await Property.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(parseInt(limit));

      res.json({ success: true, data, pagination: { total, page: parseInt(page), pages: Math.ceil(total / limit) } });
    } catch(e) { next(e); }
  },

  async getOne(req, res, next) {
    try {
      const prop = await Property.findById(req.params.id);
      if (!prop) return res.status(404).json({ success: false, message: 'Property not found' });
      res.json({ success: true, data: prop });
    } catch(e) { next(e); }
  },

  async create(req, res, next) {
    try {
      const prop = await Property.create({ ...req.body, ownerId: req.user._id });
      logger.info(`Property created: ${prop.name}`);
      res.status(201).json({ success: true, data: prop, message: 'Property created' });
    } catch(e) { next(e); }
  },

  async update(req, res, next) {
    try {
      const prop = await Property.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
      if (!prop) return res.status(404).json({ success: false, message: 'Property not found' });
      res.json({ success: true, data: prop, message: 'Property updated' });
    } catch(e) { next(e); }
  },

  async remove(req, res, next) {
    try {
      const prop = await Property.findById(req.params.id);
      if (!prop) return res.status(404).json({ success: false, message: 'Property not found' });
      // Soft delete
      prop.isActive = false;
      await prop.save();
      logger.info(`Property deactivated: ${prop.name}`);
      res.json({ success: true, message: 'Property removed' });
    } catch(e) { next(e); }
  },

  async addImage(req, res, next) {
    try {
      if (!req.file) return res.status(400).json({ success: false, message: 'No image uploaded' });
      const prop = await Property.findById(req.params.id);
      if (!prop) return res.status(404).json({ success: false, message: 'Property not found' });
      prop.images.push({ url: `/uploads/images/${req.file.filename}`, caption: req.body.caption || '' });
      await prop.save();
      res.json({ success: true, data: prop.images, message: 'Image added' });
    } catch(e) { next(e); }
  },

  async removeImage(req, res, next) {
    try {
      const prop = await Property.findById(req.params.id);
      if (!prop) return res.status(404).json({ success: false, message: 'Property not found' });
      const img = prop.images.id(req.params.imageId);
      if (img) { deleteFile(img.url); img.remove(); }
      await prop.save();
      res.json({ success: true, message: 'Image removed' });
    } catch(e) { next(e); }
  },
};

// ══════════════════════════════════════════════════════
//  TENANT CONTROLLER
// ══════════════════════════════════════════════════════
const TenantController = {
  async getAll(req, res, next) {
    try {
      const { page = 1, limit = 20, search, propertyId, verificationStatus } = req.query;
      const filter = { isActive: true };
      if (propertyId) filter.propertyId = propertyId;
      if (verificationStatus) filter['aadhaarVerification.status'] = verificationStatus;
      if (search) filter.$or = [
        { name:  { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];

      const total   = await Tenant.countDocuments(filter);
      const tenants = await Tenant.find(filter)
        .populate('propertyId', 'name address rent type')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(parseInt(limit));

      res.json({ success: true, data: tenants, pagination: { total, page: parseInt(page), pages: Math.ceil(total / limit) } });
    } catch(e) { next(e); }
  },

  async getOne(req, res, next) {
    try {
      const tenant = await Tenant.findById(req.params.id)
        .populate('propertyId', 'name address rent type bedrooms bathrooms')
        .populate('documents');
      if (!tenant) return res.status(404).json({ success: false, message: 'Tenant not found' });
      res.json({ success: true, data: tenant });
    } catch(e) { next(e); }
  },

  async create(req, res, next) {
    try {
      const tenant = await Tenant.create(req.body);
      logger.info(`Tenant added: ${tenant.name}`);
      res.status(201).json({ success: true, data: tenant, message: 'Tenant added successfully' });
    } catch(e) { next(e); }
  },

  async update(req, res, next) {
    try {
      const tenant = await Tenant.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true })
        .populate('propertyId', 'name address rent');
      if (!tenant) return res.status(404).json({ success: false, message: 'Tenant not found' });
      res.json({ success: true, data: tenant, message: 'Tenant updated' });
    } catch(e) { next(e); }
  },

  async remove(req, res, next) {
    try {
      await Tenant.findByIdAndUpdate(req.params.id, { isActive: false });
      res.json({ success: true, message: 'Tenant deactivated' });
    } catch(e) { next(e); }
  },
};

// ══════════════════════════════════════════════════════
//  PAYMENT CONTROLLER
// ══════════════════════════════════════════════════════
const PaymentController = {
  async getAll(req, res, next) {
    try {
      const { page = 1, limit = 20, status, tenantId, propertyId, month } = req.query;
      const filter = {};
      if (status)     filter.status     = status;
      if (tenantId)   filter.tenantId   = tenantId;
      if (propertyId) filter.propertyId = propertyId;
      if (month)      filter.month      = { $regex: month, $options: 'i' };

      const total = await Payment.countDocuments(filter);
      const data  = await Payment.find(filter)
        .populate('tenantId',   'name email phone')
        .populate('propertyId', 'name address')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(parseInt(limit));

      // Aggregate summary
      const summary = await Payment.aggregate([
        { $group: {
            _id: '$status',
            total: { $sum: '$amount' },
            count: { $sum: 1 },
        }},
      ]);

      res.json({ success: true, data, pagination: { total, page: parseInt(page), pages: Math.ceil(total / limit) }, summary });
    } catch(e) { next(e); }
  },

  async create(req, res, next) {
    try {
      const pay = await Payment.create({ ...req.body, recordedBy: req.user._id });
      logger.info(`Payment recorded: ${pay._id} (${pay.status})`);
      res.status(201).json({ success: true, data: pay, message: 'Payment recorded' });
    } catch(e) { next(e); }
  },

  async updateStatus(req, res, next) {
    try {
      const { status, method, transactionId, paidDate, notes } = req.body;
      const pay = await Payment.findById(req.params.id)
        .populate('tenantId', 'name email')
        .populate('propertyId', 'name');

      if (!pay) return res.status(404).json({ success: false, message: 'Payment not found' });

      pay.status = status;
      if (method)        pay.method = method;
      if (transactionId) pay.transactionId = transactionId;
      if (notes)         pay.notes = notes;
      if (status === 'Paid') pay.paidDate = paidDate ? new Date(paidDate) : new Date();
      await pay.save();

      logger.info(`Payment ${pay._id} → ${status}`);
      res.json({ success: true, data: pay, message: `Payment marked as ${status}` });
    } catch(e) { next(e); }
  },

  async delete(req, res, next) {
    try {
      await Payment.findByIdAndDelete(req.params.id);
      res.json({ success: true, message: 'Payment deleted' });
    } catch(e) { next(e); }
  },
};

// ══════════════════════════════════════════════════════
//  MAINTENANCE CONTROLLER
// ══════════════════════════════════════════════════════
const MaintenanceController = {
  async getAll(req, res, next) {
    try {
      const { page = 1, limit = 20, status, priority, propertyId, category } = req.query;
      const filter = {};
      if (status)     filter.status     = status;
      if (priority)   filter.priority   = priority;
      if (propertyId) filter.propertyId = propertyId;
      if (category)   filter.category   = category;

      const total = await Maintenance.countDocuments(filter);
      const data  = await Maintenance.find(filter)
        .populate('propertyId', 'name address')
        .populate('tenantId',   'name email')
        .sort({ priority: -1, createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(parseInt(limit));

      res.json({ success: true, data, pagination: { total, page: parseInt(page), pages: Math.ceil(total / limit) } });
    } catch(e) { next(e); }
  },

  async getOne(req, res, next) {
    try {
      const ticket = await Maintenance.findById(req.params.id)
        .populate('propertyId', 'name address')
        .populate('tenantId',   'name email phone')
        .populate('notes.addedBy', 'name role');
      if (!ticket) return res.status(404).json({ success: false, message: 'Ticket not found' });
      res.json({ success: true, data: ticket });
    } catch(e) { next(e); }
  },

  async create(req, res, next) {
    try {
      const ticket = await Maintenance.create(req.body);
      logger.info(`Maintenance ticket created: ${ticket._id} (${ticket.priority})`);
      res.status(201).json({ success: true, data: ticket, message: 'Maintenance ticket submitted' });
    } catch(e) { next(e); }
  },

  async update(req, res, next) {
    try {
      const ticket = await Maintenance.findByIdAndUpdate(req.params.id, req.body, { new: true });
      if (!ticket) return res.status(404).json({ success: false, message: 'Ticket not found' });

      // Notify tenant of status change
      if (req.body.status && ticket.tenantId) {
        const tenant = await Tenant.findById(ticket.tenantId);
        if (tenant?.userId) {
          const prop = await (await import('../models/index.js').then(m => m.Property.findById(ticket.propertyId)));
          await NotificationService.maintenanceUpdate(tenant.userId, ticket.title, req.body.status, prop?.name || 'your property');
        }
      }
      res.json({ success: true, data: ticket, message: 'Ticket updated' });
    } catch(e) { next(e); }
  },

  async escalate(req, res, next) {
    try {
      const { reason } = req.body;
      if (!reason) return res.status(400).json({ success: false, message: 'Escalation reason required' });
      const ticket = await Maintenance.findByIdAndUpdate(req.params.id, {
        escalated: true, escalationReason: reason, escalatedAt: new Date(), status: 'Escalated',
      }, { new: true });
      if (!ticket) return res.status(404).json({ success: false, message: 'Ticket not found' });
      logger.warn(`Ticket escalated: ${ticket._id} — ${reason}`);
      res.json({ success: true, data: ticket, message: 'Ticket escalated to management' });
    } catch(e) { next(e); }
  },

  async addNote(req, res, next) {
    try {
      const { text } = req.body;
      if (!text?.trim()) return res.status(400).json({ success: false, message: 'Note text required' });
      const ticket = await Maintenance.findById(req.params.id);
      if (!ticket) return res.status(404).json({ success: false, message: 'Ticket not found' });
      ticket.notes.push({ text: text.trim(), addedBy: req.user._id });
      await ticket.save();
      res.json({ success: true, data: ticket, message: 'Note added' });
    } catch(e) { next(e); }
  },
};

module.exports = { PropertyController, TenantController, PaymentController, MaintenanceController };
