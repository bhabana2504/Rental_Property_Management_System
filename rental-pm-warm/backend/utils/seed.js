/**
 * seed.js — Seeds the MongoDB database with demo data
 * Run: node utils/seed.js
 */
'use strict';

require('dotenv').config({ path: '../.env' });
const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');
const User     = require('../models/User');
const { Property, Tenant, Payment, Maintenance } = require('../models/index');

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/rental-pm-pro';

async function seed() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB');

    // Clear existing
    await Promise.all([
      User.deleteMany({}), Property.deleteMany({}),
      Tenant.deleteMany({}), Payment.deleteMany({}),
      Maintenance.deleteMany({}),
    ]);
    console.log('🗑️  Cleared existing data');

    // ── Users ──
    const adminPass  = await bcrypt.hash('Admin@123456', 12);
    const ownerPass  = await bcrypt.hash('Owner@123456', 12);
    const tenantPass = await bcrypt.hash('Tenant@123456', 12);

    const [admin, owner] = await User.insertMany([
      { name:'System Administrator', email:'admin@rentalpm.com',  password:adminPass,  role:'admin',  isActive:true },
      { name:'Admin Director',       email:'owner@rentalpm.com',  password:ownerPass,  role:'owner',  isActive:true },
      { name:'Priya Sharma',         email:'tenant@rentalpm.com', password:tenantPass, role:'tenant', isActive:true },
    ]);
    console.log('👤 Users seeded');

    // ── Properties ──
    const properties = await Property.insertMany([
      { name:'Meridian Tower — Unit 4B',        address:'1200 Brickell Ave, Mumbai, MH 400001',       type:'Penthouse', bedrooms:3, bathrooms:2, area:2100, rent:125000, deposit:250000, status:'Rented',    floor:'42nd',       amenities:['Pool','Gym','Concierge','Valet'],     ownerId:owner._id },
      { name:'The Oaks — Villa 7',              address:'8800 Sunset Ridge, Bengaluru, KA 560001',    type:'Villa',     bedrooms:5, bathrooms:4, area:4800, rent:220000, deposit:440000, status:'Rented',    floor:'Ground',     amenities:['Pool','Garden','Garage','Smart Home'], ownerId:owner._id },
      { name:'Koramangala Heights — Loft 12A',  address:'340 Koramangala 5th Block, Bengaluru',       type:'Loft',      bedrooms:1, bathrooms:1, area:980,  rent:55000,  deposit:110000, status:'Available', floor:'12th',       amenities:['Doorman','Rooftop','Storage'],        ownerId:owner._id },
      { name:'Bandra West Residences — 3C',     address:'901 Linking Road, Mumbai, MH 400050',        type:'Apartment', bedrooms:2, bathrooms:2, area:1350, rent:85000,  deposit:170000, status:'Rented',    floor:'8th',        amenities:['Sea View','Gym','Valet'],             ownerId:owner._id },
      { name:'DLF Phase V — Townhouse B',       address:'2240 Golf Course Road, Gurugram, HR 122009', type:'Townhouse', bedrooms:4, bathrooms:3, area:3200, rent:160000, deposit:320000, status:'Available', floor:'Multi-level',amenities:['Garden','Garage','Club Access'],      ownerId:owner._id },
      { name:'Hiranandani Gardens — Studio 5F', address:'400 Powai, Mumbai, MH 400076',               type:'Studio',    bedrooms:0, bathrooms:1, area:620,  rent:38000,  deposit:76000,  status:'Rented',    floor:'5th',        amenities:['Gym','Coworking','Rooftop'],          ownerId:owner._id },
    ]);
    console.log('🏢 Properties seeded');

    // ── Tenants ──
    const tenants = await Tenant.insertMany([
      { name:'Priya Sharma',    email:'p.sharma@tcs.com',           phone:'+91 98200 44221', propertyId:properties[0]._id, occupation:'Senior VP — Banking',     leaseStart:new Date('2024-02-01'), leaseEnd:new Date('2025-01-31'), deposit:250000, emergencyContact:'Rakesh Sharma — +91 98200 44200', aadhaarVerification:{status:'Verified',  aadhaarLast4:'4221'}, fraudRiskScore:5,  fraudRiskFlags:[] },
      { name:'Arjun Mehta',     email:'a.mehta@infosys.com',        phone:'+91 99450 88302', propertyId:properties[1]._id, occupation:'Tech Director',           leaseStart:new Date('2024-03-01'), leaseEnd:new Date('2025-02-28'), deposit:440000, emergencyContact:'Sunita Mehta — +91 99450 88300',  aadhaarVerification:{status:'Verified',  aadhaarLast4:'8302'}, fraudRiskScore:8,  fraudRiskFlags:[] },
      { name:'Neha Kapoor',     email:'neha.k@deloitte.in',         phone:'+91 91234 56789', propertyId:properties[3]._id, occupation:'Management Consultant',  leaseStart:new Date('2024-04-01'), leaseEnd:new Date('2025-03-31'), deposit:170000, emergencyContact:'Vijay Kapoor — +91 91234 56700',   aadhaarVerification:{status:'Submitted', aadhaarLast4:'6789'}, fraudRiskScore:20, fraudRiskFlags:['Aadhaar not yet approved'] },
      { name:'Dr. Rohan Joshi', email:'r.joshi@apollohospitals.com',phone:'+91 87654 32109', propertyId:properties[5]._id, occupation:'Senior Physician',        leaseStart:new Date('2024-05-01'), leaseEnd:new Date('2025-04-30'), deposit:76000,  emergencyContact:'Meera Joshi — +91 87654 32100',    aadhaarVerification:{status:'Pending'},                       fraudRiskScore:30, fraudRiskFlags:['Aadhaar not verified'] },
    ]);
    console.log('👥 Tenants seeded');

    // ── Payments ──
    const paymentData = [];
    const months = [
      { month:'October 2024',  date:'2024-10-01', status:'Paid' },
      { month:'November 2024', date:'2024-11-01', status:'Paid' },
      { month:'December 2024', date:'2024-12-01', status:'Pending' },
    ];
    for (const t of tenants) {
      const prop = properties.find(p => p._id.equals(t.propertyId));
      for (const m of months) {
        paymentData.push({
          tenantId: t._id, propertyId: t.propertyId,
          amount: prop.rent, month: m.month,
          dueDate: new Date(m.date), paidDate: m.status === 'Paid' ? new Date(m.date) : null,
          status: m.status, method: m.status === 'Paid' ? ['NEFT','RTGS','UPI'][Math.floor(Math.random()*3)] : '',
          recordedBy: admin._id,
        });
      }
    }
    await Payment.insertMany(paymentData);
    console.log('💳 Payments seeded');

    // ── Maintenance ──
    await Maintenance.insertMany([
      { propertyId:properties[0]._id, tenantId:tenants[0]._id, title:'HVAC Thermostat Malfunction',    description:'Smart thermostat not responding in master bedroom zone.',     category:'HVAC',      priority:'High',   status:'Completed',   reportedDate:new Date('2024-11-08'), completedDate:new Date('2024-11-11'), assignedTo:'Carrier HVAC Services', cost:8500 },
      { propertyId:properties[1]._id, tenantId:tenants[1]._id, title:'Pool Pump Pressure Drop',        description:'Main circulation pump showing irregular pressure.',             category:'Plumbing',  priority:'High',   status:'In Progress', reportedDate:new Date('2024-11-25'), assignedTo:'AquaPro Pool Services' },
      { propertyId:properties[3]._id, tenantId:tenants[2]._id, title:'Balcony Door Seal Replacement',  description:'Weather seal worn, causing drafts during monsoon.',              category:'Structural',priority:'Medium', status:'Pending',     reportedDate:new Date('2024-12-01') },
      { propertyId:properties[5]._id, tenantId:tenants[3]._id, title:'Elevator Access Card Issue',     description:"Tenant's access card not reading on floors 4 and 5.",           category:'Security',  priority:'Low',    status:'In Progress', reportedDate:new Date('2024-11-30'), assignedTo:'Building Management' },
    ]);
    console.log('🔧 Maintenance tickets seeded');

    console.log('\n✅ Database seeded successfully!');
    console.log('\nDemo credentials:');
    console.log('  Admin:  admin@rentalpm.com  / Admin@123456');
    console.log('  Owner:  owner@rentalpm.com  / Owner@123456');
    console.log('  Tenant: tenant@rentalpm.com / Tenant@123456');

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('❌ Seed failed:', err);
    process.exit(1);
  }
}

seed();
