import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Icon } from '../components/ui.jsx';

export default function Placeholder({ title, icon }) {
  return (
    <div className="empty-hero">
      <motion.div
        animate={{ y: [0, -10, 0], rotate: [0, 4, -4, 0] }}
        transition={{ repeat: Infinity, duration: 4, ease: 'easeInOut' }}
        style={{ width: 96, height: 96, margin: '0 auto 20px', borderRadius: 28, display: 'grid', placeItems: 'center', color: '#fff', background: 'linear-gradient(135deg,#14a39c,#0e6e6b)', boxShadow: '0 30px 60px -20px rgba(14,110,107,.7)' }}
      >
        <Icon name={icon} size={42} />
      </motion.div>
      <h1 style={{ margin: 0, fontSize: 30, letterSpacing: '-0.02em' }}>{title}</h1>
      <p className="muted">This screen is next on the list.</p>
      <Link to="/" className="btn btn-primary" style={{ marginTop: 10 }}>Back to dashboard</Link>
    </div>
  );
}
