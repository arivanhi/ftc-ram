import { NextResponse } from 'next/server';
import {
  buildSessionCookieOptions,
  destroyCurrentSession,
  SESSION_COOKIE_NAME,
} from '@/lib/auth';

export async function POST() {
  await destroyCurrentSession();
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE_NAME, '', buildSessionCookieOptions(0));
  return res;
}
