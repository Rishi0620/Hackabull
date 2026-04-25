import { NextRequest, NextResponse } from 'next/server';
import { geminiVisionJson } from '@/lib/gemini';
import { PILL_IDENTIFICATION_PROMPT } from '@/lib/prompts';
import { PillIdentificationSchema } from '@/lib/schema';
import { medications, members, ObjectId } from '@/lib/mongo';
import { checkAllAgainst, toInteractionResult } from '@/lib/interactions';

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const { image, householdId } = await req.json();
    if (!image || !householdId) {
      return NextResponse.json({ error: 'image and householdId required' }, { status: 400 });
    }

    const medsCol = await medications();
    const memCol = await members();
    const meds = await medsCol.find({ householdId: new ObjectId(householdId), active: true }).toArray();
    const memDocs = await memCol.find({ householdId: new ObjectId(householdId) }).toArray();
    const memMap = new Map(memDocs.map((m) => [m._id?.toString(), m]));

    const knownMeds = meds
      .map((m) => {
        const member = memMap.get(m.memberId.toString());
        const ing = m.activeIngredients.map((i) => `${i.name} ${i.strength}`).join(', ');
        return `- ${m.brandName} (${ing}) for ${member?.name || 'unknown'}: ${m.dosage.raw}`;
      })
      .join('\n');

    const raw = await geminiVisionJson<any>(
      PILL_IDENTIFICATION_PROMPT(knownMeds || '(none)'),
      image
    );
    const parsed = PillIdentificationSchema.parse(raw);

    const enriched = parsed.pills.map((p) => {
      if (!p.match.medicationName) return { ...p };
      const med = meds.find(
        (m) =>
          m.brandName.toLowerCase() === p.match.medicationName?.toLowerCase() ||
          m.genericName?.toLowerCase() === p.match.medicationName?.toLowerCase()
      );
      if (!med) return { ...p };
      const member = memMap.get(med.memberId.toString());
      return {
        ...p,
        member: member?.name,
        dosageNote: med.dosage.raw,
        medicationId: med._id?.toString(),
      };
    });

    // Pairwise interaction check across identified pills
    const knownIngredients = enriched
      .map((p) => p.match.medicationName)
      .filter(Boolean) as string[];
    const interactions: { a: string; b: string; severity: string; plainLanguage: string; summary: string }[] = [];
    for (let i = 0; i < knownIngredients.length; i++) {
      for (let j = i + 1; j < knownIngredients.length; j++) {
        const hits = checkAllAgainst(knownIngredients[i], [knownIngredients[j]]);
        for (const h of hits) {
          const r = toInteractionResult(h.result);
          interactions.push({
            a: knownIngredients[i],
            b: knownIngredients[j],
            severity: r.severity,
            summary: r.summary,
            plainLanguage: r.plainLanguage,
          });
        }
      }
    }

    return NextResponse.json({ pills: enriched, interactions });
  } catch (e: any) {
    console.error('Scan pills error', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
