import { motion } from 'framer-motion';

export const UPPER = [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28];
export const LOWER = [48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38];

export const FINDINGS = [
  { code: 'D', label: 'Decay', color: '#b4231b' },
  { code: 'F', label: 'Filled', color: '#2b56c6' },
  { code: 'C', label: 'Crown', color: '#a36a00' },
  { code: 'R', label: 'Root canal', color: '#6b3fd1' },
  { code: 'M', label: 'Missing', color: '#7b8c90' },
];
export const findingLabel = (c) => FINDINGS.find((f) => f.code === c)?.label || 'Healthy';

function Tooth({ n, code, lower, selected, onClick, index }) {
  return (
    <motion.button
      type="button"
      className={`tooth ${lower ? 'lower' : ''} ${code ? 't-' + code : ''} ${selected ? 'sel' : ''}`}
      onClick={() => onClick?.(n)}
      initial={{ opacity: 0, y: lower ? 14 : -14, scale: 0.8 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: 0.15 + index * 0.025, type: 'spring', stiffness: 260, damping: 18 }}
      whileHover={{ y: lower ? 3 : -3, scale: 1.06 }}
      whileTap={{ scale: 0.9 }}
      title={`Tooth ${n}: ${findingLabel(code)}`}
    >
      <span>{n}</span>
      {code && (
        <motion.span key={code} className="code" initial={{ scale: 0, rotate: -30 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 500, damping: 15 }}>
          {code}
        </motion.span>
      )}
    </motion.button>
  );
}

function Jaw({ teeth, lower, chart, selected, onTooth }) {
  const left = teeth.slice(0, 8);
  const right = teeth.slice(8);
  return (
    <div className="jaw">
      {left.map((n, i) => (
        <Tooth key={n} n={n} index={i + (lower ? 16 : 0)} lower={lower} code={chart[n]} selected={selected === n} onClick={onTooth} />
      ))}
      <div className="mid" />
      {right.map((n, i) => (
        <Tooth key={n} n={n} index={i + 8 + (lower ? 16 : 0)} lower={lower} code={chart[n]} selected={selected === n} onClick={onTooth} />
      ))}
    </div>
  );
}

export default function ToothChart({ chart = {}, selected, onTooth, labels = true }) {
  return (
    <div className="chart-box">
      {labels && <div className="jaw-label">UPPER</div>}
      <Jaw teeth={UPPER} chart={chart} selected={selected} onTooth={onTooth} />
      <div style={{ height: 2, background: 'var(--line)', margin: '8px auto', maxWidth: 780, borderRadius: 2 }} />
      <Jaw teeth={LOWER} lower chart={chart} selected={selected} onTooth={onTooth} />
      {labels && <div className="jaw-label">LOWER</div>}
    </div>
  );
}
