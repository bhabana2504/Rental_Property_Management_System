// routes/properties.js
'use strict';
const router   = require('express').Router();
const { protect, authorize } = require('../middleware/auth');
const { Property } = require('../models/index');

const crud = (Model, searchFields = []) => {
  router.get('/', protect, async (req, res, next) => {
    try {
      const { page=1, limit=20, search, status } = req.query;
      const filter = {};
      if (status) filter.status = status;
      if (search && searchFields.length) {
        filter.$or = searchFields.map(f => ({ [f]: { $regex: search, $options: 'i' } }));
      }
      const total = await Model.countDocuments(filter);
      const data  = await Model.find(filter).sort({ createdAt: -1 }).skip((page-1)*limit).limit(parseInt(limit));
      res.json({ success:true, data, pagination:{ total, page:parseInt(page), pages:Math.ceil(total/limit) }});
    } catch(e){next(e);}
  });

  router.get('/:id', protect, async (req, res, next) => {
    try {
      const doc = await Model.findById(req.params.id);
      if (!doc) return res.status(404).json({success:false, message:'Not found'});
      res.json({success:true, data:doc});
    } catch(e){next(e);}
  });

  router.post('/', protect, authorize('admin','owner','staff'), async (req, res, next) => {
    try {
      const doc = await Model.create({ ...req.body, ownerId: req.user._id });
      res.status(201).json({success:true, data:doc});
    } catch(e){next(e);}
  });

  router.put('/:id', protect, authorize('admin','owner','staff'), async (req, res, next) => {
    try {
      const doc = await Model.findByIdAndUpdate(req.params.id, req.body, {new:true, runValidators:true});
      if (!doc) return res.status(404).json({success:false, message:'Not found'});
      res.json({success:true, data:doc});
    } catch(e){next(e);}
  });

  router.delete('/:id', protect, authorize('admin','owner'), async (req, res, next) => {
    try {
      await Model.findByIdAndUpdate(req.params.id, {isActive:false});
      res.json({success:true, message:'Deleted'});
    } catch(e){next(e);}
  });

  return router;
};

module.exports = crud(Property, ['name','address','type']);
