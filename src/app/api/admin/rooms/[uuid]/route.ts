import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { rooms } from '@/db/schema';
import { requireAdminApi } from '@/lib/auth';
import { isValidUuid } from '@/lib/uuid';
import { roomInputSchema } from '@/lib/validators';

export async function PATCH(req: Request, context: { params: Promise<{ uuid: string }> }) {
  const auth = await requireAdminApi();
  if ('response' in auth) return auth.response;
  const { uuid } = await context.params;
  if (!isValidUuid(uuid)) return NextResponse.json({ error: 'UUID tidak valid.' }, { status: 400 });

  try {
    const parsed = roomInputSchema.partial().safeParse(await req.json());
    if (!parsed.success) return NextResponse.json({ error: 'Data ruangan tidak valid.' }, { status: 400 });
    const [updated] = await db
      .update(rooms)
      .set({
        ...parsed.data,
        ...(parsed.data.code ? { code: parsed.data.code.toUpperCase() } : {}),
        updatedAt: new Date(),
      })
      .where(eq(rooms.id, uuid))
      .returning();
    if (!updated) return NextResponse.json({ error: 'Ruangan tidak ditemukan.' }, { status: 404 });
    return NextResponse.json({ room: updated });
  } catch (err: unknown) {
    if ((err as { code?: string })?.code === '23505') {
      return NextResponse.json({ error: 'Kode ruangan sudah digunakan.' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Gagal memperbarui ruangan.' }, { status: 400 });
  }
}

export async function DELETE(_req: Request, context: { params: Promise<{ uuid: string }> }) {
  const auth = await requireAdminApi();
  if ('response' in auth) return auth.response;
  const { uuid } = await context.params;
  if (!isValidUuid(uuid)) return NextResponse.json({ error: 'UUID tidak valid.' }, { status: 400 });
  const deleted = await db.delete(rooms).where(eq(rooms.id, uuid)).returning({ id: rooms.id });
  if (!deleted[0]) return NextResponse.json({ error: 'Ruangan tidak ditemukan.' }, { status: 404 });
  return NextResponse.json({ id: uuid });
}
