import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { floors } from '@/db/schema';
import { requireAdminApi } from '@/lib/auth';
import { isValidUuid } from '@/lib/uuid';

export async function DELETE(_req: Request, context: { params: Promise<{ uuid: string }> }) {
  const auth = await requireAdminApi();
  if ('response' in auth) return auth.response;
  const { uuid } = await context.params;
  if (!isValidUuid(uuid)) return NextResponse.json({ error: 'UUID tidak valid.' }, { status: 400 });
  const deleted = await db.delete(floors).where(eq(floors.id, uuid)).returning({ id: floors.id });
  if (!deleted[0]) return NextResponse.json({ error: 'Lantai tidak ditemukan.' }, { status: 404 });
  return NextResponse.json({ id: uuid });
}
