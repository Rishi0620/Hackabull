import { NextRequest, NextResponse } from 'next/server';
import { geminiText } from '@/lib/gemini';
import { CLOUD_ANSWER_PROMPT } from '@/lib/prompts';
import { medications, members, doses, ObjectId } from '@/lib/mongo';

export const maxDuration = 30;

export async function POST(req: NextRequest) {
  try {
    const { query, householdId } = await req.json();
    if (!query) return NextResponse.json({ error: 'query required' }, { status: 400 });

    let context = '';
    if (householdId) {
      const medsCol = await medications();
      const memCol = await members();
      const dosesCol = await doses();
      const meds = await medsCol.find({ householdId: new ObjectId(householdId), active: true }).toArray();
      const memDocs = await memCol.find({ householdId: new ObjectId(householdId) }).toArray();
      const recentDoses = await dosesCol
        .find({ householdId: new ObjectId(householdId) })
        .sort({ scheduledAt: -1 })
        .limit(20)
        .toArray();
      const memMap = new Map(memDocs.map((m) => [m._id?.toString(), m.name]));
      context = [
        `Members: ${memDocs.map((m) => m.name).join(', ')}`,
        `Medications: ${meds.map((m) => `${m.brandName} (${m.activeIngredients.map((i) => i.name).join(', ')}) for ${memMap.get(m.memberId.toString())}`).join('; ')}`,
        `Recent doses: ${recentDoses.map((d) => `${d.takenAt ? 'taken' : 'missed'} at ${d.scheduledAt.toISOString()}`).join('; ')}`,
      ].join('\n');
    }

    const answer = await geminiText(CLOUD_ANSWER_PROMPT(context, query));
    return NextResponse.json({ answer: answer.trim(), source: 'gemini' });
  } catch (e: any) {
    console.error('Voice query error', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
