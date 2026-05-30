/**
 * API.js — Centralized REST client for Rental PM Pro
 * Handles JWT injection, refresh, error normalization, and demo-mode fallback.
 */
'use strict';

const API_BASE = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
  ? 'http://localhost:5000/api'
  : '/api';

const API = {
  // ── Core fetch ────────────────────────────────────────────────────────────
  async _fetch(method, path, body = null, isFormData = false) {
    const token = localStorage.getItem('rpm_token');
    const headers = {};

    if (!isFormData) headers['Content-Type'] = 'application/json';
    if (token && token !== 'demo-token') headers['Authorization'] = `Bearer ${token}`;

    const opts = { method, headers };
    if (body) opts.body = isFormData ? body : JSON.stringify(body);

    const res = await fetch(API_BASE + path, opts);

    // Token expired → clear and redirect to login
    if (res.status === 401) {
      localStorage.removeItem('rpm_token');
      localStorage.removeItem('rpm_user');
      // Don't redirect if already on login page
      if (!window.location.pathname.includes('login')) {
        window.location.href = 'login.html';
      }
      throw new Error('Session expired');
    }

    const data = await res.json();
    if (!res.ok) throw Object.assign(new Error(data.message || 'Request failed'), { status: res.status, data });
    return data;
  },

  get:    (path)             => API._fetch('GET',    path),
  post:   (path, body)       => API._fetch('POST',   path, body),
  put:    (path, body)       => API._fetch('PUT',    path, body),
  patch:  (path, body)       => API._fetch('PATCH',  path, body),
  delete: (path)             => API._fetch('DELETE', path),
  upload: (path, formData)   => API._fetch('POST',   path, formData, true),

  // ── Health check ──────────────────────────────────────────────────────────
  async isOnline() {
    try {
      const r = await fetch(API_BASE + '/health', { signal: AbortSignal.timeout(3000) });
      return r.ok;
    } catch { return false; }
  },
};

window.API = API;
