import { NextResponse } from 'next/server';
import { and, desc, eq, isNull, or, sql } from 'drizzle-orm';
import { db } from '@/db';
import { assets, issueTickets, loans, rooms } from '@/db/schema';
import { requireAdminApi } from '@/lib/auth';

export async function GET() {
  const auth = await requireAdminApi();
  if ('response' in auth) return auth.response;

  const [kpiRows, pendingLoans, openIssues, attentionAssets] = await Promise.all([
    db
      .select({
        totalAssets: sql<number>`count(*)::int`,
        primaAssets: sql<number>`count(*) filter (where ${assets.condition} = 'prima')::int`,
        maintenanceAssets: sql<number>`count(*) filter (where ${assets.condition} = 'maintenance')::int`,
        rusakAssets: sql<number>`count(*) filter (where ${assets.condition} = 'rusak')::int`,
        borrowedAssets: sql<number>`count(*) filter (where ${assets.availability} = 'dipinjam')::int`,
      })
      .from(assets)
      .where(isNull(assets.archivedAt)),
    db
      .select()
      .from(loans)
      .where(eq(loans.status, 'pending'))
      .orderBy(desc(loans.createdAt))
      .limit(10),
    db
      .select()
      .from(issueTickets)
      .where(or(eq(issueTickets.status, 'open'), eq(issueTickets.status, 'in_progress')))
      .orderBy(desc(issueTickets.createdAt))
      .limit(10),
    db
      .select({
        id: assets.id,
        inventoryCode: assets.inventoryCode,
        name: assets.name,
        condition: assets.condition,
        availability: assets.availability,
        roomCode: rooms.code,
      })
      .from(assets)
      .leftJoin(rooms, eq(assets.roomId, rooms.id))
      .where(and(isNull(assets.archivedAt), or(eq(assets.condition, 'rusak'), eq(assets.condition, 'maintenance'))))
      .orderBy(desc(assets.updatedAt))
      .limit(10),
  ]);

  return NextResponse.json({
    kpis: kpiRows[0] ?? {
      totalAssets: 0,
      primaAssets: 0,
      maintenanceAssets: 0,
      rusakAssets: 0,
      borrowedAssets: 0,
    },
    pendingLoans,
    openIssues,
    attentionAssets,
  });
}
