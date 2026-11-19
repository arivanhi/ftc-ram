import { NextResponse } from 'next/server';
import { asc } from 'drizzle-orm';
import { db } from '@/db';
import { rooms } from '@/db/schema';
import { requireAdminApi } from '@/lib/auth';
import { roomInputSchema } from '@/lib/validators';

export async function GET() {
  const auth = await requireAdminApi();
  if ('response' in auth) return auth.response;
  const items = await db.select().from(rooms).orderBy(asc(rooms.sortOrder), asc(rooms.code));
  return NextResponse.json({ items });
}

export async function POST(req: Request) {
  const auth = await requireAdminApi();
  if ('response' in auth) return auth.response;
  try {
    const parsed = roomInputSchema.safeParse(await req.json());
    if (!parsed.success) return NextResponse.json({ error: 'Data ruangan tidak valid.' }, { status: 400 });
    const [created] = await db
      .insert(rooms)
      .values({ ...parsed.data, code: parsed.data.code.toUpperCase() })
      .returning();
    return NextResponse.json({ room: created }, { status: 201 });
  } catch (err: unknown) {
    if ((err as { code?: string })?.code === '23505') {
      return NextResponse.json({ error: 'Kode ruangan sudah digunakan.' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Gagal menyimpan ruangan.' }, { status: 400 });
  }
}
