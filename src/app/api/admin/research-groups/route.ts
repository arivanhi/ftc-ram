import { NextResponse } from 'next/server';
import { asc } from 'drizzle-orm';
import { db } from '@/db';
import { researchGroups } from '@/db/schema';
import { requireAdminApi } from '@/lib/auth';
import { researchGroupInputSchema } from '@/lib/validators';

export async function GET() {
  const auth = await requireAdminApi();
  if ('response' in auth) return auth.response;

  const items = await db
    .select()
    .from(researchGroups)
    .orderBy(asc(researchGroups.sortOrder), asc(researchGroups.name));
  return NextResponse.json({ items });
}

export async function POST(req: Request) {
  const auth = await requireAdminApi();
  if ('response' in auth) return auth.response;

  try {
    const parsed = researchGroupInputSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Data Kelompok Keilmuan tidak valid. Pastikan URL diawali http:// atau https://.' },
        { status: 400 },
      );
    }
    const [created] = await db.insert(researchGroups).values(parsed.data).returning();
    return NextResponse.json({ group: created }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Gagal menyimpan Kelompok Keilmuan.' }, { status: 400 });
  }
}
