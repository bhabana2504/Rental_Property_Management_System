// routes/maintenance.js
'use strict';
const router = require('express').Router();
const { protect, authorize } = require('../middleware/auth');
const { Maintenance } = require('../models/index');

router.get('/', protect, async (req,res,next) => {
  try {
    const { page=1,limit=20,status,priority,propertyId } = req.query;
    const filter = {};
    if (status)     filter.status     = status;
    if (priority)   filter.priority   = priority;
    if (propertyId) filter.propertyId = propertyId;
    const total = await Maintenance.countDocuments(filter);
    const data  = await Maintenance.find(filter)
      .populate('propertyId','name address')
      .populate('tenantId','name email')
      .sort({ createdAt:-1 }).skip((page-1)*limit).limit(parseInt(limit));
    res.json({success:true,data,pagination:{total,page:parseInt(page),pages:Math.ceil(total/limit)}});
  } catch(e){next(e);}
});

router.post('/', protect, async (req,res,next) => {
  try {
    const ticket = await Maintenance.create(req.body);
    res.status(201).json({success:true,data:ticket});
  } catch(e){next(e);}
});

router.put('/:id', protect, async (req,res,next) => {
  try {
    const ticket = await Maintenance.findByIdAndUpdate(req.params.id,req.body,{new:true});
    if (!ticket) return res.status(404).json({success:false,message:'Ticket not found'});
    res.json({success:true,data:ticket});
  } catch(e){next(e);}
});

router.post('/:id/escalate', protect, authorize('admin','owner'), async (req,res,next) => {
  try {
    const { reason } = req.body;
    const ticket = await Maintenance.findByIdAndUpdate(req.params.id,{
      escalated:true, escalationReason:reason, escalatedAt:new Date(), status:'Escalated',
    },{new:true});
    res.json({success:true,data:ticket,message:'Ticket escalated'});
  } catch(e){next(e);}
});

router.post('/:id/note', protect, async (req,res,next) => {
  try {
    const ticket = await Maintenance.findById(req.params.id);
    if (!ticket) return res.status(404).json({success:false,message:'Ticket not found'});
    ticket.notes.push({ text:req.body.text, addedBy:req.user._id });
    await ticket.save();
    res.json({success:true,data:ticket});
  } catch(e){next(e);}
});

module.exports = router;
