// Vercel serverless function: every /api/* request is routed here (see vercel.json).
import { app, handleErrors } from '../server/app.js';

export default handleErrors(app);
