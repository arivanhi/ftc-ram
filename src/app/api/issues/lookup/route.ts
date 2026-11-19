import { NextResponse } from 'next/server';
import { ilike } from 'drizzle-orm';
import { db } from '@/db';
import { issueTickets } from '@/db/schema';
import { sanitizePublicIssue } from '@/lib/loan-rules';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const code = (searchParams.get('code') || '').trim();
  if (!code) {
    return NextResponse.json({ ticket: null });
  }

  const rows = await db
    .select()
    .from(issueTickets)
    .where(ilike(issueTickets.ticketCode, code))
    .limit(1);

  return NextResponse.json({ ticket: rows[0] ? sanitizePublicIssue(rows[0]) : null });
}
