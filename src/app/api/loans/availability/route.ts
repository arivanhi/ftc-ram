import { NextResponse } from 'next/server';
import { and, asc, eq, inArray } from 'drizzle-orm';
import { db } from '@/db';
import { loanItems, loans } from '@/db/schema';
import { isValidUuid } from '@/lib/uuid';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const assetId = searchParams.get('assetId') || '';
  if (!isValidUuid(assetId)) {
    return NextResponse.json({ error: 'Parameter assetId harus UUID valid.' }, { status: 400 });
  }

  const bookings = await db
    .select({
      ticketCode: loans.ticketCode,
      purposeTitle: loans.purposeTitle,
      startDate: loans.startDate,
      endDate: loans.endDate,
      dailySession: loans.dailySession,
      status: loans.status,
    })
    .from(loanItems)
    .innerJoin(loans, eq(loanItems.loanId, loans.id))
    .where(and(eq(loanItems.assetId, assetId), inArray(loans.status, ['approved', 'borrowed'])))
    .orderBy(asc(loans.startDate));

  return NextResponse.json({ assetId, bookings });
}
