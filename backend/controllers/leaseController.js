'use strict';

const PDFDocument  = require('pdfkit');
const path         = require('path');
const fs           = require('fs');
const { Lease, Tenant, Property, Notification } = require('../models/index');
const logger       = require('../utils/logger');

const uploadDir = path.join(__dirname, '../uploads/leases');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

// ── Create lease ──────────────────────────────────────────────────────────
exports.createLease = async (req, res, next) => {
  try {
    const { tenantId, propertyId, startDate, endDate, monthlyRent, deposit, terms, noticePeriodDays } = req.body;

    const [tenant, property] = await Promise.all([
      Tenant.findById(tenantId),
      Property.findById(propertyId),
    ]);

    if (!tenant || !property) {
      return res.status(404).json({ success: false, message: 'Tenant or Property not found' });
    }

    const lease = await Lease.create({
      tenantId, propertyId, startDate, endDate, monthlyRent: monthlyRent || property.rent,
      deposit: deposit || property.deposit, terms, noticePeriodDays: noticePeriodDays || 30,
      status: 'Draft', createdBy: req.user._id,
    });

    logger.info(`Lease created: ${lease._id} for tenant ${tenantId}`);

    res.status(201).json({ success: true, data: lease });
  } catch (err) {
    next(err);
  }
};

// ── Generate PDF ───────────────────────────────────────────────────────────
exports.generateLeasePDF = async (req, res, next) => {
  try {
    const { id } = req.params;
    const lease = await Lease.findById(id)
      .populate('tenantId', 'name email phone aadhaarVerification')
      .populate('propertyId', 'name address type bedrooms bathrooms rent');

    if (!lease) return res.status(404).json({ success: false, message: 'Lease not found' });

    const filename = `lease_${id}_${Date.now()}.pdf`;
    const filePath = path.join(uploadDir, filename);
    const doc      = new PDFDocument({ margin: 60, size: 'A4' });
    const stream   = fs.createWriteStream(filePath);

    doc.pipe(stream);

    // ── Header ──
    doc.fontSize(22).font('Helvetica-Bold').fillColor('#1a1a2e')
       .text('RENTAL AGREEMENT', { align: 'center' });
    doc.moveDown(0.3);
    doc.fontSize(11).font('Helvetica').fillColor('#555')
       .text('Rental Property Management Platform — Legal Document', { align: 'center' });
    doc.moveDown(1);

    // ── Divider ──
    doc.moveTo(60, doc.y).lineTo(535, doc.y).lineWidth(1.5).strokeColor('#00d4aa').stroke();
    doc.moveDown(1);

    const fmt = d => d ? new Date(d).toLocaleDateString('en-IN', { day:'2-digit', month:'long', year:'numeric' }) : '—';
    const fmtMoney = n => new Intl.NumberFormat('en-IN', { style:'currency', currency:'INR', maximumFractionDigits:0 }).format(n);

    const row = (label, value) => {
      doc.fontSize(10).font('Helvetica-Bold').fillColor('#333').text(label, { continued: true });
      doc.font('Helvetica').fillColor('#555').text(`  ${value}`);
      doc.moveDown(0.3);
    };

    // ── Parties ──
    doc.fontSize(13).font('Helvetica-Bold').fillColor('#00d4aa').text('PARTIES TO THIS AGREEMENT');
    doc.moveDown(0.5);
    row('Tenant Name:', lease.tenantId?.name || '—');
    row('Tenant Email:', lease.tenantId?.email || '—');
    row('Tenant Phone:', lease.tenantId?.phone || '—');
    row('Aadhaar Status:', lease.tenantId?.aadhaarVerification?.status || 'Pending');
    doc.moveDown(0.5);

    // ── Property ──
    doc.fontSize(13).font('Helvetica-Bold').fillColor('#00d4aa').text('PROPERTY DETAILS');
    doc.moveDown(0.5);
    row('Property:', lease.propertyId?.name || '—');
    row('Address:', lease.propertyId?.address || '—');
    row('Type:', lease.propertyId?.type || '—');
    row('Configuration:', `${lease.propertyId?.bedrooms}BHK / ${lease.propertyId?.bathrooms} Bath`);
    doc.moveDown(0.5);

    // ── Terms ──
    doc.fontSize(13).font('Helvetica-Bold').fillColor('#00d4aa').text('LEASE TERMS');
    doc.moveDown(0.5);
    row('Lease Start:', fmt(lease.startDate));
    row('Lease End:', fmt(lease.endDate));
    row('Monthly Rent:', fmtMoney(lease.monthlyRent));
    row('Security Deposit:', fmtMoney(lease.deposit));
    row('Notice Period:', `${lease.noticePeriodDays} days`);
    doc.moveDown(0.5);

    // ── Custom terms ──
    if (lease.terms) {
      doc.fontSize(13).font('Helvetica-Bold').fillColor('#00d4aa').text('SPECIAL TERMS & CONDITIONS');
      doc.moveDown(0.5);
      doc.fontSize(10).font('Helvetica').fillColor('#444').text(lease.terms, { align: 'justify' });
      doc.moveDown(0.5);
    }

    // ── Standard clauses ──
    doc.fontSize(13).font('Helvetica-Bold').fillColor('#00d4aa').text('STANDARD CLAUSES');
    doc.moveDown(0.5);
    const clauses = [
      '1. Rent shall be paid by the 5th of each month. Late fees of 2% per week apply after the 10th.',
      '2. Tenant shall maintain the property in good condition and report damages within 48 hours.',
      '3. Subletting is prohibited without prior written consent of the property owner.',
      '4. Tenant shall allow reasonable access for inspections with 24-hour advance notice.',
      '5. This agreement is governed by Indian Contract Act, 1872 and local tenancy laws.',
      '6. Disputes shall be resolved through arbitration in the city of jurisdiction.',
    ];
    clauses.forEach(c => {
      doc.fontSize(9.5).font('Helvetica').fillColor('#444').text(c, { align: 'justify' });
      doc.moveDown(0.3);
    });

    // ── Signatures ──
    doc.moveDown(1);
    doc.moveTo(60, doc.y).lineTo(535, doc.y).lineWidth(0.5).strokeColor('#ccc').stroke();
    doc.moveDown(1);
    doc.fontSize(11).font('Helvetica-Bold').fillColor('#333').text('SIGNATURES');
    doc.moveDown(1);

    const sigY = doc.y;
    doc.fontSize(9).font('Helvetica').fillColor('#555');
    doc.text('___________________________', 60, sigY);
    doc.text('Tenant Signature', 60, sigY + 15);
    doc.text(`Date: ${lease.tenantSignedAt ? fmt(lease.tenantSignedAt) : '________________'}`, 60, sigY + 28);

    doc.text('___________________________', 320, sigY);
    doc.text('Owner / Manager Signature', 320, sigY + 15);
    doc.text(`Date: ${lease.ownerSignedAt ? fmt(lease.ownerSignedAt) : '________________'}`, 320, sigY + 28);

    doc.moveDown(3);
    doc.fontSize(8).fillColor('#aaa').text(
      `Generated by Rental PM Pro · ${new Date().toISOString()} · Document ID: ${id}`,
      { align: 'center' }
    );

    doc.end();

    stream.on('finish', async () => {
      const pdfUrl = `/uploads/leases/${filename}`;
      await Lease.findByIdAndUpdate(id, { pdfUrl });

      logger.info(`Lease PDF generated: ${filename}`);

      if (req.query.download === 'true') {
        res.download(filePath, `lease_agreement_${lease.tenantId?.name?.replace(/\s+/g,'_')}.pdf`);
      } else {
        res.json({ success: true, pdfUrl, message: 'PDF generated successfully' });
      }
    });

    stream.on('error', next);
  } catch (err) {
    next(err);
  }
};

// ── Get all leases ────────────────────────────────────────────────────────
exports.getLeases = async (req, res, next) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (status) filter.status = status;

    const total  = await Lease.countDocuments(filter);
    const leases = await Lease.find(filter)
      .populate('tenantId', 'name email phone')
      .populate('propertyId', 'name address rent')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    res.json({ success: true, data: leases, pagination: { total, page: parseInt(page), pages: Math.ceil(total / limit) } });
  } catch (err) {
    next(err);
  }
};

// ── Sign lease ────────────────────────────────────────────────────────────
exports.signLease = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { signerType } = req.body; // 'tenant' | 'owner'
    const lease = await Lease.findById(id);
    if (!lease) return res.status(404).json({ success: false, message: 'Lease not found' });

    if (signerType === 'tenant') {
      lease.signedByTenant = true;
      lease.tenantSignedAt = new Date();
    } else if (signerType === 'owner') {
      lease.signedByOwner = true;
      lease.ownerSignedAt = new Date();
    }

    if (lease.signedByTenant && lease.signedByOwner) {
      lease.status = 'Active';
    }

    await lease.save();
    res.json({ success: true, message: `Lease signed by ${signerType}`, data: lease });
  } catch (err) {
    next(err);
  }
};

// ── Send renewal reminders (scheduled job hook) ───────────────────────────
exports.sendRenewalReminders = async (req, res, next) => {
  try {
    const thirtyDaysOut = new Date();
    thirtyDaysOut.setDate(thirtyDaysOut.getDate() + 30);

    const expiringLeases = await Lease.find({
      status: 'Active',
      endDate: { $lte: thirtyDaysOut, $gte: new Date() },
      renewalReminder: true,
    }).populate('tenantId', 'name email userId').populate('propertyId', 'name');

    const notifications = expiringLeases.map(l => ({
      userId:    l.tenantId?.userId,
      title:     '⏰ Lease Expiring Soon',
      message:   `Your lease for ${l.propertyId?.name} expires on ${new Date(l.endDate).toLocaleDateString('en-IN')}. Please contact your property manager.`,
      type:      'lease',
      priority:  'high',
      actionUrl: '/leases.html',
    })).filter(n => n.userId);

    if (notifications.length > 0) {
      await Notification.insertMany(notifications);
    }

    res.json({ success: true, reminders: expiringLeases.length, message: `${expiringLeases.length} reminders sent` });
  } catch (err) {
    next(err);
  }
};
