// The Express app, shared by:
//   server/index.js  -> long-running server (npm run dev / npm start)
//   api/index.js     -> Vercel serverless function
import express from 'express';
import mongoose from 'mongoose';
import { api, MAX_UPLOAD } from './api.js';
import { authEnabled, isLoggedIn, login, logout, requireAuth } from './auth.js';

const URI = process.env.MONGODB_URI || '';

mongoose.set('sanitizeFilter', true); // blocks {$gt: ...} style query injection
mongoose.set('strictQuery', true);

// One connection per server / serverless instance, reused across requests.
let connecting = null;
export function connectDb() {
  if (!URI) return Promise.resolve(false);
  if (mongoose.connection.readyState === 1) return Promise.resolve(true);
  if (!connecting) {
    connecting = mongoose
      .connect(URI, { serverSelectionTimeoutMS: 8000, maxPoolSize: 5 })
      .then(() => true)
      .catch((e) => {
        console.error('MongoDB connection failed:', e.message);
        connecting = null; // try again on the next request
        return false;
      });
  }
  return connecting;
}

export const app = express();
app.disable('x-powered-by');
app.set('trust proxy', 1);
app.use(express.json({ limit: '2mb' }));

app.get('/api/health', async (req, res) => {
  if (URI) await connectDb();
  res.json({
    configured: Boolean(URI),
    db: ['disconnected', 'connected', 'connecting', 'disconnecting'][mongoose.connection.readyState] || 'unknown',
    auth: authEnabled(),
    loggedIn: isLoggedIn(req),
    maxUpload: MAX_UPLOAD,
  });
});
app.post('/api/login', login);
app.post('/api/logout', logout);

app.use(
  '/api',
  requireAuth,
  async (_req, res, next) => {
    if (!(await connectDb())) return res.status(503).json({ error: 'Database is not connected' });
    next();
  },
  api
);

app.use('/api', (_req, res) => res.status(404).json({ error: 'Not found' }));

export function handleErrors(app) {
  // eslint-disable-next-line no-unused-vars
  app.use((err, _req, res, _next) => {
    if (err?.name === 'MulterError')
      return res.status(400).json({ error: err.code === 'LIMIT_FILE_SIZE' ? `File is larger than ${Math.round(MAX_UPLOAD / 1048576)} MB` : err.message });
    if (err?.name === 'ValidationError') return res.status(400).json({ error: err.message });
    console.error(err);
    res.status(500).json({ error: 'Something went wrong on the server' });
  });
  return app;
}
