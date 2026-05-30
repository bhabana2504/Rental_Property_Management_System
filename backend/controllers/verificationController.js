'use strict';

const { Tenant, Notification } = require('../models/index');
const logger = require('../utils/logger');

/**
 * AI-based fraud risk scorer (production-ready mock).
 * In real deployment, integrate with bureau APIs (CIBIL, Experian)
 * and govt Aadhaar verification gateway (UIDAI / DigiLocker).
 */
function computeFraudRiskScore(tenantData) {
  let score = 0;
  const flags = [];

  // Check email domain
  const freeEmailDomains = ['gmail.com','yahoo.com','hotmail.com','outlook.com'];
  const domain = tenantData.email?.split('@')[1] || '';
  if (freeEmailDomains.includes(domain)) {
    score += 5;
  }

  // Occupation risk
  const highRiskOccupations = ['student', 'freelance', 'self-employed'];
  if (highRiskOccupations.some(o => tenantData.occupation?.toLowerCase().includes(o))) {
    score += 10;
    flags.push('High-risk occupation type');
  }

  // No emergency contact
  if (!tenantData.emergencyContact) {
    score += 15;
    flags.push('No emergency contact provided');
  }

  // Aadhaar not verified
  if (tenantData.aadhaarVerification?.status !== 'Verified') {
    score += 25;
    flags.push('Aadhaar not verified');
  }

  // Very short lease
  if (tenantData.leaseStart && tenantData.leaseEnd) {
    const days = (new Date(tenantData.leaseEnd) - new Date(tenantData.leaseStart)) / 86400000;
    if (days < 90) {
      score += 20;
      flags.push('Unusually short lease duration (<90 days)');
    }
  }

  // Missing phone
  if (!tenantData.phone) {
    score += 15;
    flags.push('No phone number provided');
  }

  return { score: Math.min(score, 100), flags };
}

// ── Submit Aadhaar for verification ────────────────────────────────────────
exports.submitAadhaar = async (req, res, next) => {
  try {
    const { tenantId } = req.params;
    const { aadhaarLast4, documentUrl } = req.body;

    if (!aadhaarLast4 || aadhaarLast4.length !== 4 || !/^\d{4}$/.test(aadhaarLast4)) {
      return res.status(400).json({ success: false, message: 'Provide last 4 digits of Aadhaar' });
    }

    const tenant = await Tenant.findById(tenantId);
    if (!tenant) return res.status(404).json({ success: false, message: 'Tenant not found' });

    tenant.aadhaarVerification = {
      status:       'Submitted',
      aadhaarLast4,
      verifiedAt:   null,
      verifiedBy:   null,
    };

    // Run fraud check
    const { score, flags } = computeFraudRiskScore(tenant.toObject());
    tenant.fraudRiskScore = score;
    tenant.fraudRiskFlags = flags;
    tenant.fraudCheckedAt = new Date();

    await tenant.save();

    logger.info(`Aadhaar submitted for tenant ${tenantId}, risk score: ${score}`);

    // Notify admins if high risk
    if (score >= 50) {
      logger.warn(`HIGH FRAUD RISK tenant ${tenantId}: score ${score}, flags: ${flags.join(', ')}`);
    }

    res.json({
      success: true,
      message: 'Aadhaar submitted for verification',
      data: {
        status: 'Submitted',
        fraudRiskScore: score,
        fraudRiskFlags: flags,
      },
    });
  } catch (err) {
    next(err);
  }
};

// ── Admin: approve Aadhaar ────────────────────────────────────────────────
exports.approveAadhaar = async (req, res, next) => {
  try {
    const { tenantId } = req.params;
    const tenant = await Tenant.findById(tenantId);
    if (!tenant) return res.status(404).json({ success: false, message: 'Tenant not found' });

    tenant.aadhaarVerification.status     = 'Verified';
    tenant.aadhaarVerification.verifiedAt = new Date();
    tenant.aadhaarVerification.verifiedBy = req.user._id;

    // Re-run fraud check after verification
    const { score, flags } = computeFraudRiskScore(tenant.toObject());
    tenant.fraudRiskScore = score;
    tenant.fraudRiskFlags = flags;
    tenant.fraudCheckedAt = new Date();

    await tenant.save();

    // Create in-app notification for tenant (if they have a user account)
    if (tenant.userId) {
      await Notification.create({
        userId:    tenant.userId,
        title:     'Aadhaar Verified ✓',
        message:   'Your Aadhaar identity has been successfully verified.',
        type:      'verification',
        priority:  'high',
        actionUrl: '/tenants.html',
      });
    }

    res.json({ success: true, message: 'Aadhaar approved', data: { fraudRiskScore: score } });
  } catch (err) {
    next(err);
  }
};

// ── Admin: reject Aadhaar ────────────────────────────────────────────────
exports.rejectAadhaar = async (req, res, next) => {
  try {
    const { tenantId } = req.params;
    const { reason } = req.body;
    const tenant = await Tenant.findById(tenantId);
    if (!tenant) return res.status(404).json({ success: false, message: 'Tenant not found' });

    tenant.aadhaarVerification.status = 'Rejected';
    tenant.aadhaarVerification.rejectionReason = reason;
    await tenant.save();

    res.json({ success: true, message: 'Aadhaar rejected' });
  } catch (err) {
    next(err);
  }
};

// ── Get fraud risk report ─────────────────────────────────────────────────
exports.getFraudReport = async (req, res, next) => {
  try {
    const tenants = await Tenant.find({ isActive: true })
      .select('name email fraudRiskScore fraudRiskFlags fraudCheckedAt aadhaarVerification')
      .sort({ fraudRiskScore: -1 });

    const highRisk   = tenants.filter(t => t.fraudRiskScore >= 50);
    const mediumRisk = tenants.filter(t => t.fraudRiskScore >= 25 && t.fraudRiskScore < 50);
    const lowRisk    = tenants.filter(t => t.fraudRiskScore < 25);

    res.json({
      success: true,
      data: { tenants, summary: { highRisk: highRisk.length, mediumRisk: mediumRisk.length, lowRisk: lowRisk.length } },
    });
  } catch (err) {
    next(err);
  }
};
