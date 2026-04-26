import { NextRequest, NextResponse } from 'next/server';
import { geminiVisionJson } from '@/lib/gemini';
import { PILL_IDENTIFICATION_PROMPT } from '@/lib/prompts';
import { PillIdentificationSchema } from '@/lib/schema';
import { medications, members, ObjectId } from '@/lib/mongo';
import { checkAllAgainst, toInteractionResult } from '@/lib/interactions';
import { lookupLabelByName } from '@/lib/openfda';
import { lookupByImprint, lookupByName as rxImageByName } from '@/lib/rximage';
import { lookupByName as dailyMedByName, lookupByNdc } from '@/lib/dailymed';

export const maxDuration = 60;

async function enrichFromDatabases(
  imprint: string | null | undefined,
  name: string | null | undefined,
  color?: string,
  shape?: string
): Promise<{ resolvedName: string; whatItDoes: string; warnings: string[]; source: string; confidence: number } | null> {

  // Step 1: RxImage lookup by imprint — most reliable
  if (imprint) {
    const rxHit = await lookupByImprint(imprint, color, shape);
    if (rxHit) {
      // Got a confirmed drug name from NLM RxImage
      const drugName = rxHit.name;
      // Step 2: Get label info from DailyMed using the NDC
      const dmLabel = rxHit.ndc11
        ? await lookupByNdc(rxHit.ndc11.replace(/-/g, ''))
        : await dailyMedByName(drugName);
      const whatItDoes = dmLabel?.purpose || dmLabel?.indications ||
        `${drugName} — ask your pharmacist for details.`;
      const warns = dmLabel?.warnings ? [dmLabel.warnings.slice(0, 200)] : [];
      return {
        resolvedName: drugName,
        whatItDoes,
        warnings: warns,
        source: 'NLM RxImage + DailyMed',
        confidence: rxHit.confidence,
      };
    }
  }

  // Step 2: Try RxImage by name (brand name Gemini read off the pill)
  if (name) {
    const rxHit = await rxImageByName(name);
    if (rxHit) {
      const dmLabel = await dailyMedByName(rxHit.name || name);
      const whatItDoes = dmLabel?.purpose || dmLabel?.indications ||
        `${rxHit.name || name} — ask your pharmacist for details.`;
      return {
        resolvedName: rxHit.name || name,
        whatItDoes,
        warnings: dmLabel?.warnings ? [dmLabel.warnings.slice(0, 200)] : [],
        source: 'NLM RxImage + DailyMed',
        confidence: rxHit.confidence,
      };
    }
  }

  // Step 3: Fall back to OpenFDA by name
  const lookupName = name || imprint;
  if (lookupName) {
    const fdaLabel = await lookupLabelByName(lookupName);
    if (fdaLabel) {
      const whatItDoes = fdaLabel.purpose?.[0]?.slice(0, 200) ||
        fdaLabel.indications_and_usage?.[0]?.slice(0, 200) || null;
      if (!whatItDoes) return null;
      const warns = [
        ...(fdaLabel.warnings || []),
        ...(fdaLabel.warnings_and_cautions || []),
      ].slice(0, 2).map((w) => w.slice(0, 150));
      return {
        resolvedName: name || lookupName,
        whatItDoes,
        warnings: warns,
        source: 'OpenFDA',
        confidence: 0.65,
      };
    }
  }

  return null;
}

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

    // Enrich each pill
    const enriched = await Promise.all(
      parsed.pills.map(async (p) => {
        const name = p.match.medicationName;

        // 1. Cabinet match (high confidence required)
        if (name && p.match.confidence >= 0.75) {
          const med = meds.find(
            (m) =>
              m.brandName.toLowerCase() === name.toLowerCase() ||
              m.genericName?.toLowerCase() === name.toLowerCase()
          );
          if (med) {
            const member = memMap.get(med.memberId.toString());
            return { ...p, member: member?.name, dosageNote: med.dosage.raw, medicationId: med._id?.toString(), fdaInfo: null, inCabinet: true, dbSource: 'cabinet' };
          }
        }

        // 2. RxImage → DailyMed → OpenFDA lookup chain
        const dbResult = await enrichFromDatabases(p.imprint, name, p.color, p.shape);
        if (dbResult) {
          return {
            ...p,
            match: {
              medicationName: dbResult.resolvedName,
              confidence: dbResult.confidence,
            },
            fdaInfo: { whatItDoes: dbResult.whatItDoes, warnings: dbResult.warnings },
            inCabinet: false,
            dbSource: dbResult.source,
          };
        }

        return { ...p, fdaInfo: null, inCabinet: false, dbSource: null };
      })
    );

    // Pairwise interaction check
    const knownIngredients = enriched.map((p) => p.match.medicationName).filter(Boolean) as string[];
    const interactions: { a: string; b: string; severity: string; plainLanguage: string; summary: string }[] = [];
    for (let i = 0; i < knownIngredients.length; i++) {
      for (let j = i + 1; j < knownIngredients.length; j++) {
        const hits = checkAllAgainst(knownIngredients[i], [knownIngredients[j]]);
        for (const h of hits) {
          const r = toInteractionResult(h.result);
          interactions.push({ a: knownIngredients[i], b: knownIngredients[j], severity: r.severity, summary: r.summary, plainLanguage: r.plainLanguage });
        }
      }
    }

    return NextResponse.json({ pills: enriched, interactions });
  } catch (e: any) {
    console.error('Scan pills error', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
