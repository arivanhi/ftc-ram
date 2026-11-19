import { NextResponse } from 'next/server';
import { db } from '@/db';
import { floors } from '@/db/schema';
import { requireAdminApi } from '@/lib/auth';
import { floorInputSchema } from '@/lib/validators';

export async function POST(req: Request) {
  const auth = await requireAdminApi();
  if ('response' in auth) return auth.response;
  try {
    const parsed = floorInputSchema.safeParse(await req.json());
    if (!parsed.success) return NextResponse.json({ error: 'Data lantai tidak valid.' }, { status: 400 });
    const [created] = await db.insert(floors).values(parsed.data).returning();
    return NextResponse.json({ floor: created }, { status: 201 });
  } catch (err: unknown) {
    if ((err as { code?: string })?.code === '23505') {
      return NextResponse.json({ error: 'Nomor lantai sudah ada di gedung ini.' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Gagal menambah lantai.' }, { status: 400 });
  }
}
