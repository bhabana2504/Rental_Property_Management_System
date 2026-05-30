'use strict';

const winston = require('winston');
const path    = require('path');
const fs      = require('fs');

const logDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true });

const { combine, timestamp, printf, colorize, errors } = winston.format;

const logFormat = printf(({ level, message, timestamp: ts, stack }) =>
  `${ts} [${level.toUpperCase()}]: ${stack || message}`
);

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: combine(timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }), errors({ stack: true }), logFormat),
  transports: [
    new winston.transports.Console({
      format: combine(colorize(), timestamp({ format: 'HH:mm:ss' }), logFormat),
    }),
    new winston.transports.File({ filename: path.join(logDir, 'error.log'),   level: 'error', maxsize: 10485760, maxFiles: 5 }),
    new winston.transports.File({ filename: path.join(logDir, 'combined.log'),               maxsize: 10485760, maxFiles: 10 }),
  ],
});

module.exports = logger;
