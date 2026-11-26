// Long-running server (not used on Vercel, which runs api/index.js instead).
//   npm run dev     -> API on :4000 + Vite on :5173 (Vite proxies /api here)
//   npm start       -> serves the built app (dist/) and the API on one port
import express from 'express';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { app, connectDb, handleErrors } from './app.js';
import { authEnabled } from './auth.js';

// In development the API always uses API_PORT/4000, because the Vite dev
// server proxies /api there. In production, hosts usually set PORT.
const DEV = process.argv.includes('--dev');
const PORT = Number(DEV ? process.env.API_PORT : process.env.PORT) || 4000;

// Production: serve the built React app.
const dist = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'dist');
if (!DEV && fs.existsSync(dist)) {
  app.use(express.static(dist));
  app.get('*', (_req, res) => res.sendFile(path.join(dist, 'index.html')));
}
handleErrors(app);

app.listen(PORT, () => {
  console.log(`API listening on http://localhost:${PORT}`);
  if (!authEnabled()) console.warn('APP_PASSWORD is not set: anyone who can reach this server can read patient records.');
});

if (!process.env.MONGODB_URI) {
  console.warn('MONGODB_URI is not set: the app runs in demo mode (data stays in the browser). Add it to .env.');
} else {
  connectDb().then((ok) => ok && console.log('MongoDB connected'));
}
