import { NextResponse } from 'next/server';
import { requireAdminApi } from '@/lib/auth';
import { sendDueReturnReminders } from '@/lib/mailer';
import { resolveRequestOrigin } from '@/lib/qr';

export async function POST(req: Request) {
  const auth = await requireAdminApi();
  if ('response' in auth) return auth.response;

  const result = await sendDueReturnReminders(resolveRequestOrigin(req));
  return NextResponse.json(result);
}
