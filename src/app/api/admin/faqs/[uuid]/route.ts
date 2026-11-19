import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { faqs } from '@/db/schema';
import { requireAdminApi } from '@/lib/auth';
import { isValidUuid } from '@/lib/uuid';
import { faqInputSchema } from '@/lib/validators';

export async function PATCH(req: Request, context: { params: Promise<{ uuid: string }> }) {
  const auth = await requireAdminApi();
  if ('response' in auth) return auth.response;
  const { uuid } = await context.params;
  if (!isValidUuid(uuid)) return NextResponse.json({ error: 'UUID tidak valid.' }, { status: 400 });
  try {
    const parsed = faqInputSchema.partial().safeParse(await req.json());
    if (!parsed.success) return NextResponse.json({ error: 'Data FAQ tidak valid.' }, { status: 400 });
    const [updated] = await db.update(faqs).set(parsed.data).where(eq(faqs.id, uuid)).returning();
    if (!updated) return NextResponse.json({ error: 'FAQ tidak ditemukan.' }, { status: 404 });
    return NextResponse.json({ faq: updated });
  } catch {
    return NextResponse.json({ error: 'Gagal memperbarui FAQ.' }, { status: 400 });
  }
}

export async function DELETE(_req: Request, context: { params: Promise<{ uuid: string }> }) {
  const auth = await requireAdminApi();
  if ('response' in auth) return auth.response;
  const { uuid } = await context.params;
  if (!isValidUuid(uuid)) return NextResponse.json({ error: 'UUID tidak valid.' }, { status: 400 });
  const deleted = await db.delete(faqs).where(eq(faqs.id, uuid)).returning({ id: faqs.id });
  if (!deleted[0]) return NextResponse.json({ error: 'FAQ tidak ditemukan.' }, { status: 404 });
  return NextResponse.json({ id: uuid });
}
