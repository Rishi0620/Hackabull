import { NextRequest, NextResponse } from 'next/server';
import { medications, members, ObjectId } from '@/lib/mongo';

export async function GET(req: NextRequest) {
  const householdId = req.nextUrl.searchParams.get('householdId');
  if (!householdId) return NextResponse.json({ error: 'householdId required' }, { status: 400 });
  try {
    const medsCol = await medications();
    const memCol = await members();
    const meds = await medsCol
      .find({ householdId: new ObjectId(householdId), active: true })
      .sort({ firstScannedAt: -1 })
      .toArray();
    const memDocs = await memCol.find({ householdId: new ObjectId(householdId) }).toArray();
    const memMap = new Map(memDocs.map((m) => [m._id?.toString(), m]));

    return NextResponse.json({
      medications: meds.map((m) => ({
        ...m,
        _id: m._id?.toString(),
        householdId: m.householdId.toString(),
        memberId: m.memberId.toString(),
        member: memMap.get(m.memberId.toString())
          ? {
              name: memMap.get(m.memberId.toString())!.name,
              avatarColor: memMap.get(m.memberId.toString())!.avatarColor,
            }
          : null,
      })),
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
