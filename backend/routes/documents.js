// routes/documents.js
'use strict';
const router = require('express').Router();
const multer = require('multer');
const path   = require('path');
const fs     = require('fs');
const { protect } = require('../middleware/auth');
const { Document } = require('../models/index');

const uploadDir = path.join(__dirname, '../uploads/documents');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename:    (req, file, cb) => {
    const ext  = path.extname(file.originalname).toLowerCase();
    const safe = Date.now() + '_' + Math.random().toString(36).slice(2, 8) + ext;
    cb(null, safe);
  },
});

const fileFilter = (req, file, cb) => {
  const allowed = ['.pdf','.jpg','.jpeg','.png','.doc','.docx'];
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowed.includes(ext)) cb(null, true);
  else cb(new Error(`File type ${ext} not allowed`), false);
};

const upload = multer({ storage, fileFilter, limits: { fileSize: 10 * 1024 * 1024 } });

// Upload document
router.post('/upload', protect, upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ success:false, message:'No file uploaded' });

    const doc = await Document.create({
      name:       req.body.name || req.file.originalname,
      type:       req.body.type || 'Other',
      url:        `/uploads/documents/${req.file.filename}`,
      mimeType:   req.file.mimetype,
      size:       req.file.size,
      tenantId:   req.body.tenantId   || null,
      propertyId: req.body.propertyId || null,
      leaseId:    req.body.leaseId    || null,
      uploadedBy: req.user._id,
      isPrivate:  req.body.isPrivate === 'true',
    });

    res.status(201).json({ success:true, data:doc, message:'Document uploaded' });
  } catch(e){next(e);}
});

// List documents
router.get('/', protect, async (req, res, next) => {
  try {
    const { tenantId, propertyId, type } = req.query;
    const filter = {};
    if (tenantId)   filter.tenantId   = tenantId;
    if (propertyId) filter.propertyId = propertyId;
    if (type)       filter.type       = type;
    const docs = await Document.find(filter).populate('uploadedBy','name').sort({ createdAt:-1 });
    res.json({ success:true, data:docs });
  } catch(e){next(e);}
});

// Delete
router.delete('/:id', protect, async (req, res, next) => {
  try {
    const doc = await Document.findById(req.params.id);
    if (!doc) return res.status(404).json({ success:false, message:'Not found' });
    // Delete file from disk
    const filePath = path.join(__dirname, '..', doc.url);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    await doc.deleteOne();
    res.json({ success:true, message:'Document deleted' });
  } catch(e){next(e);}
});

module.exports = router;
