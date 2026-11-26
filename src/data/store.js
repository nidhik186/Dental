// ---------------------------------------------------------------------------
// Data layer. Every screen goes through these async functions.
//
// "database" mode: the API server (server/index.js) is running and has a
//   MONGODB_URI. All data is stored in MongoDB.
// "demo" mode: no server or no MONGODB_URI yet. Data is kept in this browser
//   (localStorage) with demo patients, so the app still works.
// ---------------------------------------------------------------------------

import { seedPatients, seedAppointments, seedCollections } from './seed.js';

// ---------- Mode detection ----------
let modePromise = null;
let current = { mode: 'checking', auth: false, loggedIn: true, db: '' };
const listeners = new Set();

function setStatus(s) {
  current = { ...current, ...s };
  listeners.forEach((fn) => fn(current));
}

export const getStatus = () => current;
export function onStatus(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function detectMode(force = false) {
  if (modePromise && !force) return modePromise;
  modePromise = fetch('/api/health', { credentials: 'same-origin' })
    .then((r) => (r.ok ? r.json() : Promise.reject()))
    .then((h) => {
      const mode = h.configured ? 'database' : 'demo';
      setStatus({ mode, auth: h.auth, loggedIn: h.loggedIn, db: h.db, maxUpload: h.maxUpload });
      return mode;
    })
    .catch(() => {
      setStatus({ mode: 'demo', auth: false, loggedIn: true, db: '' });
      return 'demo';
    });
  return modePromise;
}

const isDb = async () => (await detectMode()) === 'database';

// Shows errors as toasts (App.jsx listens for this event).
function report(message) {
  window.dispatchEvent(new CustomEvent('dc-error', { detail: message }));
}

async function api(path, opts = {}) {
  const init = { credentials: 'same-origin', ...opts, headers: { ...(opts.headers || {}) } };
  if (opts.body && !(opts.body instanceof FormData)) {
    init.headers['Content-Type'] = 'application/json';
    init.body = JSON.stringify(opts.body);
  }
  let res;
  try {
    res = await fetch('/api' + path, init);
  } catch {
    report('Cannot reach the server. Check your internet connection.');
    throw new Error('Network error');
  }
  if (res.status === 401) {
    setStatus({ loggedIn: false });
    throw new Error('Please log in');
  }
  const data = res.status === 204 ? null : await res.json().catch(() => null);
  if (!res.ok) {
    const msg = data?.error || 'Something went wrong';
    report(msg);
    throw new Error(msg);
  }
  return data;
}

export async function login(password) {
  const res = await fetch('/api/login', {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Login failed');
  setStatus({ loggedIn: true });
  return true;
}

export async function logout() {
  await fetch('/api/logout', { method: 'POST', credentials: 'same-origin' }).catch(() => {});
  setStatus({ loggedIn: false });
}

// "YYYY-MM-DD" in the computer's local time.
export const today = () => new Date().toLocaleDateString('en-CA');

// ---------- Demo mode (localStorage) ----------
const KEY = 'dental-clinic-db-v1';

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const db = JSON.parse(raw);
      // Keep the demo schedule (ids a1–a10) on today's date so it never looks empty.
      for (const a of db.appointments || []) if (/^a\d+$/.test(a.id)) a.date = today();
      return db;
    }
  } catch {}
  const db = {
    patients: seedPatients,
    appointments: seedAppointments.map((a) => ({ ...a, date: today() })),
    collections: seedCollections,
    nextId: 133,
  };
  save(db);
  return db;
}

function save(db) {
  try {
    localStorage.setItem(KEY, JSON.stringify(db));
  } catch {}
}

const delay = (v) => new Promise((r) => setTimeout(() => r(structuredClone(v)), 120));
const dayAppts = (db, date) => db.appointments.filter((a) => (a.date || today()) === date).sort((x, y) => x.time.localeCompare(y.time));

// ---------- Patients ----------
export async function getPatients(q = '') {
  if (await isDb()) return api('/patients' + (q ? '?q=' + encodeURIComponent(q) : ''));
  return delay(load().patients);
}

export async function getPatient(id) {
  if (await isDb()) {
    try {
      return await api('/patients/' + encodeURIComponent(id));
    } catch {
      return null;
    }
  }
  return delay(load().patients.find((p) => p.id === id) || null);
}

export async function createPatient(data) {
  if (await isDb()) return api('/patients', { method: 'POST', body: data });
  const db = load();
  const id = 'PT-' + String(db.nextId).padStart(5, '0');
  db.nextId += 1;
  const patient = { status: 'New', since: today(), plan: [], paid: 0, visits: [], files: [], ...data, id };
  db.patients.unshift(patient);
  save(db);
  return delay(patient);
}

export async function updatePatient(id, patch) {
  if (await isDb()) {
    const { paid, ...rest } = patch; // payments go through addPayment()
    return api('/patients/' + encodeURIComponent(id), { method: 'PATCH', body: rest });
  }
  const db = load();
  const i = db.patients.findIndex((p) => p.id === id);
  if (i < 0) throw new Error('Patient not found');
  db.patients[i] = { ...db.patients[i], ...patch };
  save(db);
  return delay(db.patients[i]);
}

// ---------- Payments ----------
export async function addPayment(id, amount, mode) {
  if (await isDb()) return api(`/patients/${encodeURIComponent(id)}/payments`, { method: 'POST', body: { amount, mode } });
  const db = load();
  const p = db.patients.find((x) => x.id === id);
  if (!p) throw new Error('Patient not found');
  p.paid = (p.paid || 0) + Number(amount);
  const last = db.collections[db.collections.length - 1];
  if (last) last.amount += Number(amount);
  save(db);
  return delay(p);
}

export async function getPayments(id) {
  if (await isDb()) return api(`/patients/${encodeURIComponent(id)}/payments`);
  return [];
}

export async function getCollections() {
  if (await isDb()) return api('/collections?days=7');
  return delay(load().collections);
}

// ---------- Appointments ----------
// Returns the appointments for one day (today by default), sorted by time.
export async function getAppointments(date = today()) {
  if (await isDb()) return api('/appointments?date=' + date);
  return delay(dayAppts(load(), date));
}

export async function getPatientAppointments(patientId) {
  if (await isDb()) return api('/appointments?patientId=' + encodeURIComponent(patientId));
  return delay(load().appointments.filter((a) => a.patientId === patientId));
}

// Returns the updated list for that appointment's day.
export async function updateAppointment(id, patch) {
  if (await isDb()) return api('/appointments/' + encodeURIComponent(id), { method: 'PATCH', body: patch });
  const db = load();
  const a = db.appointments.find((x) => x.id === id);
  if (a) Object.assign(a, patch);
  save(db);
  return delay(dayAppts(db, a?.date || today()));
}

// a = { date, time: 'HH:MM', patientId, name, procedure, doctor, chair }
// Returns the updated list for that day.
export async function createAppointment(a) {
  const date = a.date || today();
  if (await isDb()) return api('/appointments', { method: 'POST', body: { ...a, date } });
  const db = load();
  db.appointments.push({ id: 'n' + Date.now(), status: 'Booked', ...a, date });
  save(db);
  return delay(dayAppts(db, date));
}

// ---------- Files (X-rays, reports) ----------
// files: File objects from an <input type="file"> or drag-and-drop.
export async function uploadFiles(id, files) {
  const list = [...files];
  if (!list.length) return getPatient(id);
  if (await isDb()) {
    // One file per request (hosting limits like Vercel's 4.5 MB per request).
    const max = current.maxUpload || 25 * 1024 * 1024;
    let patient = null;
    for (const f of list) {
      if (f.size > max) {
        report(`${f.name} is larger than ${Math.round(max / 1048576)} MB and was not uploaded`);
        continue;
      }
      const fd = new FormData();
      fd.append('files', f);
      patient = await api(`/patients/${encodeURIComponent(id)}/files`, { method: 'POST', body: fd });
    }
    return patient || getPatient(id);
  }
  // Demo mode only keeps the file names.
  const db = load();
  const p = db.patients.find((x) => x.id === id);
  if (!p) throw new Error('Patient not found');
  p.files = [...(p.files || []), ...list.map((x) => ({ name: x.name, size: x.size, type: x.type, date: today(), kind: 'file' }))];
  save(db);
  return delay(p);
}

export async function deleteFile(id, fileId) {
  if (await isDb()) return api(`/patients/${encodeURIComponent(id)}/files/${encodeURIComponent(fileId)}`, { method: 'DELETE' });
  return getPatient(id);
}

export function resetDemoData() {
  localStorage.removeItem(KEY);
}

// ---------- Helpers ----------
export const planTotal = (p) => (p.plan || []).reduce((s, x) => s + Number(x.cost || 0), 0);
export const balance = (p) => planTotal(p) - Number(p.paid || 0);

export function age(dob) {
  if (!dob) return '';
  const d = new Date(dob);
  const n = new Date();
  let a = n.getFullYear() - d.getFullYear();
  if (n < new Date(n.getFullYear(), d.getMonth(), d.getDate())) a--;
  return a;
}

export const inr = (n) => '₹' + Math.round(Number(n) || 0).toLocaleString('en-IN');

export const initials = (name = '') =>
  name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0].toUpperCase())
    .join('');
