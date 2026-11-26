import { useEffect, useRef, useState } from 'react';
import { DOCTOR } from '../config.js';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Badge, Card, CountUp, Icon, Modal, useToast } from '../components/ui.jsx';
import ToothChart, { FINDINGS, findingLabel } from '../components/ToothChart.jsx';
import { addPayment, age, balance, createAppointment, deleteFile, getPatient, getPatients, getPayments, inr, initials, planTotal, today, updatePatient, uploadFiles } from '../data/store.js';
import { BookModal, PatientSearch } from './Dashboard.jsx';

const TABS = ['Overview', 'Dental chart', 'Treatment plan', 'Visits', 'X-rays & files', 'Billing'];
const STATUS_CYCLE = ['Planned', 'In progress', 'Done'];
const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '');

function DentalChartCard({ p, selected, setSelected, onUpdate, delay }) {
  const [editMark, setEditMark] = useState(null);
  const code = p.chart?.[selected];
  const note = p.toothNotes?.[selected] || (code ? `${findingLabel(code)} noted on examination.` : 'No findings on this tooth.');
  const history = (p.plan || []).filter((x) => String(x.tooth) === String(selected));
  return (
    <Card delay={delay}>
      <div className="row between" style={{ flexWrap: 'wrap' }}>
        <h3 style={{ margin: 0 }}>Dental chart</h3>
        <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
          <span className="muted small">{editMark ? 'Tap teeth to mark' : 'Tap a tooth to see its history'}</span>
          <button className="btn" style={{ padding: '6px 10px', fontSize: 12.5 }} onClick={() => setEditMark(editMark ? null : 'D')}>
            {editMark ? 'Done editing' : 'Edit chart'}
          </button>
        </div>
      </div>
      <AnimatePresence>
        {editMark && (
          <motion.div className="legend" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} style={{ marginTop: 12, overflow: 'hidden' }}>
            {FINDINGS.map((x) => (
              <button key={x.code} className={'lg' + (editMark === x.code ? ' on' : '')} onClick={() => setEditMark(x.code)}>
                <span className="sw" style={{ borderColor: x.color, background: editMark === x.code ? x.color : 'transparent' }} />
                {x.label}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
      <div style={{ marginTop: 14 }}>
        <ToothChart
          chart={p.chart || {}}
          selected={selected}
          labels={false}
          onTooth={(n) => {
            if (editMark) {
              const chart = { ...p.chart };
              if (chart[n] === editMark) delete chart[n];
              else chart[n] = editMark;
              onUpdate({ chart });
            }
            setSelected(n);
          }}
        />
      </div>
      <div className="legend" style={{ marginTop: 10, marginBottom: 0, gap: 14 }}>
        <span className="small row" style={{ gap: 6 }}><span className="sw" style={{ width: 12, height: 12, borderRadius: 4, border: '1.5px solid #c9d5d7' }} /> Healthy</span>
        {FINDINGS.map((x) => (
          <span key={x.code} className="small row" style={{ gap: 6 }}>
            <span style={{ width: 12, height: 12, borderRadius: 4, border: '1.5px solid ' + x.color }} /> {x.label} ({x.code})
          </span>
        ))}
      </div>
      <AnimatePresence mode="wait">
        {selected && (
          <motion.div key={selected} className="tooth-detail" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.25 }}>
            <motion.div className="num" initial={{ rotateY: 90 }} animate={{ rotateY: 0 }} transition={{ type: 'spring', stiffness: 200, damping: 14 }}>
              {selected}
            </motion.div>
            <div style={{ flex: 1 }}>
              <b>Tooth {selected} · {findingLabel(code)}</b>
              <div style={{ fontSize: 14, color: 'var(--ink-2)', marginTop: 2 }}>{note}</div>
              {history.length > 0 && (
                <div className="row" style={{ gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
                  {history.map((h, i) => (
                    <span key={i} className="small">{h.procedure} <Badge>{h.status}</Badge></span>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}

function PlanCard({ p, onUpdate, delay, onAdd }) {
  return (
    <Card delay={delay}>
      <div className="row between" style={{ marginBottom: 8 }}>
        <h3 style={{ margin: 0 }}>Treatment plan</h3>
        <button className="btn" onClick={onAdd}><Icon name="plus" size={15} /> Add procedure</button>
      </div>
      <div className="table-scroll">
        <table className="tbl">
          <thead>
            <tr><th>Tooth</th><th>Procedure</th><th>Status</th><th className="right">Cost</th></tr>
          </thead>
          <tbody>
            <AnimatePresence initial={false}>
              {(p.plan || []).map((x, i) => (
                <motion.tr key={i + x.procedure} layout initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0, transition: { delay: delay + i * 0.05 } }}>
                  <td className="time">{x.tooth}</td>
                  <td>
                    {x.procedure}
                    {x.sub && <div className="pid">{x.sub}</div>}
                  </td>
                  <td>
                    <button
                      title="Click to change status"
                      style={{ border: 0, background: 'none', padding: 0 }}
                      onClick={() => {
                        const plan = [...p.plan];
                        plan[i] = { ...x, status: STATUS_CYCLE[(STATUS_CYCLE.indexOf(x.status) + 1) % 3] };
                        onUpdate({ plan });
                      }}
                    >
                      <Badge>{x.status}</Badge>
                    </button>
                  </td>
                  <td className="right" style={{ fontVariantNumeric: 'tabular-nums' }}>{inr(x.cost)}</td>
                </motion.tr>
              ))}
            </AnimatePresence>
          </tbody>
        </table>
        {!p.plan?.length && <div className="muted small" style={{ padding: 12 }}>No procedures planned yet.</div>}
      </div>
    </Card>
  );
}

function VisitsCard({ p, delay }) {
  return (
    <Card delay={delay}>
      <h3>Visit history</h3>
      {!p.visits?.length && <div className="muted small">No visits yet.</div>}
      <div className="timeline">
        {(p.visits || []).map((v, i) => (
          <motion.div className="tl-item" key={i + v.date} initial={{ opacity: 0, x: -14 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: delay + 0.1 + i * 0.08 }}>
            <span className="tl-dot" />
            <div className="meta">{fmtDate(v.date)} · {v.doctor}</div>
            <b>{v.title}</b>
            <p>{v.text}</p>
          </motion.div>
        ))}
      </div>
    </Card>
  );
}

function FilesCard({ p, setP, delay }) {
  const input = useRef();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  async function add(list) {
    const files = [...list];
    if (!files.length) return;
    setBusy(true);
    try {
      setP(await uploadFiles(p.id, files));
      toast(files.length + ' file(s) uploaded');
    } catch {}
    setBusy(false);
  }
  async function remove(x) {
    if (!confirm(`Delete "${x.name}"? This cannot be undone.`)) return;
    try {
      setP(await deleteFile(p.id, x.fileId));
      toast('File deleted');
    } catch {}
  }
  return (
    <Card delay={delay}>
      <div className="row between" style={{ marginBottom: 12 }}>
        <h3 style={{ margin: 0 }}>X-rays & files</h3>
        <button className="link" disabled={busy} onClick={() => input.current.click()}>{busy ? 'Uploading…' : 'Upload'}</button>
        <input
          ref={input}
          type="file"
          multiple
          hidden
          accept=".jpg,.jpeg,.png,.webp,.pdf,.dcm"
          onChange={(e) => {
            add(e.target.files);
            e.target.value = '';
          }}
        />
      </div>
      <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        {(p.files || []).map((x, i) => (
          <motion.div key={i} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: delay + i * 0.06 }} whileHover={{ y: -3 }}>
            <a href={x.url || undefined} target="_blank" rel="noreferrer" style={{ display: 'block', cursor: x.url ? 'pointer' : 'default' }}>
              {x.url && /^image\//.test(x.type || '') ? (
                <div className="xray" style={{ background: `#13262c url("${x.url}") center/cover` }} />
              ) : (
                <div className="xray">{x.kind === 'opg' ? 'OPG image' : x.kind === 'iopa' ? 'IOPA image' : /pdf/.test(x.type || '') ? 'PDF' : 'File'}</div>
              )}
            </a>
            <div className="row between" style={{ gap: 6, marginTop: 6 }}>
              <div style={{ fontSize: 13, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{x.name}</div>
              {x.fileId && (
                <button aria-label={'Delete ' + x.name} onClick={() => remove(x)} style={{ border: 0, background: 'none', padding: 0, color: 'var(--ink-3)' }}>
                  <Icon name="x" size={13} />
                </button>
              )}
            </div>
            <div className="muted small">{fmtDate(x.date)}</div>
          </motion.div>
        ))}
      </div>
      {p.consents?.examination && (
        <div className="row" style={{ border: '1px solid var(--line)', borderRadius: 12, padding: '10px 12px', marginTop: 12, fontSize: 14, fontWeight: 600 }}>
          <Icon name="file" size={16} /> Signed consent form (PDF)
        </div>
      )}
    </Card>
  );
}

function BillingCard({ p, delay, onPay }) {
  const [history, setHistory] = useState([]);
  useEffect(() => {
    getPayments(p.id).then(setHistory).catch(() => {});
  }, [p.id, p.paid]);
  const total = planTotal(p);
  const pct = total ? Math.min(1, (p.paid || 0) / total) : 0;
  return (
    <Card delay={delay}>
      <h3>Billing</h3>
      <div className="row between">
        <div><div className="muted small">Plan total</div><b style={{ fontSize: 18 }}><CountUp value={total} prefix="₹" /></b></div>
        <div><div className="muted small">Paid</div><b style={{ fontSize: 18, color: 'var(--brand)' }}><CountUp value={p.paid || 0} prefix="₹" /></b></div>
        <div><div className="muted small">Balance</div><b style={{ fontSize: 18, color: 'var(--red)' }}><CountUp value={balance(p)} prefix="₹" /></b></div>
      </div>
      <div className="progress">
        <motion.div initial={{ width: 0 }} animate={{ width: pct * 100 + '%' }} transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1], delay: 0.3 }} />
      </div>
      <button className="btn" style={{ width: '100%' }} onClick={onPay}>Record payment</button>
      {history.length > 0 && (
        <div style={{ marginTop: 14 }}>
          <div className="muted small" style={{ marginBottom: 6 }}>Payments</div>
          {history.slice(0, 5).map((x, i) => (
            <div key={i} className="row between" style={{ fontSize: 14, padding: '6px 0', borderTop: '1px solid var(--line)' }}>
              <span>{new Date(x.at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })} · {x.mode}</span>
              <b>{inr(x.amount)}</b>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

export default function PatientProfile() {
  const { id } = useParams();
  const nav = useNavigate();
  const toast = useToast();
  const [p, setP] = useState(null);
  const [all, setAll] = useState([]);
  const [tab, setTab] = useState('Overview');
  const [selected, setSelected] = useState(null);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({});
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    getPatient(id).then((x) => {
      if (!x) return setMissing(true);
      setP(x);
      const first = Object.keys(x.chart || {}).find((t) => x.chart[t] === 'R') || Object.keys(x.chart || {})[0];
      setSelected(first ? Number(first) : null);
    });
    getPatients().then(setAll);
  }, [id]);

  async function update(patch) {
    try {
      setP(await updatePatient(id, patch));
    } catch {}
  }

  if (missing)
    return (
      <div className="empty-hero">
        <h2>Patient not found</h2>
        <Link to="/patients" className="link">Back to patients</Link>
      </div>
    );
  if (!p) return <div className="muted" style={{ padding: 40 }}>Loading…</div>;

  const alerts = [
    ...(p.medical?.allergies ? ['Allergy: ' + p.medical.allergies] : []),
    ...(p.medical?.conditions || []).map((c) => (c === 'Diabetes' && /metformin/i.test(p.medical.medications) ? 'Diabetes (on Metformin)' : c)),
  ];

  const open = (name, init = {}) => {
    setForm(init);
    setModal(name);
  };
  const setF = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const show = (t) => tab === 'Overview' || tab === t;

  return (
    <>
      <div className="row between" style={{ marginBottom: 18, flexWrap: 'wrap' }}>
        <Link to="/patients" className="link small" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
          <Icon name="arrowLeft" size={14} /> All patients
        </Link>
        <PatientSearch patients={all} placeholder="Search by name, phone or ID" />
      </div>

      {/* Header */}
      <Card delay={0} style={{ marginBottom: 20, paddingBottom: 0 }}>
        <div className="row between" style={{ flexWrap: 'wrap', gap: 16 }}>
          <div className="prof-head">
            <motion.div className="avatar" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 200, damping: 14, delay: 0.1 }}>
              {initials(p.name)}
            </motion.div>
            <div>
              <h1>{p.name} <Badge>{p.status}</Badge></h1>
              <div style={{ color: 'var(--ink-2)', fontSize: 14, marginTop: 4, lineHeight: 1.6 }}>
                {p.id} · {p.gender || '—'} · {age(p.dob)} yrs · Blood group {p.medical?.bloodGroup || 'Unknown'}
                <br />
                {p.phone} · Patient since {fmtDate(p.since)}
              </div>
            </div>
          </div>
          <div className="row" style={{ flexWrap: 'wrap', gap: 8 }}>
            <button className="btn" onClick={() => open('edit', { phone: p.phone, email: p.email, address: p.address, allergies: p.medical?.allergies || '' })}>Edit details</button>
            <button className="btn" onClick={() => open('note', { title: '', text: '' })}>Add visit note</button>
            <motion.button className="btn btn-primary" whileHover={{ y: -2 }} onClick={() => setModal('book')}>Book appointment</motion.button>
          </div>
        </div>

        {alerts.length > 0 && (
          <motion.div className="alert" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.25 }}>
            <motion.span animate={{ rotate: [0, -12, 12, -8, 0] }} transition={{ delay: 0.8, duration: 0.6 }} style={{ display: 'inline-flex' }}>
              <Icon name="alert" size={18} />
            </motion.span>
            Check before treatment:
            {alerts.map((a, i) => (
              <motion.span key={a} className="chip" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 + i * 0.08 }}>
                {a}
              </motion.span>
            ))}
          </motion.div>
        )}

        <div className="ptabs">
          {TABS.map((t) => (
            <button key={t} className={'ptab' + (tab === t ? ' active' : '')} onClick={() => setTab(t)}>
              {t}
              {tab === t && <motion.div layoutId="ptabline" className="ptab-line" transition={{ type: 'spring', stiffness: 400, damping: 32 }} />}
            </button>
          ))}
        </div>
      </Card>

      <AnimatePresence mode="wait">
        <motion.div key={tab} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.3 }}>
          <div className={tab === 'Overview' ? 'grid prof-grid' : 'grid'}>
            <div className="grid" style={{ gap: 20 }}>
              {show('Dental chart') && <DentalChartCard p={p} selected={selected} setSelected={setSelected} onUpdate={update} delay={0.1} />}
              {show('Treatment plan') && <PlanCard p={p} onUpdate={update} delay={0.18} onAdd={() => open('proc', { tooth: '', procedure: '', cost: '' })} />}
              {show('Visits') && <VisitsCard p={p} delay={0.26} />}
              {tab === 'X-rays & files' && <FilesCard p={p} setP={setP} delay={0.1} />}
              {tab === 'Billing' && <BillingCard p={p} delay={0.1} onPay={() => open('pay', { amount: '', mode: 'UPI' })} />}
            </div>

            {tab === 'Overview' && (
              <div className="side-stack">
                <Card className="next-appt" delay={0.15}>
                  <div className="eyebrow">Next appointment</div>
                  {p.nextAppt ? (
                    <>
                      <h2>{new Date(p.nextAppt.date).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })} · {p.nextAppt.time}</h2>
                      <div style={{ color: '#cfe0e3', fontSize: 14, marginBottom: 14 }}>{p.nextAppt.what}</div>
                      <div className="row">
                        <button className="btn btn-dark" onClick={() => setModal('book')}>Reschedule</button>
                        <button className="btn btn-light" onClick={() => toast('Reminder sent to ' + p.name)}>Send reminder</button>
                      </div>
                    </>
                  ) : (
                    <>
                      <h2>Not booked</h2>
                      <button className="btn btn-light" onClick={() => setModal('book')}>Book now</button>
                    </>
                  )}
                </Card>
                <BillingCard p={p} delay={0.22} onPay={() => open('pay', { amount: '', mode: 'UPI' })} />
                <Card delay={0.29}>
                  <h3>Contact & medical</h3>
                  <dl className="kv">
                    <dt>Email</dt><dd>{p.email || '—'}</dd>
                    <dt>Address</dt><dd>{p.address || '—'}</dd>
                    <dt>Emergency</dt><dd>{p.emergency?.name ? `${p.emergency.name} (${p.emergency.relation}) ${p.emergency.phone}` : '—'}</dd>
                    <dt>Medications</dt><dd>{p.medical?.medications || '—'}</dd>
                    <dt>Habits</dt><dd>{p.habits || p.dental?.history?.filter((h) => ['Smoking', 'Tobacco / gutkha', 'Teeth grinding'].includes(h)).join(', ') || '—'}</dd>
                    <dt>Hygiene</dt><dd>{p.hygiene}{p.dental?.brushing ? ' · brushes ' + p.dental.brushing.toLowerCase() : ''}</dd>
                  </dl>
                </Card>
                <FilesCard p={p} setP={setP} delay={0.36} />
              </div>
            )}
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Modals */}
      <BookModal
        open={modal === 'book'}
        onClose={() => setModal(null)}
        patients={all.length ? all : [p]}
        defaultPatient={p.id}
        onBooked={async (f) => {
          const who = all.find((x) => x.id === f.patientId) || p;
          await createAppointment({ date: f.date, time: f.time, patientId: who.id, name: who.name, procedure: f.procedure, doctor: f.doctor, chair: f.doctor === 'Dr. Mehta' ? 'C1' : 'C2' });
          if (f.patientId !== p.id) return;
          const [h, m] = f.time.split(':').map(Number);
          const time = `${((h + 11) % 12) + 1}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`;
          update({ nextAppt: { date: f.date, time, what: `${f.procedure} · ${f.doctor}` } });
        }}
      />

      <Modal open={modal === 'pay'} onClose={() => setModal(null)} title="Record payment">
        <div className="grid" style={{ gap: 12, marginTop: 10 }}>
          <div className="muted small">Balance due: <b className="red">{inr(balance(p))}</b></div>
          <div className="field"><label>Amount (₹)</label><input className="input" type="number" min="1" value={form.amount} onChange={setF('amount')} autoFocus /></div>
          <div className="field">
            <label>Mode</label>
            <select className="input" value={form.mode} onChange={setF('mode')}><option>UPI</option><option>Cash</option><option>Card</option><option>Bank transfer</option></select>
          </div>
          <button
            className="btn btn-primary"
            onClick={async () => {
              const amt = Number(form.amount);
              if (!amt) return;
              try {
                setP(await addPayment(p.id, amt, form.mode));
              } catch {
                return;
              }
              toast(`${inr(amt)} received via ${form.mode}`);
              setModal(null);
            }}
          >
            Save payment
          </button>
        </div>
      </Modal>

      <Modal open={modal === 'proc'} onClose={() => setModal(null)} title="Add procedure">
        <div className="grid" style={{ gap: 12, marginTop: 10 }}>
          <div className="row">
            <div className="field" style={{ width: 110 }}><label>Tooth</label><input className="input" value={form.tooth} onChange={setF('tooth')} placeholder="e.g. 36" /></div>
            <div className="field" style={{ flex: 1 }}><label>Procedure</label><input className="input" value={form.procedure} onChange={setF('procedure')} placeholder="e.g. Composite filling" /></div>
          </div>
          <div className="field"><label>Cost (₹)</label><input className="input" type="number" value={form.cost} onChange={setF('cost')} /></div>
          <button
            className="btn btn-primary"
            onClick={async () => {
              if (!form.procedure) return;
              await update({ plan: [...(p.plan || []), { tooth: form.tooth || 'All', procedure: form.procedure, status: 'Planned', cost: Number(form.cost) || 0 }] });
              toast('Procedure added to plan');
              setModal(null);
            }}
          >
            Add to plan
          </button>
        </div>
      </Modal>

      <Modal open={modal === 'note'} onClose={() => setModal(null)} title="Add visit note">
        <div className="grid" style={{ gap: 12, marginTop: 10 }}>
          <div className="field"><label>What was done</label><input className="input" value={form.title} onChange={setF('title')} placeholder="e.g. RCT sitting 3 on tooth 46" autoFocus /></div>
          <div className="field"><label>Notes</label><textarea className="input" value={form.text} onChange={setF('text')} /></div>
          <button
            className="btn btn-primary"
            onClick={async () => {
              if (!form.title) return;
              await update({ visits: [{ date: today(), doctor: DOCTOR, title: form.title, text: form.text }, ...(p.visits || [])] });
              toast('Visit note added');
              setModal(null);
            }}
          >
            Save note
          </button>
        </div>
      </Modal>

      <Modal open={modal === 'edit'} onClose={() => setModal(null)} title="Edit details">
        <div className="grid" style={{ gap: 12, marginTop: 10 }}>
          <div className="field"><label>Mobile</label><input className="input" value={form.phone} onChange={setF('phone')} /></div>
          <div className="field"><label>Email</label><input className="input" value={form.email} onChange={setF('email')} /></div>
          <div className="field"><label>Address</label><textarea className="input" value={form.address} onChange={setF('address')} /></div>
          <div className="field"><label>Allergies</label><input className="input" value={form.allergies} onChange={setF('allergies')} /></div>
          <button
            className="btn btn-primary"
            onClick={async () => {
              await update({ phone: form.phone, email: form.email, address: form.address, medical: { ...p.medical, allergies: form.allergies } });
              toast('Details updated');
              setModal(null);
            }}
          >
            Save changes
          </button>
        </div>
      </Modal>
    </>
  );
}
