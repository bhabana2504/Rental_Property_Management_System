// routes/leases.js
'use strict';
const router = require('express').Router();
const { protect, authorize } = require('../middleware/auth');
const ctrl = require('../controllers/leaseController');

router.get('/',                     protect,                          ctrl.getLeases);
router.post('/',                    protect, authorize('admin','owner','staff'), ctrl.createLease);
router.get('/:id/pdf',              protect,                          ctrl.generateLeasePDF);
router.patch('/:id/sign',           protect,                          ctrl.signLease);
router.post('/reminders',           protect, authorize('admin'),      ctrl.sendRenewalReminders);

module.exports = router;
