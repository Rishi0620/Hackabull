import { MongoClient, Db, Collection, ObjectId } from 'mongodb';

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB || 'medmate';

if (!uri) {
  console.warn('MONGODB_URI not set — using in-memory fallback');
}

let client: MongoClient | null = null;
let clientPromise: Promise<MongoClient> | null = null;

declare global {
  // eslint-disable-next-line no-var
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

function getClient(): Promise<MongoClient> {
  if (!uri) {
    throw new Error('MONGODB_URI is required');
  }
  if (process.env.NODE_ENV === 'development') {
    if (!global._mongoClientPromise) {
      client = new MongoClient(uri);
      global._mongoClientPromise = client.connect();
    }
    return global._mongoClientPromise;
  }
  if (!clientPromise) {
    client = new MongoClient(uri);
    clientPromise = client.connect();
  }
  return clientPromise;
}

export async function getDb(): Promise<Db> {
  const c = await getClient();
  return c.db(dbName);
}

export type Household = {
  _id?: ObjectId;
  code: string;
  name: string;
  createdAt: Date;
  preferredLanguage: string;
  accessibility: {
    largeText: boolean;
    highContrast: boolean;
    voiceFirst: boolean;
    readingLevel: number;
  };
};

export type Member = {
  _id?: ObjectId;
  householdId: ObjectId;
  name: string;
  age?: number;
  conditions?: string[];
  allergies?: string[];
  avatarColor: string;
  createdAt: Date;
};

export type Medication = {
  _id?: ObjectId;
  householdId: ObjectId;
  memberId: ObjectId;
  brandName: string;
  genericName: string | null;
  activeIngredients: { name: string; strength: string }[];
  ndc: string | null;
  rxNumber: string | null;
  prescriber: string | null;
  pharmacy: string | null;
  dosage: {
    raw: string;
    parsed?: {
      amount: number;
      unit: string;
      frequency: string;
      times: string[];
    };
  };
  warnings: { code: string; text: string; severity: 'info' | 'caution' | 'danger' }[];
  plainLanguage: {
    whatItDoes: string;
    howToTake: string;
    watchOutFor: string;
  };
  pillAppearance?: {
    shape: string;
    color: string;
    secondaryColor?: string | null;
    imprint: string | null;
    embedding?: number[];
  };
  refillsRemaining: number | null;
  nextRefillDate: Date | null;
  firstScannedAt: Date;
  active: boolean;
  fdaVerified: boolean;
};

export type Scan = {
  _id?: ObjectId;
  householdId: ObjectId;
  memberId?: ObjectId;
  type: 'bottle' | 'pills_in_hand';
  geminiRaw: unknown;
  fdaVerified: boolean;
  fdaConflicts: string[];
  resultMedicationIds: ObjectId[];
  createdAt: Date;
};

export type Dose = {
  _id?: ObjectId;
  medicationId: ObjectId;
  memberId: ObjectId;
  householdId: ObjectId;
  scheduledAt: Date;
  takenAt: Date | null;
  source: 'manual' | 'voice' | 'auto';
  notes?: string;
};

export type Interaction = {
  _id?: ObjectId;
  ingredientPair: [string, string];
  severity: 'info' | 'caution' | 'danger';
  summary: string;
  plainLanguage: string;
  source: 'openfda' | 'rxnorm' | 'gemini' | 'static';
  cachedAt: Date;
};

export async function households(): Promise<Collection<Household>> {
  const db = await getDb();
  return db.collection<Household>('households');
}
export async function members(): Promise<Collection<Member>> {
  const db = await getDb();
  return db.collection<Member>('members');
}
export async function medications(): Promise<Collection<Medication>> {
  const db = await getDb();
  return db.collection<Medication>('medications');
}
export async function scans(): Promise<Collection<Scan>> {
  const db = await getDb();
  return db.collection<Scan>('scans');
}
export async function doses(): Promise<Collection<Dose>> {
  const db = await getDb();
  return db.collection<Dose>('doses');
}
export async function interactionsCol(): Promise<Collection<Interaction>> {
  const db = await getDb();
  return db.collection<Interaction>('interactions');
}

export { ObjectId };
