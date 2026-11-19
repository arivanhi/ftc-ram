import { NextResponse } from 'next/server';
import { and, eq, ilike, isNull, or } from 'drizzle-orm';
import { db } from '@/db';
import { assets, buildings, floors, rooms } from '@/db/schema';
import { isValidUuid } from '@/lib/uuid';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get('q') || '').trim();
  const assetId = (searchParams.get('assetId') || '').trim();

  if (!q && !assetId) {
    return NextResponse.json({ match: null });
  }
  if (assetId && !isValidUuid(assetId)) {
    return NextResponse.json({ error: 'Parameter assetId harus UUID valid.' }, { status: 400 });
  }

  const filter = assetId
    ? and(isNull(assets.archivedAt), eq(assets.id, assetId))
    : and(
        isNull(assets.archivedAt),
        or(
          ilike(assets.name, `%${q}%`),
          ilike(assets.inventoryCode, `%${q}%`),
          ilike(assets.placementDetail, `%${q}%`),
          ilike(rooms.code, `%${q}%`),
          ilike(rooms.name, `%${q}%`),
        ),
      );

  const rows = await db
    .select({
      assetId: assets.id,
      assetName: assets.name,
      inventoryCode: assets.inventoryCode,
      placementDetail: assets.placementDetail,
      roomId: rooms.id,
      roomCode: rooms.code,
      roomName: rooms.name,
      floorId: floors.id,
      buildingId: buildings.id,
    })
    .from(assets)
    .innerJoin(rooms, eq(assets.roomId, rooms.id))
    .innerJoin(floors, eq(rooms.floorId, floors.id))
    .innerJoin(buildings, eq(floors.buildingId, buildings.id))
    .where(filter)
    .limit(1);

  return NextResponse.json({ match: rows[0] ?? null });
}
