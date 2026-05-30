'use strict';

const multer = require('multer');
const path   = require('path');
const fs     = require('fs');
const { v4: uuidv4 } = require('uuid');

// ── Ensure upload directories exist ─────────────────────────────────────
const DIRS = {
  documents: path.join(__dirname, '../uploads/documents'),
  leases:    path.join(__dirname, '../uploads/leases'),
  images:    path.join(__dirname, '../uploads/images'),
  avatars:   path.join(__dirname, '../uploads/avatars'),
};
Object.values(DIRS).forEach(dir => { if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true }); });

// ── Storage factory ──────────────────────────────────────────────────────
function diskStorage(subDir) {
  return multer.diskStorage({
    destination: (req, file, cb) => cb(null, DIRS[subDir] || DIRS.documents),
    filename:    (req, file, cb) => {
      const ext  = path.extname(file.originalname).toLowerCase().replace(/[^a-z0-9.]/g, '');
      const safe = `${uuidv4()}${ext}`;
      cb(null, safe);
    },
  });
}

// ── File type filters ────────────────────────────────────────────────────
const ALLOWED = {
  documents: ['.pdf', '.jpg', '.jpeg', '.png', '.doc', '.docx'],
  images:    ['.jpg', '.jpeg', '.png', '.gif', '.webp'],
  leases:    ['.pdf'],
};

function fileFilter(allowedExts) {
  return (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedExts.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error(`File type "${ext}" not allowed. Allowed: ${allowedExts.join(', ')}`), false);
    }
  };
}

const MAX_SIZE_MB = parseInt(process.env.MAX_FILE_SIZE_MB) || 10;

// ── Multer instances ─────────────────────────────────────────────────────
const uploadDocument = multer({
  storage:    diskStorage('documents'),
  fileFilter: fileFilter(ALLOWED.documents),
  limits:     { fileSize: MAX_SIZE_MB * 1024 * 1024, files: 1 },
});

const uploadImage = multer({
  storage:    diskStorage('images'),
  fileFilter: fileFilter(ALLOWED.images),
  limits:     { fileSize: 5 * 1024 * 1024, files: 5 },
});

const uploadAvatar = multer({
  storage:    diskStorage('avatars'),
  fileFilter: fileFilter(ALLOWED.images),
  limits:     { fileSize: 2 * 1024 * 1024, files: 1 },
});

// ── URL helper ───────────────────────────────────────────────────────────
function fileUrl(subDir, filename) {
  return `/uploads/${subDir}/${filename}`;
}

// ── Safe file deletion ────────────────────────────────────────────────────
function deleteFile(relativePath) {
  try {
    const full = path.join(__dirname, '..', relativePath);
    if (fs.existsSync(full)) { fs.unlinkSync(full); return true; }
  } catch (err) { /* ignore */ }
  return false;
}

module.exports = { uploadDocument, uploadImage, uploadAvatar, fileUrl, deleteFile, DIRS };
