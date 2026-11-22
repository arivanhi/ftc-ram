import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { researchGroups } from '@/db/schema';
import { requireAdminApi } from '@/lib/auth';
import { isValidUuid } from '@/lib/uuid';
import { researchGroupInputSchema } from '@/lib/validators';

export async function PATCH(req: Request, context: { params: Promise<{ uuid: string }> }) {
  const auth = await requireAdminApi();
  if ('response' in auth) return auth.response;

  const { uuid } = await context.params;
  if (!isValidUuid(uuid)) return NextResponse.json({ error: 'UUID tidak valid.' }, { status: 400 });

  try {
    const parsed = researchGroupInputSchema.partial().safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Data Kelompok Keilmuan tidak valid. Pastikan URL diawali http:// atau https://.' },
        { status: 400 },
      );
    }
    const [updated] = await db
      .update(researchGroups)
      .set({ ...parsed.data, updatedAt: new Date() })
      .where(eq(researchGroups.id, uuid))
      .returning();
    if (!updated) return NextResponse.json({ error: 'Kelompok Keilmuan tidak ditemukan.' }, { status: 404 });
    return NextResponse.json({ group: updated });
  } catch {
    return NextResponse.json({ error: 'Gagal memperbarui Kelompok Keilmuan.' }, { status: 400 });
  }
}

export async function DELETE(_req: Request, context: { params: Promise<{ uuid: string }> }) {
  const auth = await requireAdminApi();
  if ('response' in auth) return auth.response;

  const { uuid } = await context.params;
  if (!isValidUuid(uuid)) return NextResponse.json({ error: 'UUID tidak valid.' }, { status: 400 });

  const deleted = await db
    .delete(researchGroups)
    .where(eq(researchGroups.id, uuid))
    .returning({ id: researchGroups.id });
  if (!deleted[0]) return NextResponse.json({ error: 'Kelompok Keilmuan tidak ditemukan.' }, { status: 404 });
  return NextResponse.json({ id: uuid });
}
