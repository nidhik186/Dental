import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Badge, Card, CountUp, Icon, Modal, Sparkline, TiltCard, useToast } from '../components/ui.jsx';
import { balance, createAppointment, getAppointments, getCollections, getPatients, inr, today, updateAppointment } from '../data/store.js';

import { DOCTOR } from '../config.js';

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
}

export function PatientSearch({ patients, placeholder = 'Search name, phone or ID' }) {
  const [q, setQ] = useState('');
  const nav = useNavigate();
  const results = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return [];
    return patients.filter((p) => [p.name, p.phone, p.id].join(' ').toLowerCase().includes(s)).slice(0, 6);
  }, [q, patients]);
  return (
    <div style={{ position: 'relative' }}>
      <label className="search">
        <Icon name="search" size={17} color="#7b8c90" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={placeholder} onKeyDown={(e) => e.key === 'Enter' && results[0] && nav('/patients/' + results[0].id)} />
      </label>
      <AnimatePresence>
        {results.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6 }}
            className="card"
            style={{ position: 'absolute', top: 50, left: 0, right: 0, padding: 6, zIndex: 20 }}
          >
            {results.map((p, i) => (
              <motion.button
                key={p.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.03 }}
                onClick={() => nav('/patients/' + p.id)}
                className="row"
                style={{ width: '100%', border: 0, background: 'none', padding: '9px 10px', borderRadius: 10, textAlign: 'left' }}
                onMouseEnter={(e) => (e.currentTarget.style.background = '#f0f7f6')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
              >
                <b style={{ fontSize: 14 }}>{p.name}</b>
                <span className="muted small" style={{ marginLeft: 'auto' }}>{p.id}</span>
              </motion.button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function BookModal({ open, onClose, patients, onBooked, defaultPatient }) {
  const toast = useToast();
  const [f, setF] = useState({});
  useEffect(() => {
    if (open) setF({ patientId: defaultPatient || patients[0]?.id, date: today(), time: '17:00', procedure: 'Consultation', doctor: 'Dr. Iyer' });
  }, [open]);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  return (
    <Modal open={open} onClose={onClose} title="Book appointment">
      <div className="grid" style={{ gap: 12, marginTop: 10 }}>
        <div className="field">
          <label>Patient</label>
          <select className="input" value={f.patientId} onChange={set('patientId')}>
            {patients.map((p) => (
              <option key={p.id} value={p.id}>{p.name} · {p.id}</option>
            ))}
          </select>
        </div>
        <div className="row">
          <div className="field" style={{ flex: 1 }}>
            <label>Date</label>
            <input type="date" className="input" value={f.date} onChange={set('date')} />
          </div>
          <div className="field" style={{ flex: 1 }}>
            <label>Time</label>
            <input type="time" className="input" value={f.time} onChange={set('time')} />
          </div>
        </div>
        <div className="field">
          <label>Procedure</label>
          <input className="input" value={f.procedure} onChange={set('procedure')} />
        </div>
        <div className="field">
          <label>Doctor</label>
          <select className="input" value={f.doctor} onChange={set('doctor')}>
            <option>Dr. Iyer</option>
            <option>Dr. Mehta</option>
          </select>
        </div>
        <button
          className="btn btn-primary"
          style={{ marginTop: 6 }}
          onClick={async () => {
            if (!f.patientId || !f.date || !f.time) return toast('Choose a patient, date and time');
            try {
              await onBooked?.(f);
            } catch {
              return;
            }
            toast('Appointment booked for ' + (patients.find((p) => p.id === f.patientId)?.name || 'patient'));
            onClose();
          }}
        >
          Confirm booking
        </button>
      </div>
    </Modal>
  );
}

function WaitMinutes({ since }) {
  const [, tick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => tick((x) => x + 1), 30000);
    return () => clearInterval(t);
  }, []);
  return <>{Math.max(1, Math.round((Date.now() - since) / 60000))} min</>;
}

export default function Dashboard() {
  const nav = useNavigate();
  const toast = useToast();
  const [appts, setAppts] = useState([]);
  const [patients, setPatients] = useState([]);
  const [cols, setCols] = useState([]);
  const [filter, setFilter] = useState('All');
  const [book, setBook] = useState(false);
  const [remindersSent, setRemindersSent] = useState(false);
  const [hoverBar, setHoverBar] = useState(null);

  useEffect(() => {
    getAppointments().then(setAppts);
    getPatients().then(setPatients);
    getCollections().then(setCols);
  }, []);

  const counts = {
    All: appts.length,
    Upcoming: appts.filter((a) => ['Booked', 'Waiting', 'In chair'].includes(a.status)).length,
    Done: appts.filter((a) => a.status === 'Done').length,
    'No-show': appts.filter((a) => a.status === 'No-show').length,
  };
  const shown = appts.filter((a) =>
    filter === 'All' ? true : filter === 'Upcoming' ? ['Booked', 'Waiting', 'In chair'].includes(a.status) : a.status === filter
  );
  const waiting = appts.filter((a) => a.status === 'Waiting');
  const inChair = appts.filter((a) => a.status === 'In chair');
  const todayCollected = cols[cols.length - 1]?.amount || 0;
  const weekTotal = cols.reduce((s, c) => s + c.amount, 0);
  const maxCol = Math.max(1, ...cols.map((c) => c.amount));
  const owing = patients.filter((p) => balance(p) > 0).sort((a, b) => balance(b) - balance(a));
  const outstanding = owing.reduce((s, p) => s + balance(p), 0);
  const thisMonth = new Date().toISOString().slice(0, 7);
  const newThisMonth = patients.filter((p) => (p.since || '').startsWith(thisMonth)).length;

  async function callIn(a) {
    // Whoever is in the same chair is finished.
    const prev = appts.find((x) => x.status === 'In chair' && x.chair === a.chair);
    if (prev) await updateAppointment(prev.id, { status: 'Done' });
    setAppts(await updateAppointment(a.id, { status: 'In chair' }));
    toast(`${a.name} called in to ${a.chair === 'C1' ? 'Chair 1' : 'Chair 2'}`);
  }

  const chairInfo = (c) => {
    const cur = inChair.find((a) => a.chair === c);
    if (cur) return { status: 'Busy', text: `${cur.doctor} · ${cur.procedure.split(' ')[0]}, ${cur.name}` };
    const next = appts.find((a) => a.chair === c && a.status === 'Booked');
    return { status: 'Free', text: next ? `${next.doctor} · next at ${next.time}` : 'No more bookings' };
  };

  const treatments = [
    ['Scaling & cleaning', 42],
    ['Fillings', 35],
    ['Root canals', 18],
    ['Crowns & bridges', 11],
    ['Aligners / braces', 6],
  ];

  const dateStr = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <>
      <div className="page-head">
        <div>
          <div className="date">{dateStr}</div>
          <h1>
            {greeting()}, <span className="grad-text">{DOCTOR}</span> <span className="wave">👋</span>
          </h1>
        </div>
        <div className="row" style={{ flexWrap: 'wrap' }}>
          <PatientSearch patients={patients} />
          <motion.button className="btn btn-primary" style={{ height: 44 }} whileHover={{ y: -2 }} onClick={() => setBook(true)}>
            <Icon name="plus" size={16} /> Book appointment
          </motion.button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid kpis">
        <TiltCard className="kpi" delay={0.05}>
          <div className="glow" style={{ background: '#14a39c' }} />
          <div className="label">Appointments today</div>
          <div className="value"><CountUp value={appts.length} /></div>
          <div className="sub">{counts.Done} done · {inChair.length} in chair · {counts.Upcoming - inChair.length} to go</div>
          <Sparkline data={[6, 9, 8, 12, 10, 13, appts.length || 10]} />
        </TiltCard>
        <TiltCard className="kpi" delay={0.12}>
          <div className="glow" style={{ background: '#5fe0d0' }} />
          <div className="label">Collected today</div>
          <div className="value"><CountUp value={todayCollected} prefix="₹" /></div>
          <div className="sub up"><Icon name="arrowUp" size={13} stroke={3} style={{ verticalAlign: -2 }} /> 12% vs last week</div>
          <Sparkline data={cols.map((c) => c.amount).filter(Boolean).concat(todayCollected).slice(-7)} color="#0e6e6b" delay={0.5} />
        </TiltCard>
        <TiltCard className="kpi" delay={0.19}>
          <div className="glow" style={{ background: '#2b56c6' }} />
          <div className="label">New patients this month</div>
          <div className="value"><CountUp value={newThisMonth} /></div>
          <div className="sub">{patients.length} active patients in total</div>
          <Sparkline data={[3, 5, 4, 7, 6, 9, 8]} color="#2b56c6" delay={0.6} />
        </TiltCard>
        <TiltCard className="kpi" delay={0.26}>
          <div className="glow" style={{ background: '#b4231b' }} />
          <div className="label">Outstanding balance</div>
          <div className="value red"><CountUp value={outstanding} prefix="₹" /></div>
          <div className="sub">across {owing.length} patients</div>
          <Sparkline data={[9, 8, 10, 9, 11, 10, 12]} color="#b4231b" delay={0.7} />
        </TiltCard>
      </div>

      <div className="grid dash-mid">
        {/* Schedule */}
        <Card delay={0.3}>
          <div className="row between" style={{ marginBottom: 12, flexWrap: 'wrap' }}>
            <h3 style={{ margin: 0 }}>Today's schedule</h3>
            <div className="tabs">
              {Object.keys(counts).map((k) => (
                <button key={k} className={'tab' + (filter === k ? ' active' : '')} onClick={() => setFilter(k)}>
                  {filter === k && <motion.div layoutId="schedtab" className="tab-bg" transition={{ type: 'spring', stiffness: 400, damping: 30 }} />}
                  <span>{k} · {counts[k]}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="table-scroll">
            <table className="tbl">
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Patient</th>
                  <th>Procedure</th>
                  <th>Doctor · chair</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                <AnimatePresence mode="popLayout" initial={false}>
                  {shown.map((a, i) => (
                    <motion.tr
                      layout
                      key={a.id}
                      className="clickable"
                      onClick={() => nav('/patients/' + a.patientId)}
                      initial={{ opacity: 0, x: -16 }}
                      animate={{ opacity: 1, x: 0, transition: { delay: 0.35 + i * 0.04 } }}
                      exit={{ opacity: 0, x: 16, transition: { duration: 0.15 } }}
                    >
                      <td className="time">{a.time}</td>
                      <td>
                        <div className="pname">{a.name}</div>
                        <div className="pid">{a.patientId}</div>
                      </td>
                      <td>{a.procedure}</td>
                      <td>{a.doctor} · {a.chair}</td>
                      <td><Badge dot={a.status === 'Waiting' || a.status === 'In chair'}>{a.status}</Badge></td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        </Card>

        <div className="side-stack">
          {/* Waiting room */}
          <Card className="waiting" delay={0.36}>
            <div className="eyebrow"><span className="live-dot" /> Waiting room · {waiting.length}</div>
            <AnimatePresence initial={false}>
              {waiting.length === 0 && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ color: '#b6cbcf', fontSize: 14, padding: '10px 0' }}>
                  No one waiting. ☕
                </motion.div>
              )}
              {waiting.map((a) => (
                <motion.div
                  key={a.id}
                  layout
                  className="wait-item"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, x: 80, height: 0, paddingTop: 0, paddingBottom: 0 }}
                  transition={{ type: 'spring', stiffness: 260, damping: 26 }}
                >
                  <div>
                    <b>{a.name}</b>
                    <small>Waiting <WaitMinutes since={a.waitingSince || Date.now()} /> · {a.procedure.split(' ')[0]}</small>
                  </div>
                  <motion.button className="btn btn-light" style={{ padding: '8px 12px' }} whileHover={{ scale: 1.06 }} whileTap={{ scale: 0.92 }} onClick={() => callIn(a)}>
                    Call in
                  </motion.button>
                </motion.div>
              ))}
            </AnimatePresence>
          </Card>

          {/* Chairs */}
          <Card delay={0.42}>
            <h3>Chairs right now</h3>
            {['C1', 'C2'].map((c, i) => {
              const info = chairInfo(c);
              return (
                <div className="chair" key={c}>
                  <div>
                    <b>Chair {i + 1}</b>
                    <small>{info.text}</small>
                  </div>
                  <Badge dot={info.status === 'Busy'}>{info.status}</Badge>
                </div>
              );
            })}
            <div className="chair">
              <div>
                <b>Chair 3</b>
                <small>Hygienist · being cleaned</small>
              </div>
              <Badge>Prep</Badge>
            </div>
          </Card>

          {/* Needs attention */}
          <Card className="attn" delay={0.48}>
            <h3>Needs attention</h3>
            <ul>
              {[
                ['#b4231b', <><b>2 crowns</b> due back from lab tomorrow. Confirm pickup.</>],
                ['#c2541b', <><b>8 recalls</b> overdue for 6-month check-up.</>],
                ['#c2541b', remindersSent ? <><b>Reminders sent</b> for tomorrow ✓</> : <><b>5 reminders</b> for tomorrow not sent yet.</>],
                ['#8a9a9e', <><b>Composite kit</b> stock low (3 left).</>],
              ].map(([c, t], i) => (
                <motion.li key={i} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.6 + i * 0.07 }}>
                  <span className="bullet" style={{ background: c }} />
                  <span>{t}</span>
                </motion.li>
              ))}
            </ul>
            <motion.button
              className={'btn ' + (remindersSent ? '' : '')}
              style={{ width: '100%' }}
              disabled={remindersSent}
              whileTap={{ scale: 0.96 }}
              onClick={() => {
                setRemindersSent(true);
                toast('5 reminders sent on WhatsApp / SMS');
              }}
            >
              {remindersSent ? <><Icon name="check" size={16} /> All reminders sent</> : 'Send all reminders'}
            </motion.button>
          </Card>
        </div>
      </div>

      <div className="grid dash-bottom">
        {/* Collections */}
        <Card delay={0.5}>
          <div className="row between">
            <h3 style={{ margin: 0 }}>Collections, last 7 days</h3>
            <b>{inr(weekTotal)}</b>
          </div>
          <div className="bars">
            {cols.map((c, i) => {
              const today = i === cols.length - 1;
              const h = c.amount ? (c.amount / maxCol) * 100 : 2;
              return (
                <div className="bar-col" key={c.day} onMouseEnter={() => setHoverBar(i)} onMouseLeave={() => setHoverBar(null)}>
                  <motion.span className="bar-val" initial={{ opacity: 0 }} animate={{ opacity: 1, scale: hoverBar === i ? 1.15 : 1 }} transition={{ delay: hoverBar === null ? 1 + i * 0.06 : 0 }}>
                    {c.amount ? (c.amount / 1000).toFixed(1) + 'k' : 'Closed'}
                  </motion.span>
                  <motion.div
                    className={'bar' + (today ? ' today' : '')}
                    style={{ height: h + '%', opacity: hoverBar === null || hoverBar === i ? 1 : 0.5 }}
                    initial={{ scaleY: 0 }}
                    animate={{ scaleY: 1 }}
                    transition={{ delay: 0.6 + i * 0.07, type: 'spring', stiffness: 120, damping: 14 }}
                  />
                  <span className={'bar-day' + (today ? ' today' : '')}>{c.day}</span>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Top treatments */}
        <Card delay={0.56}>
          <h3>Top treatments this month</h3>
          {treatments.map(([t, n], i) => (
            <div key={t}>
              <div className="row between" style={{ fontSize: 14.5 }}>
                <span>{t}</span>
                <b><CountUp value={n} duration={1.2 + i * 0.1} /></b>
              </div>
              <div className="meter">
                <motion.div initial={{ width: 0 }} animate={{ width: (n / 42) * 100 + '%' }} transition={{ delay: 0.7 + i * 0.1, duration: 1, ease: [0.16, 1, 0.3, 1] }} />
              </div>
            </div>
          ))}
        </Card>

        {/* Pending payments */}
        <Card delay={0.62}>
          <div className="row between" style={{ marginBottom: 6 }}>
            <h3 style={{ margin: 0 }}>Largest pending payments</h3>
            <button className="link" onClick={() => nav('/patients')}>View all</button>
          </div>
          {owing.slice(0, 4).map((p, i) => (
            <motion.div
              key={p.id}
              className="pending-row"
              style={{ cursor: 'pointer' }}
              onClick={() => nav('/patients/' + p.id)}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 + i * 0.07 }}
              whileHover={{ x: 4 }}
            >
              <div>
                <b>{p.name}</b>
                <small>{p.plan.filter((x) => x.status !== 'Done').map((x) => x.procedure).slice(0, 2).join(' + ')}</small>
              </div>
              <span className="amt">{inr(balance(p))}</span>
            </motion.div>
          ))}
        </Card>
      </div>

      <BookModal
        open={book}
        onClose={() => setBook(false)}
        patients={patients}
        onBooked={async (f) => {
          const p = patients.find((x) => x.id === f.patientId);
          const list = await createAppointment({ date: f.date, time: f.time, patientId: p.id, name: p.name, procedure: f.procedure, doctor: f.doctor, chair: f.doctor === 'Dr. Mehta' ? 'C1' : 'C2' });
          if (f.date === today()) setAppts(list);
        }}
      />
    </>
  );
}
