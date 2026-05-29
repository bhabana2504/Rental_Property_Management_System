'use strict';

const logger = require('../utils/logger');

let transporter = null;

// Lazy-init so the app boots even without email config
async function getTransporter() {
  if (transporter) return transporter;
  try {
    const nodemailer = require('nodemailer');
    if (!process.env.EMAIL_HOST || !process.env.EMAIL_USER) {
      logger.warn('Email service not configured — EMAIL_HOST/EMAIL_USER missing');
      return null;
    }
    transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: parseInt(process.env.EMAIL_PORT) || 587,
      secure: process.env.EMAIL_PORT === '465',
      auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
      tls: { rejectUnauthorized: false },
    });
    await transporter.verify();
    logger.info('✅ Email transporter ready');
    return transporter;
  } catch (err) {
    logger.warn('Email transporter unavailable:', err.message);
    return null;
  }
}

const FROM = process.env.EMAIL_FROM || 'Rental PM Pro <no-reply@rentalpm.com>';

/**
 * EmailService — all transactional emails
 */
const EmailService = {
  // ── Core send ──────────────────────────────────────────────────────────
  async send({ to, subject, html, text }) {
    try {
      const t = await getTransporter();
      if (!t) {
        logger.warn(`Email skipped (no transport) → ${to}: ${subject}`);
        return false;
      }
      const info = await t.sendMail({ from: FROM, to, subject, html, text });
      logger.info(`Email sent → ${to}: ${subject} (${info.messageId})`);
      return true;
    } catch (err) {
      logger.error(`Email failed → ${to}: ${err.message}`);
      return false;
    }
  },

  // ── Welcome email ───────────────────────────────────────────────────────
  async welcome(user) {
    return this.send({
      to:      user.email,
      subject: `Welcome to Rental PM Pro, ${user.name}!`,
      html: `
        <div style="font-family:sans-serif;max-width:500px;margin:auto;background:#0f1322;color:#fff;border-radius:16px;overflow:hidden">
          <div style="background:linear-gradient(135deg,#00d4aa22,#0f1322);padding:32px;text-align:center">
            <h1 style="color:#00d4aa;margin:0">Rental PM Pro</h1>
            <p style="color:rgba(255,255,255,0.6);margin:8px 0 0">Production Property Management</p>
          </div>
          <div style="padding:32px">
            <h2 style="color:#fff">Welcome, ${user.name}! 👋</h2>
            <p style="color:rgba(255,255,255,0.7)">Your account has been created with role: <strong style="color:#00d4aa">${user.role}</strong></p>
            <p style="color:rgba(255,255,255,0.7)">You can now log in and start managing your properties.</p>
            <div style="margin:24px 0;text-align:center">
              <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/login.html" 
                 style="background:#00d4aa;color:#000;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:700">
                Access Dashboard →
              </a>
            </div>
          </div>
          <div style="padding:20px;text-align:center;color:rgba(255,255,255,0.3);font-size:12px;border-top:1px solid rgba(255,255,255,0.08)">
            Rental PM Pro · Secure Property Management
          </div>
        </div>`,
    });
  },

  // ── Payment receipt ─────────────────────────────────────────────────────
  async paymentReceipt({ tenantEmail, tenantName, propertyName, amount, month, transactionId, paidDate }) {
    return this.send({
      to:      tenantEmail,
      subject: `Payment Receipt — ${month} — ${propertyName}`,
      html: `
        <div style="font-family:sans-serif;max-width:500px;margin:auto;background:#0f1322;color:#fff;border-radius:16px;overflow:hidden">
          <div style="padding:24px 32px;border-bottom:1px solid rgba(255,255,255,0.08)">
            <h2 style="color:#00d4aa;margin:0">✅ Payment Confirmed</h2>
          </div>
          <div style="padding:32px">
            <table style="width:100%;border-collapse:collapse">
              <tr><td style="color:rgba(255,255,255,0.5);padding:8px 0">Tenant</td><td style="color:#fff;text-align:right"><strong>${tenantName}</strong></td></tr>
              <tr><td style="color:rgba(255,255,255,0.5);padding:8px 0">Property</td><td style="color:#fff;text-align:right">${propertyName}</td></tr>
              <tr><td style="color:rgba(255,255,255,0.5);padding:8px 0">Month</td><td style="color:#fff;text-align:right">${month}</td></tr>
              <tr><td style="color:rgba(255,255,255,0.5);padding:8px 0">Amount</td><td style="color:#00d4aa;text-align:right;font-size:20px;font-weight:700">₹${amount.toLocaleString('en-IN')}</td></tr>
              <tr><td style="color:rgba(255,255,255,0.5);padding:8px 0">Transaction ID</td><td style="color:#fff;text-align:right">${transactionId || 'N/A'}</td></tr>
              <tr><td style="color:rgba(255,255,255,0.5);padding:8px 0">Payment Date</td><td style="color:#fff;text-align:right">${new Date(paidDate).toLocaleDateString('en-IN', { day:'2-digit', month:'long', year:'numeric' })}</td></tr>
            </table>
          </div>
          <div style="padding:20px;text-align:center;color:rgba(255,255,255,0.3);font-size:12px;border-top:1px solid rgba(255,255,255,0.08)">
            Rental PM Pro · Keep this receipt for your records
          </div>
        </div>`,
    });
  },

  // ── Lease signed notification ───────────────────────────────────────────
  async leaseSigned({ ownerEmail, tenantName, propertyName, pdfUrl }) {
    return this.send({
      to:      ownerEmail,
      subject: `Lease Signed — ${tenantName} — ${propertyName}`,
      html: `
        <div style="font-family:sans-serif;max-width:500px;margin:auto;background:#0f1322;color:#fff;border-radius:16px;overflow:hidden">
          <div style="padding:24px 32px;border-bottom:1px solid rgba(255,255,255,0.08)">
            <h2 style="color:#00d4aa;margin:0">📄 Lease Agreement Signed</h2>
          </div>
          <div style="padding:32px">
            <p style="color:rgba(255,255,255,0.7)"><strong style="color:#fff">${tenantName}</strong> has signed the lease agreement for <strong style="color:#fff">${propertyName}</strong>. Both parties have executed the agreement and it is now active.</p>
            ${pdfUrl ? `<div style="margin:24px 0;text-align:center"><a href="${pdfUrl}" style="background:#00d4aa;color:#000;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:700">Download Lease PDF →</a></div>` : ''}
          </div>
        </div>`,
    });
  },

  // ── Password reset ──────────────────────────────────────────────────────
  async passwordReset(email, name, resetUrl) {
    return this.send({
      to:      email,
      subject: 'Reset Your Rental PM Pro Password',
      html: `
        <div style="font-family:sans-serif;max-width:500px;margin:auto;background:#0f1322;color:#fff;border-radius:16px;overflow:hidden">
          <div style="padding:24px 32px"><h2 style="color:#fff">Password Reset Request</h2>
          <p style="color:rgba(255,255,255,0.7)">Hi ${name}, click below to reset your password. This link expires in 1 hour.</p>
          <div style="margin:24px 0;text-align:center"><a href="${resetUrl}" style="background:#ef4444;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:700">Reset Password</a></div>
          <p style="color:rgba(255,255,255,0.4);font-size:12px">If you didn't request this, please ignore this email.</p></div>
        </div>`,
    });
  },
};

module.exports = EmailService;
