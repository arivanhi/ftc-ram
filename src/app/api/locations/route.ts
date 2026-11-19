import { NextResponse } from 'next/server';
import { asc, isNull } from 'drizzle-orm';
import { db } from '@/db';
import { assets, buildings, floors, rooms } from '@/db/schema';

export async function GET() {
  const [bRows, fRows, rRows, aRows] = await Promise.all([
    db.select().from(buildings).orderBy(asc(buildings.sortOrder), asc(buildings.code)),
    db.select().from(floors).orderBy(asc(floors.floorNumber)),
    db.select().from(rooms).orderBy(asc(rooms.sortOrder), asc(rooms.code)),
    db
      .select({
        id: assets.id,
        inventoryCode: assets.inventoryCode,
        name: assets.name,
        category: assets.category,
        condition: assets.condition,
        availability: assets.availability,
        roomId: assets.roomId,
        placementDetail: assets.placementDetail,
        completionDate: assets.completionDate,
      })
      .from(assets)
      .where(isNull(assets.archivedAt))
      .orderBy(asc(assets.inventoryCode)),
  ]);

  const assetsByRoom = new Map<string, typeof aRows>();
  for (const a of aRows) {
    if (!a.roomId) continue;
    const list = assetsByRoom.get(a.roomId) ?? [];
    list.push(a);
    assetsByRoom.set(a.roomId, list);
  }

  const roomsByFloor = new Map<string, Array<(typeof rRows)[number] & { assets: typeof aRows }>>();
  for (const r of rRows) {
    const list = roomsByFloor.get(r.floorId) ?? [];
    list.push({ ...r, assets: assetsByRoom.get(r.id) ?? [] });
    roomsByFloor.set(r.floorId, list);
  }

  const floorsByBuilding = new Map<
    string,
    Array<
      (typeof fRows)[number] & {
        rooms: Array<(typeof rRows)[number] & { assets: typeof aRows }>;
        metrics: { total: number; prima: number; attention: number; dipinjam: number };
      }
    >
  >();
  for (const f of fRows) {
    const floorRooms = roomsByFloor.get(f.id) ?? [];
    const floorAssets = floorRooms.flatMap((r) => r.assets);
    const metrics = {
      total: floorAssets.length,
      prima: floorAssets.filter((a) => a.condition === 'prima').length,
      attention: floorAssets.filter((a) => a.condition === 'maintenance' || a.condition === 'rusak').length,
      dipinjam: floorAssets.filter((a) => a.availability === 'dipinjam').length,
    };
    const list = floorsByBuilding.get(f.buildingId) ?? [];
    list.push({ ...f, rooms: floorRooms, metrics });
    floorsByBuilding.set(f.buildingId, list);
  }

  return NextResponse.json({
    buildings: bRows.map((b) => ({ ...b, floors: floorsByBuilding.get(b.id) ?? [] })),
  });
}
