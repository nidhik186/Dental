// Simple single-password login for the clinic. If APP_PASSWORD is not set,
// the API is open (fine on your own computer, NOT on the internet).
import crypto from 'node:crypto';

const PASSWORD = process.env.APP_PASSWORD || '';
// Sessions are signed with SESSION_SECRET. Without it, a key derived from the
// password + database URL is used so every serverless instance agrees on it.
const SECRET =
  process.env.SESSION_SECRET ||
  crypto.createHash('sha256').update('dc-session|' + PASSWORD + '|' + (process.env.MONGODB_URI || '')).digest('hex');
const COOKIE = 'dc_session';
const MAX_AGE = 1000 * 60 * 60 * 24 * 7; // 7 days

export const authEnabled = () => Boolean(PASSWORD);

const sign = (v) => crypto.createHmac('sha256', SECRET).update(v).digest('hex');
const hash = (v) => crypto.createHash('sha256').update(String(v)).digest();

function readCookie(req) {
  const raw = req.headers.cookie || '';
  for (const part of raw.split(';')) {
    const [k, ...v] = part.trim().split('=');
    if (k === COOKIE) return decodeURIComponent(v.join('='));
  }
  return '';
}

function validSession(req) {
  const [exp, sig] = readCookie(req).split('.');
  if (!exp || !sig || Number(exp) < Date.now()) return false;
  const good = sign(exp);
  return sig.length === good.length && crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(good));
}

export const isLoggedIn = (req) => !authEnabled() || validSession(req);

export function requireAuth(req, res, next) {
  if (isLoggedIn(req)) return next();
  res.status(401).json({ error: 'Please log in' });
}

// Basic brute-force protection: 10 wrong passwords per IP per 15 minutes.
const attempts = new Map();

export function login(req, res) {
  const ip = req.ip;
  const now = Date.now();
  const a = attempts.get(ip) || { n: 0, until: now + 15 * 60000 };
  if (a.until < now) Object.assign(a, { n: 0, until: now + 15 * 60000 });
  if (a.n >= 10) return res.status(429).json({ error: 'Too many attempts. Try again in 15 minutes.' });

  if (!authEnabled()) return res.json({ ok: true });
  const ok = crypto.timingSafeEqual(hash(req.body?.password ?? ''), hash(PASSWORD));
  if (!ok) {
    a.n += 1;
    attempts.set(ip, a);
    return res.status(401).json({ error: 'Wrong password' });
  }
  attempts.delete(ip);
  const exp = String(now + MAX_AGE);
  res.cookie(COOKIE, `${exp}.${sign(exp)}`, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: MAX_AGE,
  });
  res.json({ ok: true });
}

export function logout(_req, res) {
  res.clearCookie(COOKIE);
  res.json({ ok: true });
}
