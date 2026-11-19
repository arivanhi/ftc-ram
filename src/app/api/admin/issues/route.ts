import { NextResponse } from 'next/server';
import { desc, eq } from 'drizzle-orm';
import { db } from '@/db';
import { assets, contacts, issueTickets } from '@/db/schema';
import { requireAdminApi } from '@/lib/auth';

export async function GET(req: Request) {
  const auth = await requireAdminApi();
  if ('response' in auth) return auth.response;

  const status = new URL(req.url).searchParams.get('status') || '';
  const rows = await db
    .select({
      ticket: issueTickets,
      assetName: assets.name,
      assetCondition: assets.condition,
      contactName: contacts.name,
    })
    .from(issueTickets)
    .leftJoin(assets, eq(issueTickets.assetId, assets.id))
    .leftJoin(contacts, eq(issueTickets.assignedContactId, contacts.id))
    .where(status ? eq(issueTickets.status, status) : undefined)
    .orderBy(desc(issueTickets.createdAt));

  return NextResponse.json({
    items: rows.map((r) => ({
      ...r.ticket,
      assetName: r.assetName,
      assetCondition: r.assetCondition,
      contactName: r.contactName,
    })),
  });
}
