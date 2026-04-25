import { NextRequest, NextResponse } from 'next/server';
import { medications, members, doses, ObjectId } from '@/lib/mongo';

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

    // Only today's doses — not 35 days of history
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    const todayDoses = await dosesCol
      .find({
        householdId: new ObjectId(householdId),
        scheduledAt: { $gte: startOfDay, $lte: endOfDay },
      })
      .toArray();

    // Deduplicate by (medicationId, scheduledHour) — seed creates duplicate entries
    const seen = new Set<string>();
    const dedupedDoses = todayDoses.filter((d) => {
      const hour = new Date(d.scheduledAt).getHours();
      const key = `${d.medicationId.toString()}|${hour}|${d.takenAt ? 'taken' : 'pending'}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    // Filter out non-medication items (e.g. test scans like "Clif Bar")
    const realMeds = meds.filter((m) => {
      const name = m.brandName.toLowerCase();
      const nonMedKeywords = ['clif', 'bar', 'snack', 'food', 'drink'];
      return !nonMedKeywords.some((k) => name.includes(k));
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
          medication: medMap.get(d.medicationId.toString()) || '',
          member: memMap.get(d.memberId.toString()) || '',
          takenAt: d.takenAt?.toISOString() || null,
          scheduledAt: d.scheduledAt.toISOString(),
        })),
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
