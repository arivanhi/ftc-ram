import { NextResponse } from 'next/server';
import { asc, eq, isNull, or, sql } from 'drizzle-orm';
import { db } from '@/db';
import { assets, contacts, issueTickets } from '@/db/schema';

export async function GET() {
  const [contactRows, assetCounts, openTickets] = await Promise.all([
    db.select().from(contacts).orderBy(asc(contacts.code)),
    db
      .select({
        contactId: assets.contactId,
        count: sql<number>`count(*)::int`,
      })
      .from(assets)
      .where(isNull(assets.archivedAt))
      .groupBy(assets.contactId),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(issueTickets)
      .where(or(eq(issueTickets.status, 'open'), eq(issueTickets.status, 'in_progress'))),
  ]);

  const countMap = new Map<string, number>();
  for (const r of assetCounts) {
    if (r.contactId) countMap.set(r.contactId, r.count);
  }

  return NextResponse.json({
    items: contactRows.map((c) => ({ ...c, handledAssetCount: countMap.get(c.id) ?? 0 })),
    openIssueCount: openTickets[0]?.count ?? 0,
  });
}
