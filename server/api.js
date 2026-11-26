import express from 'express';
import mongoose from 'mongoose';
import multer from 'multer';
import { Readable } from 'node:stream';
import { Appointment, Patient, Payment, nextPatientId } from './models.js';

export const TZ = process.env.CLINIC_TZ || 'Asia/Kolkata';

// "YYYY-MM-DD" in the clinic's time zone.
export const localDate = (d = new Date()) => d.toLocaleDateString('en-CA', { timeZone: TZ });
const isDate = (s) => /^\d{4}-\d{2}-\d{2}$/.test(s || '');
const isTime = (s) => /^\d{2}:\d{2}$/.test(s || '');

// Fields the client may never overwrite directly.
const LOCKED = ['_id', 'id', 'createdAt', 'updatedAt', 'paid'];
const strip = (body = {}) => {
  const out = { ...body };
  for (const k of LOCKED) delete out[k];
  for (const k of Object.keys(out)) if (k.startsWith('$') || k.includes('.')) delete out[k];
  return out;
};

const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
const bucket = () => new mongoose.mongo.GridFSBucket(mongoose.connection.db, { bucketName: 'files' });

// Vercel functions accept at most 4.5 MB per request, so files are uploaded one
// per request and capped at 4 MB there. A normal server allows 25 MB.
export const MAX_UPLOAD = (process.env.VERCEL ? 4 : 25) * 1024 * 1024;
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_UPLOAD, files: 10 },
});

export const api = express.Router();

// ---------- Patients ----------
api.get('/patients', wrap(async (req, res) => {
  const q = String(req.query.q || '').trim();
  const esc = (v) => v.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const digits = q.replace(/\D/g, '');
  const or = [{ name: new RegExp(esc(q), 'i') }, { id: q.toUpperCase() }];
  if (digits.length >= 3) or.push({ phone: new RegExp(digits.split('').join('\\s*')) });
  const filter = q ? { $or: or } : {};
  res.json(await Patient.find(filter).sort({ createdAt: -1 }));
}));

api.get('/patients/:id', wrap(async (req, res) => {
  const p = await Patient.findOne({ id: req.params.id });
  if (!p) return res.status(404).json({ error: 'Patient not found' });
  res.json(p);
}));

api.post('/patients', wrap(async (req, res) => {
  const data = strip(req.body);
  if (!data.name || !data.phone) return res.status(400).json({ error: 'Name and phone are required' });
  const p = await Patient.create({
    status: 'New',
    since: localDate(),
    plan: [],
    visits: [],
    files: [],
    ...data,
    paid: 0,
    id: await nextPatientId(),
  });
  res.status(201).json(p);
}));

api.patch('/patients/:id', wrap(async (req, res) => {
  const p = await Patient.findOneAndUpdate({ id: req.params.id }, { $set: strip(req.body) }, { new: true, runValidators: true });
  if (!p) return res.status(404).json({ error: 'Patient not found' });
  res.json(p);
}));

// ---------- Payments ----------
api.get('/patients/:id/payments', wrap(async (req, res) => {
  res.json(await Payment.find({ patientId: req.params.id }).sort({ at: -1 }));
}));

api.post('/patients/:id/payments', wrap(async (req, res) => {
  const amount = Math.round(Number(req.body?.amount));
  if (!(amount > 0)) return res.status(400).json({ error: 'Enter an amount' });
  const p = await Patient.findOneAndUpdate({ id: req.params.id }, { $inc: { paid: amount } }, { new: true });
  if (!p) return res.status(404).json({ error: 'Patient not found' });
  await Payment.create({ patientId: p.id, name: p.name, amount, mode: String(req.body.mode || 'Cash') });
  res.status(201).json(p);
}));

// Money collected per day for the last N days (oldest first, today last).
api.get('/collections', wrap(async (req, res) => {
  const days = Math.min(90, Math.max(1, Number(req.query.days) || 7));
  const from = new Date(Date.now() - (days + 1) * 86400000);
  const rows = await Payment.aggregate([
    { $match: { at: { $gte: from } } },
    { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$at', timezone: TZ } }, amount: { $sum: '$amount' } } },
  ]);
  const byDate = Object.fromEntries(rows.map((r) => [r._id, r.amount]));
  const out = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000);
    const date = localDate(d);
    out.push({ date, day: d.toLocaleDateString('en-US', { weekday: 'short', timeZone: TZ }), amount: byDate[date] || 0 });
  }
  res.json(out);
}));

// ---------- Appointments ----------
const dayList = (date) => Appointment.find({ date }).sort({ time: 1 });

api.get('/appointments', wrap(async (req, res) => {
  if (req.query.patientId) return res.json(await Appointment.find({ patientId: String(req.query.patientId) }).sort({ date: -1, time: -1 }));
  const date = isDate(req.query.date) ? req.query.date : localDate();
  res.json(await dayList(date));
}));

api.post('/appointments', wrap(async (req, res) => {
  const b = req.body || {};
  const date = isDate(b.date) ? b.date : localDate();
  if (!isTime(b.time) || !b.patientId) return res.status(400).json({ error: 'Patient and time are required' });
  const p = await Patient.findOne({ id: String(b.patientId) });
  if (!p) return res.status(404).json({ error: 'Patient not found' });
  await Appointment.create({
    id: 'AP-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    date,
    time: b.time,
    patientId: p.id,
    name: p.name,
    procedure: String(b.procedure || 'Consultation'),
    doctor: String(b.doctor || ''),
    chair: String(b.chair || ''),
    status: 'Booked',
  });
  res.status(201).json(await dayList(date));
}));

api.patch('/appointments/:id', wrap(async (req, res) => {
  const patch = {};
  for (const k of ['status', 'time', 'date', 'procedure', 'doctor', 'chair', 'waitingSince']) if (k in (req.body || {})) patch[k] = req.body[k];
  if (patch.status === 'Waiting' && !patch.waitingSince) patch.waitingSince = Date.now();
  const a = await Appointment.findOneAndUpdate({ id: req.params.id }, { $set: patch }, { new: true });
  if (!a) return res.status(404).json({ error: 'Appointment not found' });
  res.json(await dayList(a.date));
}));

// ---------- Files (X-rays, reports) stored in MongoDB GridFS ----------
api.post('/patients/:id/files', upload.array('files'), wrap(async (req, res) => {
  const p = await Patient.findOne({ id: req.params.id });
  if (!p) return res.status(404).json({ error: 'Patient not found' });
  const added = [];
  for (const f of req.files || []) {
    const stream = bucket().openUploadStream(f.originalname, { metadata: { patientId: p.id, contentType: f.mimetype } });
    await new Promise((ok, fail) => Readable.from(f.buffer).pipe(stream).on('finish', ok).on('error', fail));
    const fileId = String(stream.id);
    added.push({ fileId, url: `/api/files/${fileId}`, name: f.originalname, size: f.size, type: f.mimetype, date: localDate(), kind: 'file' });
  }
  const updated = await Patient.findOneAndUpdate({ id: p.id }, { $push: { files: { $each: added } } }, { new: true });
  res.status(201).json(updated);
}));

api.get('/files/:fileId', wrap(async (req, res) => {
  let _id;
  try {
    _id = new mongoose.Types.ObjectId(req.params.fileId);
  } catch {
    return res.status(404).end();
  }
  const [file] = await bucket().find({ _id }).toArray();
  if (!file) return res.status(404).end();
  const type = file.metadata?.contentType || 'application/octet-stream';
  // Only images and PDFs open inline; anything else downloads.
  const inline = /^image\/(png|jpe?g|gif|webp)$|^application\/pdf$/.test(type);
  res.set('Content-Type', inline ? type : 'application/octet-stream');
  res.set('X-Content-Type-Options', 'nosniff');
  res.set('Content-Disposition', `${inline ? 'inline' : 'attachment'}; filename="${encodeURIComponent(file.filename)}"`);
  bucket().openDownloadStream(_id).on('error', () => res.end()).pipe(res);
}));

api.delete('/patients/:id/files/:fileId', wrap(async (req, res) => {
  const fileId = String(req.params.fileId);
  const p = await Patient.findOneAndUpdate({ id: req.params.id, 'files.fileId': fileId }, { $pull: { files: { fileId } } }, { new: true });
  if (!p) return res.status(404).json({ error: 'File not found' });
  try {
    await bucket().delete(new mongoose.Types.ObjectId(fileId));
  } catch {}
  res.json(p);
}));
