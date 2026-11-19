import { NextResponse } from 'next/server';
import { asc } from 'drizzle-orm';
import { db } from '@/db';
import { buildings } from '@/db/schema';
import { requireAdminApi } from '@/lib/auth';
import { buildingInputSchema } from '@/lib/validators';

export async function GET() {
  const auth = await requireAdminApi();
  if ('response' in auth) return auth.response;
  const items = await db.select().from(buildings).orderBy(asc(buildings.sortOrder), asc(buildings.code));
  return NextResponse.json({ items });
}

export async function POST(req: Request) {
  const auth = await requireAdminApi();
  if ('response' in auth) return auth.response;
  try {
    const parsed = buildingInputSchema.safeParse(await req.json());
    if (!parsed.success) return NextResponse.json({ error: 'Data gedung tidak valid.' }, { status: 400 });
    const [created] = await db
      .insert(buildings)
      .values({ ...parsed.data, code: parsed.data.code.toUpperCase() })
      .returning();
    return NextResponse.json({ building: created }, { status: 201 });
  } catch (err: unknown) {
    if ((err as { code?: string })?.code === '23505') {
      return NextResponse.json({ error: 'Kode gedung sudah digunakan.' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Gagal menyimpan gedung.' }, { status: 400 });
  }
}
