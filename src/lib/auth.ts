import { createHash, randomBytes } from 'node:crypto';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { and, eq, gt } from 'drizzle-orm';
import { db } from '@/db';
import { adminSessions, adminUsers } from '@/db/schema';

export const SESSION_COOKIE_NAME = 'ftc_admin_session';
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;

export type AdminSessionUser = {
  userId: string;
  email: string;
  name: string;
};

export function hashSessionToken(rawToken: string): string {
  const pepper = process.env.SESSION_SECRET ?? '';
  return createHash('sha256').update(`${pepper}:${rawToken}`).digest('hex');
}

export function buildSessionCookieOptions(maxAge = SESSION_TTL_SECONDS) {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    path: '/',
    secure: process.env.COOKIE_SECURE === 'true',
    maxAge,
  };
}

export async function createAdminSession(userId: string): Promise<string> {
  const rawToken = randomBytes(32).toString('hex');
  const tokenHash = hashSessionToken(rawToken);
  const expiresAt = new Date(Date.now() + SESSION_TTL_SECONDS * 1000);
  await db.insert(adminSessions).values({ userId, tokenHash, expiresAt });
  return rawToken;
}

export async function getAdminSession(): Promise<AdminSessionUser | null> {
  const cookieStore = await cookies();
  const rawToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!rawToken) return null;

  const tokenHash = hashSessionToken(rawToken);
  const rows = await db
    .select({
      userId: adminUsers.id,
      email: adminUsers.email,
      name: adminUsers.name,
    })
    .from(adminSessions)
    .innerJoin(adminUsers, eq(adminSessions.userId, adminUsers.id))
    .where(and(eq(adminSessions.tokenHash, tokenHash), gt(adminSessions.expiresAt, new Date())))
    .limit(1);

  return rows[0] ?? null;
}

export async function requireAdminApi(): Promise<
  { user: AdminSessionUser } | { response: NextResponse }
> {
  const user = await getAdminSession();
  if (!user) {
    return { response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }
  return { user };
}

export async function destroyCurrentSession(): Promise<void> {
  const cookieStore = await cookies();
  const rawToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!rawToken) return;
  await db.delete(adminSessions).where(eq(adminSessions.tokenHash, hashSessionToken(rawToken)));
}
