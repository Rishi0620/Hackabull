import { NextRequest, NextResponse } from 'next/server';
import { medications, members, ObjectId } from '@/lib/mongo';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const medsCol = await medications();
    const memCol = await members();
    const med = await medsCol.findOne({ _id: new ObjectId(id) });
    if (!med) return NextResponse.json({ error: 'not found' }, { status: 404 });
    const member = await memCol.findOne({ _id: med.memberId });
    return NextResponse.json({
      medication: {
        ...med,
        _id: med._id?.toString(),
        householdId: med.householdId.toString(),
        memberId: med.memberId.toString(),
      },
      member: member ? { ...member, _id: member._id?.toString(), householdId: member.householdId.toString() } : null,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const medsCol = await medications();
    await medsCol.updateOne({ _id: new ObjectId(id) }, { $set: { active: false } });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
