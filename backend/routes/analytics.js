// routes/analytics.js
'use strict';
const router = require('express').Router();
const { protect, authorize } = require('../middleware/auth');
const ctrl = require('../controllers/analyticsController');

router.get('/dashboard',            protect, authorize('admin','owner'), ctrl.getDashboard);
router.get('/payments',             protect, authorize('admin','owner'), ctrl.getPaymentAnalytics);
router.get('/property-performance', protect, authorize('admin','owner'), ctrl.getPropertyPerformance);

module.exports = router;
