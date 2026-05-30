'use strict';

const mongoose = require('mongoose');
const logger   = require('../utils/logger');

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/rental-pm-pro';

const OPTIONS = {
  useNewUrlParser:    true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS:          45000,
  maxPoolSize:              10,
  retryWrites:              true,
};

let retries = 0;
const MAX_RETRIES = 5;

async function connect() {
  try {
    await mongoose.connect(MONGO_URI, OPTIONS);
    logger.info(`✅ MongoDB connected: ${mongoose.connection.host}`);
    retries = 0;

    mongoose.connection.on('error',      err  => logger.error('MongoDB error:', err.message));
    mongoose.connection.on('disconnected',()   => { logger.warn('MongoDB disconnected — retrying…'); reconnect(); });
  } catch (err) {
    retries++;
    logger.error(`❌ MongoDB connection failed (attempt ${retries}/${MAX_RETRIES}): ${err.message}`);
    if (retries < MAX_RETRIES) {
      const delay = Math.min(1000 * 2 ** retries, 30000);
      logger.info(`Retrying in ${delay/1000}s…`);
      setTimeout(connect, delay);
    } else {
      logger.error('Max retries reached. Starting in demo mode (no DB).');
    }
  }
}

async function reconnect() {
  try {
    await mongoose.connect(MONGO_URI, OPTIONS);
    logger.info('✅ MongoDB reconnected');
  } catch (err) {
    logger.error('Reconnection failed:', err.message);
    setTimeout(reconnect, 5000);
  }
}

async function disconnect() {
  await mongoose.disconnect();
  logger.info('MongoDB disconnected gracefully');
}

module.exports = { connect, disconnect };
