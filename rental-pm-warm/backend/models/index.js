'use strict';

const mongoose = require('mongoose');

// ══════════════════════════════════════════════════════
//  PROPERTY
// ══════════════════════════════════════════════════════
const propertySchema = new mongoose.Schema({
  name:       { type: String, required: true, trim: true },
  address:    { type: String, required: true, trim: true },
  type:       { type: String, enum: ['Apartment', 'Villa', 'Studio', 'Loft', 'Penthouse', 'Townhouse', 'PG', 'Commercial'], default: 'Apartment' },
  bedrooms:   { type: Number, default: 1, min: 0 },
  bathrooms:  { type: Number, default: 1, min: 0 },
  area:       { type: Number, min: 0 },
  rent:       { type: Number, required: true, min: 0 },
  deposit:    { type: Number, default: 0, min: 0 },
  floor:      { type: String },
  status:     { type: String, enum: ['Available', 'Rented', 'Under Maintenance', 'Inactive'], default: 'Available' },
  amenities:  [{ type: String }],
  images:     [{ url: String, caption: String, uploadedAt: { type: Date, default: Date.now } }],
  ownerId:    { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  description: { type: String },
  geoLocation: {
    lat: { type: Number },
    lng: { type: Number },
  },
  isActive:   { type: Boolean, default: true },
}, { timestamps: true });

propertySchema.index({ status: 1 });
propertySchema.index({ ownerId: 1 });
propertySchema.index({ name: 'text', address: 'text' });

// ══════════════════════════════════════════════════════
//  TENANT
// ══════════════════════════════════════════════════════
const tenantSchema = new mongoose.Schema({
  name:       { type: String, required: true, trim: true },
  email:      { type: String, required: true, lowercase: true, trim: true },
  phone:      { type: String, trim: true },
  propertyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Property' },
  occupation: { type: String, trim: true },
  leaseStart: { type: Date },
  leaseEnd:   { type: Date },
  deposit:    { type: Number, default: 0 },
  emergencyContact: { type: String },
  userId:     { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

  // Aadhaar verification
  aadhaarVerification: {
    status:       { type: String, enum: ['Pending', 'Submitted', 'Verified', 'Rejected'], default: 'Pending' },
    aadhaarLast4: { type: String },  // Only store last 4 digits
    verifiedAt:   { type: Date },
    verifiedBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    rejectionReason: { type: String },
  },

  // AI fraud risk score
  fraudRiskScore:  { type: Number, default: 0, min: 0, max: 100 },
  fraudRiskFlags:  [{ type: String }],
  fraudCheckedAt:  { type: Date },

  documents: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Document' }],
  notes:     { type: String },
  isActive:  { type: Boolean, default: true },
}, { timestamps: true });

tenantSchema.index({ propertyId: 1 });
tenantSchema.index({ email: 1 });
tenantSchema.index({ 'aadhaarVerification.status': 1 });

// ══════════════════════════════════════════════════════
//  PAYMENT
// ══════════════════════════════════════════════════════
const paymentSchema = new mongoose.Schema({
  tenantId:   { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true },
  propertyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Property', required: true },
  amount:     { type: Number, required: true, min: 0 },
  month:      { type: String, required: true },
  dueDate:    { type: Date },
  paidDate:   { type: Date },
  status:     { type: String, enum: ['Pending', 'Paid', 'Overdue', 'Partial', 'Waived'], default: 'Pending' },
  method:     { type: String, enum: ['NEFT', 'RTGS', 'UPI', 'Cash', 'Cheque', 'IMPS', ''], default: '' },
  transactionId: { type: String },
  notes:      { type: String },
  receiptUrl: { type: String },
  lateFee:    { type: Number, default: 0 },
  recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

paymentSchema.index({ tenantId: 1, month: 1 });
paymentSchema.index({ status: 1 });
paymentSchema.index({ dueDate: 1 });

// ══════════════════════════════════════════════════════
//  MAINTENANCE
// ══════════════════════════════════════════════════════
const maintenanceSchema = new mongoose.Schema({
  propertyId:    { type: mongoose.Schema.Types.ObjectId, ref: 'Property', required: true },
  tenantId:      { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant' },
  title:         { type: String, required: true, trim: true },
  description:   { type: String },
  category:      { type: String, enum: ['Plumbing', 'Electrical', 'HVAC', 'Structural', 'Appliance', 'Security', 'Pest', 'Other'], default: 'Other' },
  priority:      { type: String, enum: ['Low', 'Medium', 'High', 'Emergency'], default: 'Medium' },
  status:        { type: String, enum: ['Pending', 'Acknowledged', 'In Progress', 'Completed', 'Cancelled', 'Escalated'], default: 'Pending' },
  reportedDate:  { type: Date, default: Date.now },
  assignedTo:    { type: String },
  assignedToId:  { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  scheduledDate: { type: Date },
  completedDate: { type: Date },
  cost:          { type: Number, default: 0 },
  images:        [{ url: String, caption: String }],
  notes:         [{ text: String, addedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, addedAt: { type: Date, default: Date.now } }],
  // Escalation
  escalated:     { type: Boolean, default: false },
  escalationReason: { type: String },
  escalatedAt:   { type: Date },
}, { timestamps: true });

maintenanceSchema.index({ propertyId: 1, status: 1 });
maintenanceSchema.index({ priority: 1, status: 1 });

// ══════════════════════════════════════════════════════
//  LEASE
// ══════════════════════════════════════════════════════
const leaseSchema = new mongoose.Schema({
  tenantId:    { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true },
  propertyId:  { type: mongoose.Schema.Types.ObjectId, ref: 'Property', required: true },
  startDate:   { type: Date, required: true },
  endDate:     { type: Date, required: true },
  monthlyRent: { type: Number, required: true },
  deposit:     { type: Number, default: 0 },
  status:      { type: String, enum: ['Draft', 'Active', 'Expired', 'Terminated', 'Renewed'], default: 'Draft' },
  terms:       { type: String },
  pdfUrl:      { type: String },
  signedByTenant: { type: Boolean, default: false },
  signedByOwner:  { type: Boolean, default: false },
  tenantSignedAt: { type: Date },
  ownerSignedAt:  { type: Date },
  renewalReminder: { type: Boolean, default: true },
  noticePeriodDays: { type: Number, default: 30 },
  createdBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

leaseSchema.index({ tenantId: 1, status: 1 });
leaseSchema.index({ endDate: 1 });

// ══════════════════════════════════════════════════════
//  DOCUMENT
// ══════════════════════════════════════════════════════
const documentSchema = new mongoose.Schema({
  name:       { type: String, required: true },
  type:       { type: String, enum: ['Aadhaar', 'PAN', 'Lease', 'NOC', 'Receipt', 'Photo', 'Other'], default: 'Other' },
  url:        { type: String, required: true },
  mimeType:   { type: String },
  size:       { type: Number },
  tenantId:   { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant' },
  propertyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Property' },
  leaseId:    { type: mongoose.Schema.Types.ObjectId, ref: 'Lease' },
  uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  isPrivate:  { type: Boolean, default: false },
  expiresAt:  { type: Date },
}, { timestamps: true });

// ══════════════════════════════════════════════════════
//  NOTIFICATION
// ══════════════════════════════════════════════════════
const notificationSchema = new mongoose.Schema({
  userId:     { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title:      { type: String, required: true },
  message:    { type: String, required: true },
  type:       { type: String, enum: ['payment', 'lease', 'maintenance', 'verification', 'system', 'alert'], default: 'system' },
  isRead:     { type: Boolean, default: false },
  readAt:     { type: Date },
  actionUrl:  { type: String },
  metadata:   { type: mongoose.Schema.Types.Mixed },
  priority:   { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
  expiresAt:  { type: Date },
}, { timestamps: true });

notificationSchema.index({ userId: 1, isRead: 1 });
notificationSchema.index({ createdAt: -1 });

// ══════════════════════════════════════════════════════
//  CHAT MESSAGE (real-time)
// ══════════════════════════════════════════════════════
const chatMessageSchema = new mongoose.Schema({
  roomId:     { type: String, required: true },     // e.g. `tenant_${tenantId}`
  senderId:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  senderName: { type: String },
  senderRole: { type: String },
  message:    { type: String, required: true },
  isRead:     { type: Boolean, default: false },
  attachmentUrl: { type: String },
}, { timestamps: true });

chatMessageSchema.index({ roomId: 1, createdAt: -1 });

module.exports = {
  Property:    mongoose.model('Property',    propertySchema),
  Tenant:      mongoose.model('Tenant',      tenantSchema),
  Payment:     mongoose.model('Payment',     paymentSchema),
  Maintenance: mongoose.model('Maintenance', maintenanceSchema),
  Lease:       mongoose.model('Lease',       leaseSchema),
  Document:    mongoose.model('Document',    documentSchema),
  Notification: mongoose.model('Notification', notificationSchema),
  ChatMessage: mongoose.model('ChatMessage', chatMessageSchema),
};
