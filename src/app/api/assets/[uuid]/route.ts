import { NextResponse } from 'next/server';
import { and, asc, eq, inArray, isNull } from 'drizzle-orm';
import { db } from '@/db';
import { assets, buildings, contacts, floors, loanItems, loans, rooms, tutorials } from '@/db/schema';
import { isValidUuid } from '@/lib/uuid';

export async function GET(
  _req: Request,
  context: { params: Promise<{ uuid: string }> },
) {
  const { uuid } = await context.params;
  if (!isValidUuid(uuid)) {
    return NextResponse.json({ error: 'ID aset harus berupa UUID yang valid.' }, { status: 400 });
  }

  const rows = await db
    .select({
      asset: assets,
      room: rooms,
      floor: floors,
      building: buildings,
      contact: contacts,
    })
    .from(assets)
    .leftJoin(rooms, eq(assets.roomId, rooms.id))
    .leftJoin(floors, eq(rooms.floorId, floors.id))
    .leftJoin(buildings, eq(floors.buildingId, buildings.id))
    .leftJoin(contacts, eq(assets.contactId, contacts.id))
    .where(and(eq(assets.id, uuid), isNull(assets.archivedAt)))
    .limit(1);

  if (!rows[0]) {
    return NextResponse.json({ error: 'Aset tidak ditemukan.' }, { status: 404 });
  }

  const [linkedTutorials, activeBookings] = await Promise.all([
    db.select().from(tutorials).where(eq(tutorials.assetId, uuid)).orderBy(asc(tutorials.docCode)),
    db
      .select({
        startDate: loans.startDate,
        endDate: loans.endDate,
        status: loans.status,
        purposeTitle: loans.purposeTitle,
      })
      .from(loanItems)
      .innerJoin(loans, eq(loanItems.loanId, loans.id))
      .where(and(eq(loanItems.assetId, uuid), inArray(loans.status, ['approved', 'borrowed'])))
      .orderBy(asc(loans.startDate)),
  ]);

  return NextResponse.json({
    ...rows[0].asset,
    room: rows[0].room,
    floor: rows[0].floor,
    building: rows[0].building,
    contact: rows[0].contact,
    tutorials: linkedTutorials,
    activeBookings,
  });
}
