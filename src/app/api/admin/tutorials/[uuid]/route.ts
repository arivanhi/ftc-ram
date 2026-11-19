import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { tutorials } from '@/db/schema';
import { requireAdminApi } from '@/lib/auth';
import { isValidUuid } from '@/lib/uuid';
import { tutorialInputSchema } from '@/lib/validators';

export async function PATCH(req: Request, context: { params: Promise<{ uuid: string }> }) {
  const auth = await requireAdminApi();
  if ('response' in auth) return auth.response;
  const { uuid } = await context.params;
  if (!isValidUuid(uuid)) return NextResponse.json({ error: 'UUID tidak valid.' }, { status: 400 });
  try {
    const parsed = tutorialInputSchema.partial().safeParse(await req.json());
    if (!parsed.success) return NextResponse.json({ error: 'Data tutorial tidak valid.' }, { status: 400 });
    const [updated] = await db
      .update(tutorials)
      .set({
        ...parsed.data,
        ...(parsed.data.docCode ? { docCode: parsed.data.docCode.toUpperCase() } : {}),
        updatedAt: new Date(),
      })
      .where(eq(tutorials.id, uuid))
      .returning();
    if (!updated) return NextResponse.json({ error: 'Tutorial tidak ditemukan.' }, { status: 404 });
    return NextResponse.json({ tutorial: updated });
  } catch (err: unknown) {
    if ((err as { code?: string })?.code === '23505') {
      return NextResponse.json({ error: 'Kode dokumen sudah digunakan.' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Gagal memperbarui tutorial.' }, { status: 400 });
  }
}

export async function DELETE(_req: Request, context: { params: Promise<{ uuid: string }> }) {
  const auth = await requireAdminApi();
  if ('response' in auth) return auth.response;
  const { uuid } = await context.params;
  if (!isValidUuid(uuid)) return NextResponse.json({ error: 'UUID tidak valid.' }, { status: 400 });
  const deleted = await db.delete(tutorials).where(eq(tutorials.id, uuid)).returning({ id: tutorials.id });
  if (!deleted[0]) return NextResponse.json({ error: 'Tutorial tidak ditemukan.' }, { status: 404 });
  return NextResponse.json({ id: uuid });
}
