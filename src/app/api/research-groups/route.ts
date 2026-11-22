import { NextResponse } from 'next/server';
import { asc } from 'drizzle-orm';
import { db } from '@/db';
import { researchGroups } from '@/db/schema';

export const dynamic = 'force-dynamic';

export async function GET() {
  const items = await db
    .select({
      id: researchGroups.id,
      name: researchGroups.name,
      url: researchGroups.url,
      description: researchGroups.description,
      sortOrder: researchGroups.sortOrder,
    })
    .from(researchGroups)
    .orderBy(asc(researchGroups.sortOrder), asc(researchGroups.name));
  return NextResponse.json({ items });
}
