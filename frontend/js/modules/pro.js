/**
 * pro.js — Shared module for all Pro-upgraded pages.
 * Provides: sidebar injection, user info, pagination, debounce, helpers.
 */
'use strict';

// ── Helpers reused across pages (if app.js not yet loaded) ────────────────
window.esc       = window.esc       || (s => { const d = document.createElement('div'); d.textContent = s||''; return d.innerHTML; });
window.fmtMoney  = window.fmtMoney  || (n => new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR',maximumFractionDigits:0}).format(Number(n)||0));
window.fmtDate   = window.fmtDate   || (d => { if (!d) return '—'; return new Date(d+'').toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}); });
window.initials  = window.initials  || (name => (name||'').split(' ').slice(0,2).map(w=>w[0]).join('').toUpperCase());
window.hashColor = window.hashColor || (name => (name||'').charCodeAt(0) % 6);

window.statusPill = window.statusPill || function(status) {
  const map = { 'Available':'teal','Rented':'blue','Paid':'green','Pending':'amber','Completed':'green',
    'In Progress':'blue','Active':'green','Expiring Soon':'amber','Expired':'red','Draft':'muted',
    'Terminated':'red','Escalated':'red','Overdue':'red','Verified':'green','Rejected':'red','Submitted':'blue' };
  const cls = map[status] || 'muted';
  return `<span class="pill pill-${cls}"><span class="pill-dot"></span>${esc(status)}</span>`;
};

window.leaseStatus = window.leaseStatus || function(endDate) {
  if (!endDate) return { label:'Unknown', cls:'muted' };
  const days = Math.ceil((new Date(endDate+'') - new Date()) / 86400000);
  if (days < 0)  return { label:'Expired',       cls:'red'   };
  if (days < 30) return { label:'Expiring Soon', cls:'amber' };
  return                { label:'Active',         cls:'green' };
};

window.debounce = window.debounce || function(fn, delay) {
  let timer;
  return (...args) => { clearTimeout(timer); timer = setTimeout(() => fn(...args), delay); };
};

window.renderPagination = function(containerId, pagination, onPage) {
  const el = document.getElementById(containerId);
  if (!el || !pagination || pagination.pages <= 1) { if (el) el.innerHTML = ''; return; }
  const { page, pages } = pagination;
  let html = `<div class="pagination-inner">`;
  html += `<button class="page-btn" ${page<=1?'disabled':''} onclick="(${onPage})(${page-1})">‹</button>`;
  for (let i = Math.max(1,page-2); i <= Math.min(pages,page+2); i++) {
    html += `<button class="page-btn ${i===page?'active':''}" onclick="(${onPage})(${i})">${i}</button>`;
  }
  html += `<button class="page-btn" ${page>=pages?'disabled':''} onclick="(${onPage})(${page+1})">›</button>`;
  html += `<span class="page-info">Page ${page} of ${pages}</span></div>`;
  el.innerHTML = html;
};

// ── Current page detection ────────────────────────────────────────────────
function currentPage() {
  const file = window.location.pathname.split('/').pop().replace('.html','') || 'index';
  return file === '' ? 'index' : file;
}

// ── Sidebar HTML ──────────────────────────────────────────────────────────
const SIDEBAR_LINKS = [
  { id:'index',        href:'index.html',        label:'Dashboard',     icon:'grid',          section:'Overview' },
  { id:'analytics',    href:'analytics.html',     label:'Analytics',     icon:'chart',         section:null },
  { id:'properties',   href:'properties.html',    label:'Properties',    icon:'home',          section:'Management' },
  { id:'tenants',      href:'tenants.html',       label:'Tenants',       icon:'users',         section:null },
  { id:'payments',     href:'payments.html',      label:'Payments',      icon:'card',          section:null },
  { id:'maintenance',  href:'maintenance.html',   label:'Maintenance',   icon:'wrench',        badge:'maintenance', section:null },
  { id:'leases',       href:'leases.html',        label:'Leases',        icon:'document',      section:'Compliance' },
  { id:'verification', href:'verification.html',  label:'Verification',  icon:'shield',        section:null },
  { id:'documents',    href:'documents.html',     label:'Documents',     icon:'folder',        section:null },
  { id:'notifications',href:'notifications.html', label:'Notifications', icon:'bell',          badge:'notifications', section:'System' },
  { id:'chat',         href:'chat.html',          label:'Messages',      icon:'chat',          section:null },
];

const ICONS = {
  grid:     `<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/>`,
  chart:    `<line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>`,
  home:     `<path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>`,
  users:    `<path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/>`,
  card:     `<rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/>`,
  wrench:   `<path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z"/>`,
  document: `<path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/>`,
  shield:   `<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>`,
  folder:   `<path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/>`,
  bell:     `<path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/>`,
  chat:     `<path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>`,
};

function buildSidebarHTML(activePage) {
  const user = JSON.parse(localStorage.getItem('rpm_user') || '{}');
  const maintCount = (JSON.parse(localStorage.getItem('rpm_maintenance') || '[]')).filter(m => m.status !== 'Completed').length;
  const notifCount = 3; // demo

  let nav = '';
  let lastSection = null;
  SIDEBAR_LINKS.forEach(link => {
    if (link.section && link.section !== lastSection) {
      nav += `<div class="nav-section${lastSection ? ' mt8' : ''}">${link.section}</div>`;
      lastSection = link.section;
    }
    const badge = link.badge === 'maintenance' && maintCount > 0
      ? `<span class="nav-badge">${maintCount}</span>`
      : link.badge === 'notifications' && notifCount > 0
      ? `<span class="nav-badge">${notifCount}</span>`
      : '';
    nav += `
      <a href="${link.href}" class="nav-link ${activePage === link.id ? 'active' : ''}">
        <span class="nav-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor">${ICONS[link.icon]}</svg></span>
        <span class="nav-label-text">${link.label}</span>
        ${badge}
      </a>`;
  });

  const roleLabel = { admin:'System Admin', owner:'Portfolio Manager', tenant:'Tenant Portal', staff:'Property Staff' };
  const userInitials = initials(user.name || 'Admin Director');
  const userName  = user.name  || 'Admin Director';
  const userRole  = roleLabel[user.role] || 'Portfolio Manager';

  return `
    <aside class="sidebar" id="sidebar">
      <div class="sidebar-brand">
        <div class="brand-logo">
          <svg viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect width="36" height="36" rx="8" fill="#2D6A4F" fill-opacity="0.12"/>
            <rect x="1" y="1" width="34" height="34" rx="7" stroke="#2D6A4F" stroke-opacity="0.3" stroke-width="1"/>
            <path d="M10 26V14l8-6 8 6v12" stroke="#2D6A4F" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M15 26v-6h6v6" stroke="#2D6A4F" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            <circle cx="18" cy="11" r="1.5" fill="#2D6A4F"/>
          </svg>
        </div>
        <div class="brand-wordmark">
          <strong>Rental PM</strong>
          <span>Pro Platform</span>
        </div>
      </div>
      <nav class="sidebar-nav">${nav}</nav>
      <div class="sidebar-footer">
        <div class="sidebar-user">
          <div class="user-avatar">${userInitials}</div>
          <div class="user-meta">
            <strong>${esc(userName)}</strong>
            <span>${esc(userRole)}</span>
          </div>
          <div class="online-dot"></div>
        </div>
        <button class="logout-btn" onclick="ProModule.logout()" title="Sign out">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
        </button>
      </div>
    </aside>`;
}

// ── Notification bell in topbar ───────────────────────────────────────────
function injectNotifBell() {
  const actions = document.querySelector('.topbar-actions');
  if (!actions) return;
  const btn = document.createElement('div');
  btn.className = 'notif-bell-wrap';
  btn.innerHTML = `
    <button class="notif-bell" onclick="window.location.href='notifications.html'" title="Notifications">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>
      <span class="notif-dot" id="notifDot"></span>
    </button>`;
  actions.prepend(btn);
}

// ── Hamburger ─────────────────────────────────────────────────────────────
function wireHamburger() {
  const btn = document.getElementById('hamburger');
  const sb  = document.getElementById('sidebar');
  if (!btn || !sb) return;
  btn.addEventListener('click', () => sb.classList.toggle('open'));
  document.addEventListener('click', e => {
    if (sb.classList.contains('open') && !sb.contains(e.target) && e.target !== btn) {
      sb.classList.remove('open');
    }
  });
}

// ── ProModule public API ──────────────────────────────────────────────────
window.ProModule = {
  injectSidebar(activePage) {
    const mount = document.getElementById('sidebarMount');
    if (mount) {
      mount.outerHTML = buildSidebarHTML(activePage || currentPage());
    }
    wireHamburger();
    injectNotifBell();
  },

  applyUserInfo() {
    const user = JSON.parse(localStorage.getItem('rpm_user') || '{}');
    if (!user.name && !window.location.pathname.includes('login')) {
      // Allow demo access — do not force redirect
    }
    // Update notif dot
    setTimeout(() => {
      const dot = document.getElementById('notifDot');
      if (dot) dot.style.display = 'block';
    }, 500);
  },

  logout() {
    if (!confirm('Sign out?')) return;
    localStorage.removeItem('rpm_token');
    localStorage.removeItem('rpm_user');
    window.location.href = 'login.html';
  },
};

// ── Skeleton auto-hide after 800ms fallback ───────────────────────────────
window.addEventListener('load', () => {
  setTimeout(() => {
    document.querySelectorAll('.skeleton-grid').forEach(el => el.style.display = 'none');
    document.querySelectorAll('[id$="Panel"]').forEach(el => el.style.display = '');
  }, 300);
});
