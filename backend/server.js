'use strict';

require('dotenv').config();
const express      = require('express');
const cors         = require('cors');
const helmet       = require('helmet');
const compression  = require('compression');
const morgan       = require('morgan');
const rateLimit    = require('express-rate-limit');
const path         = require('path');

const logger       = require('./utils/logger');
const errorHandler = require('./middleware/errorHandler');
const db           = require('./config/db');

// ── Route imports ──────────────────────────────────────────────────────────
const authRoutes         = require('./routes/auth');
const propertyRoutes     = require('./routes/properties');
const tenantRoutes       = require('./routes/tenants');
const paymentRoutes      = require('./routes/payments');
const maintenanceRoutes  = require('./routes/maintenance');
const leaseRoutes        = require('./routes/leases');
const documentRoutes     = require('./routes/documents');
const notificationRoutes = require('./routes/notifications');
const analyticsRoutes    = require('./routes/analytics');
const verificationRoutes = require('./routes/verification');
const adminRoutes        = require('./routes/admin');

const app  = express();
const PORT = process.env.PORT || 5000;

// ── Security middleware ────────────────────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc:   ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      fontSrc:    ["'self'", 'https://fonts.gstatic.com'],
      scriptSrc:  ["'self'", "'unsafe-inline'", 'https://cdn.jsdelivr.net'],
      imgSrc:     ["'self'", 'data:', 'https:'],
    },
  },
  crossOriginEmbedderPolicy: false,
}));

// ── CORS ───────────────────────────────────────────────────────────────────
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token'],
}));

// ── Rate limiting ──────────────────────────────────────────────────────────
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minutes
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests, please try again later.' },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { success: false, message: 'Too many login attempts. Please wait 15 minutes.' },
});

app.use(globalLimiter);

// ── Body parsers ───────────────────────────────────────────────────────────
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ── Logging ────────────────────────────────────────────────────────────────
app.use(morgan('combined', {
  stream: { write: msg => logger.http(msg.trim()) },
}));

// ── Static uploads ─────────────────────────────────────────────────────────
app.use('/uploads', express.static(path.join(__dirname, 'uploads'), {
  setHeaders: (res) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Cache-Control', 'private, max-age=3600');
  },
}));

// ── API Routes ─────────────────────────────────────────────────────────────
app.use('/api/auth',          authLimiter, authRoutes);
app.use('/api/properties',    propertyRoutes);
app.use('/api/tenants',       tenantRoutes);
app.use('/api/payments',      paymentRoutes);
app.use('/api/maintenance',   maintenanceRoutes);
app.use('/api/leases',        leaseRoutes);
app.use('/api/documents',     documentRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/analytics',     analyticsRoutes);
app.use('/api/verification',  verificationRoutes);
app.use('/api/admin',         adminRoutes);

// ── Health check ───────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    status: 'operational',
    timestamp: new Date().toISOString(),
    version: '2.0.0',
    uptime: process.uptime(),
  });
});

// ── 404 ────────────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.originalUrl} not found` });
});

// ── Error handler ──────────────────────────────────────────────────────────
app.use(errorHandler);

// ── DB + Server boot ───────────────────────────────────────────────────────
db.connect()
  .then(() => {
    app.listen(PORT, () => {
      logger.info(`🚀 Server running on http://localhost:${PORT}`);
      logger.info(`📖 Health check: http://localhost:${PORT}/api/health`);
    });
  })
  .catch(() => {
    // Start without DB for demo mode
    app.listen(PORT, () => {
      logger.warn(`⚠️  Server running in DEMO mode (no DB) on http://localhost:${PORT}`);
    });
  });

// ── Graceful shutdown ───────────────────────────────────────────────────────
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received — shutting down gracefully');
  await db.disconnect();
  process.exit(0);
});
process.on('SIGINT', async () => {
  logger.info('SIGINT received — shutting down gracefully');
  await db.disconnect();
  process.exit(0);
});

module.exports = app;
