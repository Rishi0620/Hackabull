import { MongoClient, ObjectId } from 'mongodb';
import 'dotenv/config';

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB || 'medmate';

if (!uri) {
  console.error('MONGODB_URI is required');
  process.exit(1);
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

async function main() {
  const client = new MongoClient(uri!);
  await client.connect();
  const db = client.db(dbName);

  console.log('Wiping demo collections...');
  await Promise.all([
    db.collection('households').deleteMany({ code: '123456' }),
    db.collection('members').deleteMany({}),
    db.collection('medications').deleteMany({}),
    db.collection('doses').deleteMany({}),
  ]);

  const householdId = new ObjectId();
  await db.collection('households').insertOne({
    _id: householdId,
    code: '123456',
    name: 'The Demo Family',
    createdAt: new Date(),
    preferredLanguage: 'en',
    accessibility: { largeText: true, highContrast: false, voiceFirst: true, readingLevel: 6 },
  });

  const dadId = new ObjectId();
  const momId = new ObjectId();
  await db.collection('members').insertMany([
    { _id: dadId, householdId, name: 'Dad', age: 72, avatarColor: '#3B82F6', createdAt: new Date() },
    { _id: momId, householdId, name: 'Mom', age: 68, avatarColor: '#E11D48', createdAt: new Date() },
  ]);

  const lisinoprilId = new ObjectId();
  const metforminId = new ObjectId();
  const warfarinId = new ObjectId();

  await db.collection('medications').insertMany([
    {
      _id: lisinoprilId,
      householdId,
      memberId: dadId,
      brandName: 'Lisinopril',
      genericName: 'lisinopril',
      activeIngredients: [{ name: 'lisinopril', strength: '10mg' }],
      ndc: '00071-0222-23',
      rxNumber: '4829301',
      prescriber: 'Dr. Patel',
      pharmacy: 'CVS #4421',
      dosage: { raw: 'Take one tablet by mouth daily in the morning' },
      warnings: [{ code: 'DIZZY', text: 'May cause dizziness when standing up', severity: 'caution' }],
      plainLanguage: {
        whatItDoes: 'Lowers your blood pressure.',
        howToTake: 'One pill every morning with water.',
        watchOutFor: 'Dizziness when standing up too fast.',
      },
      pillAppearance: { shape: 'round', color: 'white', imprint: 'LUPIN 10' },
      refillsRemaining: 3,
      nextRefillDate: null,
      firstScannedAt: new Date(),
      active: true,
      fdaVerified: true,
    },
    {
      _id: metforminId,
      householdId,
      memberId: dadId,
      brandName: 'Metformin',
      genericName: 'metformin',
      activeIngredients: [{ name: 'metformin', strength: '500mg' }],
      ndc: '00093-1048-01',
      rxNumber: null,
      prescriber: null,
      pharmacy: null,
      dosage: { raw: 'Take one tablet twice daily with meals' },
      warnings: [{ code: 'ALCOHOL', text: 'Avoid alcohol', severity: 'caution' }],
      plainLanguage: {
        whatItDoes: 'Helps control your blood sugar.',
        howToTake: 'One pill with breakfast and one with dinner.',
        watchOutFor: 'Upset stomach. Avoid alcohol.',
      },
      pillAppearance: { shape: 'oval', color: 'white', imprint: 'APO MET 500' },
      refillsRemaining: 5,
      nextRefillDate: null,
      firstScannedAt: new Date(),
      active: true,
      fdaVerified: true,
    },
    {
      _id: warfarinId,
      householdId,
      memberId: momId,
      brandName: 'Warfarin',
      genericName: 'warfarin',
      activeIngredients: [{ name: 'warfarin', strength: '5mg' }],
      ndc: '00056-0173-70',
      rxNumber: null,
      prescriber: null,
      pharmacy: null,
      dosage: { raw: 'Take one tablet by mouth daily in the evening' },
      warnings: [{ code: 'BLEEDING', text: 'Risk of bleeding — avoid NSAIDs like ibuprofen', severity: 'danger' }],
      plainLanguage: {
        whatItDoes: 'Thins your blood to prevent clots.',
        howToTake: 'One pill at the same time each evening.',
        watchOutFor: 'Avoid Advil/Motrin (ibuprofen) — they raise your bleeding risk.',
      },
      pillAppearance: { shape: 'round', color: 'blue', imprint: 'DAN 5' },
      refillsRemaining: 2,
      nextRefillDate: null,
      firstScannedAt: new Date(),
      active: true,
      fdaVerified: true,
    },
  ]);

  // Doses: Dad took his morning Lisinopril, hasn't taken evening Metformin yet.
  // Mom hasn't taken her Warfarin tonight (sets up the demo voice query perfectly).
  const takenAt = today(8, 12); // 8:12am
  await db.collection('doses').insertMany([
    // Lisinopril — Dad took it this morning
    {
      medicationId: lisinoprilId,
      memberId: dadId,
      householdId,
      scheduledAt: today(8, 0),
      takenAt,
      source: 'manual',
    },
    // Metformin morning — Dad took with breakfast
    {
      medicationId: metforminId,
      memberId: dadId,
      householdId,
      scheduledAt: today(8, 0),
      takenAt,
      source: 'manual',
    },
    // Metformin evening — Dad hasn't taken yet (upcoming)
    {
      medicationId: metforminId,
      memberId: dadId,
      householdId,
      scheduledAt: today(20, 0),
      takenAt: null,
      source: 'auto',
    },
    // Warfarin — Mom hasn't taken tonight's dose yet (key for demo)
    {
      medicationId: warfarinId,
      memberId: momId,
      householdId,
      scheduledAt: today(21, 0),
      takenAt: null,
      source: 'auto',
    },
    // Tomorrow's doses pre-scheduled
    {
      medicationId: lisinoprilId,
      memberId: dadId,
      householdId,
      scheduledAt: tomorrow(8, 0),
      takenAt: null,
      source: 'auto',
    },
    {
      medicationId: warfarinId,
      memberId: momId,
      householdId,
      scheduledAt: tomorrow(21, 0),
      takenAt: null,
      source: 'auto',
    },
  ]);

  console.log(`✓ Seeded household ${householdId.toString()} (code 123456)`);
  console.log('  Dad: Lisinopril (taken 8am) + Metformin (taken 8am, due 8pm)');
  console.log('  Mom: Warfarin (due 9pm — not taken yet)');
  console.log('\nDemo voice queries to try:');
  console.log('  "Did Dad take his morning pill?" → Yes');
  console.log('  "Did Mom take her Warfarin?" → Not yet');
  console.log('  "What\'s in the cabinet?" → lists all 3 meds');
  await client.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
