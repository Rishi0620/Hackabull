import { NextRequest, NextResponse } from 'next/server';
import { geminiJson } from '@/lib/gemini';
import { lookupLabelByName } from '@/lib/openfda';
import { lookupByName as dailyMedByName } from '@/lib/dailymed';
import { PLAIN_LANGUAGE_PROMPT } from '@/lib/prompts';
import { PlainLanguageSchema } from '@/lib/schema';
import { medications, doses, ObjectId } from '@/lib/mongo';
import { checkAllAgainst, toInteractionResult } from '@/lib/interactions';

export const maxDuration = 30;

function parseDoseTimes(raw: string): string[] {
  const s = raw.toLowerCase();
  if (s.includes('twice') || s.includes('b.i.d')) return ['08:00', '20:00'];
  if (s.includes('three') || s.includes('t.i.d')) return ['08:00', '14:00', '20:00'];
  return ['08:00'];
}

function buildScheduledDate(t: string): Date {
  const [h, m] = t.split(':').map(Number);
  const d = new Date();
  d.setHours(h, m, 0, 0);
  if (d < new Date()) d.setDate(d.getDate() + 1);
  return d;
}

export async function POST(req: NextRequest) {
  try {
    const { name, householdId, memberId } = await req.json();
    if (!name || !householdId || !memberId) {
      return NextResponse.json({ error: 'name, householdId, memberId required' }, { status: 400 });
    }

    // Fetch structured drug info from DailyMed + OpenFDA
    const [dm, fda] = await Promise.all([
      dailyMedByName(name),
      lookupLabelByName(name),
    ]);

    const dosageRaw = dm?.dosage || fda?.dosage_and_administration?.[0]?.slice(0, 300) || 'Follow label directions.';
    const warnings = [
      ...(fda?.warnings || []),
      ...(fda?.warnings_and_cautions || []),
    ].slice(0, 3).map((w) => w.slice(0, 200));
    const activeIngredient = fda?.active_ingredient?.[0]?.slice(0, 100) || name;

    const labelText = [
      `Brand: ${name}`,
      dm?.purpose ? `Purpose: ${dm.purpose}` : '',
      dm?.indications ? `Use: ${dm.indications}` : fda?.indications_and_usage?.[0]?.slice(0, 300) || '',
      `Dosage: ${dosageRaw}`,
      warnings.length ? `Warnings: ${warnings.join('; ')}` : '',
    ].filter(Boolean).join('\n');

    let plain;
    try {
      plain = PlainLanguageSchema.parse(await geminiJson(PLAIN_LANGUAGE_PROMPT(6, labelText)));
    } catch {
      plain = {
        whatItDoes: dm?.purpose || dm?.indications || `${name} — ask your pharmacist what this does.`,
        howToTake: dosageRaw,
        watchOutFor: warnings[0] || 'Read the label carefully before taking.',
      };
    }

    const medsCol = await medications();
    const existing = await medsCol.find({ householdId: new ObjectId(householdId), active: true }).toArray();
    const existingIngredients = existing.flatMap((m) =>
      m.activeIngredients.length > 0 ? m.activeIngredients.map((i) => i.name) : [m.genericName || m.brandName]
    );
    const interactions = checkAllAgainst(name, existingIngredients).map((h) => ({
      with: h.ingredient,
      ...toInteractionResult(h.result),
    }));

    const insert = await medsCol.insertOne({
      householdId: new ObjectId(householdId),
      memberId: new ObjectId(memberId),
      brandName: name,
      genericName: activeIngredient.toLowerCase() !== name.toLowerCase() ? activeIngredient.toLowerCase() : null,
      activeIngredients: [{ name: activeIngredient, strength: '' }],
      ndc: null,
      rxNumber: null,
      prescriber: null,
      pharmacy: null,
      dosage: { raw: dosageRaw },
      warnings: warnings.map((text) => ({ code: 'GENERAL', text, severity: 'info' as const })),
      plainLanguage: plain,
      refillsRemaining: null,
      nextRefillDate: null,
      firstScannedAt: new Date(),
      active: true,
      fdaVerified: !!fda,
    });

    // Create dose schedule
    const dosesCol = await doses();
    const times = parseDoseTimes(dosageRaw);
    await dosesCol.insertMany(times.map((t) => ({
      medicationId: insert.insertedId,
      memberId: new ObjectId(memberId),
      householdId: new ObjectId(householdId),
      scheduledAt: buildScheduledDate(t),
      takenAt: null,
      source: 'auto' as const,
    })));

    return NextResponse.json({
      medicationId: insert.insertedId.toString(),
      plainLanguage: plain,
      fdaVerified: !!fda,
      interactions,
    });
  } catch (e: any) {
    console.error('Scan from-name error', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
