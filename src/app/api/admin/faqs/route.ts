import { NextResponse } from 'next/server';
import { asc } from 'drizzle-orm';
import { db } from '@/db';
import { faqs } from '@/db/schema';
import { requireAdminApi } from '@/lib/auth';
import { faqInputSchema } from '@/lib/validators';

export async function GET() {
  const auth = await requireAdminApi();
  if ('response' in auth) return auth.response;
  const items = await db.select().from(faqs).orderBy(asc(faqs.sortOrder), asc(faqs.createdAt));
  return NextResponse.json({ items });
}

export async function POST(req: Request) {
  const auth = await requireAdminApi();
  if ('response' in auth) return auth.response;
  try {
    const parsed = faqInputSchema.safeParse(await req.json());
    if (!parsed.success) return NextResponse.json({ error: 'Data FAQ tidak valid.' }, { status: 400 });
    const [created] = await db.insert(faqs).values(parsed.data).returning();
    return NextResponse.json({ faq: created }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Gagal menyimpan FAQ.' }, { status: 400 });
  }
}
