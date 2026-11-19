import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { buildings } from '@/db/schema';
import { requireAdminApi } from '@/lib/auth';
import { isValidUuid } from '@/lib/uuid';
import { buildingInputSchema } from '@/lib/validators';

export async function PATCH(req: Request, context: { params: Promise<{ uuid: string }> }) {
  const auth = await requireAdminApi();
  if ('response' in auth) return auth.response;
  const { uuid } = await context.params;
  if (!isValidUuid(uuid)) return NextResponse.json({ error: 'UUID tidak valid.' }, { status: 400 });

  try {
    const parsed = buildingInputSchema.partial().safeParse(await req.json());
    if (!parsed.success) return NextResponse.json({ error: 'Data gedung tidak valid.' }, { status: 400 });
    const [updated] = await db
      .update(buildings)
      .set({
        ...parsed.data,
        ...(parsed.data.code ? { code: parsed.data.code.toUpperCase() } : {}),
        updatedAt: new Date(),
      })
      .where(eq(buildings.id, uuid))
      .returning();
    if (!updated) return NextResponse.json({ error: 'Gedung tidak ditemukan.' }, { status: 404 });
    return NextResponse.json({ building: updated });
  } catch (err: unknown) {
    if ((err as { code?: string })?.code === '23505') {
      return NextResponse.json({ error: 'Kode gedung sudah digunakan.' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Gagal memperbarui gedung.' }, { status: 400 });
  }
}

export async function DELETE(_req: Request, context: { params: Promise<{ uuid: string }> }) {
  const auth = await requireAdminApi();
  if ('response' in auth) return auth.response;
  const { uuid } = await context.params;
  if (!isValidUuid(uuid)) return NextResponse.json({ error: 'UUID tidak valid.' }, { status: 400 });
  const deleted = await db.delete(buildings).where(eq(buildings.id, uuid)).returning({ id: buildings.id });
  if (!deleted[0]) return NextResponse.json({ error: 'Gedung tidak ditemukan.' }, { status: 404 });
  return NextResponse.json({ id: uuid });
}
