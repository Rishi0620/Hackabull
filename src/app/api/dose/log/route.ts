import { NextRequest, NextResponse } from 'next/server';
import { doses, medications, ObjectId } from '@/lib/mongo';

export async function POST(req: NextRequest) {
  try {
    const { medicationId, source } = await req.json();
    const medsCol = await medications();
    const med = await medsCol.findOne({ _id: new ObjectId(medicationId) });
    if (!med) return NextResponse.json({ error: 'medication not found' }, { status: 404 });

    const dosesCol = await doses();
    const now = new Date();
    const windowStart = new Date(now.getTime() - 4 * 3600 * 1000); // 4h back
    const windowEnd = new Date(now.getTime() + 4 * 3600 * 1000);   // 4h forward

    // Find an untaken scheduled dose within the ±4h window
    const pending = await dosesCol.findOne({
      medicationId: med._id!,
      takenAt: null,
      scheduledAt: { $gte: windowStart, $lte: windowEnd },
    });

    let doseId: string;
    if (pending) {
      // Mark the existing scheduled dose as taken
      await dosesCol.updateOne(
        { _id: pending._id },
        { $set: { takenAt: now, source: source || 'manual' } }
      );
      doseId = pending._id!.toString();
    } else {
      // No scheduled dose found — create a new ad-hoc log entry
      const result = await dosesCol.insertOne({
        medicationId: med._id!,
        memberId: med.memberId,
        householdId: med.householdId,
        scheduledAt: now,
        takenAt: now,
        source: source || 'manual',
      });
      doseId = result.insertedId.toString();
    }

    return NextResponse.json({ doseId });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
