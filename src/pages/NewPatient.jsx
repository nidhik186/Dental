import { useEffect, useRef, useState } from 'react';
import { DOCTOR } from '../config.js';
import { Link, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Card, Icon, Ring, useToast } from '../components/ui.jsx';
import ToothChart, { FINDINGS } from '../components/ToothChart.jsx';
import { createPatient, today, uploadFiles } from '../data/store.js';

const DRAFT_KEY = 'dental-new-patient-draft';

const EMPTY = {
  name: '', dob: '', gender: '', phone: '+91 ', email: '', occupation: '', address: '',
  emergency: { name: '', relation: '', phone: '+91 ' },
  referredBy: '',
  medical: { conditions: [], allergies: '', medications: '', bloodGroup: 'Unknown', surgeries: '', physician: '' },
  dental: { complaint: '', lastVisit: '', brushing: '', pain: 0, history: [] },
  chart: {}, gums: 'Healthy', hygiene: 'Good', notes: '',
  consents: { confirmed: false, examination: false, reminders: true },
  files: [],
};

const CONDITIONS = ['Diabetes', 'High blood pressure', 'Heart condition', 'Asthma', 'Bleeding disorder', 'Thyroid disorder', 'Pregnant / nursing', 'On blood thinners'];
const HISTORY = ['Fillings', 'Root canal', 'Extractions', 'Braces / aligners', 'Smoking', 'Tobacco / gutkha', 'Teeth grinding', 'Sensitive teeth'];
const STEPS = ['Personal', 'Medical history', 'Dental history', 'Examination', 'Files & consent'];

function Check({ on, onClick, children }) {
  return (
    <motion.div className={'chk' + (on ? ' on' : '')} onClick={onClick} whileHover={{ y: -1 }} role="checkbox" aria-checked={on} tabIndex={0} onKeyDown={(e) => e.key === ' ' && (e.preventDefault(), onClick())}>
      <span className="box">
        <AnimatePresence>
          {on && (
            <motion.svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
              <motion.path d="M5 12l5 5 9-10" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} exit={{ pathLength: 0 }} transition={{ duration: 0.25 }} />
            </motion.svg>
          )}
        </AnimatePresence>
      </span>
      {children}
    </motion.div>
  );
}

function Field({ label, req, span, children, error }) {
  return (
    <div className={'field' + (span ? ' span' + span : '')}>
      <label>
        {label}
        {req && <span style={{ color: 'var(--red)' }}> *</span>}
      </label>
      {children}
      <AnimatePresence>
        {error && (
          <motion.span initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="small" style={{ color: 'var(--red)', fontWeight: 600 }}>
            {error}
          </motion.span>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function NewPatient() {
  const nav = useNavigate();
  const toast = useToast();
  const [f, setF] = useState(() => {
    try {
      return { ...EMPTY, ...JSON.parse(localStorage.getItem(DRAFT_KEY)) };
    } catch {
      return EMPTY;
    }
  });
  const [errors, setErrors] = useState({});
  const [active, setActive] = useState(0);
  const [mark, setMark] = useState('D');
  const [over, setOver] = useState(false);
  const [saving, setSaving] = useState(false);
  const refs = useRef([]);
  const fileInput = useRef();

  // Track which section is in view
  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => e.isIntersecting && setActive(Number(e.target.dataset.i)));
      },
      { rootMargin: '-30% 0px -60% 0px' }
    );
    refs.current.forEach((r) => r && io.observe(r));
    return () => io.disconnect();
  }, []);

  const set = (path, value) => {
    setF((s) => {
      const next = structuredClone(s);
      const keys = path.split('.');
      let o = next;
      keys.slice(0, -1).forEach((k) => (o = o[k]));
      o[keys.at(-1)] = value;
      return next;
    });
    if (errors[path]) setErrors((e) => ({ ...e, [path]: undefined }));
  };
  const bind = (path) => ({
    value: path.split('.').reduce((o, k) => o[k], f),
    onChange: (e) => set(path, e.target.value),
    className: 'input' + (errors[path] ? ' err' : ''),
  });
  const toggleIn = (path, item) => {
    const arr = path.split('.').reduce((o, k) => o[k], f);
    set(path, arr.includes(item) ? arr.filter((x) => x !== item) : [...arr, item]);
  };

  const required = { name: f.name.trim(), dob: f.dob, phone: f.phone.replace(/\D/g, '').length >= 12, 'dental.complaint': f.dental.complaint.trim() };
  const done = Object.values(required).filter(Boolean).length;
  const sectionDone = [required.name && required.dob && required.phone, f.medical.conditions.length || f.medical.allergies, required['dental.complaint'], Object.keys(f.chart).length, f.consents.confirmed && f.consents.examination];

  function toggleTooth(n) {
    const chart = { ...f.chart };
    if (chart[n] === mark) delete chart[n];
    else chart[n] = mark;
    set('chart', chart);
  }

  // The actual File objects are kept here (not in the form state / draft)
  // and uploaded after the patient is created.
  const rawFiles = useRef([]);
  function addFiles(list) {
    const arr = [...list];
    rawFiles.current = [...rawFiles.current, ...arr];
    const files = arr.map((x) => ({ name: x.name, size: x.size, date: today(), kind: 'file' }));
    set('files', [...f.files, ...files]);
  }
  function removeFile(i) {
    rawFiles.current = rawFiles.current.filter((_, j) => j !== i);
    set('files', f.files.filter((_, j) => j !== i));
  }

  async function save() {
    const e = {};
    if (!required.name) e.name = 'Enter the patient’s name';
    if (!required.dob) e.dob = 'Enter date of birth';
    if (!required.phone) e.phone = 'Enter a 10-digit mobile number';
    if (!required['dental.complaint']) e['dental.complaint'] = 'What brings them in today?';
    setErrors(e);
    if (Object.keys(e).length) {
      const first = ['name', 'dob', 'phone'].some((k) => e[k]) ? 0 : 2;
      refs.current[first]?.scrollIntoView({ behavior: 'smooth' });
      return;
    }
    setSaving(true);
    let p;
    try {
      p = await createPatient({
        ...f,
        files: [],
        status: 'New',
        visits: [{ date: today(), doctor: DOCTOR, title: 'First visit: registration & examination', text: 'Complaint: ' + f.dental.complaint }],
      });
      if (rawFiles.current.length) await uploadFiles(p.id, rawFiles.current).catch(() => toast('Patient saved, but the files could not be uploaded'));
    } catch {
      setSaving(false);
      return;
    }
    localStorage.removeItem(DRAFT_KEY);
    toast(`${p.name} saved as ${p.id}`);
    nav('/patients/' + p.id);
  }

  const sec = (i) => ({ ref: (el) => (refs.current[i] = el), 'data-i': i, className: 'section', delay: 0.05 + i * 0.06 });

  return (
    <div className="form-wrap">
      <Link to="/patients" className="link small" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
        <Icon name="arrowLeft" size={14} /> Patients
      </Link>
      <div className="page-head" style={{ marginBottom: 10, marginTop: 6 }}>
        <div>
          <h1>New patient</h1>
          <div className="muted" style={{ marginTop: 4, fontSize: 14 }}>Fill what you know now. Only fields marked * are required to save.</div>
        </div>
        <span className="badge b-done">Patient ID assigned on save</span>
      </div>

      <div className="steps">
        {STEPS.map((s, i) => (
          <button key={s} className={'step' + (active === i ? ' active' : '')} onClick={() => refs.current[i]?.scrollIntoView({ behavior: 'smooth' })}>
            {active === i && <motion.div layoutId="stepbg" className="step-bg" transition={{ type: 'spring', stiffness: 400, damping: 32 }} />}
            {sectionDone[i] ? <span className="check">✓</span> : null}
            {i + 1} {s}
          </button>
        ))}
      </div>

      {/* 1 Personal */}
      <Card {...sec(0)}>
        <h2>1 · Personal details</h2>
        <div className="desc">Used for identification, reminders and billing.</div>
        <div className="fields">
          <Field label="Full name" req error={errors.name}><input {...bind('name')} placeholder="First and last name" /></Field>
          <Field label="Date of birth" req error={errors.dob}><input type="date" {...bind('dob')} max={new Date().toISOString().slice(0, 10)} /></Field>
          <Field label="Gender">
            <select {...bind('gender')}><option value="">Select</option><option>Female</option><option>Male</option><option>Other</option></select>
          </Field>
          <Field label="Mobile number" req error={errors.phone}><input {...bind('phone')} inputMode="tel" /></Field>
          <Field label="Email"><input type="email" {...bind('email')} placeholder="name@example.com" /></Field>
          <Field label="Occupation"><input {...bind('occupation')} /></Field>
          <div />
          <div />
          <Field label="Address" span={4}><textarea {...bind('address')} placeholder="House, street, area, city, PIN" /></Field>
          <Field label="Emergency contact name"><input {...bind('emergency.name')} /></Field>
          <Field label="Relationship"><input {...bind('emergency.relation')} placeholder="e.g. Spouse" /></Field>
          <Field label="Emergency contact number"><input {...bind('emergency.phone')} /></Field>
          <Field label="Referred by">
            <select {...bind('referredBy')}><option value="">Select</option><option>Google / maps</option><option>Friend / family</option><option>Existing patient</option><option>Doctor referral</option><option>Social media</option><option>Walk-in</option></select>
          </Field>
        </div>
      </Card>

      {/* 2 Medical */}
      <Card {...sec(1)}>
        <h2>2 · Medical history</h2>
        <div className="desc">Anything ticked here shows as an alert on the patient’s profile.</div>
        <div className="field" style={{ marginBottom: 10 }}><label>Does the patient have any of these?</label></div>
        <div className="checks" style={{ marginBottom: 16 }}>
          {CONDITIONS.map((c) => (
            <Check key={c} on={f.medical.conditions.includes(c)} onClick={() => toggleIn('medical.conditions', c)}>{c}</Check>
          ))}
        </div>
        <div className="fields">
          <Field label="Allergies (drugs, latex, anaesthetic)" span={2}><textarea {...bind('medical.allergies')} placeholder="e.g. Penicillin: rash" /></Field>
          <Field label="Current medications" span={2}><textarea {...bind('medical.medications')} placeholder="Name, dose, how often" /></Field>
          <Field label="Blood group">
            <select {...bind('medical.bloodGroup')}>{['Unknown', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map((b) => <option key={b}>{b}</option>)}</select>
          </Field>
          <Field label="Past surgeries / hospital stays"><input {...bind('medical.surgeries')} /></Field>
          <Field label="Physician name & number" span={2}><input {...bind('medical.physician')} /></Field>
        </div>
      </Card>

      {/* 3 Dental */}
      <Card {...sec(2)}>
        <h2>3 · Dental history</h2>
        <div className="desc">Why they came in today, and what’s been done before.</div>
        <div className="fields">
          <Field label="Chief complaint" req span={4} error={errors['dental.complaint']}>
            <textarea {...bind('dental.complaint')} placeholder="In the patient’s words, e.g. ‘Pain on lower left side while chewing’" />
          </Field>
          <Field label="Last dental visit">
            <select {...bind('dental.lastVisit')}><option value="">Select</option><option>Within 6 months</option><option>6–12 months</option><option>1–2 years</option><option>More than 2 years</option><option>Never</option></select>
          </Field>
          <Field label="Brushing">
            <select {...bind('dental.brushing')}><option value="">Select</option><option>Once a day</option><option>Twice a day</option><option>Irregular</option></select>
          </Field>
          <Field label="Pain level (0–10)" span={2}>
            <div className="row" style={{ height: 44 }}>
              <input type="range" min="0" max="10" className="range" value={f.dental.pain} onChange={(e) => set('dental.pain', Number(e.target.value))} />
              <motion.span key={f.dental.pain} className="pain-val" initial={{ scale: 1.5 }} animate={{ scale: 1 }} style={{ color: `hsl(${120 - f.dental.pain * 12}, 65%, 38%)` }}>
                {f.dental.pain}
              </motion.span>
            </div>
          </Field>
        </div>
        <div className="field" style={{ margin: '16px 0 10px' }}><label>Previous treatments and habits</label></div>
        <div className="checks">
          {HISTORY.map((c) => (
            <Check key={c} on={f.dental.history.includes(c)} onClick={() => toggleIn('dental.history', c)}>{c}</Check>
          ))}
        </div>
      </Card>

      {/* 4 Examination */}
      <Card {...sec(3)}>
        <div className="row between">
          <div>
            <h2>4 · Examination: tooth chart</h2>
            <div className="desc">Pick a finding, then tap the teeth. Tap again to clear. FDI numbering.</div>
          </div>
          <button className="btn" onClick={() => set('chart', {})}>Clear chart</button>
        </div>
        <div className="legend">
          {FINDINGS.map((x) => (
            <motion.button key={x.code} className={'lg' + (mark === x.code ? ' on' : '')} onClick={() => setMark(x.code)} whileTap={{ scale: 0.94 }}>
              <span className="sw" style={{ borderColor: x.color, background: mark === x.code ? x.color : 'transparent' }} />
              {x.label} ({x.code})
            </motion.button>
          ))}
        </div>
        <ToothChart chart={f.chart} onTooth={toggleTooth} />
        <div style={{ margin: '16px 0' }}>
          <b style={{ fontSize: 14 }}>Findings ({Object.keys(f.chart).length})</b>
          <div className="findings">
            {Object.keys(f.chart).length === 0 && <span className="muted small">No findings marked yet.</span>}
            <AnimatePresence>
              {Object.entries(f.chart).map(([t, c]) => (
                <motion.span key={t} layout initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} className={'badge t-' + c} style={{ border: '1px solid' }}>
                  {t} · {FINDINGS.find((x) => x.code === c).label}
                </motion.span>
              ))}
            </AnimatePresence>
          </div>
        </div>
        <div className="fields">
          <Field label="Gums & soft tissue" span={2}>
            <select {...bind('gums')}><option>Healthy</option><option>Mild gingivitis</option><option>Moderate gingivitis</option><option>Periodontitis</option></select>
          </Field>
          <Field label="Oral hygiene" span={2}>
            <select {...bind('hygiene')}><option>Good</option><option>Fair</option><option>Poor</option></select>
          </Field>
          <Field label="Diagnosis & doctor’s notes" span={4}><textarea {...bind('notes')} /></Field>
        </div>
      </Card>

      {/* 5 Files */}
      <Card {...sec(4)}>
        <h2>5 · X-rays, files & consent</h2>
        <div className="desc">Attach X-rays, intraoral photos or old reports.</div>
        <div
          className={'dropzone' + (over ? ' over' : '')}
          onClick={() => fileInput.current.click()}
          onDragOver={(e) => (e.preventDefault(), setOver(true))}
          onDragLeave={() => setOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setOver(false);
            addFiles(e.dataTransfer.files);
          }}
        >
          <motion.div animate={{ y: [0, -6, 0] }} transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }} style={{ color: 'var(--brand)' }}>
            <Icon name="upload" size={28} />
          </motion.div>
          <b style={{ display: 'block', marginTop: 8 }}>Drop files here or browse</b>
          <span className="muted small">JPG, PNG, PDF, DICOM</span>
          <input ref={fileInput} type="file" multiple hidden accept=".jpg,.jpeg,.png,.pdf,.dcm" onChange={(e) => addFiles(e.target.files)} />
        </div>
        <div style={{ margin: '10px 0' }}>
          <AnimatePresence>
            {f.files.map((x, i) => (
              <motion.span key={x.name + i} className="file-chip" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }}>
                <Icon name="file" size={14} /> {x.name}
                <button style={{ border: 0, background: 'none', padding: 0, color: 'var(--ink-3)' }} onClick={() => removeFile(i)}>
                  <Icon name="x" size={13} />
                </button>
              </motion.span>
            ))}
          </AnimatePresence>
        </div>
        <div className="grid" style={{ gap: 10 }}>
          <Check on={f.consents.confirmed} onClick={() => set('consents.confirmed', !f.consents.confirmed)}>Patient confirms the medical information above is correct</Check>
          <Check on={f.consents.examination} onClick={() => set('consents.examination', !f.consents.examination)}>Patient consents to examination, X-rays and storing these records</Check>
          <Check on={f.consents.reminders} onClick={() => set('consents.reminders', !f.consents.reminders)}>Send appointment reminders on WhatsApp / SMS</Check>
        </div>
      </Card>

      <motion.div className="form-actions" initial={{ y: 80, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.5, type: 'spring', stiffness: 200, damping: 22 }}>
        <div className="progress-ring">
          <Ring pct={done / 4} />
          {done === 4 ? 'Ready to save' : `${done} of 4 required fields`}
        </div>
        <button className="btn" style={{ border: 0 }} onClick={() => nav(-1)}>Cancel</button>
        <button
          className="btn"
          onClick={() => {
            localStorage.setItem(DRAFT_KEY, JSON.stringify({ ...f, files: [] }));
            toast('Draft saved');
          }}
        >
          Save draft
        </button>
        <motion.button className="btn btn-primary" onClick={save} disabled={saving} whileTap={{ scale: 0.95 }}>
          {saving ? 'Saving…' : 'Save patient'}
        </motion.button>
      </motion.div>
    </div>
  );
}
