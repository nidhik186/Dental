import { useEffect, useState } from 'react';
import { NavLink, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Icon, Page, ToastProvider, useToast } from './components/ui.jsx';
import { detectMode, getStatus, login, logout, onStatus, resetDemoData } from './data/store.js';
import Dashboard from './pages/Dashboard.jsx';
import Patients from './pages/Patients.jsx';
import NewPatient from './pages/NewPatient.jsx';
import PatientProfile from './pages/PatientProfile.jsx';
import Placeholder from './pages/Placeholder.jsx';

export const CLINIC_NAME = '[Clinic name]';

const NAV = [
  { to: '/', label: 'Dashboard', icon: 'grid' },
  { to: '/patients', label: 'Patients', icon: 'users' },
  { to: '/appointments', label: 'Appointments', icon: 'calendar' },
  { to: '/billing', label: 'Billing', icon: 'bill' },
  { to: '/reports', label: 'Reports', icon: 'chart' },
  { to: '/staff', label: 'Staff', icon: 'staff' },
];

function Sidebar({ open, onNavigate }) {
  const loc = useLocation();
  const nav = useNavigate();
  const isActive = (to) => (to === '/' ? loc.pathname === '/' : loc.pathname.startsWith(to));
  return (
    <aside className={'sidebar' + (open ? ' open' : '')}>
      <div className="aurora" />
      <div className="brand">
        <motion.div className="brand-logo" initial={{ rotate: -90, scale: 0 }} animate={{ rotate: 0, scale: 1 }} transition={{ type: 'spring', stiffness: 200, damping: 14, delay: 0.1 }}>
          <Icon name="tooth" size={22} color="#fff" />
        </motion.div>
        <div>
          <b>{CLINIC_NAME}</b>
          <small>Admin</small>
        </div>
      </div>
      {NAV.map((n, i) => (
        <motion.div key={n.to} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15 + i * 0.05 }}>
          <NavLink to={n.to} end={n.to === '/'} className={'nav-item' + (isActive(n.to) ? ' active' : '')} onClick={onNavigate}>
            {isActive(n.to) && <motion.div layoutId="navpill" className="nav-pill" transition={{ type: 'spring', stiffness: 380, damping: 30 }} />}
            <Icon name={n.icon} />
            {n.label}
          </NavLink>
        </motion.div>
      ))}
      <motion.button
        className="btn-new"
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.97 }}
        onClick={() => {
          nav('/patients/new');
          onNavigate();
        }}
      >
        <Icon name="plus" /> New patient
      </motion.button>
      <SidebarFoot />
    </aside>
  );
}

function useDbStatus() {
  const [s, setS] = useState(getStatus());
  useEffect(() => {
    const off = onStatus(setS);
    detectMode();
    return off;
  }, []);
  return s;
}

function SidebarFoot() {
  const s = useDbStatus();
  if (s.mode === 'database')
    return (
      <div className="sidebar-foot">
        <span className={'db-dot' + (s.db === 'connected' ? ' on' : '')} /> {s.db === 'connected' ? 'Connected to database' : 'Database ' + (s.db || 'offline')}
        {s.auth && (
          <>
            {' · '}
            <button onClick={logout}>Log out</button>
          </>
        )}
      </div>
    );
  return (
    <div className="sidebar-foot">
      Demo mode: data is stored in this browser.{' '}
      <button
        onClick={() => {
          resetDemoData();
          location.reload();
        }}
      >
        Reset
      </button>
    </div>
  );
}

// Shows server errors from the data layer as toasts.
function ErrorToasts() {
  const toast = useToast();
  useEffect(() => {
    const fn = (e) => toast(e.detail);
    window.addEventListener('dc-error', fn);
    return () => window.removeEventListener('dc-error', fn);
  }, [toast]);
  return null;
}

function Login() {
  const [pw, setPw] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setErr('');
    try {
      await login(pw);
      location.reload();
    } catch (x) {
      setErr(x.message);
      setBusy(false);
    }
  }
  return (
    <div className="splash">
      <motion.form
        onSubmit={submit}
        className="card login-card"
        initial={{ opacity: 0, y: 24, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: 'spring', stiffness: 220, damping: 22 }}
      >
        <div className="brand-logo" style={{ margin: '0 auto 14px', width: 52, height: 52 }}>
          <Icon name="tooth" size={26} color="#fff" />
        </div>
        <h2 style={{ margin: '0 0 4px', textAlign: 'center' }}>{CLINIC_NAME}</h2>
        <div className="muted small" style={{ textAlign: 'center', marginBottom: 18 }}>Enter the clinic password to open patient records.</div>
        <div className="field">
          <label htmlFor="pw">Password</label>
          <input id="pw" className={'input' + (err ? ' err' : '')} type="password" autoFocus autoComplete="current-password" value={pw} onChange={(e) => setPw(e.target.value)} />
          {err && <span className="small" style={{ color: 'var(--red)', fontWeight: 600 }}>{err}</span>}
        </div>
        <button className="btn btn-primary" style={{ width: '100%', marginTop: 14 }} disabled={busy || !pw}>
          {busy ? 'Checking…' : 'Log in'}
        </button>
      </motion.form>
    </div>
  );
}

function Splash({ done }) {
  return (
    <motion.div className="splash" initial={{ opacity: 1 }} exit={{ opacity: 0, transition: { duration: 0.5 } }}>
      <div style={{ textAlign: 'center' }}>
        <motion.div
          initial={{ scale: 0.4, opacity: 0, rotate: -20 }}
          animate={{ scale: 1, opacity: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 160, damping: 12 }}
          style={{ width: 84, height: 84, margin: '0 auto', borderRadius: 24, display: 'grid', placeItems: 'center', background: 'linear-gradient(135deg,#14a39c,#0e6e6b)', boxShadow: '0 20px 60px -10px rgba(20,163,156,.8)' }}
        >
          <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <motion.path
              d="M7 3c-2.5 0-4 2-4 4.5 0 2 .7 3.3 1.3 5 .6 1.8.7 4 1.2 6 .3 1.3.8 2.5 1.8 2.5 1.3 0 1.5-2 1.9-3.8.3-1.4.8-2.7 1.8-2.7s1.5 1.3 1.8 2.7c.4 1.8.6 3.8 1.9 3.8 1 0 1.5-1.2 1.8-2.5.5-2 .6-4.2 1.2-6 .6-1.7 1.3-3 1.3-5C21 5 19.5 3 17 3c-1.8 0-2.8 1-5 1S8.8 3 7 3z"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 1, ease: 'easeInOut' }}
              onAnimationComplete={done}
            />
          </svg>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} style={{ color: '#fff', fontWeight: 800, fontSize: 20, marginTop: 18 }}>
          {CLINIC_NAME}
        </motion.div>
      </div>
    </motion.div>
  );
}

export default function App() {
  const location = useLocation();
  const [menu, setMenu] = useState(false);
  const [splash, setSplash] = useState(() => !sessionStorage.getItem('splashed'));
  const status = useDbStatus();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  return (
    <ToastProvider>
      <ErrorToasts />
      {!splash && status.mode === 'database' && !status.loggedIn && <Login />}
      <AnimatePresence>
        {splash && (
          <Splash
            done={() =>
              setTimeout(() => {
                sessionStorage.setItem('splashed', '1');
                setSplash(false);
              }, 350)
            }
          />
        )}
      </AnimatePresence>
      <div className="app">
        <Sidebar open={menu} onNavigate={() => setMenu(false)} />
        <main className="main">
          <div className="mobile-top">
            <b>{CLINIC_NAME}</b>
            <button className="btn" onClick={() => setMenu((m) => !m)} aria-label="Menu">
              <Icon name="menu" />
            </button>
          </div>
          {!splash && status.mode !== 'checking' && status.loggedIn && (
            <AnimatePresence mode="wait">
              <Routes location={location} key={location.pathname}>
                <Route path="/" element={<Page><Dashboard /></Page>} />
                <Route path="/patients" element={<Page><Patients /></Page>} />
                <Route path="/patients/new" element={<Page><NewPatient /></Page>} />
                <Route path="/patients/:id" element={<Page><PatientProfile /></Page>} />
                <Route path="/appointments" element={<Page><Placeholder title="Appointments" icon="calendar" /></Page>} />
                <Route path="/billing" element={<Page><Placeholder title="Billing" icon="bill" /></Page>} />
                <Route path="/reports" element={<Page><Placeholder title="Reports" icon="chart" /></Page>} />
                <Route path="/staff" element={<Page><Placeholder title="Staff" icon="staff" /></Page>} />
                <Route path="*" element={<Page><Placeholder title="Page not found" icon="tooth" /></Page>} />
              </Routes>
            </AnimatePresence>
          )}
        </main>
      </div>
    </ToastProvider>
  );
}
