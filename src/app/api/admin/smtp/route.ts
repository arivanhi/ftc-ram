import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { smtpSettings } from '@/db/schema';
import { requireAdminApi } from '@/lib/auth';
import { smtpSettingsInputSchema } from '@/lib/validators';
import { encryptSecret, getSmtpConfig } from '@/lib/mailer';

export async function GET() {
  const auth = await requireAdminApi();
  if ('response' in auth) return auth.response;

  const cfg = await getSmtpConfig();
  return NextResponse.json({
    settings: {
      enabled: cfg.enabled,
      smtpHost: cfg.smtpHost,
      smtpPort: cfg.smtpPort,
      smtpUser: cfg.smtpUser,
      hasAppPassword: cfg.hasAppPassword,
      senderName: cfg.senderName,
      adminNotifyEmail: cfg.adminNotifyEmail,
      reminderHoursBefore: cfg.reminderHoursBefore,
    },
  });
}

export async function PUT(req: Request) {
  const auth = await requireAdminApi();
  if ('response' in auth) return auth.response;

  try {
    const parsed = smtpSettingsInputSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Konfigurasi SMTP tidak valid. Periksa format email dan port SMTP.' },
        { status: 400 },
      );
    }

    const input = parsed.data;
    const existingRows = await db.select().from(smtpSettings).limit(1);
    const existing = existingRows[0];

    const rawNewPass = (input.smtpPassword ?? '').replace(/\s+/g, '');
    const nextPasswordEnc = input.clearPassword
      ? ''
      : rawNewPass.length > 0
        ? encryptSecret(rawNewPass)
        : existing?.smtpPasswordEnc ?? '';

    if (input.enabled && (!input.smtpUser || !nextPasswordEnc)) {
      return NextResponse.json(
        { error: 'Untuk mengaktifkan SMTP, isi Email Gmail SMTP dan Sandi Aplikasi terlebih dahulu.' },
        { status: 400 },
      );
    }

    const values = {
      enabled: input.enabled,
      smtpHost: input.smtpHost,
      smtpPort: input.smtpPort,
      smtpUser: input.smtpUser.toLowerCase(),
      smtpPasswordEnc: nextPasswordEnc,
      senderName: input.senderName,
      adminNotifyEmail: input.adminNotifyEmail.toLowerCase(),
      reminderHoursBefore: input.reminderHoursBefore,
      updatedAt: new Date(),
    };

    if (existing) {
      await db.update(smtpSettings).set(values).where(eq(smtpSettings.id, existing.id));
    } else {
      await db.insert(smtpSettings).values(values);
    }

    const updated = await getSmtpConfig();
    return NextResponse.json({
      settings: {
        enabled: updated.enabled,
        smtpHost: updated.smtpHost,
        smtpPort: updated.smtpPort,
        smtpUser: updated.smtpUser,
        hasAppPassword: updated.hasAppPassword,
        senderName: updated.senderName,
        adminNotifyEmail: updated.adminNotifyEmail,
        reminderHoursBefore: updated.reminderHoursBefore,
      },
    });
  } catch {
    return NextResponse.json({ error: 'Gagal menyimpan konfigurasi SMTP.' }, { status: 400 });
  }
}
