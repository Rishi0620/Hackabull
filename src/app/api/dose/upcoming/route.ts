import { NextRequest, NextResponse } from 'next/server';
import { doses, ObjectId } from '@/lib/mongo';

export async function GET(req: NextRequest) {
  const householdId = req.nextUrl.searchParams.get('householdId');
  if (!householdId) return NextResponse.json({ error: 'householdId required' }, { status: 400 });
  try {
    const dosesCol = await doses();
    const now = new Date();
    const tomorrow = new Date(now.getTime() + 24 * 3600 * 1000);
    const upcoming = await dosesCol
      .find({
        householdId: new ObjectId(householdId),
        scheduledAt: { $gte: now, $lte: tomorrow },
        takenAt: null,
      })
      .sort({ scheduledAt: 1 })
      .toArray();
    return NextResponse.json({
      upcoming: upcoming.map((d) => ({
        ...d,
        _id: d._id?.toString(),
        medicationId: d.medicationId.toString(),
        memberId: d.memberId.toString(),
        householdId: d.householdId.toString(),
      })),
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
