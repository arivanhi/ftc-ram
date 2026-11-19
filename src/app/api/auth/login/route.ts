import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/db';
import { adminUsers } from '@/db/schema';
import { verifyPassword } from '@/lib/password';
import {
  buildSessionCookieOptions,
  createAdminSession,
  SESSION_COOKIE_NAME,
} from '@/lib/auth';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = loginSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Email dan password wajib diisi.' }, { status: 400 });
    }

    const email = parsed.data.email.trim().toLowerCase();
    const rows = await db.select().from(adminUsers).where(eq(adminUsers.email, email)).limit(1);
    const user = rows[0];
    if (!user || !verifyPassword(parsed.data.password, user.passwordHash)) {
      return NextResponse.json({ error: 'Email atau password salah.' }, { status: 401 });
    }

    const token = await createAdminSession(user.id);
    const res = NextResponse.json({
      user: { userId: user.id, email: user.email, name: user.name },
    });
    res.cookies.set(SESSION_COOKIE_NAME, token, buildSessionCookieOptions());
    return res;
  } catch {
    return NextResponse.json({ error: 'Permintaan login tidak valid.' }, { status: 400 });
  }
}
