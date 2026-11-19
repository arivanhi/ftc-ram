import { NextResponse } from 'next/server';
import { desc, eq, ilike, inArray, or } from 'drizzle-orm';
import { db } from '@/db';
import { assets, loanItems, loans, rooms } from '@/db/schema';
import { sanitizePublicLoan, type RawLoanItemSummary } from '@/lib/loan-rules';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get('q') || '').trim();
  const status = (searchParams.get('status') || '').trim();

  let loanRows;
  let exactLookup = false;

  if (q) {
    exactLookup = true;
    loanRows = await db
      .select()
      .from(loans)
      .where(or(ilike(loans.ticketCode, q), ilike(loans.borrowerIdValue, q)))
      .orderBy(desc(loans.createdAt))
      .limit(20);
  } else {
    const allowedStatuses = status
      ? [status]
      : ['pending', 'approved', 'borrowed', 'returned'];
    loanRows = await db
      .select()
      .from(loans)
      .where(inArray(loans.status, allowedStatuses))
      .orderBy(desc(loans.createdAt))
      .limit(30);
  }

  const loanIds = loanRows.map((l) => l.id);
  const itemsByLoan = new Map<string, RawLoanItemSummary[]>();

  if (loanIds.length > 0) {
    const itemRows = await db
      .select({
        loanId: loanItems.loanId,
        assetId: assets.id,
        inventoryCode: assets.inventoryCode,
        assetName: assets.name,
        roomCode: rooms.code,
        roomName: rooms.name,
      })
      .from(loanItems)
      .innerJoin(assets, eq(loanItems.assetId, assets.id))
      .leftJoin(rooms, eq(assets.roomId, rooms.id))
      .where(inArray(loanItems.loanId, loanIds));

    for (const r of itemRows) {
      const list = itemsByLoan.get(r.loanId) ?? [];
      list.push({
        assetId: r.assetId,
        inventoryCode: r.inventoryCode,
        assetName: r.assetName,
        roomLabel: r.roomCode ? `${r.roomCode} - ${r.roomName}` : null,
      });
      itemsByLoan.set(r.loanId, list);
    }
  }

  return NextResponse.json({
    exactLookup,
    items: loanRows.map((l) =>
      sanitizePublicLoan({ ...l, items: itemsByLoan.get(l.id) ?? [] }, exactLookup),
    ),
  });
}
