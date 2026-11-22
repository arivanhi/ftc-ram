import { NextResponse } from 'next/server';
import { requireAdminApi } from '@/lib/auth';
import { isValidUuid } from '@/lib/uuid';
import { sendLoanReturnReminder } from '@/lib/mailer';
import { resolveRequestOrigin } from '@/lib/qr';

export async function POST(
  req: Request,
  context: { params: Promise<{ uuid: string }> },
) {
  const auth = await requireAdminApi();
  if ('response' in auth) return auth.response;

  const { uuid } = await context.params;
  if (!isValidUuid(uuid)) {
    return NextResponse.json({ error: 'UUID peminjaman tidak valid.' }, { status: 400 });
  }

  const result = await sendLoanReturnReminder(uuid, resolveRequestOrigin(req));
  if (!result.sent) {
    return NextResponse.json({ error: result.reason || 'Gagal mengirim pengingat pengembalian.' }, { status: 400 });
  }
  return NextResponse.json({ ok: true, message: 'Email peringatan pengembalian berhasil dikirim ke peminjam.' });
}
