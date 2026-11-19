import { NextResponse } from 'next/server';
import { desc, eq, inArray } from 'drizzle-orm';
import { db } from '@/db';
import { assets, loanItems, loans, rooms } from '@/db/schema';
import { requireAdminApi } from '@/lib/auth';

export async function GET(req: Request) {
  const auth = await requireAdminApi();
  if ('response' in auth) return auth.response;

  const status = new URL(req.url).searchParams.get('status') || '';
  const loanRows = await db
    .select()
    .from(loans)
    .where(status ? eq(loans.status, status) : undefined)
    .orderBy(desc(loans.createdAt));

  const loanIds = loanRows.map((l) => l.id);
  const itemsMap = new Map<
    string,
    Array<{
      id: string;
      assetId: string;
      inventoryCode: string;
      assetName: string;
      condition: string;
      availability: string;
      roomCode: string | null;
      returnCondition: string | null;
      returnNotes: string | null;
    }>
  >();

  if (loanIds.length > 0) {
    const rows = await db
      .select({
        id: loanItems.id,
        loanId: loanItems.loanId,
        assetId: assets.id,
        inventoryCode: assets.inventoryCode,
        assetName: assets.name,
        condition: assets.condition,
        availability: assets.availability,
        roomCode: rooms.code,
        returnCondition: loanItems.returnCondition,
        returnNotes: loanItems.returnNotes,
      })
      .from(loanItems)
      .innerJoin(assets, eq(loanItems.assetId, assets.id))
      .leftJoin(rooms, eq(assets.roomId, rooms.id))
      .where(inArray(loanItems.loanId, loanIds));

    for (const r of rows) {
      const list = itemsMap.get(r.loanId) ?? [];
      list.push({
        id: r.id,
        assetId: r.assetId,
        inventoryCode: r.inventoryCode,
        assetName: r.assetName,
        condition: r.condition,
        availability: r.availability,
        roomCode: r.roomCode,
        returnCondition: r.returnCondition,
        returnNotes: r.returnNotes,
      });
      itemsMap.set(r.loanId, list);
    }
  }

  return NextResponse.json({
    items: loanRows.map((l) => ({ ...l, items: itemsMap.get(l.id) ?? [] })),
  });
}
