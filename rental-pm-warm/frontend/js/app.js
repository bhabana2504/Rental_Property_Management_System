/**
 * ╔══════════════════════════════════════════════╗
 * ║  NEXUS — Property Intelligence Platform     ║
 * ║  app.js  ·  Vanilla ES6  ·  localStorage    ║
 * ╚══════════════════════════════════════════════╝
 *
 * DATA FLOW:
 *   1. data.json → localStorage (first-run seed)
 *   2. getAll() / getById() / addItem() / updateItem() / deleteItem()
 *      are the only data access methods used — all reads/writes go through them
 *   3. After each mutation a render*() call rebuilds the affected UI
 *   4. Page routing: boot() checks the filename and calls the right init()
 */

'use strict';

/* ════════════════════════════════════════════
   STORAGE LAYER
════════════════════════════════════════════ */

const STORE = {
  properties:  'rpm_properties',
  tenants:     'rpm_tenants',
  payments:    'rpm_payments',
  maintenance: 'rpm_maintenance',
  seeded:      'rpm_seeded',
};

const getAll  = c => JSON.parse(localStorage.getItem(STORE[c]) || '[]');
const saveAll = (c, d) => localStorage.setItem(STORE[c], JSON.stringify(d));
const getById = (c, id) => getAll(c).find(x => x.id === id) || null;

function addItem(col, data) {
  const all = getAll(col);
  data.id = `${col[0]}${Date.now()}${Math.random().toString(36).slice(2, 7)}`;
  data.createdAt = todayStr();
  all.push(data);
  saveAll(col, all);
  return data;
}

function updateItem(col, id, patch) {
  const all = getAll(col);
  const i = all.findIndex(x => x.id === id);
  if (i < 0) return null;
  all[i] = { ...all[i], ...patch };
  saveAll(col, all);
  return all[i];
}

function deleteItem(col, id) {
  const filtered = getAll(col).filter(x => x.id !== id);
  saveAll(col, filtered);
}

/* ════════════════════════════════════════════
   SEED DATA.JSON ON FIRST LOAD
════════════════════════════════════════════ */

async function seedOnce() {
  if (localStorage.getItem(STORE.seeded)) return;
  try {
    const res  = await fetch('./data.json');
    const data = await res.json();
    saveAll('properties',  data.properties  || []);
    saveAll('tenants',     data.tenants     || []);
    saveAll('payments',    data.payments    || []);
    saveAll('maintenance', data.maintenance || []);
  } catch (e) {
    console.warn('Could not seed data.json — starting empty.', e);
    ['properties','tenants','payments','maintenance']
      .forEach(c => { if (!localStorage.getItem(STORE[c])) saveAll(c, []); });
  }
  localStorage.setItem(STORE.seeded, '1');
}

/* ════════════════════════════════════════════
   UTILITIES
════════════════════════════════════════════ */

const $ = id => document.getElementById(id);
const setText = (id, val) => { const el = $(id); if (el) el.textContent = val; };
const todayStr = () => new Date().toISOString().split('T')[0];

function esc(s) {
  const d = document.createElement('div');
  d.textContent = s || '';
  return d.innerHTML;
}

function fmtMoney(n) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency', currency: 'INR', maximumFractionDigits: 0, minimumFractionDigits: 0
  }).format(Number(n) || 0);
}

function fmtDate(d) {
  if (!d) return '—';
  return new Date(`${d}T12:00:00`).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric'
  });
}

function fmtDateShort(d) {
  if (!d) return '—';
  return new Date(`${d}T12:00:00`).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric'
  });
}

function initials(name) {
  return (name || '').split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
}

function avClass(name) {
  return `av-${(name || '').charCodeAt(0) % 6}`;
}

function propName(id) { return getById('properties', id)?.name || '—'; }
function tenantName(id) { return getById('tenants', id)?.name || '—'; }

function leaseStatus(endDate) {
  if (!endDate) return { label: 'Unknown', cls: 'muted' };
  const days = Math.ceil((new Date(`${endDate}T12:00:00`) - new Date()) / 86400000);
  if (days < 0)   return { label: 'Expired',        cls: 'red' };
  if (days < 30)  return { label: 'Expiring Soon',  cls: 'amber' };
  return               { label: 'Active',            cls: 'green' };
}

/* HTML builders */
function statusPill(status) {
  const map = {
    'Available':     'teal',
    'Rented':        'blue',
    'Paid':          'green',
    'Pending':       'amber',
    'Completed':     'green',
    'In Progress':   'blue',
    'Active':        'green',
    'Expiring Soon': 'amber',
    'Expired':       'red',
  };
  const cls = map[status] || 'muted';
  return `<span class="pill pill-${cls}"><span class="pill-dot"></span>${esc(status)}</span>`;
}

function priorityPill(p) {
  const cls = { High: 'red', Medium: 'amber', Low: 'green' };
  return `<span class="pill pill-${cls[p] || 'muted'}"><span class="pill-dot"></span>${esc(p)}</span>`;
}

/* SVG icon helpers */
const ICON = {
  edit: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4z"/></svg>`,
  trash: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>`,
  pin: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>`,
  check: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><polyline points="20 6 9 17 4 12"/></svg>`,
  play: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>`,
  wrench: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z"/></svg>`,
};

/* ════════════════════════════════════════════
   TOAST
════════════════════════════════════════════ */

function toast(message, type = 'success') {
  let stack = document.querySelector('.toast-stack');
  if (!stack) {
    stack = document.createElement('div');
    stack.className = 'toast-stack';
    document.body.appendChild(stack);
  }

  const el = document.createElement('div');
  el.className = 'toast';
  el.innerHTML = `
    <div class="toast-bar ${type}"></div>
    <div class="toast-msg"><strong>${esc(message)}</strong></div>`;
  stack.appendChild(el);

  setTimeout(() => {
    el.classList.add('exiting');
    setTimeout(() => el.remove(), 320);
  }, 3800);
}

/* ════════════════════════════════════════════
   MODAL
════════════════════════════════════════════ */

function openModal(id) {
  const el = $(id);
  if (!el) return;
  el.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeAllModals() {
  document.querySelectorAll('.modal-backdrop').forEach(el => el.classList.remove('open'));
  document.body.style.overflow = '';
}

document.addEventListener('click', e => {
  if (e.target.classList.contains('modal-backdrop')) closeAllModals();
});
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeAllModals(); });

/* ════════════════════════════════════════════
   CONFIRM DIALOG
════════════════════════════════════════════ */

function confirmDelete(heading, desc, onConfirm) {
  let el = $('confirmModal');
  if (!el) {
    el = document.createElement('div');
    el.id = 'confirmModal';
    el.className = 'modal-backdrop';
    el.innerHTML = `
      <div class="modal-box" style="max-width:360px;">
        <div class="confirm-body">
          <div class="confirm-icon-wrap">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>
          </div>
          <div class="confirm-heading" id="confirmHeading"></div>
          <div class="confirm-desc" id="confirmDesc"></div>
        </div>
        <div class="modal-foot">
          <button class="btn btn-ghost btn-sm" id="confirmNo">Cancel</button>
          <button class="btn btn-danger btn-sm" id="confirmYes">Delete</button>
        </div>
      </div>`;
    document.body.appendChild(el);
    el.addEventListener('click', e => { if (e.target === el) closeAllModals(); });
  }

  $('confirmHeading').textContent = heading;
  $('confirmDesc').textContent = desc;
  openModal('confirmModal');

  // Swap out old listeners
  const yes = $('confirmYes'), no = $('confirmNo');
  const newYes = yes.cloneNode(true), newNo = no.cloneNode(true);
  yes.replaceWith(newYes); no.replaceWith(newNo);
  newYes.addEventListener('click', () => { closeAllModals(); onConfirm(); });
  newNo.addEventListener('click', closeAllModals);
}

/* ════════════════════════════════════════════
   FORM VALIDATION
════════════════════════════════════════════ */

function validateForm(formId, rules) {
  const form = $(formId);
  let ok = true;
  form.querySelectorAll('.err').forEach(el => el.classList.remove('err'));
  form.querySelectorAll('.field-error').forEach(el => el.classList.remove('visible'));

  for (const { field, label, required, type } of rules) {
    const el = form.querySelector(`[name="${field}"]`);
    if (!el) continue;
    const val = el.value.trim();
    let fail = required && !val;
    if (!fail && type === 'email' && val && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) fail = true;
    if (!fail && type === 'posnum' && val && (isNaN(val) || +val <= 0)) fail = true;
    if (fail) {
      ok = false;
      el.classList.add('err');
      const fe = el.closest('.form-group')?.querySelector('.field-error');
      if (fe) {
        fe.textContent = required && !val ? `${label} is required` : `Enter a valid ${label}`;
        fe.classList.add('visible');
      }
    }
  }
  return ok;
}

/* ════════════════════════════════════════════
   SIDEBAR + MOBILE
════════════════════════════════════════════ */

function initLayout() {
  const sidebar = document.querySelector('.sidebar');
  const hamburger = $('hamburger');
  let veil = document.querySelector('.mob-veil');
  if (!veil) {
    veil = document.createElement('div');
    veil.className = 'mob-veil';
    document.body.appendChild(veil);
  }

  hamburger?.addEventListener('click', () => {
    sidebar.classList.add('mobile-open');
    veil.classList.add('active');
  });

  veil.addEventListener('click', () => {
    sidebar.classList.remove('mobile-open');
    veil.classList.remove('active');
  });

  // Set active nav
  const page = location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav-link').forEach(a => {
    const href = a.getAttribute('href') || '';
    a.classList.toggle('active', href === page || (page === '' && href === 'index.html'));
  });

  // Live maintenance badge
  const openMaint = getAll('maintenance').filter(m => m.status !== 'Completed').length;
  document.querySelectorAll('.nav-badge').forEach(b => {
    b.textContent = openMaint;
    b.style.display = openMaint > 0 ? '' : 'none';
  });
}

/* ════════════════════════════════════════════
   PROP SELECTOR HELPERS (for modals)
════════════════════════════════════════════ */

function fillPropSelect(sel) {
  if (!sel) return;
  sel.innerHTML = '<option value="">— Select property —</option>' +
    getAll('properties').map(p => `<option value="${p.id}">${esc(p.name)}</option>`).join('');
}

function fillTenantSelect(sel) {
  if (!sel) return;
  sel.innerHTML = '<option value="">— Select tenant —</option>' +
    getAll('tenants').map(t => `<option value="${t.id}" data-prop="${t.propertyId}">${esc(t.name)}</option>`).join('');
}

/* ════════════════════════════════════════════
   DASHBOARD
════════════════════════════════════════════ */

function initDashboard() {
  drawKPIs();
  drawActivity();
  drawOpenMaint();
}

function drawKPIs() {
  const props    = getAll('properties');
  const tenants  = getAll('tenants');
  const rented   = props.filter(p => p.status === 'Rented');
  const avail    = props.length - rented.length;
  const revenue  = rented.reduce((s, p) => s + Number(p.rent), 0);

  setText('kpiProps',   props.length);
  setText('kpiOccupied', rented.length);
  setText('kpiTenants', tenants.length);
  setText('kpiRevenue', fmtMoney(revenue));

  setText('kpiPropsub',    `${avail} available · ${rented.length} rented`);
  setText('kpiOccSub',     `${props.length > 0 ? Math.round(rented.length / props.length * 100) : 0}% occupancy rate`);
  setText('kpiTenantSub',  `Across ${rented.length} properties`);
  setText('kpiRevenueSub', 'Expected monthly income');
}

function drawActivity() {
  const el = $('activityFeed');
  if (!el) return;

  const items = [];

  getAll('payments').slice().reverse().slice(0, 5).forEach(p => {
    items.push({
      color: p.status === 'Paid' ? 'var(--green)' : 'var(--amber)',
      text: `<strong>${esc(tenantName(p.tenantId))}</strong> — rent ${p.status === 'Paid' ? 'collected' : 'pending'} for ${esc(p.month)}`,
      time: fmtDateShort(p.date),
    });
  });

  getAll('maintenance').slice().reverse().slice(0, 3).forEach(m => {
    items.push({
      color: 'var(--blue)',
      text: `Maintenance: <strong>${esc(m.title)}</strong> at ${esc(propName(m.propertyId))}`,
      time: fmtDateShort(m.reportedDate),
    });
  });

  if (!items.length) {
    el.innerHTML = `<div style="padding:24px;text-align:center;color:var(--t3);font-size:13px;">No activity yet</div>`;
    return;
  }

  el.innerHTML = items.map(a => `
    <div class="activity-item">
      <span class="activity-dot" style="background:${a.color};box-shadow:0 0 6px ${a.color};"></span>
      <span class="activity-text">${a.text}</span>
      <span class="activity-time">${a.time}</span>
    </div>`).join('');
}

function drawOpenMaint() {
  const el = $('openMaint');
  if (!el) return;

  const items = getAll('maintenance').filter(m => m.status !== 'Completed');

  if (!items.length) {
    el.innerHTML = `<div style="padding:24px;text-align:center;color:var(--t3);font-size:13px;">All clear — no open requests</div>`;
    return;
  }

  const bg = { High: 'var(--red-dim)', Medium: 'var(--amber-dim)', Low: 'var(--green-dim)' };

  el.innerHTML = items.slice(0, 5).map(m => `
    <div class="maint-mini">
      <div class="maint-mini-ico" style="background:${bg[m.priority] || 'var(--surface3)'}">
        ${ICON.wrench}
      </div>
      <div class="maint-mini-info">
        <div class="maint-mini-title">${esc(m.title)}</div>
        <div class="maint-mini-prop">${esc(propName(m.propertyId))}</div>
      </div>
      ${statusPill(m.status)}
    </div>`).join('');
}

/* ════════════════════════════════════════════
   PROPERTIES
════════════════════════════════════════════ */

function initProperties() {
  renderProps();
  $('propSearch')?.addEventListener('input',   repaint);
  $('propStatus')?.addEventListener('change',  repaint);
  $('propSort')?.addEventListener('change',    repaint);
  $('addPropBtn')?.addEventListener('click',   openAddProp);
  $('propForm')?.addEventListener('submit',    submitProp);
}

function repaint() {
  renderProps(
    $('propStatus')?.value || 'all',
    ($('propSearch')?.value || '').toLowerCase(),
    $('propSort')?.value || ''
  );
}

function renderProps(filter = 'all', search = '', sort = '') {
  const cont = $('propGrid');
  if (!cont) return;

  let props = getAll('properties');
  if (filter !== 'all') props = props.filter(p => p.status === filter);
  if (search) props = props.filter(p =>
    p.name.toLowerCase().includes(search) ||
    p.address.toLowerCase().includes(search) ||
    p.type.toLowerCase().includes(search)
  );
  if (sort === 'rent-asc')  props.sort((a, b) => a.rent - b.rent);
  if (sort === 'rent-desc') props.sort((a, b) => b.rent - a.rent);
  if (sort === 'alpha')     props.sort((a, b) => a.name.localeCompare(b.name));

  setText('propCount', props.length);

  if (!props.length) {
    cont.innerHTML = `<div class="empty-state">
      <div class="empty-state-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg></div>
      <h3>No properties found</h3>
      <p>Adjust filters or add a new property.</p>
    </div>`;
    return;
  }

  const tenants = getAll('tenants');

  cont.innerHTML = props.map(p => {
    const tenant = tenants.find(t => t.propertyId === p.id);
    const amenities = (p.amenities || []).slice(0, 3);

    return `
    <div class="prop-card">
      <div class="prop-band"></div>
      <div class="prop-body">
        <div class="prop-type-row">
          <span class="prop-type-tag">${esc(p.type)}</span>
          ${statusPill(p.status)}
        </div>
        <div class="prop-name">${esc(p.name)}</div>
        <div class="prop-address">
          ${ICON.pin}
          ${esc(p.address)}
        </div>
        <div class="prop-specs">
          <div class="spec"><span class="spec-val">${p.bedrooms}</span>Beds</div>
          <div class="spec"><span class="spec-val">${p.bathrooms}</span>Baths</div>
          <div class="spec"><span class="spec-val">${(p.area || 0).toLocaleString()}</span>Sq ft</div>
        </div>
        <div class="prop-rent-row">
          <span class="prop-rent">${fmtMoney(p.rent)}</span>
          <span class="prop-rent-label">/ month</span>
        </div>
        ${amenities.length ? `<div class="prop-amenities">${amenities.map(a => `<span class="amenity-chip">${esc(a)}</span>`).join('')}</div>` : ''}
      </div>
      <div class="prop-footer">
        ${tenant
          ? `<div class="prop-tenant-chip">
              <div class="mini-av ${avClass(tenant.name)}" style="width:24px;height:24px;font-size:9px;font-weight:700;border-radius:50%;display:flex;align-items:center;justify-content:center;color:var(--void);">${initials(tenant.name)}</div>
              <span>${esc(tenant.name)}</span>
            </div>`
          : `<span style="font-size:12px;color:var(--t3)">No tenant</span>`
        }
        <div class="prop-actions">
          <button class="icon-btn" title="Edit" onclick="openEditProp('${p.id}')">${ICON.edit}</button>
          <button class="icon-btn danger" title="Delete" onclick="deleteProp('${p.id}')">${ICON.trash}</button>
        </div>
      </div>
    </div>`;
  }).join('');
}

function openAddProp() {
  const form = $('propForm');
  form.reset();
  delete form.dataset.id;
  setText('propModalTitle', 'Add property');
  openModal('propModal');
}

function openEditProp(id) {
  const p = getById('properties', id);
  if (!p) return;
  const form = $('propForm');
  form.dataset.id = id;
  setText('propModalTitle', 'Edit property');
  ['name','address','type','bedrooms','bathrooms','area','rent','status','floor'].forEach(f => {
    const el = form.querySelector(`[name="${f}"]`);
    if (el) el.value = p[f] ?? '';
  });
  // Amenities as comma-separated
  const amenEl = form.querySelector('[name="amenities"]');
  if (amenEl) amenEl.value = (p.amenities || []).join(', ');
  openModal('propModal');
}

function submitProp(e) {
  e.preventDefault();
  const ok = validateForm('propForm', [
    { field: 'name',    label: 'Property name',  required: true },
    { field: 'address', label: 'Address',         required: true },
    { field: 'type',    label: 'Type',            required: true },
    { field: 'rent',    label: 'Monthly rent',    required: true, type: 'posnum' },
  ]);
  if (!ok) return;

  const fd = new FormData(this);
  const data = Object.fromEntries(fd);
  data.bedrooms  = Number(data.bedrooms || 0);
  data.bathrooms = Number(data.bathrooms || 0);
  data.area      = Number(data.area || 0);
  data.rent      = Number(data.rent);
  data.amenities = (data.amenities || '').split(',').map(s => s.trim()).filter(Boolean);

  const id = this.dataset.id;
  if (id) {
    updateItem('properties', id, data);
    toast('Property updated successfully');
  } else {
    if (!data.status) data.status = 'Available';
    addItem('properties', data);
    toast('Property added to portfolio');
  }
  closeAllModals();
  this.reset();
  delete this.dataset.id;
  renderProps();
  drawKPIs?.();
}

function deleteProp(id) {
  const p = getById('properties', id);
  confirmDelete('Delete property?', `"${p?.name}" and all linked data will be permanently removed.`, () => {
    getAll('tenants').filter(t => t.propertyId === id).forEach(t => deleteItem('tenants', t.id));
    deleteItem('properties', id);
    toast('Property deleted', 'info');
    renderProps();
    drawKPIs?.();
  });
}

/* ════════════════════════════════════════════
   TENANTS
════════════════════════════════════════════ */

function initTenants() {
  renderTenants();
  $('tenantSearch')?.addEventListener('input', e => renderTenants(e.target.value));
  $('addTenantBtn')?.addEventListener('click', openAddTenant);
  $('tenantForm')?.addEventListener('submit', submitTenant);
}

function renderTenants(search = '') {
  const tbody = $('tenantBody');
  if (!tbody) return;

  let tenants = getAll('tenants');
  if (search) {
    const q = search.toLowerCase();
    tenants = tenants.filter(t =>
      t.name.toLowerCase().includes(q) ||
      t.email.toLowerCase().includes(q) ||
      propName(t.propertyId).toLowerCase().includes(q)
    );
  }

  setText('tenantCount', tenants.length);

  if (!tenants.length) {
    tbody.innerHTML = `<tr><td colspan="6"><div class="empty-state">
      <div class="empty-state-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/></svg></div>
      <h3>No tenants found</h3><p>Add your first tenant to get started.</p>
    </div></td></tr>`;
    return;
  }

  tbody.innerHTML = tenants.map(t => {
    const ls = leaseStatus(t.leaseEnd);
    return `<tr>
      <td>
        <div class="av-cell">
          <div class="av ${avClass(t.name)}">${initials(t.name)}</div>
          <div>
            <div class="av-name">${esc(t.name)}</div>
            <div class="av-email">${esc(t.email)}</div>
          </div>
        </div>
      </td>
      <td style="color:var(--t2);">${esc(t.phone)}</td>
      <td style="font-size:12.5px;">${esc(propName(t.propertyId))}</td>
      <td style="font-size:12px;color:var(--t2);">${fmtDate(t.leaseStart)} → ${fmtDate(t.leaseEnd)}</td>
      <td>${statusPill(ls.label)}</td>
      <td>
        <div style="display:flex;gap:5px;">
          <button class="icon-btn" onclick="openEditTenant('${t.id}')">${ICON.edit}</button>
          <button class="icon-btn danger" onclick="deleteTenant('${t.id}')">${ICON.trash}</button>
        </div>
      </td>
    </tr>`;
  }).join('');
}

function openAddTenant() {
  const form = $('tenantForm');
  form.reset();
  delete form.dataset.id;
  setText('tenantModalTitle', 'Add tenant');
  fillPropSelect(form.querySelector('[name="propertyId"]'));
  openModal('tenantModal');
}

function openEditTenant(id) {
  const t = getById('tenants', id);
  if (!t) return;
  const form = $('tenantForm');
  form.dataset.id = id;
  setText('tenantModalTitle', 'Edit tenant');
  fillPropSelect(form.querySelector('[name="propertyId"]'));
  ['name','email','phone','propertyId','occupation','leaseStart','leaseEnd','deposit','emergencyContact']
    .forEach(f => { const el = form.querySelector(`[name="${f}"]`); if (el) el.value = t[f] ?? ''; });
  openModal('tenantModal');
}

function submitTenant(e) {
  e.preventDefault();
  const ok = validateForm('tenantForm', [
    { field: 'name',        label: 'Full name',    required: true },
    { field: 'email',       label: 'Email',         required: true, type: 'email' },
    { field: 'phone',       label: 'Phone',         required: true },
    { field: 'propertyId',  label: 'Property',      required: true },
    { field: 'leaseStart',  label: 'Lease start',   required: true },
    { field: 'leaseEnd',    label: 'Lease end',     required: true },
  ]);
  if (!ok) return;

  const data = Object.fromEntries(new FormData(this));
  data.deposit = Number(data.deposit || 0);
  const id = this.dataset.id;

  if (id) {
    updateItem('tenants', id, data);
    toast('Tenant record updated');
  } else {
    addItem('tenants', data);
    if (data.propertyId) updateItem('properties', data.propertyId, { status: 'Rented' });
    toast('Tenant added successfully');
  }
  closeAllModals();
  this.reset();
  delete this.dataset.id;
  renderTenants();
  drawKPIs?.();
}

function deleteTenant(id) {
  const t = getById('tenants', id);
  confirmDelete('Remove tenant?', `"${t?.name}" will be removed and their property set to Available.`, () => {
    if (t?.propertyId) updateItem('properties', t.propertyId, { status: 'Available' });
    deleteItem('tenants', id);
    toast('Tenant removed', 'info');
    renderTenants();
    drawKPIs?.();
  });
}

/* ════════════════════════════════════════════
   PAYMENTS
════════════════════════════════════════════ */

function initPayments() {
  renderPayments();
  renderPayBands();
  $('paySearch')?.addEventListener('input',  repaintPay);
  $('payStatus')?.addEventListener('change', repaintPay);
  $('addPayBtn')?.addEventListener('click',  openAddPay);
  $('payForm')?.addEventListener('submit',   submitPay);
}

function repaintPay() {
  renderPayments(($('paySearch')?.value || '').toLowerCase(), $('payStatus')?.value || 'all');
}

function renderPayments(search = '', filter = 'all') {
  const tbody = $('payBody');
  if (!tbody) return;

  let pays = getAll('payments');
  if (filter !== 'all') pays = pays.filter(p => p.status === filter);
  if (search) pays = pays.filter(p =>
    tenantName(p.tenantId).toLowerCase().includes(search) ||
    propName(p.propertyId).toLowerCase().includes(search) ||
    p.month.toLowerCase().includes(search)
  );
  pays.sort((a, b) => new Date(b.date) - new Date(a.date));
  setText('payCount', pays.length);

  if (!pays.length) {
    tbody.innerHTML = `<tr><td colspan="7"><div class="empty-state">
      <div class="empty-state-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg></div>
      <h3>No payments found</h3></div></td></tr>`;
    return;
  }

  tbody.innerHTML = pays.map(p => `
    <tr>
      <td style="font-weight:600;">${esc(tenantName(p.tenantId))}</td>
      <td style="font-size:12.5px;color:var(--t2);">${esc(propName(p.propertyId))}</td>
      <td style="font-size:12.5px;color:var(--t2);">${esc(p.month)}</td>
      <td><span class="mono-num">${fmtMoney(p.amount)}</span></td>
      <td style="font-size:12px;color:var(--t2);">${fmtDate(p.date)}</td>
      <td>${statusPill(p.status)}</td>
      <td>
        <div style="display:flex;gap:5px;align-items:center;">
          ${p.status === 'Pending'
            ? `<button class="btn btn-success btn-xs" onclick="markPaid('${p.id}')">
                <svg style="width:11px;height:11px;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>
                Mark paid
              </button>` : ''}
          <button class="icon-btn danger" onclick="deletePay('${p.id}')">${ICON.trash}</button>
        </div>
      </td>
    </tr>`).join('');
}

function renderPayBands() {
  const pays = getAll('payments');
  const paid    = pays.filter(p => p.status === 'Paid').reduce((s, p)    => s + Number(p.amount), 0);
  const pending = pays.filter(p => p.status === 'Pending').reduce((s, p) => s + Number(p.amount), 0);
  setText('bandPaid',    fmtMoney(paid));
  setText('bandPending', fmtMoney(pending));
  setText('bandTotal',   fmtMoney(paid + pending));
}

function openAddPay() {
  const form = $('payForm');
  form.reset();
  setText('payModalTitle', 'Record payment');
  const tenSel = form.querySelector('[name="tenantId"]');
  fillTenantSelect(tenSel);
  fillPropSelect(form.querySelector('[name="propertyId"]'));
  tenSel?.addEventListener('change', () => {
    const opt = tenSel.options[tenSel.selectedIndex];
    const propSel = form.querySelector('[name="propertyId"]');
    if (propSel && opt?.dataset.prop) propSel.value = opt.dataset.prop;
    // Auto-fill rent
    const prop = getById('properties', opt?.dataset.prop);
    const amtEl = form.querySelector('[name="amount"]');
    if (amtEl && prop) amtEl.value = prop.rent;
  });
  const dateEl = form.querySelector('[name="date"]');
  if (dateEl) dateEl.value = todayStr();
  openModal('payModal');
}

function submitPay(e) {
  e.preventDefault();
  const ok = validateForm('payForm', [
    { field: 'tenantId',   label: 'Tenant',   required: true },
    { field: 'propertyId', label: 'Property', required: true },
    { field: 'amount',     label: 'Amount',   required: true, type: 'posnum' },
    { field: 'month',      label: 'Month',    required: true },
    { field: 'date',       label: 'Date',     required: true },
  ]);
  if (!ok) return;

  const data = Object.fromEntries(new FormData(this));
  data.amount = Number(data.amount);
  addItem('payments', data);
  toast('Payment recorded');
  closeAllModals();
  this.reset();
  renderPayments();
  renderPayBands();
}

function markPaid(id) {
  updateItem('payments', id, { status: 'Paid', date: todayStr() });
  toast('Payment confirmed — marked as paid');
  renderPayments();
  renderPayBands();
}

function deletePay(id) {
  confirmDelete('Delete payment?', 'This payment record will be permanently removed.', () => {
    deleteItem('payments', id);
    toast('Payment record deleted', 'info');
    renderPayments();
    renderPayBands();
  });
}

/* ════════════════════════════════════════════
   MAINTENANCE
════════════════════════════════════════════ */

function initMaintenance() {
  renderMaintenance();
  $('maintSearch')?.addEventListener('input',  repaintMaint);
  $('maintStatus')?.addEventListener('change', repaintMaint);
  $('addMaintBtn')?.addEventListener('click',  openAddMaint);
  $('maintForm')?.addEventListener('submit',   submitMaint);
}

function repaintMaint() {
  renderMaintenance(($('maintSearch')?.value || '').toLowerCase(), $('maintStatus')?.value || 'all');
}

function renderMaintenance(search = '', filter = 'all') {
  const grid = $('maintGrid');
  if (!grid) return;

  let items = getAll('maintenance');
  if (filter !== 'all') items = items.filter(m => m.status === filter);
  if (search) items = items.filter(m =>
    m.title.toLowerCase().includes(search) ||
    m.description.toLowerCase().includes(search) ||
    propName(m.propertyId).toLowerCase().includes(search)
  );

  setText('maintCount', items.length);

  if (!items.length) {
    grid.innerHTML = `<div class="empty-state">
      <div class="empty-state-icon">${ICON.wrench}</div>
      <h3>No maintenance requests</h3>
      <p>All properties are in good shape, or no requests match.</p>
    </div>`;
    return;
  }

  grid.innerHTML = items.map(m => `
    <div class="maint-card">
      <div class="maint-card-stripe ${m.priority.toLowerCase()}"></div>
      <div class="maint-card-body">
        <div class="maint-card-head">
          <div class="maint-card-title">${esc(m.title)}</div>
          ${priorityPill(m.priority)}
        </div>
        <div class="maint-card-prop">
          ${ICON.pin}
          ${esc(propName(m.propertyId))}
        </div>
        <div class="maint-card-desc">${esc(m.description)}</div>
        <div class="maint-card-meta">
          <span>📅 ${fmtDate(m.reportedDate)}</span>
          ${m.assignedTo ? `<span>👷 ${esc(m.assignedTo)}</span>` : ''}
          ${m.cost > 0  ? `<span>💰 ${fmtMoney(m.cost)}</span>` : ''}
          ${m.completedDate ? `<span>✓ Done ${fmtDate(m.completedDate)}</span>` : ''}
        </div>
      </div>
      <div class="maint-card-foot">
        ${statusPill(m.status)}
        <div style="display:flex;gap:5px;align-items:center;">
          ${m.status === 'Pending'
            ? `<button class="btn btn-ghost btn-xs" onclick="advanceMaint('${m.id}','In Progress')">
                ${ICON.play} Start
              </button>` : ''}
          ${m.status === 'In Progress'
            ? `<button class="btn btn-success btn-xs" onclick="advanceMaint('${m.id}','Completed')">
                ${ICON.check} Complete
              </button>` : ''}
          <button class="icon-btn" onclick="openEditMaint('${m.id}')">${ICON.edit}</button>
          <button class="icon-btn danger" onclick="deleteMaint('${m.id}')">${ICON.trash}</button>
        </div>
      </div>
    </div>`).join('');
}

function openAddMaint() {
  const form = $('maintForm');
  form.reset();
  delete form.dataset.id;
  setText('maintModalTitle', 'New request');
  fillPropSelect(form.querySelector('[name="propertyId"]'));
  const d = form.querySelector('[name="reportedDate"]');
  if (d) d.value = todayStr();
  openModal('maintModal');
}

function openEditMaint(id) {
  const m = getById('maintenance', id);
  if (!m) return;
  const form = $('maintForm');
  form.dataset.id = id;
  setText('maintModalTitle', 'Edit request');
  fillPropSelect(form.querySelector('[name="propertyId"]'));
  ['propertyId','title','description','priority','status','reportedDate','assignedTo','cost']
    .forEach(f => { const el = form.querySelector(`[name="${f}"]`); if (el) el.value = m[f] ?? ''; });
  openModal('maintModal');
}

function submitMaint(e) {
  e.preventDefault();
  const ok = validateForm('maintForm', [
    { field: 'propertyId',  label: 'Property',    required: true },
    { field: 'title',       label: 'Title',        required: true },
    { field: 'description', label: 'Description',  required: true },
    { field: 'priority',    label: 'Priority',     required: true },
  ]);
  if (!ok) return;

  const data = Object.fromEntries(new FormData(this));
  data.cost = Number(data.cost || 0);
  const id = this.dataset.id;

  if (id) {
    updateItem('maintenance', id, data);
    toast('Request updated');
  } else {
    if (!data.status) data.status = 'Pending';
    addItem('maintenance', data);
    toast('Maintenance request created');
  }
  closeAllModals();
  this.reset();
  delete this.dataset.id;
  renderMaintenance();
  initLayout(); // refresh badge
}

function advanceMaint(id, status) {
  const patch = { status };
  if (status === 'Completed') patch.completedDate = todayStr();
  updateItem('maintenance', id, patch);
  toast(`Request marked as ${status}`);
  renderMaintenance();
  initLayout();
}

function deleteMaint(id) {
  const m = getById('maintenance', id);
  confirmDelete('Delete request?', `"${m?.title}" will be permanently removed.`, () => {
    deleteItem('maintenance', id);
    toast('Request deleted', 'info');
    renderMaintenance();
    initLayout();
  });
}

/* ════════════════════════════════════════════
   BOOT
════════════════════════════════════════════ */

async function boot() {
  await seedOnce();
  initLayout();

  const page = location.pathname.split('/').pop() || 'index.html';
  if (page === 'index.html' || page === '') initDashboard();
  else if (page === 'properties.html')      initProperties();
  else if (page === 'tenants.html')         initTenants();
  else if (page === 'payments.html')        initPayments();
  else if (page === 'maintenance.html')     initMaintenance();
}

document.addEventListener('DOMContentLoaded', boot);
