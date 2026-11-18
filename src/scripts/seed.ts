/**
 * Resets the database with demo data:
 *   - the demo admin (admin@doctortracker.com / Admin@12345)
 *   - ~50 doctors across 10 specializations and 8 hospitals
 *   - ~600 patients admitted over the last 14 months
 *
 * Usage: npm run seed
 * Uses a fixed random seed so every run produces the same data set.
 */
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { connectDB } from '../config/db';
import { env } from '../config/env';
import { UserModel } from '../models/User';
import { DoctorModel } from '../models/Doctor';
import { recountPatientCounts } from '../services/doctor.service';
import { PatientModel, type CONDITIONS, type STATUSES } from '../models/Patient';

// ---------- tiny deterministic PRNG (mulberry32) ----------
let state = 20261120;
function rand() {
  state |= 0;
  state = (state + 0x6d2b79f5) | 0;
  let t = Math.imul(state ^ (state >>> 15), 1 | state);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
const int = (min: number, max: number) => Math.floor(rand() * (max - min + 1)) + min;
const pick = <T>(arr: readonly T[]): T => arr[Math.floor(rand() * arr.length)];
const chance = (p: number) => rand() < p;

// ---------- reference data ----------
type Condition = (typeof CONDITIONS)[number];
type Status = (typeof STATUSES)[number];

const HOSPITALS = [
  { name: 'Square Hospital, Dhaka', domain: 'squarehospital.com' },
  { name: 'Evercare Hospital Dhaka', domain: 'evercarebd.com' },
  { name: 'United Hospital', domain: 'uhlbd.com' },
  { name: 'Labaid Specialized Hospital', domain: 'labaidgroup.com' },
  { name: 'Ibn Sina Hospital, Dhanmondi', domain: 'ibnsinatrust.com' },
  { name: 'BIRDEM General Hospital', domain: 'birdembd.org' },
  { name: 'Dhaka Medical College Hospital', domain: 'dmch.gov.bd' },
  { name: 'Popular Medical College Hospital', domain: 'populardiagnostic.com' },
];

const SPECIALIZATIONS: { name: string; conditions: Condition[]; ages: [number, number] }[] = [
  { name: 'Cardiology', conditions: ['Cardiac', 'Cardiac', 'Hypertension'], ages: [38, 82] },
  { name: 'Neurology', conditions: ['Neurological'], ages: [20, 80] },
  { name: 'Orthopedics', conditions: ['Orthopedic'], ages: [12, 78] },
  { name: 'Pediatrics', conditions: ['Pediatric', 'Pediatric', 'Asthma', 'General'], ages: [0, 15] },
  { name: 'Dermatology', conditions: ['Dermatology'], ages: [14, 65] },
  { name: 'Endocrinology', conditions: ['Diabetes', 'Diabetes', 'Hypertension'], ages: [25, 75] },
  { name: 'Pulmonology', conditions: ['Respiratory', 'Asthma'], ages: [18, 80] },
  { name: 'Gastroenterology', conditions: ['General'], ages: [18, 75] },
  { name: 'Internal Medicine', conditions: ['General', 'Hypertension', 'Diabetes'], ages: [18, 85] },
  { name: 'ENT', conditions: ['Respiratory', 'General'], ages: [5, 70] },
];

const MALE_FIRST = [
  'Rafiqul', 'Mahmudul', 'Tanvir', 'Shafiqur', 'Kamrul', 'Arif', 'Nazmul', 'Sajid', 'Imran', 'Fahim',
  'Rezaul', 'Habibur', 'Mizanur', 'Ashraful', 'Saiful', 'Tariq', 'Zahid', 'Mehedi', 'Raihan', 'Abdullah',
];
const FEMALE_FIRST = [
  'Nusrat', 'Farhana', 'Tahmina', 'Sharmin', 'Nasrin', 'Sabrina', 'Rumana', 'Ayesha', 'Fatema', 'Shirin',
  'Tasnim', 'Jannatul', 'Sadia', 'Mahmuda', 'Rokeya', 'Laila', 'Nadia', 'Afroza', 'Sumaiya', 'Ishrat',
];
const LAST = [
  'Rahman', 'Hossain', 'Ahmed', 'Islam', 'Chowdhury', 'Khan', 'Uddin', 'Alam', 'Sarkar', 'Talukder',
  'Haque', 'Karim', 'Siddiqui', 'Mia', 'Bhuiyan', 'Das', 'Roy', 'Majumder',
];
// used as surnames by women only
const FEMALE_LAST = ['Akter', 'Begum', 'Khatun'];

const NOTES: Record<Condition, string[]> = {
  Hypertension: [
    'BP 160/100 on admission. Started on amlodipine, advised low-salt diet.',
    'Known hypertensive, missed medication for two weeks. Monitoring BP twice daily.',
    'Headache and dizziness. BP controlled after dose adjustment.',
  ],
  Diabetes: [
    'Type 2 diabetes, HbA1c 9.1%. Switched to basal insulin.',
    'Fasting glucose 14 mmol/L. Diet counselling done, metformin increased.',
    'Diabetic foot ulcer on left heel, dressing daily.',
  ],
  Asthma: [
    'Acute exacerbation after dust exposure. Nebulised salbutamol, improving.',
    'Night-time wheeze. Inhaler technique reviewed, started on preventer.',
  ],
  Cardiac: [
    'Chest pain radiating to left arm. ECG shows ST changes, troponin pending.',
    'Post angioplasty follow-up. On dual antiplatelet therapy.',
    'Shortness of breath on exertion, echo shows reduced EF.',
  ],
  Orthopedic: [
    'Fracture of right radius after a fall. Cast applied, review in 6 weeks.',
    'Chronic lower back pain, MRI shows L4-L5 disc bulge. Physiotherapy started.',
    'Knee osteoarthritis, planned for intra-articular injection.',
  ],
  Respiratory: [
    'Community acquired pneumonia. On IV antibiotics, oxygen 2L.',
    'Persistent cough for 3 weeks. Chest X-ray clear, sputum test sent.',
    'COPD exacerbation, steroids started.',
  ],
  Neurological: [
    'Recurrent migraine with aura. Started on prophylaxis.',
    'Transient weakness of right arm. CT brain normal, MRI scheduled.',
    'Seizure episode at home. EEG requested, started on levetiracetam.',
  ],
  Dermatology: [
    'Eczema flare on both forearms. Topical steroid prescribed.',
    'Fungal skin infection, oral antifungal for 4 weeks.',
    'Psoriasis plaques on elbows, phototherapy discussed.',
  ],
  Pediatric: [
    'High fever for 3 days, dengue NS1 negative. Paracetamol and fluids.',
    'Routine growth check, vaccination schedule up to date.',
    'Acute watery diarrhoea, ORS given, mild dehydration.',
  ],
  General: [
    'Routine check-up. Blood tests ordered.',
    'Abdominal pain and acidity. Started on omeprazole.',
    'Fatigue and weight loss, thyroid panel requested.',
  ],
};

// ---------- helpers ----------
const DAY = 24 * 60 * 60 * 1000;
const now = Date.now();
const monthsAgo = (m: number) => now - m * 30 * DAY;

function bdPhone() {
  const op = pick(['13', '14', '15', '16', '17', '18', '19']);
  return `+880 1${op.slice(1)}${int(10, 99)}-${String(int(0, 999999)).padStart(6, '0')}`;
}

const usedEmails = new Set<string>();
function uniqueEmail(local: string, domain: string) {
  let candidate = `${local}@${domain}`;
  for (let n = 2; usedEmails.has(candidate); n++) candidate = `${local}${n}@${domain}`;
  usedEmails.add(candidate);
  return candidate;
}

function personName(gender: 'male' | 'female') {
  if (gender === 'male') return { first: pick(MALE_FIRST), last: pick(LAST) };
  return { first: pick(FEMALE_FIRST), last: chance(0.25) ? pick(FEMALE_LAST) : pick(LAST) };
}

function statusFor(admittedAt: number): Status {
  const days = (now - admittedAt) / DAY;
  if (days < 7) return pick(['admitted', 'admitted', 'under_treatment']);
  if (days < 45) return pick(['admitted', 'under_treatment', 'under_treatment', 'recovered']);
  return pick(['under_treatment', 'recovered', 'recovered', 'discharged', 'discharged']);
}

// ---------- seed ----------
async function seed() {
  if (env.isProd && !process.argv.includes('--force')) {
    throw new Error('Refusing to seed with NODE_ENV=production (pass --force to override)');
  }

  await connectDB();
  console.log('Connected, clearing collections...');

  await Promise.all([UserModel.deleteMany({}), DoctorModel.deleteMany({}), PatientModel.deleteMany({})]);
  await Promise.all([UserModel.syncIndexes(), DoctorModel.syncIndexes(), PatientModel.syncIndexes()]);

  await UserModel.create({
    name: 'Admin',
    email: 'admin@doctortracker.com',
    password: await bcrypt.hash('Admin@12345', 10),
    role: 'admin',
  });

  // 50 doctors: 5 per specialization, spread over 8 hospitals, joined over the last 14 months
  const doctorDocs = SPECIALIZATIONS.flatMap((spec) =>
    Array.from({ length: 5 }, () => {
      const gender = chance(0.45) ? 'female' : 'male';
      const { first, last } = personName(gender);
      const hospital = pick(HOSPITALS);
      // most doctors were onboarded early, a few joined recently
      const createdAt = new Date(chance(0.7) ? monthsAgo(int(11, 14)) - int(0, 20) * DAY : monthsAgo(int(0, 10)) - int(0, 25) * DAY);
      return {
        name: `Dr. ${first} ${last}`,
        specialization: spec.name,
        hospital: hospital.name,
        phone: bdPhone(),
        email: uniqueEmail(`${first}.${last}`.toLowerCase(), hospital.domain),
        createdAt,
        updatedAt: createdAt,
      };
    }),
  );
  const doctors = await DoctorModel.insertMany(doctorDocs);
  console.log(`Inserted ${doctors.length} doctors`);

  // ~600 patients; some doctors are busier than others, and a doctor who joined
  // last month shouldn't have as many patients as one who has been here a year
  const fourteenMonths = now - monthsAgo(14);
  const weights = doctors.map((d) => {
    const tenure = Math.min(1, (now - d.createdAt.getTime()) / fourteenMonths);
    return (0.3 + rand() * 1.7) * Math.max(0.05, tenure);
  });
  const totalWeight = weights.reduce((a, b) => a + b, 0);
  const specByName = new Map(SPECIALIZATIONS.map((s) => [s.name, s]));

  const patientDocs = doctors.flatMap((doctor, i) => {
    const count = Math.round((weights[i] / totalWeight) * 600);
    const spec = specByName.get(doctor.specialization)!;
    const earliest = Math.max(doctor.createdAt.getTime(), monthsAgo(14));

    return Array.from({ length: count }, () => {
      const gender = chance(0.03) ? 'other' : chance(0.5) ? 'female' : 'male';
      const { first, last } = personName(gender === 'other' ? pick(['male', 'female']) : gender);
      const condition = pick(spec.conditions);
      const admittedAt = earliest + rand() * (now - earliest);
      const admissionDate = new Date(admittedAt);

      return {
        name: `${first} ${last}`,
        age: int(spec.ages[0], spec.ages[1]),
        gender,
        phone: bdPhone(),
        ...(chance(0.6) && { email: uniqueEmail(`${first}.${last}`.toLowerCase(), pick(['gmail.com', 'yahoo.com', 'outlook.com'])) }),
        condition,
        status: statusFor(admittedAt),
        admissionDate,
        ...(chance(0.75) && { notes: pick(NOTES[condition]) }),
        doctor: doctor._id,
        createdAt: admissionDate,
        updatedAt: admissionDate,
      };
    });
  });
  await PatientModel.insertMany(patientDocs);
  console.log(`Inserted ${patientDocs.length} patients`);

  const r = await recountPatientCounts();
  console.log('patientCount set for', r.doctorsWithPatients, 'doctors');
  console.log('Demo login: admin@doctortracker.com / Admin@12345');
}

seed()
  .catch((err) => {
    console.error('Seed failed:', err);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
