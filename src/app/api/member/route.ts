import { NextRequest, NextResponse } from 'next/server';
import { members, ObjectId } from '@/lib/mongo';
import { pickMemberColor } from '@/lib/utils';

export async function POST(req: NextRequest) {
  try {
    const { householdId, name, age, conditions, allergies, index } = await req.json();
    const col = await members();
    const result = await col.insertOne({
      householdId: new ObjectId(householdId),
      name,
      age,
      conditions,
      allergies,
      avatarColor: pickMemberColor(index || 0),
      createdAt: new Date(),
    });
    return NextResponse.json({ memberId: result.insertedId.toString() });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
