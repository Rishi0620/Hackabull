import { MongoClient, ObjectId } from 'mongodb';
import 'dotenv/config';

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB || 'medmate';
if (!uri) { console.error('MONGODB_URI required'); process.exit(1); }

const HOUSEHOLD_CODE = '999999';

function daysAgo(n: number, h: number, m = 0): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(h, m, 0, 0);
  return d;
}

function today(h: number, m = 0): Date {
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d;
}

function tomorrow(h: number, m = 0): Date {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(h, m, 0, 0);
  return d;
}

// Simulate realistic take time: on time ±45 min, occasionally late by 2h
function takenAt(scheduled: Date, adherence: number): Date | null {
  if (Math.random() > adherence) return null; // missed
  const offsetMin = Math.floor((Math.random() - 0.4) * 90); // -36min to +54min skew
  const d = new Date(scheduled.getTime() + offsetMin * 60 * 1000);
  return d;
}

async function main() {
  const client = new MongoClient(uri!);
  await client.connect();
  const db = client.db(dbName);

  console.log('Wiping rich demo data...');
  const existingHousehold = await db.collection('households').findOne({ code: HOUSEHOLD_CODE });
  if (existingHousehold) {
    const hid = existingHousehold._id;
    await db.collection('members').deleteMany({ householdId: hid });
    await db.collection('medications').deleteMany({ householdId: hid });
    await db.collection('doses').deleteMany({ householdId: hid });
    await db.collection('households').deleteOne({ _id: hid });
  }

  const householdId = new ObjectId();
  await db.collection('households').insertOne({
    _id: householdId,
    code: HOUSEHOLD_CODE,
    name: 'The Martinez Family',
    createdAt: daysAgo(45, 10),
    preferredLanguage: 'en',
    accessibility: { largeText: true, highContrast: false, voiceFirst: true, readingLevel: 6 },
  });

  // ── Members ──────────────────────────────────────────────────────────────
  const grandpaId = new ObjectId();
  const grandmaId = new ObjectId();
  const dadId     = new ObjectId();
  const momId     = new ObjectId();

  await db.collection('members').insertMany([
    { _id: grandpaId, householdId, name: 'Grandpa Joe', age: 78, avatarColor: '#3B82F6', conditions: ['hypertension', 'type 2 diabetes', 'heart disease'], allergies: ['penicillin'], createdAt: daysAgo(45, 10) },
    { _id: grandmaId, householdId, name: 'Grandma Rosa', age: 74, avatarColor: '#E11D48', conditions: ['atrial fibrillation', 'hypothyroidism', 'osteoporosis'], allergies: [], createdAt: daysAgo(45, 10) },
    { _id: dadId,     householdId, name: 'Carlos', age: 52, avatarColor: '#8B5CF6', conditions: ['hypertension', 'high cholesterol'], allergies: [], createdAt: daysAgo(45, 10) },
    { _id: momId,     householdId, name: 'Linda', age: 49, avatarColor: '#14B8A6', conditions: ['acid reflux'], allergies: ['sulfa'], createdAt: daysAgo(45, 10) },
  ]);

  // ── Medications ───────────────────────────────────────────────────────────
  const lisinopril10Id  = new ObjectId();
  const metforminId     = new ObjectId();
  const atorvastatinId  = new ObjectId();
  const aspirinId       = new ObjectId();
  const metoprololId    = new ObjectId();
  const warfarinId      = new ObjectId();
  const levothyroxineId = new ObjectId();
  const calciumId       = new ObjectId();
  const amlodipineId    = new ObjectId();
  const lisinopril5Id   = new ObjectId();
  const simvastatinId   = new ObjectId();
  const omeprazoleId    = new ObjectId();
  const vitaminDId      = new ObjectId();

  await db.collection('medications').insertMany([
    // ── Grandpa Joe (5 meds) ──
    {
      _id: lisinopril10Id,
      householdId, memberId: grandpaId,
      brandName: 'Lisinopril', genericName: 'lisinopril',
      activeIngredients: [{ name: 'lisinopril', strength: '10mg' }],
      ndc: '00071-0222-23', rxNumber: '4829301', prescriber: 'Dr. Patel', pharmacy: 'CVS #4421',
      dosage: { raw: 'Take one tablet by mouth once daily in the morning' },
      warnings: [{ code: 'DIZZY', text: 'May cause dizziness when standing up quickly', severity: 'caution' }],
      plainLanguage: { whatItDoes: 'Lowers your blood pressure.', howToTake: 'One pill every morning with water.', watchOutFor: 'Dizziness when standing up too fast.' },
      pillAppearance: { shape: 'round', color: 'white', imprint: 'LUPIN 10' },
      refillsRemaining: 2, nextRefillDate: null, firstScannedAt: daysAgo(42, 9), active: true, fdaVerified: true,
    },
    {
      _id: metforminId,
      householdId, memberId: grandpaId,
      brandName: 'Metformin', genericName: 'metformin',
      activeIngredients: [{ name: 'metformin', strength: '500mg' }],
      ndc: '00093-1048-01', rxNumber: '4829302', prescriber: 'Dr. Patel', pharmacy: 'CVS #4421',
      dosage: { raw: 'Take one tablet twice daily with meals' },
      warnings: [{ code: 'ALCOHOL', text: 'Avoid alcohol while taking this medication', severity: 'caution' }],
      plainLanguage: { whatItDoes: 'Helps control your blood sugar.', howToTake: 'One pill with breakfast and one with dinner.', watchOutFor: 'Upset stomach, especially at first. Avoid alcohol.' },
      pillAppearance: { shape: 'oval', color: 'white', imprint: 'APO MET 500' },
      refillsRemaining: 4, nextRefillDate: null, firstScannedAt: daysAgo(42, 9), active: true, fdaVerified: true,
    },
    {
      _id: atorvastatinId,
      householdId, memberId: grandpaId,
      brandName: 'Atorvastatin', genericName: 'atorvastatin',
      activeIngredients: [{ name: 'atorvastatin', strength: '20mg' }],
      ndc: '00071-0157-23', rxNumber: '4829303', prescriber: 'Dr. Patel', pharmacy: 'CVS #4421',
      dosage: { raw: 'Take one tablet by mouth once daily in the evening' },
      warnings: [{ code: 'MUSCLE', text: 'Stop and call doctor if you have unexplained muscle pain or weakness', severity: 'caution' }],
      plainLanguage: { whatItDoes: 'Lowers your bad cholesterol to protect your heart.', howToTake: 'One pill every evening, with or without food.', watchOutFor: 'Muscle pain or weakness — stop and call your doctor.' },
      pillAppearance: { shape: 'oval', color: 'white', imprint: 'PD 155 20' },
      refillsRemaining: 3, nextRefillDate: null, firstScannedAt: daysAgo(42, 9), active: true, fdaVerified: true,
    },
    {
      _id: aspirinId,
      householdId, memberId: grandpaId,
      brandName: 'Aspirin 81mg', genericName: 'aspirin',
      activeIngredients: [{ name: 'aspirin', strength: '81mg' }],
      ndc: '00280-0102-10', rxNumber: null, prescriber: 'Dr. Patel', pharmacy: 'OTC',
      dosage: { raw: 'Take one tablet by mouth once daily with food' },
      warnings: [{ code: 'BLEED', text: 'Can increase bleeding risk. Avoid if scheduled for surgery.', severity: 'caution' }],
      plainLanguage: { whatItDoes: 'Helps prevent heart attacks by keeping blood from clotting too easily.', howToTake: 'One small pill every morning with food.', watchOutFor: 'Increased bleeding. Tell your doctor before any surgery.' },
      pillAppearance: { shape: 'round', color: 'orange', imprint: 'BAYER' },
      refillsRemaining: null, nextRefillDate: null, firstScannedAt: daysAgo(40, 9), active: true, fdaVerified: true,
    },
    {
      _id: metoprololId,
      householdId, memberId: grandpaId,
      brandName: 'Metoprolol', genericName: 'metoprolol',
      activeIngredients: [{ name: 'metoprolol', strength: '25mg' }],
      ndc: '00378-0372-01', rxNumber: '4829304', prescriber: 'Dr. Ramirez (Cardiologist)', pharmacy: 'CVS #4421',
      dosage: { raw: 'Take one tablet by mouth twice daily' },
      warnings: [{ code: 'HEART', text: 'Do not stop suddenly — taper dose with doctor guidance', severity: 'danger' }, { code: 'DIZZY', text: 'May cause dizziness or fatigue', severity: 'caution' }],
      plainLanguage: { whatItDoes: 'Slows your heart rate and lowers blood pressure to protect your heart.', howToTake: 'One pill in the morning and one in the evening, with food.', watchOutFor: "Never stop this pill suddenly — it can cause a dangerous rebound. Talk to your doctor first." },
      pillAppearance: { shape: 'round', color: 'pink', imprint: 'BI 25' },
      refillsRemaining: 1, nextRefillDate: null, firstScannedAt: daysAgo(40, 9), active: true, fdaVerified: true,
    },

    // ── Grandma Rosa (4 meds) ──
    {
      _id: warfarinId,
      householdId, memberId: grandmaId,
      brandName: 'Warfarin', genericName: 'warfarin',
      activeIngredients: [{ name: 'warfarin', strength: '5mg' }],
      ndc: '00056-0173-70', rxNumber: '5012201', prescriber: 'Dr. Ramirez (Cardiologist)', pharmacy: 'Walgreens #1102',
      dosage: { raw: 'Take one tablet by mouth once daily at the same time each evening' },
      warnings: [{ code: 'BLEEDING', text: 'Risk of serious bleeding — avoid ibuprofen, naproxen, and aspirin unless directed', severity: 'danger' }, { code: 'FOOD', text: 'Keep vitamin K intake consistent (leafy greens)', severity: 'caution' }],
      plainLanguage: { whatItDoes: 'Thins your blood to prevent dangerous clots from your heart rhythm.', howToTake: 'One pill every evening at the same time — consistency is critical.', watchOutFor: 'Avoid Advil, Motrin, or Aleve — they greatly increase your bleeding risk.' },
      pillAppearance: { shape: 'round', color: 'blue', imprint: 'DAN 5' },
      refillsRemaining: 2, nextRefillDate: null, firstScannedAt: daysAgo(38, 10), active: true, fdaVerified: true,
    },
    {
      _id: levothyroxineId,
      householdId, memberId: grandmaId,
      brandName: 'Levothyroxine', genericName: 'levothyroxine',
      activeIngredients: [{ name: 'levothyroxine', strength: '50mcg' }],
      ndc: '00074-4842-90', rxNumber: '5012202', prescriber: 'Dr. Nguyen (Endocrinologist)', pharmacy: 'Walgreens #1102',
      dosage: { raw: 'Take one tablet by mouth once daily on an empty stomach, 30-60 minutes before breakfast' },
      warnings: [{ code: 'TIMING', text: 'Take on empty stomach — food, calcium, and iron reduce absorption', severity: 'danger' }],
      plainLanguage: { whatItDoes: 'Replaces the hormone your thyroid is not making enough of.', howToTake: 'One pill first thing in the morning, 30-60 minutes before eating.', watchOutFor: 'Do not take with calcium pills or iron — space them at least 4 hours apart.' },
      pillAppearance: { shape: 'oval', color: 'yellow', imprint: 'SYNTHROID 50' },
      refillsRemaining: 5, nextRefillDate: null, firstScannedAt: daysAgo(38, 10), active: true, fdaVerified: true,
    },
    {
      _id: calciumId,
      householdId, memberId: grandmaId,
      brandName: 'Calcium + Vitamin D', genericName: 'calcium carbonate',
      activeIngredients: [{ name: 'calcium carbonate', strength: '600mg' }, { name: 'vitamin D3', strength: '800IU' }],
      ndc: null, rxNumber: null, prescriber: null, pharmacy: 'OTC',
      dosage: { raw: 'Take one tablet twice daily with meals' },
      warnings: [{ code: 'TIMING', text: 'Separate from Levothyroxine by at least 4 hours', severity: 'caution' }],
      plainLanguage: { whatItDoes: 'Keeps your bones strong and reduces fracture risk.', howToTake: 'One tablet with lunch and one with dinner. Not with your thyroid pill.', watchOutFor: 'Do not take within 4 hours of your Levothyroxine.' },
      pillAppearance: { shape: 'oblong', color: 'white', imprint: 'OS CAL 600+D' },
      refillsRemaining: null, nextRefillDate: null, firstScannedAt: daysAgo(35, 10), active: true, fdaVerified: false,
    },
    {
      _id: amlodipineId,
      householdId, memberId: grandmaId,
      brandName: 'Amlodipine', genericName: 'amlodipine',
      activeIngredients: [{ name: 'amlodipine', strength: '5mg' }],
      ndc: '00069-1520-68', rxNumber: '5012203', prescriber: 'Dr. Ramirez (Cardiologist)', pharmacy: 'Walgreens #1102',
      dosage: { raw: 'Take one tablet by mouth once daily' },
      warnings: [{ code: 'GRAPEFRUIT', text: 'Avoid grapefruit juice — can make this drug too strong', severity: 'caution' }],
      plainLanguage: { whatItDoes: 'Relaxes blood vessels to lower blood pressure.', howToTake: 'One pill once a day, same time each day.', watchOutFor: 'Avoid grapefruit juice. Ankle swelling is common but call doctor if severe.' },
      pillAppearance: { shape: 'round', color: 'white', imprint: 'PFIZER NDT' },
      refillsRemaining: 3, nextRefillDate: null, firstScannedAt: daysAgo(35, 10), active: true, fdaVerified: true,
    },

    // ── Carlos / Dad (2 meds) ──
    {
      _id: lisinopril5Id,
      householdId, memberId: dadId,
      brandName: 'Lisinopril', genericName: 'lisinopril',
      activeIngredients: [{ name: 'lisinopril', strength: '5mg' }],
      ndc: '00071-0221-23', rxNumber: '7741001', prescriber: 'Dr. Williams', pharmacy: 'Rite Aid #882',
      dosage: { raw: 'Take one tablet by mouth once daily' },
      warnings: [{ code: 'DIZZY', text: 'May cause dizziness, especially when first starting', severity: 'caution' }],
      plainLanguage: { whatItDoes: 'Keeps your blood pressure under control.', howToTake: 'One pill every morning.', watchOutFor: 'Dizziness in the first few weeks — sit up slowly.' },
      pillAppearance: { shape: 'round', color: 'white', imprint: 'LUPIN 5' },
      refillsRemaining: 6, nextRefillDate: null, firstScannedAt: daysAgo(30, 9), active: true, fdaVerified: true,
    },
    {
      _id: simvastatinId,
      householdId, memberId: dadId,
      brandName: 'Simvastatin', genericName: 'simvastatin',
      activeIngredients: [{ name: 'simvastatin', strength: '10mg' }],
      ndc: '00006-0735-31', rxNumber: '7741002', prescriber: 'Dr. Williams', pharmacy: 'Rite Aid #882',
      dosage: { raw: 'Take one tablet by mouth once daily in the evening' },
      warnings: [{ code: 'GRAPEFRUIT', text: 'Avoid large amounts of grapefruit juice', severity: 'caution' }, { code: 'MUSCLE', text: 'Report unexplained muscle pain immediately', severity: 'caution' }],
      plainLanguage: { whatItDoes: 'Lowers your bad cholesterol to reduce heart disease risk.', howToTake: 'One pill every evening.', watchOutFor: 'Avoid grapefruit juice. Tell your doctor about any muscle pain.' },
      pillAppearance: { shape: 'oval', color: 'peach', imprint: 'MSD 735' },
      refillsRemaining: 5, nextRefillDate: null, firstScannedAt: daysAgo(30, 9), active: true, fdaVerified: true,
    },

    // ── Linda / Mom (2 meds) ──
    {
      _id: omeprazoleId,
      householdId, memberId: momId,
      brandName: 'Omeprazole', genericName: 'omeprazole',
      activeIngredients: [{ name: 'omeprazole', strength: '20mg' }],
      ndc: '00186-0106-47', rxNumber: null, prescriber: null, pharmacy: 'OTC',
      dosage: { raw: 'Take one capsule by mouth once daily before eating' },
      warnings: [{ code: 'LONGTERM', text: 'Not recommended for long-term use without doctor supervision', severity: 'info' }],
      plainLanguage: { whatItDoes: 'Reduces acid in your stomach to relieve heartburn and reflux.', howToTake: 'One capsule every morning before breakfast.', watchOutFor: 'Fine for short-term use. Check with your doctor if you need it for more than 2 months.' },
      pillAppearance: { shape: 'capsule', color: 'purple', imprint: 'KU 118' },
      refillsRemaining: null, nextRefillDate: null, firstScannedAt: daysAgo(20, 9), active: true, fdaVerified: true,
    },
    {
      _id: vitaminDId,
      householdId, memberId: momId,
      brandName: 'Vitamin D3 1000IU', genericName: 'cholecalciferol',
      activeIngredients: [{ name: 'vitamin D3', strength: '1000IU' }],
      ndc: null, rxNumber: null, prescriber: null, pharmacy: 'OTC',
      dosage: { raw: 'Take one softgel by mouth once daily with a meal' },
      warnings: [],
      plainLanguage: { whatItDoes: 'Supports bone health and immune function.', howToTake: 'One softgel with any meal.', watchOutFor: 'Generally safe at this dose. No major concerns.' },
      pillAppearance: { shape: 'round', color: 'yellow', imprint: 'D3' },
      refillsRemaining: null, nextRefillDate: null, firstScannedAt: daysAgo(20, 9), active: true, fdaVerified: false,
    },
  ]);

  // ── Doses: 35 days of history ─────────────────────────────────────────────
  // Schedule: [medicationId, memberId, [times], adherenceRate]
  const schedules: [ObjectId, ObjectId, number[], number][] = [
    // Grandpa Joe — 88% adherent (some misses, he's 78)
    [lisinopril10Id,  grandpaId, [8],     0.88],
    [metforminId,     grandpaId, [8, 20], 0.85],
    [atorvastatinId,  grandpaId, [20],    0.90],
    [aspirinId,       grandpaId, [8],     0.92],
    [metoprololId,    grandpaId, [8, 20], 0.87],
    // Grandma Rosa — 93% adherent (she's very diligent)
    [warfarinId,      grandmaId, [21],    0.93],
    [levothyroxineId, grandmaId, [7],     0.95],
    [calciumId,       grandmaId, [12, 19],0.88],
    [amlodipineId,    grandmaId, [9],     0.94],
    // Carlos — 80% (busy, sometimes forgets evening)
    [lisinopril5Id,   dadId,     [8],     0.82],
    [simvastatinId,   dadId,     [20],    0.78],
    // Linda — 90%
    [omeprazoleId,    momId,     [8],     0.91],
    [vitaminDId,      momId,     [12],    0.89],
  ];

  const allDoses: any[] = [];

  for (const [medId, memberId, times, adherence] of schedules) {
    for (let day = 35; day >= 1; day--) {
      for (const hour of times) {
        const scheduled = daysAgo(day, hour);
        const taken = takenAt(scheduled, adherence);
        allDoses.push({
          medicationId: medId,
          memberId,
          householdId,
          scheduledAt: scheduled,
          takenAt: taken,
          source: taken ? 'manual' : 'auto',
        });
      }
    }
    // Today's past doses
    const nowHour = new Date().getHours();
    for (const hour of times) {
      if (hour <= nowHour - 1) {
        const scheduled = today(hour);
        const taken = takenAt(scheduled, adherence);
        allDoses.push({ medicationId: medId, memberId, householdId, scheduledAt: scheduled, takenAt: taken, source: taken ? 'manual' : 'auto' });
      } else {
        // Upcoming
        allDoses.push({ medicationId: medId, memberId, householdId, scheduledAt: today(hour), takenAt: null, source: 'auto' });
      }
    }
    // Tomorrow pre-scheduled
    for (const hour of times) {
      allDoses.push({ medicationId: medId, memberId, householdId, scheduledAt: tomorrow(hour), takenAt: null, source: 'auto' });
    }
  }

  await db.collection('doses').insertMany(allDoses);
  console.log(`Inserted ${allDoses.length} dose records`);

  // Summary
  const taken = allDoses.filter((d) => d.takenAt).length;
  const missed = allDoses.filter((d) => !d.takenAt && d.scheduledAt < new Date()).length;
  const upcoming = allDoses.filter((d) => !d.takenAt && d.scheduledAt >= new Date()).length;
  console.log(`  ${taken} taken | ${missed} missed | ${upcoming} upcoming`);

  console.log(`
✓ Rich demo household seeded
  Household code: ${HOUSEHOLD_CODE}
  Family: The Martinez Family

  Members & meds:
  • Grandpa Joe (78) — Lisinopril, Metformin, Atorvastatin, Aspirin 81mg, Metoprolol
  • Grandma Rosa (74) — Warfarin, Levothyroxine, Calcium+D, Amlodipine
  • Carlos / Dad (52) — Lisinopril, Simvastatin
  • Linda / Mom (49)  — Omeprazole, Vitamin D3

  Active interactions in cabinet:
  • Warfarin + Aspirin (Grandma + Grandpa) — DANGER: bleeding risk
  • Simvastatin + Amlodipine (Carlos) — CAUTION: muscle damage risk
  • Levothyroxine + Calcium (Grandma) — INFO: space doses 4h apart

  To use: go through onboarding, then update localStorage manually OR
  visit /api/household?id=<householdId> to confirm the data is live.
  `);

  await client.close();
}

main().catch((e) => { console.error(e); process.exit(1); });
