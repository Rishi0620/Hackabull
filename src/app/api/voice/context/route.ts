import { NextRequest, NextResponse } from 'next/server';
import { medications, members, doses, ObjectId } from '@/lib/mongo';

function parseDoseTimes(instructions: string): number[] {
  const s = instructions.toLowerCase();
  if (s.includes('twice') || s.includes('two times') || s.includes('b.i.d') || s.includes('bid')) return [8, 20];
  if (s.includes('three') || s.includes('t.i.d') || s.includes('tid')) return [8, 14, 20];
  if (s.includes('four') || s.includes('q.i.d') || s.includes('qid')) return [8, 12, 16, 20];
  if (s.includes('bedtime') || s.includes('at night') || s.includes('evening')) return [21];
  if (s.includes('morning') || s.includes('breakfast')) return [8];
  return [8];
}

function scheduledAtForHour(hour: number): Date {
  const d = new Date();
  d.setHours(hour, 0, 0, 0);
  return d;
}

export async function GET(req: NextRequest) {
  const householdId = req.nextUrl.searchParams.get('householdId');
  if (!householdId) return NextResponse.json({ error: 'householdId required' }, { status: 400 });
  try {
    const medsCol = await medications();
    const memCol = await members();
    const dosesCol = await doses();

    const meds = await medsCol.find({ householdId: new ObjectId(householdId), active: true }).toArray();
    const memDocs = await memCol.find({ householdId: new ObjectId(householdId) }).toArray();
    const memMap = new Map(memDocs.map((m) => [m._id?.toString(), m.name]));

    const startOfDay = new Date(); startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(); endOfDay.setHours(23, 59, 59, 999);

    let todayDoses = await dosesCol
      .find({ householdId: new ObjectId(householdId), scheduledAt: { $gte: startOfDay, $lte: endOfDay } })
      .toArray();

    // Auto-generate today's dose entries if medications exist but no doses for today.
    // This happens when bottles were scanned on a previous day — doses are only created
    // at scan time, so they go stale after 24-48h.
    const realMeds = meds.filter((m) => {
      const name = m.brandName.toLowerCase();
      return !['clif', 'bar', 'snack', 'food', 'drink'].some((k) => name.includes(k));
    });

    if (todayDoses.length === 0 && realMeds.length > 0) {
      const newDoses: any[] = [];
      for (const med of realMeds) {
        const hours = parseDoseTimes(med.dosage.raw);
        for (const hour of hours) {
          newDoses.push({
            medicationId: med._id!,
            memberId: med.memberId,
            householdId: new ObjectId(householdId),
            scheduledAt: scheduledAtForHour(hour),
            takenAt: null,
            source: 'auto',
          });
        }
      }
      if (newDoses.length > 0) {
        await dosesCol.insertMany(newDoses);
        todayDoses = await dosesCol
          .find({ householdId: new ObjectId(householdId), scheduledAt: { $gte: startOfDay, $lte: endOfDay } })
          .toArray();
      }
    }

    // Deduplicate by (medicationId, scheduledHour, status)
    const seen = new Set<string>();
    const dedupedDoses = todayDoses.filter((d) => {
      const hour = new Date(d.scheduledAt).getHours();
      const key = `${d.medicationId.toString()}|${hour}|${d.takenAt ? 'taken' : 'pending'}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    const medMap = new Map(realMeds.map((m) => [m._id?.toString(), m.brandName]));

    return NextResponse.json({
      members: memDocs.map((m) => ({ id: m._id?.toString(), name: m.name })),
      medications: realMeds.map((m) => ({
        name: m.brandName,
        member: memMap.get(m.memberId.toString()) || 'unknown',
        dosage: m.dosage.raw,
      })),
      recentDoses: dedupedDoses
        .filter((d) => medMap.has(d.medicationId.toString()))
        .map((d) => ({
          doseId: d._id?.toString() || null,
          medicationId: d.medicationId.toString(),
          medication: medMap.get(d.medicationId.toString()) || '',
          member: memMap.get(d.memberId.toString()) || '',
          takenAt: d.takenAt?.toISOString() || null,
          scheduledAt: d.scheduledAt.toISOString(),
        }))
        .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime()),
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
