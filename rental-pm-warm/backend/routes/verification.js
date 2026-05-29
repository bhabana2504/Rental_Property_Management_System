// routes/verification.js
'use strict';
const router = require('express').Router();
const { protect, authorize } = require('../middleware/auth');
const ctrl = require('../controllers/verificationController');

router.post('/aadhaar/:tenantId',         protect,                          ctrl.submitAadhaar);
router.patch('/aadhaar/:tenantId/approve',protect, authorize('admin','owner'), ctrl.approveAadhaar);
router.patch('/aadhaar/:tenantId/reject', protect, authorize('admin','owner'), ctrl.rejectAadhaar);
router.get('/fraud-report',              protect, authorize('admin','owner'), ctrl.getFraudReport);

module.exports = router;
