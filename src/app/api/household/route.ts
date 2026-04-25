import { NextRequest, NextResponse } from 'next/server';
import { households, members, ObjectId } from '@/lib/mongo';
import { generateHouseholdCode, pickMemberColor } from '@/lib/utils';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, firstMemberName } = body as { name: string; firstMemberName: string };

    const code = generateHouseholdCode();
    const householdsCol = await households();
    const insert = await householdsCol.insertOne({
      code,
      name: name || 'My Household',
      createdAt: new Date(),
      preferredLanguage: 'en',
      accessibility: {
        largeText: true,
        highContrast: false,
        voiceFirst: true,
        readingLevel: 6,
      },
    });

    const membersCol = await members();
    const member = await membersCol.insertOne({
      householdId: insert.insertedId,
      name: firstMemberName || 'Me',
      avatarColor: pickMemberColor(0),
      createdAt: new Date(),
    });

    return NextResponse.json({
      householdId: insert.insertedId.toString(),
      code,
      name: name || 'My Household',
      activeMemberId: member.insertedId.toString(),
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
  try {
    const householdsCol = await households();
    const membersCol = await members();
    const h = await householdsCol.findOne({ _id: new ObjectId(id) });
    if (!h) return NextResponse.json({ error: 'not found' }, { status: 404 });
    const memberDocs = await membersCol.find({ householdId: h._id }).toArray();
    return NextResponse.json({
      household: { ...h, _id: h._id.toString() },
      members: memberDocs.map((m) => ({ ...m, _id: m._id?.toString(), householdId: m.householdId.toString() })),
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
