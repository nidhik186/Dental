// Demo data so the app looks alive before the database is connected.

const basic = (id, name, gender, dob, phone, extra = {}) => ({
  id,
  name,
  gender,
  dob,
  phone,
  email: '',
  occupation: '',
  address: '',
  emergency: { name: '', relation: '', phone: '' },
  referredBy: '',
  medical: { conditions: [], allergies: '', medications: '', bloodGroup: 'Unknown', surgeries: '', physician: '' },
  dental: { complaint: '', lastVisit: '', brushing: '', pain: 0, history: [] },
  chart: {},
  gums: 'Healthy',
  hygiene: 'Good',
  notes: '',
  consents: { confirmed: true, examination: true, reminders: true },
  status: 'Active treatment',
  // New patients are dated to the current month so the dashboard KPI has data.
  since: extra.status === 'New' ? new Date().toISOString().slice(0, 8) + '02' : '2026-09-12',
  plan: [],
  paid: 0,
  visits: [],
  files: [],
  ...extra,
});

export const seedPatients = [
  basic('PT-00124', 'Ananya Sharma', 'Female', '1992-03-14', '+91 98200 00000', {
    email: 'ananya@example.com',
    occupation: 'Architect',
    address: '[Street, area], Pune 411001',
    emergency: { name: 'Rohit Sharma', relation: 'Spouse', phone: '+91 98200 00001' },
    referredBy: 'Friend / family',
    medical: {
      conditions: ['Diabetes', 'High blood pressure'],
      allergies: 'Penicillin',
      medications: 'Metformin 500 mg, twice daily; Amlodipine 5 mg',
      bloodGroup: 'B+',
      surgeries: '',
      physician: '',
    },
    dental: {
      complaint: 'Pain on lower left while chewing',
      lastVisit: 'More than 2 years',
      brushing: 'Once a day',
      pain: 7,
      history: ['Fillings', 'Teeth grinding'],
    },
    chart: { 18: 'M', 16: 'C', 14: 'F', 26: 'F', 48: 'M', 46: 'R', 36: 'D', 37: 'D' },
    toothNotes: {
      46: 'Deep decay into the nerve. Root canal in progress (2 of 3 sittings), zirconia crown to follow.',
      36: 'Occlusal decay, composite filling planned.',
      37: 'Proximal decay, composite filling planned.',
      16: 'Old PFM crown, margins intact.',
    },
    gums: 'Mild gingivitis',
    hygiene: 'Fair',
    habits: 'Teeth grinding at night',
    since: '2026-10-28',
    plan: [
      { tooth: 'All', procedure: 'Scaling & polishing', status: 'Done', cost: 1200 },
      { tooth: '46', procedure: 'Root canal treatment', sub: 'Sitting 2 of 3', status: 'In progress', cost: 6500 },
      { tooth: '46', procedure: 'Zirconia crown', status: 'Planned', cost: 9000 },
      { tooth: '36', procedure: 'Composite filling', status: 'Planned', cost: 1800 },
      { tooth: '37', procedure: 'Composite filling', status: 'Planned', cost: 1800 },
    ],
    paid: 6000,
    nextAppt: { date: '2026-11-27', time: '11:30 AM', what: 'RCT sitting 3 (obturation) · tooth 46 · 45 min' },
    visits: [
      { date: '2026-11-12', doctor: 'Dr. Nidhi Khandelwal', title: 'RCT sitting 2 on tooth 46', text: 'Canals cleaned and shaped, medicated dressing placed. Pain reduced from 7 to 2.' },
      { date: '2026-11-05', doctor: 'Dr. Nidhi Khandelwal', title: 'RCT sitting 1 on 46 + IOPA X-ray', text: 'Access opening and pulp extirpation. Antibiotic prescribed (non-penicillin).' },
      { date: '2026-10-28', doctor: 'Dr. Nidhi Khandelwal', title: 'First visit: examination, OPG, scaling', text: 'Complaint: pain on lower left while chewing. Decay found on 36, 37 and deep decay on 46.' },
    ],
    files: [
      { name: 'OPG X-ray', date: '2026-10-28', kind: 'opg' },
      { name: 'IOPA · tooth 46', date: '2026-11-05', kind: 'iopa' },
    ],
  }),
  basic('PT-00098', 'Rahul Verma', 'Male', '1985-07-02', '+91 98111 22334', {
    plan: [{ tooth: 'All', procedure: 'Scaling & polishing', status: 'Done', cost: 1200 }],
    paid: 1200,
    status: 'Recall',
  }),
  basic('PT-00117', 'Meera Joshi', 'Female', '1990-11-21', '+91 99870 11223', {
    chart: { 26: 'F' },
    plan: [{ tooth: '26', procedure: 'Composite filling', status: 'Done', cost: 1800 }],
    paid: 1800,
  }),
  basic('PT-00061', 'Farhan Ali', 'Male', '1979-04-18', '+91 98450 77812', {
    chart: { 38: 'M' },
    plan: [{ tooth: '38', procedure: 'Extraction', status: 'Done', cost: 2500 }],
    paid: 2500,
  }),
  basic('PT-00130', 'Sneha Pillai', 'Female', '1996-01-09', '+91 97690 44110', { status: 'New' }),
  basic('PT-00089', 'Kavita Rao', 'Female', '1988-06-30', '+91 98201 33445', {
    chart: { 15: 'D' },
    plan: [{ tooth: '15', procedure: 'Composite filling', status: 'Planned', cost: 1800 }],
  }),
  basic('PT-00131', 'Imran Shaikh', 'Male', '1993-09-12', '+91 90040 55667', { status: 'New' }),
  basic('PT-00102', 'Pooja Nair', 'Female', '1999-02-25', '+91 98330 66778', {
    plan: [{ tooth: 'All', procedure: 'Clear aligners', sub: 'Month 4 of 12', status: 'In progress', cost: 85000 }],
    paid: 60000,
  }),
  basic('PT-00077', 'Vikram Singh', 'Male', '1975-12-05', '+91 98190 88990', {
    chart: { 36: 'C' },
    plan: [{ tooth: '36', procedure: 'Zirconia crown', status: 'In progress', cost: 9000 }],
    paid: 4500,
  }),
  basic('PT-00132', 'Riya Gupta', 'Female', '2018-08-14', '+91 98670 12121', { status: 'New' }),
  basic('PT-00045', 'Suresh Patil', 'Male', '1968-03-03', '+91 98220 45454', {
    plan: [{ tooth: '46', procedure: 'Implant, stage 1', status: 'In progress', cost: 32000 }],
    paid: 20000,
  }),
  basic('PT-00052', 'Neha Kulkarni', 'Female', '1997-10-10', '+91 98500 78787', {
    plan: [{ tooth: 'All', procedure: 'Aligners, month 3', status: 'In progress', cost: 70000 }],
    paid: 60500,
  }),
  basic('PT-00066', 'Arjun Desai', 'Male', '1983-05-27', '+91 98900 32323', {
    plan: [{ tooth: '24–26', procedure: 'Bridge 24–26', status: 'In progress', cost: 21000 }],
    paid: 13200,
  }),
];

export const seedAppointments = [
  { id: 'a1', time: '09:30', patientId: 'PT-00098', name: 'Rahul Verma', procedure: 'Scaling & polishing', doctor: 'Dr. Iyer', chair: 'C2', status: 'Done' },
  { id: 'a2', time: '10:00', patientId: 'PT-00117', name: 'Meera Joshi', procedure: 'Composite filling 26', doctor: 'Dr. Mehta', chair: 'C1', status: 'Done' },
  { id: 'a3', time: '10:45', patientId: 'PT-00061', name: 'Farhan Ali', procedure: 'Extraction 38', doctor: 'Dr. Mehta', chair: 'C1', status: 'Done' },
  { id: 'a4', time: '11:30', patientId: 'PT-00130', name: 'Sneha Pillai', procedure: 'Consultation', doctor: 'Dr. Iyer', chair: 'C2', status: 'No-show' },
  { id: 'a5', time: '12:30', patientId: 'PT-00124', name: 'Ananya Sharma', procedure: 'RCT sitting 2 · 46', doctor: 'Dr. Mehta', chair: 'C1', status: 'In chair' },
  { id: 'a6', time: '13:00', patientId: 'PT-00089', name: 'Kavita Rao', procedure: 'Composite filling 15', doctor: 'Dr. Iyer', chair: 'C2', status: 'Waiting', waitingSince: Date.now() - 12 * 60000 },
  { id: 'a7', time: '13:15', patientId: 'PT-00131', name: 'Imran Shaikh', procedure: 'Consultation', doctor: 'Dr. Iyer', chair: 'C2', status: 'Waiting', waitingSince: Date.now() - 4 * 60000 },
  { id: 'a8', time: '14:00', patientId: 'PT-00102', name: 'Pooja Nair', procedure: 'Aligner check', doctor: 'Dr. Iyer', chair: 'C2', status: 'Booked' },
  { id: 'a9', time: '15:30', patientId: 'PT-00077', name: 'Vikram Singh', procedure: 'Crown fitting 36', doctor: 'Dr. Mehta', chair: 'C1', status: 'Booked' },
  { id: 'a10', time: '16:15', patientId: 'PT-00132', name: 'Riya Gupta', procedure: 'Kids check-up', doctor: 'Dr. Iyer', chair: 'C2', status: 'Booked' },
];

export const seedCollections = [
  { day: 'Wed', amount: 14200 },
  { day: 'Thu', amount: 16800 },
  { day: 'Fri', amount: 21500 },
  { day: 'Sat', amount: 24100 },
  { day: 'Sun', amount: 0 },
  { day: 'Mon', amount: 13700 },
  { day: 'Tue', amount: 18400 },
];
