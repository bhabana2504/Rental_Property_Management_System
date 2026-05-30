'use strict';

const { body, param, query, validationResult } = require('express-validator');

// ── Respond with first validation error ───────────────────────────────────
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: errors.array()[0].msg,
      errors:  errors.array(),
    });
  }
  next();
};

// ── Property validators ───────────────────────────────────────────────────
const propertyRules = [
  body('name').trim().notEmpty().withMessage('Property name is required').isLength({ max: 100 }),
  body('address').trim().notEmpty().withMessage('Address is required'),
  body('rent').isNumeric({ no_symbols: true }).withMessage('Rent must be a number').isFloat({ min: 0 }),
  body('type').optional().isIn(['Apartment','Villa','Studio','Loft','Penthouse','Townhouse','PG','Commercial']),
  body('bedrooms').optional().isInt({ min: 0, max: 20 }),
  body('bathrooms').optional().isInt({ min: 0, max: 20 }),
  body('area').optional().isFloat({ min: 0 }),
  body('deposit').optional().isFloat({ min: 0 }),
  body('status').optional().isIn(['Available','Rented','Under Maintenance','Inactive']),
  validate,
];

// ── Tenant validators ─────────────────────────────────────────────────────
const tenantRules = [
  body('name').trim().notEmpty().withMessage('Tenant name is required').isLength({ max: 100 }),
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('phone').optional().trim().isLength({ max: 20 }),
  body('propertyId').optional().isMongoId().withMessage('Invalid property ID'),
  body('deposit').optional().isFloat({ min: 0 }),
  validate,
];

// ── Payment validators ────────────────────────────────────────────────────
const paymentRules = [
  body('tenantId').isMongoId().withMessage('Invalid tenant ID'),
  body('propertyId').isMongoId().withMessage('Invalid property ID'),
  body('amount').isFloat({ min: 1 }).withMessage('Amount must be a positive number'),
  body('month').notEmpty().withMessage('Month is required'),
  body('status').optional().isIn(['Pending','Paid','Overdue','Partial','Waived']),
  body('method').optional().isIn(['NEFT','RTGS','UPI','Cash','Cheque','IMPS','']),
  validate,
];

// ── Maintenance validators ────────────────────────────────────────────────
const maintenanceRules = [
  body('propertyId').isMongoId().withMessage('Invalid property ID'),
  body('title').trim().notEmpty().withMessage('Title is required').isLength({ max: 200 }),
  body('category').optional().isIn(['Plumbing','Electrical','HVAC','Structural','Appliance','Security','Pest','Other']),
  body('priority').optional().isIn(['Low','Medium','High','Emergency']),
  body('status').optional().isIn(['Pending','Acknowledged','In Progress','Completed','Cancelled','Escalated']),
  validate,
];

// ── Lease validators ──────────────────────────────────────────────────────
const leaseRules = [
  body('tenantId').isMongoId().withMessage('Invalid tenant ID'),
  body('propertyId').isMongoId().withMessage('Invalid property ID'),
  body('startDate').isISO8601().withMessage('Valid start date required'),
  body('endDate').isISO8601().withMessage('Valid end date required')
    .custom((end, { req }) => {
      if (new Date(end) <= new Date(req.body.startDate)) throw new Error('End date must be after start date');
      return true;
    }),
  body('monthlyRent').optional().isFloat({ min: 0 }),
  body('deposit').optional().isFloat({ min: 0 }),
  body('noticePeriodDays').optional().isInt({ min: 0, max: 365 }),
  validate,
];

// ── MongoDB ObjectId param validator ─────────────────────────────────────
const validateId = [
  param('id').isMongoId().withMessage('Invalid ID format'),
  validate,
];

// ── Pagination query validators ───────────────────────────────────────────
const paginationRules = [
  query('page').optional().isInt({ min: 1 }).toInt(),
  query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
  validate,
];

module.exports = {
  validate,
  propertyRules,
  tenantRules,
  paymentRules,
  maintenanceRules,
  leaseRules,
  validateId,
  paginationRules,
};
