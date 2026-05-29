# 🏢 Rental PM Pro — Production-Grade Property Management Platform

> A scalable, full-stack rental property management platform with multi-role authentication, Aadhaar verification, AI fraud detection, lease PDF generation, real-time chat, analytics dashboard, and cloud-ready architecture.

---

## 📁 Project Structure

```
rental-pm-pro/
├── frontend/                        # Pure HTML/CSS/JS frontend (works offline)
│   ├── index.html                   # ★ Dashboard (original + Chart.js revenue graph)
│   ├── properties.html              # ★ Property management (original)
│   ├── tenants.html                 # ★ Tenant management (original)
│   ├── payments.html                # ★ Payment tracking (original)
│   ├── maintenance.html             # ★ Maintenance tickets (original)
│   ├── login.html                   # ✨ NEW — Multi-role auth (JWT + demo mode)
│   ├── leases.html                  # ✨ NEW — Lease management + PDF generation
│   ├── analytics.html               # ✨ NEW — Admin analytics dashboard (Chart.js)
│   ├── verification.html            # ✨ NEW — Aadhaar verification + AI fraud detection
│   ├── documents.html               # ✨ NEW — Secure document vault (grid/list view)
│   ├── notifications.html           # ✨ NEW — Smart notifications center
│   ├── chat.html                    # ✨ NEW — Real-time tenant ↔ owner messaging
│   ├── data.json                    # Seed data (original)
│   ├── css/
│   │   ├── style.css                # ★ Original styles (untouched)
│   │   └── pro.css                  # ✨ NEW — All production upgrade styles
│   └── js/
│       ├── app.js                   # ★ Original app logic (untouched)
│       └── modules/
│           ├── api.js               # ✨ NEW — REST API client with JWT
│           └── pro.js               # ✨ NEW — Sidebar, pagination, shared utilities
│
└── backend/                         # Node.js + Express REST API
    ├── server.js                    # Entry point (Helmet, CORS, rate limiting)
    ├── package.json
    ├── .env.example                 # Copy to .env and fill in values
    ├── .gitignore
    ├── models/
    │   ├── User.js                  # User model with role-based access
    │   └── index.js                 # Property, Tenant, Payment, Maintenance,
    │                                #   Lease, Document, Notification, ChatMessage
    ├── controllers/
    │   ├── authController.js        # Register, login, logout, profile, password
    │   ├── analyticsController.js   # Dashboard KPIs, revenue charts, property perf
    │   ├── leaseController.js       # CRUD, PDF generation (PDFKit), e-signature
    │   └── verificationController.js# Aadhaar submit/approve/reject + AI fraud score
    ├── middleware/
    │   ├── auth.js                  # JWT protect + role authorize
    │   └── errorHandler.js          # Centralized error handling
    ├── routes/
    │   ├── auth.js
    │   ├── properties.js
    │   ├── tenants.js
    │   ├── payments.js
    │   ├── maintenance.js
    │   ├── leases.js
    │   ├── documents.js             # Multer file upload
    │   ├── notifications.js
    │   ├── analytics.js
    │   └── verification.js
    └── utils/
        ├── logger.js                # Winston logger (console + file)
        └── seed.js                  # MongoDB seed script
```

---

## 🚀 Quick Start

### Option A — Frontend Only (No Server Needed)
Open `frontend/index.html` in any browser. The app works fully in **demo mode** using `localStorage` for all data — no backend required.

**Demo Login:** Open `login.html` → click any Quick Demo button.

### Option B — Full Stack with Backend

**Prerequisites:** Node.js 18+, MongoDB 6+

```bash
# 1. Backend setup
cd backend
cp .env.example .env        # Fill in MONGODB_URI and secrets
npm install
node utils/seed.js          # Seed the database
npm run dev                 # Start API at http://localhost:5000

# 2. Frontend
# Open frontend/ with any static server:
cd ../frontend
npx serve .                 # or python -m http.server 3000
```

---

## 🔑 Demo Credentials

| Role   | Email                    | Password      |
|--------|--------------------------|---------------|
| Admin  | admin@rentalpm.com       | Admin@123456  |
| Owner  | owner@rentalpm.com       | Owner@123456  |
| Tenant | tenant@rentalpm.com      | Tenant@123456 |

---

## ✨ New Features Added

### 🔐 Multi-Role Authentication
- JWT access tokens + refresh tokens
- Roles: **Admin**, **Owner**, **Tenant**, **Staff**
- Account lockout after 5 failed attempts (15-minute lock)
- Secure password hashing (bcrypt, 12 rounds)

### 🪪 Aadhaar-Based Tenant Verification
- Submit last-4 digits of Aadhaar (UIDAI compliant — no full number stored)
- Admin approve/reject workflow
- Status: Pending → Submitted → Verified/Rejected

### 🤖 AI Fraud Risk Detection
- Automatic fraud scoring (0–100) for each tenant
- Flags: unverified Aadhaar, missing contacts, suspicious occupation, short lease
- High-risk (≥50) triggers admin alerts

### 📄 Lease Agreement Management
- Create, sign (tenant + owner e-signature), track status
- PDF generation via PDFKit with all tenant/property/clause details
- Auto-renewal reminders 30 days before expiry

### 📊 Analytics Dashboard
- Revenue trend chart (Chart.js line graph — 6-month view)
- Occupancy doughnut chart
- Maintenance-by-category bar chart
- Payment method distribution pie chart
- Property performance table with collection rate progress bars

### 🔔 Smart Notifications
- In-app notification center with type filtering
- Auto-generated alerts: pending payments, expiring leases, high-risk tenants
- Mark read / clear all

### 💬 Real-time Tenant Chat
- Conversation rooms per tenant
- Auto-reply simulation in demo mode
- Designed for WebSocket upgrade (Socket.io)

### 📁 Document Vault
- Grid/list view toggle
- Upload PDF, JPG, PNG, DOCX
- Type categories: Aadhaar, PAN, Lease, NOC, Receipt, Photo
- Per-tenant and per-property scoping

---

## 🔒 Security

| Feature                     | Implementation                          |
|-----------------------------|-----------------------------------------|
| Authentication              | JWT (access + refresh tokens)           |
| Password hashing            | bcrypt (12 rounds)                      |
| Role-based access control   | Express middleware per route            |
| Rate limiting               | 200 req/15min global, 10 req/15min auth |
| HTTP security headers       | Helmet.js                               |
| CORS                        | Configured per environment              |
| File upload safety          | Mimetype whitelist, 10MB limit          |
| Input validation            | express-validator on all endpoints      |
| XSS prevention              | xss-clean middleware + output escaping  |
| Error handling              | Centralized, no stack traces in prod    |
| Logging                     | Winston (file + console, rotating)      |
| Data minimization           | Aadhaar: last 4 digits only             |

---

## 🌐 API Endpoints

```
POST   /api/auth/register
POST   /api/auth/login
GET    /api/auth/me
POST   /api/auth/logout

GET    /api/properties         GET/POST/PUT/DELETE
GET    /api/tenants            GET/POST/PUT/DELETE
GET    /api/payments           GET/POST
PATCH  /api/payments/:id/status

GET    /api/maintenance        GET/POST/PUT
POST   /api/maintenance/:id/escalate
POST   /api/maintenance/:id/note

GET    /api/leases             GET/POST
GET    /api/leases/:id/pdf     → Download signed PDF
PATCH  /api/leases/:id/sign
POST   /api/leases/reminders   → Send renewal reminders

POST   /api/documents/upload   (multipart/form-data)
GET    /api/documents
DELETE /api/documents/:id

GET    /api/notifications
PATCH  /api/notifications/:id/read
PATCH  /api/notifications/read-all

GET    /api/analytics/dashboard
GET    /api/analytics/payments?year=2025
GET    /api/analytics/property-performance

POST   /api/verification/aadhaar/:tenantId
PATCH  /api/verification/aadhaar/:tenantId/approve
PATCH  /api/verification/aadhaar/:tenantId/reject
GET    /api/verification/fraud-report

GET    /api/health
```

---

## 🏗️ Cloud Deployment

**Frontend:** Deploy `frontend/` to Vercel, Netlify, or any static host.

**Backend:** Deploy to Railway, Render, Fly.io, or AWS EC2.

```bash
# Set environment variables:
NODE_ENV=production
MONGODB_URI=mongodb+srv://...
JWT_SECRET=<strong-random-64-char-string>
FRONTEND_URL=https://your-frontend-domain.com
```

---

## 📦 Tech Stack

| Layer     | Technology                              |
|-----------|-----------------------------------------|
| Frontend  | Vanilla HTML5 / CSS3 / ES6+             |
| Charts    | Chart.js 4.4                            |
| Backend   | Node.js 18 + Express 4                  |
| Database  | MongoDB + Mongoose                      |
| Auth      | JSON Web Tokens (jsonwebtoken)          |
| PDF       | PDFKit                                  |
| Uploads   | Multer                                  |
| Security  | Helmet, express-rate-limit, bcryptjs    |
| Logging   | Winston                                 |

---

*Original project structure, styles, and all existing functionality preserved. All enhancements are additive modules.*
