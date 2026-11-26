// MongoDB models. Patient records are flexible documents (the intake form has
// many optional sections), so only the fields we query on are declared.
import mongoose from 'mongoose';

const clean = {
  versionKey: false,
  transform(_doc, ret) {
    delete ret._id;
    return ret;
  },
};

const patientSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true },
    name: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    status: { type: String, default: 'New' },
    since: String,
    paid: { type: Number, default: 0 },
  },
  { strict: false, timestamps: true, minimize: false, toJSON: clean }
);
patientSchema.index({ name: 1 });
patientSchema.index({ phone: 1 });

const appointmentSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true },
    date: { type: String, required: true }, // YYYY-MM-DD, clinic local date
    time: { type: String, required: true }, // HH:MM, 24h
    patientId: { type: String, required: true },
    name: String,
    procedure: String,
    doctor: String,
    chair: String,
    status: { type: String, default: 'Booked' },
    waitingSince: Number,
  },
  { timestamps: true, toJSON: clean }
);
appointmentSchema.index({ date: 1, time: 1 });
appointmentSchema.index({ patientId: 1 });

const paymentSchema = new mongoose.Schema(
  {
    patientId: { type: String, required: true },
    name: String,
    amount: { type: Number, required: true, min: 1 },
    mode: { type: String, default: 'Cash' },
    at: { type: Date, default: Date.now },
  },
  { timestamps: true, toJSON: clean }
);
paymentSchema.index({ at: 1 });
paymentSchema.index({ patientId: 1 });

// Running number for patient IDs (PT-00001, PT-00002, ...).
const counterSchema = new mongoose.Schema({ _id: String, seq: Number }, { versionKey: false });

export const Patient = mongoose.model('Patient', patientSchema);
export const Appointment = mongoose.model('Appointment', appointmentSchema);
export const Payment = mongoose.model('Payment', paymentSchema);
export const Counter = mongoose.model('Counter', counterSchema);

export async function nextPatientId() {
  const c = await Counter.findOneAndUpdate({ _id: 'patient' }, { $inc: { seq: 1 } }, { upsert: true, new: true });
  return 'PT-' + String(c.seq).padStart(5, '0');
}
