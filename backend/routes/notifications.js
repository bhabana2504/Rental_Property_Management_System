// routes/notifications.js
'use strict';
const router = require('express').Router();
const { protect } = require('../middleware/auth');
const { Notification } = require('../models/index');

router.get('/', protect, async (req,res,next) => {
  try {
    const { unread } = req.query;
    const filter = { userId: req.user._id };
    if (unread === 'true') filter.isRead = false;
    const notifications = await Notification.find(filter).sort({ createdAt:-1 }).limit(50);
    const unreadCount   = await Notification.countDocuments({ userId:req.user._id, isRead:false });
    res.json({ success:true, data:notifications, unreadCount });
  } catch(e){next(e);}
});

router.patch('/:id/read', protect, async (req,res,next) => {
  try {
    await Notification.findByIdAndUpdate(req.params.id, { isRead:true, readAt:new Date() });
    res.json({ success:true, message:'Marked as read' });
  } catch(e){next(e);}
});

router.patch('/read-all', protect, async (req,res,next) => {
  try {
    await Notification.updateMany({ userId:req.user._id, isRead:false }, { isRead:true, readAt:new Date() });
    res.json({ success:true, message:'All notifications marked as read' });
  } catch(e){next(e);}
});

router.delete('/:id', protect, async (req,res,next) => {
  try {
    await Notification.findByIdAndDelete(req.params.id);
    res.json({ success:true, message:'Notification deleted' });
  } catch(e){next(e);}
});

module.exports = router;
