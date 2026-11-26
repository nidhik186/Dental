// Fills the database with the demo patients, today's appointments and a week
// of payments.   npm run seed          (only if the database is empty)
//                npm run seed -- --force   (wipes patients/appointments/payments first)
import mongoose from 'mongoose';
import { seedAppointments, seedCollections, seedPatients } from '../src/data/seed.js';
import { Appointment, Counter, Patient, Payment } from './models.js';
import { localDate } from './api.js';

const URI = process.env.MONGODB_URI;
if (!URI) {
  console.error('Set MONGODB_URI in .env first.');
  process.exit(1);
}
const force = process.argv.includes('--force');

await mongoose.connect(URI);
const count = await Patient.countDocuments();
if (count && !force) {
  console.log(`Database already has ${count} patients. Use "npm run seed -- --force" to replace them with demo data.`);
  await mongoose.disconnect();
  process.exit(0);
}

if (force) {
  await Promise.all([Patient.deleteMany({}), Appointment.deleteMany({}), Payment.deleteMany({}), Counter.deleteMany({})]);
}

await Patient.insertMany(seedPatients);
const today = localDate();
await Appointment.insertMany(seedAppointments.map((a) => ({ ...a, date: today })));

// Spread the demo week of collections over the last 7 days (today last).
const payments = [];
seedCollections.forEach((c, i) => {
  if (!c.amount) return;
  const at = new Date(Date.now() - (seedCollections.length - 1 - i) * 86400000);
  payments.push({ patientId: 'DEMO', name: 'Demo collections', amount: c.amount, mode: 'Cash', at });
});
await Payment.insertMany(payments);

const maxId = Math.max(...seedPatients.map((p) => Number(p.id.replace(/\D/g, ''))));
await Counter.findOneAndUpdate({ _id: 'patient' }, { $max: { seq: maxId } }, { upsert: true });

console.log(`Seeded ${seedPatients.length} patients, ${seedAppointments.length} appointments, ${payments.length} payments.`);
await mongoose.disconnect();
