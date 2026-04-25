import { NextRequest, NextResponse } from 'next/server';
import { geminiVisionJson, geminiJson } from '@/lib/gemini';
import { lookupLabelByName, lookupLabelByNdc, compareWithFda } from '@/lib/openfda';
import { BOTTLE_EXTRACTION_PROMPT, PLAIN_LANGUAGE_PROMPT } from '@/lib/prompts';
import { BottleExtractionSchema, PlainLanguageSchema } from '@/lib/schema';
import { medications, scans, doses, ObjectId } from '@/lib/mongo';
import { checkAllAgainst, toInteractionResult } from '@/lib/interactions';

export const maxDuration = 60;

// Parse a rough time from dosage text like "take daily", "twice daily", "every 8 hours"
function parseDoseTimes(instructions: string): string[] {
  const s = instructions.toLowerCase();
  if (s.includes('twice') || s.includes('two times') || s.includes('b.i.d') || s.includes('bid'))
    return ['08:00', '20:00'];
  if (s.includes('three') || s.includes('t.i.d') || s.includes('tid'))
    return ['08:00', '14:00', '20:00'];
  if (s.includes('four') || s.includes('q.i.d') || s.includes('qid'))
    return ['08:00', '12:00', '16:00', '20:00'];
  if (s.includes('bedtime') || s.includes('at night') || s.includes('evening'))
    return ['21:00'];
  if (s.includes('morning') || s.includes('breakfast'))
    return ['08:00'];
  return ['08:00']; // default: once daily in the morning
}

function buildScheduledDate(timeStr: string): Date {
  const [h, m] = timeStr.split(':').map(Number);
  const d = new Date();
  d.setHours(h, m, 0, 0);
  // If the time has already passed today, schedule for tomorrow
  if (d < new Date()) d.setDate(d.getDate() + 1);
  return d;
}

export async function POST(req: NextRequest) {
  try {
    const { image, householdId, memberId, language } = await req.json();
    if (!image || !householdId || !memberId) {
      return NextResponse.json({ error: 'image, householdId, memberId required' }, { status: 400 });
    }

    const raw = await geminiVisionJson<any>(BOTTLE_EXTRACTION_PROMPT, image);
    const parsed = BottleExtractionSchema.parse(raw);

    let fda = null;
    if (parsed.ndc) fda = await lookupLabelByNdc(parsed.ndc);
    if (!fda && (parsed.genericName || parsed.brandName)) {
      fda = await lookupLabelByName(parsed.genericName || parsed.brandName);
    }
    const fdaCheck = compareWithFda(parsed.dosageInstructions, parsed.warnings, fda);

    const labelText = [
      `Brand: ${parsed.brandName}`,
      `Generic: ${parsed.genericName || ''}`,
      `Dosage: ${parsed.dosageInstructions}`,
      `Warnings: ${parsed.warnings.join('; ')}`,
      fda?.indications_and_usage ? `Use: ${fda.indications_and_usage[0].slice(0, 400)}` : '',
    ]
      .filter(Boolean)
      .join('\n');

    let plain;
    try {
      const rawPlain = await geminiJson<any>(PLAIN_LANGUAGE_PROMPT(6, labelText));
      plain = PlainLanguageSchema.parse(rawPlain);
    } catch {
      plain = {
        whatItDoes: parsed.brandName + ' — see your pharmacist for what this does.',
        howToTake: parsed.dosageInstructions || 'Follow the label directions.',
        watchOutFor: parsed.warnings[0] || 'Read the warning label before taking.',
      };
    }

    const warnings = parsed.warnings.map((text) => ({
      code: 'GENERAL',
      text,
      severity: /alcohol|driving|drowsy/i.test(text) ? ('caution' as const) : ('info' as const),
    }));

    const medsCol = await medications();
    const existing = await medsCol
      .find({ householdId: new ObjectId(householdId), active: true })
      .toArray();

    // Check all active ingredients against existing cabinet (not just first)
    const newIngredients = parsed.activeIngredients.length > 0
      ? parsed.activeIngredients.map((i) => i.name)
      : [parsed.genericName || parsed.brandName];
    const existingIngredients = existing.flatMap((m) =>
      m.activeIngredients.length > 0
        ? m.activeIngredients.map((i) => i.name)
        : [m.genericName || m.brandName]
    );
    const interactionHits = newIngredients.flatMap((ing) =>
      checkAllAgainst(ing, existingIngredients)
    );
    // Dedupe by ingredient pair
    const seen = new Set<string>();
    const dedupedHits = interactionHits.filter((h) => {
      const k = [h.ingredient, h.result.pair.join('|')].join('||');
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });

    const insert = await medsCol.insertOne({
      householdId: new ObjectId(householdId),
      memberId: new ObjectId(memberId),
      brandName: parsed.brandName,
      genericName: parsed.genericName || null,
      activeIngredients: parsed.activeIngredients,
      ndc: parsed.ndc || null,
      rxNumber: parsed.rxNumber || null,
      prescriber: parsed.prescriber || null,
      pharmacy: parsed.pharmacy || null,
      dosage: { raw: parsed.dosageInstructions },
      warnings,
      plainLanguage: plain,
      refillsRemaining: parsed.refillsRemaining ?? null,
      nextRefillDate: null,
      firstScannedAt: new Date(),
      active: true,
      fdaVerified: fdaCheck.verified,
    });

    // Create scheduled dose entries for today/tomorrow based on dosage instructions
    const doseTimes = parseDoseTimes(parsed.dosageInstructions);
    const dosesCol = await doses();
    await dosesCol.insertMany(
      doseTimes.map((t) => ({
        medicationId: insert.insertedId,
        memberId: new ObjectId(memberId),
        householdId: new ObjectId(householdId),
        scheduledAt: buildScheduledDate(t),
        takenAt: null,
        source: 'auto' as const,
      }))
    );

    const scansCol = await scans();
    await scansCol.insertOne({
      householdId: new ObjectId(householdId),
      memberId: new ObjectId(memberId),
      type: 'bottle',
      geminiRaw: raw,
      fdaVerified: fdaCheck.verified,
      fdaConflicts: fdaCheck.conflicts,
      resultMedicationIds: [insert.insertedId],
      createdAt: new Date(),
    });

    return NextResponse.json({
      medicationId: insert.insertedId.toString(),
      extracted: parsed,
      plainLanguage: plain,
      fdaVerified: fdaCheck.verified,
      fdaWarnings: fdaCheck.fdaWarnings,
      interactions: dedupedHits.map((h) => ({
        with: h.ingredient,
        ...toInteractionResult(h.result),
      })),
    });
  } catch (e: any) {
    console.error('Scan bottle error', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
