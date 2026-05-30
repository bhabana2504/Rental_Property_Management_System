'use strict';

const jwt    = require('jsonwebtoken');
const User   = require('../models/User');
const logger = require('../utils/logger');

const JWT_SECRET = process.env.JWT_SECRET || 'rental-pm-pro-secret-change-in-production';

// ── Verify JWT ─────────────────────────────────────────────────────────────
exports.protect = async (req, res, next) => {
  try {
    let token;

    if (req.headers.authorization?.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies?.token) {
      token = req.cookies.token;
    }

    if (!token) {
      return res.status(401).json({ success: false, message: 'Access denied. No token provided.' });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    const user    = await User.findById(decoded.id).select('-password -refreshTokens');

    if (!user || !user.isActive) {
      return res.status(401).json({ success: false, message: 'User not found or account deactivated.' });
    }

    if (user.isLocked()) {
      return res.status(423).json({ success: false, message: 'Account temporarily locked.' });
    }

    req.user = user;
    next();
  } catch (err) {
    logger.warn(`Auth failure: ${err.message}`);
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: 'Token expired. Please log in again.' });
    }
    return res.status(401).json({ success: false, message: 'Invalid token.' });
  }
};

// ── Role-based access ──────────────────────────────────────────────────────
exports.authorize = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      message: `Role '${req.user.role}' is not authorized for this action.`,
    });
  }
  next();
};

// ── Generate tokens ────────────────────────────────────────────────────────
exports.generateAccessToken = (userId, role) =>
  jwt.sign({ id: userId, role }, JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES || '7d' });

exports.generateRefreshToken = (userId) =>
  jwt.sign({ id: userId }, process.env.JWT_REFRESH_SECRET || JWT_SECRET + '_refresh', { expiresIn: '30d' });
