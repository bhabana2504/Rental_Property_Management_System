// routes/tenants.js
'use strict';
const router = require('express').Router();
const { protect, authorize } = require('../middleware/auth');
const { Tenant } = require('../models/index');

router.get('/', protect, async (req, res, next) => {
  try {
    const { page=1, limit=20, search, propertyId } = req.query;
    const filter = { isActive: true };
    if (propertyId) filter.propertyId = propertyId;
    if (search) filter.$or = [
      { name: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
    ];
    const total   = await Tenant.countDocuments(filter);
    const tenants = await Tenant.find(filter)
      .populate('propertyId', 'name address rent')
      .sort({ createdAt: -1 })
      .skip((page-1)*limit).limit(parseInt(limit));
    res.json({ success:true, data:tenants, pagination:{ total, page:parseInt(page), pages:Math.ceil(total/limit) }});
  } catch(e){next(e);}
});

router.get('/:id', protect, async (req, res, next) => {
  try {
    const tenant = await Tenant.findById(req.params.id).populate('propertyId','name address rent');
    if (!tenant) return res.status(404).json({success:false, message:'Tenant not found'});
    res.json({success:true, data:tenant});
  } catch(e){next(e);}
});

router.post('/', protect, authorize('admin','owner','staff'), async (req, res, next) => {
  try {
    const tenant = await Tenant.create(req.body);
    res.status(201).json({success:true, data:tenant});
  } catch(e){next(e);}
});

router.put('/:id', protect, authorize('admin','owner','staff'), async (req, res, next) => {
  try {
    const tenant = await Tenant.findByIdAndUpdate(req.params.id, req.body, {new:true});
    if (!tenant) return res.status(404).json({success:false, message:'Not found'});
    res.json({success:true, data:tenant});
  } catch(e){next(e);}
});

router.delete('/:id', protect, authorize('admin','owner'), async (req, res, next) => {
  try {
    await Tenant.findByIdAndUpdate(req.params.id, {isActive:false});
    res.json({success:true, message:'Tenant deactivated'});
  } catch(e){next(e);}
});

module.exports = router;
