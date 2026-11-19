import { NextResponse } from 'next/server';
import { asc } from 'drizzle-orm';
import { db } from '@/db';
import { contacts } from '@/db/schema';
import { requireAdminApi } from '@/lib/auth';
import { contactInputSchema } from '@/lib/validators';

export async function GET() {
  const auth = await requireAdminApi();
  if ('response' in auth) return auth.response;
  const items = await db.select().from(contacts).orderBy(asc(contacts.code));
  return NextResponse.json({ items });
}

export async function POST(req: Request) {
  const auth = await requireAdminApi();
  if ('response' in auth) return auth.response;
  try {
    const parsed = contactInputSchema.safeParse(await req.json());
    if (!parsed.success) return NextResponse.json({ error: 'Data narahubung tidak valid.' }, { status: 400 });
    const [created] = await db
      .insert(contacts)
      .values({ ...parsed.data, code: parsed.data.code.toUpperCase() })
      .returning();
    return NextResponse.json({ contact: created }, { status: 201 });
  } catch (err: unknown) {
    if ((err as { code?: string })?.code === '23505') {
      return NextResponse.json({ error: 'Kode narahubung sudah digunakan.' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Gagal menyimpan narahubung.' }, { status: 400 });
  }
}
