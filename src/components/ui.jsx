import { createContext, forwardRef, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { animate, AnimatePresence, motion, useMotionValue, useSpring, useTransform } from 'framer-motion';

// ---------- Icons (inline, stroke-based) ----------
const paths = {
  tooth: 'M7 3c-2.5 0-4 2-4 4.5 0 2 .7 3.3 1.3 5 .6 1.8.7 4 1.2 6 .3 1.3.8 2.5 1.8 2.5 1.3 0 1.5-2 1.9-3.8.3-1.4.8-2.7 1.8-2.7s1.5 1.3 1.8 2.7c.4 1.8.6 3.8 1.9 3.8 1 0 1.5-1.2 1.8-2.5.5-2 .6-4.2 1.2-6 .6-1.7 1.3-3 1.3-5C21 5 19.5 3 17 3c-1.8 0-2.8 1-5 1S8.8 3 7 3z',
  grid: 'M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z',
  users: 'M16 19v-1a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v1M9 10a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7M22 19v-1a4 4 0 0 0-3-3.9M16 3.1a3.5 3.5 0 0 1 0 6.8',
  calendar: 'M4 6h16v14H4zM4 10h16M8 3v4M16 3v4',
  bill: 'M6 3h12v18l-3-2-3 2-3-2-3 2zM9 8h6M9 12h6M9 16h3',
  chart: 'M4 20h16M7 16v-5M12 16V7M17 16v-8',
  staff: 'M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8M4 21v-1a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v1',
  plus: 'M12 5v14M5 12h14',
  search: 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14M21 21l-4.3-4.3',
  arrowUp: 'M12 19V5M6 11l6-6 6 6',
  arrowLeft: 'M19 12H5M11 18l-6-6 6-6',
  alert: 'M12 3 2 20h20zM12 10v4M12 17h.01',
  upload: 'M12 16V4M7 9l5-5 5 5M4 20h16',
  file: 'M14 3H6v18h12V7zM14 3v4h4',
  check: 'M5 12l5 5 9-10',
  x: 'M6 6l12 12M18 6 6 18',
  menu: 'M4 7h16M4 12h16M4 17h16',
  sparkle: 'M12 3l2 6 6 2-6 2-2 6-2-6-6-2 6-2z',
  bell: 'M6 16V11a6 6 0 1 1 12 0v5l2 2H4zM10 21h4',
  phone: 'M5 4h4l2 5-3 2a11 11 0 0 0 5 5l2-3 5 2v4a2 2 0 0 1-2 2A17 17 0 0 1 3 6a2 2 0 0 1 2-2',
  settings: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-2.9 1.2V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-2.9-1.2l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1A1.7 1.7 0 0 0 3 15H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.2-2.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1A1.7 1.7 0 0 0 10 4V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 2.9 1.2l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1A1.7 1.7 0 0 0 21 10h.1a2 2 0 1 1 0 4H21a1.7 1.7 0 0 0-1.6 1',
};

export function Icon({ name, size = 18, stroke = 2, ...rest }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" {...rest}>
      <path d={paths[name]} />
    </svg>
  );
}

// ---------- Count-up number ----------
export function CountUp({ value, prefix = '', format = 'en-IN', duration = 1.4 }) {
  const ref = useRef(null);
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const controls = animate(0, value, {
      duration,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => (node.textContent = prefix + Math.round(v).toLocaleString(format)),
    });
    return () => controls.stop();
  }, [value]);
  return <span ref={ref}>{prefix}0</span>;
}

// ---------- 3D tilt card with cursor spotlight ----------
export function TiltCard({ children, className = '', style, delay = 0, ...rest }) {
  const x = useMotionValue(0.5);
  const y = useMotionValue(0.5);
  const rx = useSpring(useTransform(y, [0, 1], [6, -6]), { stiffness: 200, damping: 20 });
  const ry = useSpring(useTransform(x, [0, 1], [-6, 6]), { stiffness: 200, damping: 20 });
  const bg = useTransform([x, y], ([a, b]) => `radial-gradient(260px circle at ${a * 100}% ${b * 100}%, rgba(20,163,156,0.13), transparent 70%)`);
  return (
    <motion.div
      className={'card ' + className}
      style={{ ...style, rotateX: rx, rotateY: ry, transformPerspective: 900 }}
      initial={{ opacity: 0, y: 24, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      onMouseMove={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        x.set((e.clientX - r.left) / r.width);
        y.set((e.clientY - r.top) / r.height);
      }}
      onMouseLeave={() => {
        x.set(0.5);
        y.set(0.5);
      }}
      {...rest}
    >
      <motion.div style={{ position: 'absolute', inset: 0, borderRadius: 'inherit', background: bg, pointerEvents: 'none' }} />
      {children}
    </motion.div>
  );
}

// ---------- Simple fade-up card ----------
export const Card = forwardRef(function Card({ children, className = '', delay = 0, ...rest }, ref) {
  return (
    <motion.div
      ref={ref}
      className={'card ' + className}
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
      {...rest}
    >
      {children}
    </motion.div>
  );
});

// ---------- Status badge ----------
const badgeClass = {
  Done: 'b-done',
  'No-show': 'b-noshow',
  'In chair': 'b-chair',
  Waiting: 'b-wait',
  Booked: 'b-booked',
  'In progress': 'b-progress',
  Planned: 'b-planned',
  Busy: 'b-chair',
  Free: 'b-done',
  Prep: 'b-wait',
  'Active treatment': 'b-done',
  New: 'b-chair',
  Recall: 'b-wait',
};
export function Badge({ children, dot }) {
  return (
    <motion.span layout className={'badge ' + (badgeClass[children] || 'b-booked')}>
      {dot && <span className="dot" />}
      {children}
    </motion.span>
  );
}

// ---------- Sparkline (animated draw) ----------
export function Sparkline({ data, color = '#14a39c', width = 120, height = 44, delay = 0.4 }) {
  if (!data || data.length < 2) return null;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const pts = data.map((v, i) => [(i / (data.length - 1)) * width, height - 4 - ((v - min) / (max - min || 1)) * (height - 8)]);
  const d = pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' ');
  const id = 'sg' + color.replace('#', '');
  return (
    <svg className="spark" width={width} height={height}>
      <defs>
        <linearGradient id={id} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.28" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <motion.path d={d + ` L${width} ${height} L0 ${height} Z`} fill={`url(#${id})`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: delay + 0.6, duration: 0.8 }} />
      <motion.path d={d} fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ delay, duration: 1.2, ease: 'easeInOut' }} />
    </svg>
  );
}

// ---------- Progress ring ----------
export function Ring({ pct, size = 36, stroke = 4 }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={size / 2} cy={size / 2} r={r} stroke="#e3eaeb" strokeWidth={stroke} fill="none" />
      <motion.circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        stroke="url(#ringg)"
        strokeWidth={stroke}
        fill="none"
        strokeLinecap="round"
        strokeDasharray={c}
        animate={{ strokeDashoffset: c * (1 - pct) }}
        transition={{ type: 'spring', stiffness: 80, damping: 18 }}
      />
      <defs>
        <linearGradient id="ringg">
          <stop offset="0%" stopColor="#0e6e6b" />
          <stop offset="100%" stopColor="#5fe0d0" />
        </linearGradient>
      </defs>
    </svg>
  );
}

// ---------- Toasts ----------
const ToastCtx = createContext(() => {});
export const useToast = () => useContext(ToastCtx);

export function ToastProvider({ children }) {
  const [items, setItems] = useState([]);
  const push = useCallback((text) => {
    const id = Math.random();
    setItems((s) => [...s, { id, text }]);
    setTimeout(() => setItems((s) => s.filter((t) => t.id !== id)), 3200);
  }, []);
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="toasts">
        <AnimatePresence>
          {items.map((t) => (
            <motion.div
              key={t.id}
              className="toast"
              initial={{ opacity: 0, x: 60, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 60, scale: 0.9 }}
              transition={{ type: 'spring', stiffness: 300, damping: 24 }}
            >
              <span style={{ width: 26, height: 26, borderRadius: 8, background: '#14a39c', display: 'grid', placeItems: 'center' }}>
                <Icon name="check" size={15} stroke={3} />
              </span>
              {t.text}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastCtx.Provider>
  );
}

// ---------- Modal ----------
export function Modal({ open, onClose, title, children }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div className="overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
          <motion.div
            className="modal"
            initial={{ opacity: 0, y: 40, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 260, damping: 24 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="row between" style={{ marginBottom: 6 }}>
              <h3 style={{ margin: 0 }}>{title}</h3>
              <button className="btn" style={{ padding: 8 }} onClick={onClose} aria-label="Close">
                <Icon name="x" size={16} />
              </button>
            </div>
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ---------- Page transition wrapper ----------
export function Page({ children }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 18, filter: 'blur(6px)' }}
      animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
      exit={{ opacity: 0, y: -12, filter: 'blur(6px)' }}
      transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>
  );
}
