import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Badge, Icon, TiltCard } from '../components/ui.jsx';
import { age, balance, getPatients, inr, initials } from '../data/store.js';

export default function Patients() {
  const nav = useNavigate();
  const [list, setList] = useState([]);
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState('All');

  useEffect(() => {
    getPatients().then(setList);
  }, []);

  const filters = ['All', 'Active treatment', 'New', 'Recall', 'Owes money'];
  const shown = useMemo(() => {
    const s = q.trim().toLowerCase();
    return list.filter(
      (p) =>
        (!s || [p.name, p.phone, p.id].join(' ').toLowerCase().includes(s)) &&
        (filter === 'All' || (filter === 'Owes money' ? balance(p) > 0 : p.status === filter))
    );
  }, [list, q, filter]);

  return (
    <>
      <div className="page-head">
        <div>
          <div className="date">{list.length} patients</div>
          <h1>Patients</h1>
        </div>
        <div className="row" style={{ flexWrap: 'wrap' }}>
          <label className="search">
            <Icon name="search" size={17} color="#7b8c90" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, phone or ID" />
          </label>
          <motion.button className="btn btn-primary" style={{ height: 44 }} whileHover={{ y: -2 }} onClick={() => nav('/patients/new')}>
            <Icon name="plus" size={16} /> New patient
          </motion.button>
        </div>
      </div>

      <div className="tabs" style={{ display: 'inline-flex', marginBottom: 20, flexWrap: 'wrap' }}>
        {filters.map((k) => (
          <button key={k} className={'tab' + (filter === k ? ' active' : '')} onClick={() => setFilter(k)}>
            {filter === k && <motion.div layoutId="ptfilter" className="tab-bg" transition={{ type: 'spring', stiffness: 400, damping: 30 }} />}
            <span>{k}</span>
          </button>
        ))}
      </div>

      <motion.div layout className="grid pcards">
        <AnimatePresence mode="popLayout">
          {shown.map((p, i) => (
            <motion.div key={p.id} layout initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} transition={{ delay: Math.min(i * 0.03, 0.4) }}>
              <TiltCard className="pcard" onClick={() => nav('/patients/' + p.id)} delay={0}>
                <div className="row">
                  <div className="mini-avatar">{initials(p.name)}</div>
                  <div style={{ minWidth: 0 }}>
                    <b style={{ display: 'block' }}>{p.name}</b>
                    <span className="muted small">{p.id} · {age(p.dob)} yrs · {p.gender}</span>
                  </div>
                </div>
                <div className="row between" style={{ marginTop: 16 }}>
                  <Badge>{p.status}</Badge>
                  {balance(p) > 0 ? <b className="red small">{inr(balance(p))} due</b> : <span className="muted small">No dues</span>}
                </div>
                <div className="muted small" style={{ marginTop: 10 }}>{p.phone}</div>
              </TiltCard>
            </motion.div>
          ))}
        </AnimatePresence>
      </motion.div>
      {shown.length === 0 && <div className="empty-hero muted">No patients match.</div>}
    </>
  );
}
