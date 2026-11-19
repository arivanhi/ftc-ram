import { NextResponse } from 'next/server';
import { desc } from 'drizzle-orm';
import { db } from '@/db';
import { tutorials } from '@/db/schema';
import { requireAdminApi } from '@/lib/auth';
import { tutorialInputSchema } from '@/lib/validators';

export async function GET() {
  const auth = await requireAdminApi();
  if ('response' in auth) return auth.response;
  const items = await db.select().from(tutorials).orderBy(desc(tutorials.updatedAt));
  return NextResponse.json({ items });
}

export async function POST(req: Request) {
  const auth = await requireAdminApi();
  if ('response' in auth) return auth.response;
  try {
    const parsed = tutorialInputSchema.safeParse(await req.json());
    if (!parsed.success) return NextResponse.json({ error: 'Data tutorial tidak valid.' }, { status: 400 });
    const [created] = await db
      .insert(tutorials)
      .values({ ...parsed.data, docCode: parsed.data.docCode.toUpperCase() })
      .returning();
    return NextResponse.json({ tutorial: created }, { status: 201 });
  } catch (err: unknown) {
    if ((err as { code?: string })?.code === '23505') {
      return NextResponse.json({ error: 'Kode dokumen SOP/Tutorial sudah digunakan.' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Gagal menyimpan tutorial.' }, { status: 400 });
  }
}
