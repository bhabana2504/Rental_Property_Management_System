// routes/payments.js
'use strict';
const router = require('express').Router();
const { protect, authorize } = require('../middleware/auth');
const { Payment } = require('../models/index');

router.get('/', protect, async (req,res,next) => {
  try {
    const { page=1,limit=20,status,tenantId,propertyId } = req.query;
    const filter = {};
    if (status)     filter.status     = status;
    if (tenantId)   filter.tenantId   = tenantId;
    if (propertyId) filter.propertyId = propertyId;
    const total = await Payment.countDocuments(filter);
    const data  = await Payment.find(filter)
      .populate('tenantId','name email')
      .populate('propertyId','name address')
      .sort({ createdAt:-1 }).skip((page-1)*limit).limit(parseInt(limit));
    res.json({success:true,data,pagination:{total,page:parseInt(page),pages:Math.ceil(total/limit)}});
  } catch(e){next(e);}
});

router.post('/', protect, authorize('admin','owner','staff'), async (req,res,next) => {
  try {
    const pay = await Payment.create({...req.body, recordedBy:req.user._id});
    res.status(201).json({success:true,data:pay});
  } catch(e){next(e);}
});

router.patch('/:id/status', protect, authorize('admin','owner','staff'), async (req,res,next) => {
  try {
    const { status, method, transactionId, paidDate } = req.body;
    const pay = await Payment.findByIdAndUpdate(req.params.id,
      { status, method, transactionId, paidDate: paidDate || (status==='Paid' ? new Date() : undefined) },
      { new:true }
    );
    if (!pay) return res.status(404).json({success:false,message:'Payment not found'});
    res.json({success:true,data:pay});
  } catch(e){next(e);}
});

router.delete('/:id', protect, authorize('admin'), async (req,res,next) => {
  try {
    await Payment.findByIdAndDelete(req.params.id);
    res.json({success:true,message:'Payment deleted'});
  } catch(e){next(e);}
});

module.exports = router;
