# Dental Clinic — patient records

React + Vite + Framer Motion front end, Express + MongoDB back end.

## Run it

```
npm install
npm run dev      # API on :4000 + app on http://localhost:5173
```

Without a MongoDB URL the app runs in **demo mode**: data stays in this browser
and the sidebar says "Demo mode". Once `MONGODB_URI` is set it switches to the
database automatically and the sidebar shows a green "Connected to database".

## Connect MongoDB

1. Open `.env` (copy `.env.example` if it's missing) and fill in:
   - `MONGODB_URI`: your connection string, e.g.
     `mongodb+srv://USER:PASSWORD@cluster0.xxxxx.mongodb.net/dental?retryWrites=true&w=majority`
     (put the database name, e.g. `dental`, before the `?`).
   - `APP_PASSWORD`: the password staff type to open the app. Leave it empty only on your own computer.
   - `SESSION_SECRET`: already filled with a random value; keep it secret.
2. On MongoDB Atlas, under **Network Access**, allow the IP address of the computer/server running the app.
3. Optional: load the demo patients into the database: `npm run seed`
   (`npm run seed -- --force` wipes patients, appointments and payments first).
   Skip this to start with an empty database for real patients.
4. Restart `npm run dev`.

## Deploy on Vercel

The project is ready for Vercel: the React app is built to `dist/` and the API
runs as one serverless function (`api/index.js`), routed by `vercel.json`.

1. Put the project on GitHub (the `.gitignore` keeps `.env` and `node_modules` out),
   then on vercel.com choose **Add New → Project** and import the repository.
   Or, from this folder: `npx vercel` (first time) and `npx vercel --prod`.
2. In **Project → Settings → Environment Variables** add:
   | Name | Value |
   |---|---|
   | `MONGODB_URI` | your Atlas connection string (with the database name, e.g. `/dental?`) |
   | `APP_PASSWORD` | the clinic login password (**required** on the internet) |
   | `SESSION_SECRET` | a long random text (copy the one from your `.env`) |
   | `CLINIC_TZ` | `Asia/Kolkata` |
3. MongoDB Atlas → **Network Access** → add `0.0.0.0/0` (Vercel has no fixed IP
   addresses). Use a strong database user password.
4. Optional, for speed: in **Settings → Functions**, choose a region close to your
   Atlas cluster (e.g. Mumbai `bom1` for an Atlas cluster in Mumbai).
5. Redeploy after changing environment variables.

Limits on Vercel: each uploaded file can be up to **4 MB** (Vercel allows 4.5 MB per
request); the app tells the user if a file is too big. On a normal server the limit is 25 MB.

## Run on your own server instead

```
npm run build
npm start        # serves the app and the API on PORT (default 4000)
```
Set `NODE_ENV=production` and serve it over HTTPS (login cookies are HTTPS-only in production).

## What's stored where (MongoDB collections)
- `patients`: all patient details, medical/dental history, tooth chart, treatment plan, visits, file list, total paid.
- `appointments`: date, time, patient, procedure, doctor, chair, status (Booked / Waiting / In chair / Done / No-show).
- `payments`: every payment (amount, mode, time). Feeds "Collected today" and the weekly chart.
- `files.files` / `files.chunks` (GridFS): uploaded X-rays and documents, up to 25 MB each.
- `counters`: running number for patient IDs (PT-00001, ...).

## API (all under `/api`, login required when `APP_PASSWORD` is set)
| Method | Path | What |
|---|---|---|
| GET | `/health` | server / database status |
| POST | `/login`, `/logout` | start / end a session |
| GET | `/patients?q=` | list or search by name, phone or ID |
| GET / PATCH | `/patients/:id` | read / update a patient |
| POST | `/patients` | create (name and phone required) |
| GET / POST | `/patients/:id/payments` | payment history / record a payment |
| POST | `/patients/:id/files` | upload files (multipart field `files`) |
| DELETE | `/patients/:id/files/:fileId` | delete a file |
| GET | `/files/:fileId` | open/download a file |
| GET | `/appointments?date=YYYY-MM-DD` or `?patientId=` | a day's schedule / a patient's appointments |
| POST / PATCH | `/appointments`, `/appointments/:id` | book / change status |
| GET | `/collections?days=7` | money collected per day |

## Code map
- `server/`: `app.js` (Express app), `index.js` (long-running server), `api.js` (routes), `models.js` (schemas), `auth.js` (login), `seed.js` (demo data).
- `api/index.js` + `vercel.json`: Vercel serverless entry and routing.
- `src/data/store.js`: the only place the screens get data from; picks database or demo mode.
- Screens: `src/pages/Dashboard.jsx`, `Patients.jsx`, `NewPatient.jsx`, `PatientProfile.jsx`.

The clinic name is a placeholder and the doctor name is set in: `CLINIC_NAME` in `src/App.jsx` and `DOCTOR` in `src/config.js`.
