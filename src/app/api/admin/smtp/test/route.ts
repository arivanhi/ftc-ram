import { NextResponse } from 'next/server';
import { requireAdminApi } from '@/lib/auth';
import { smtpTestInputSchema } from '@/lib/validators';
import { sendMailViaSmtp } from '@/lib/mailer';
import { resolveRequestOrigin } from '@/lib/qr';

export async function POST(req: Request) {
  const auth = await requireAdminApi();
  if ('response' in auth) return auth.response;

  try {
    const parsed = smtpTestInputSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: 'Alamat email tujuan tes tidak valid.' }, { status: 400 });
    }

    const origin = resolveRequestOrigin(req);
    const result = await sendMailViaSmtp(
      {
        to: parsed.data.to,
        subject: '[SIM-Aset FTC] Uji Koneksi SMTP Berhasil',
        html: `<div style="font-family:Segoe UI,Arial,sans-serif;padding:16px;">
          <h2 style="color:#003369;margin-top:0;">Koneksi Email SMTP Gmail Berhasil</h2>
          <p>Pengaturan SMTP untuk <strong>SIM-Aset Produk Penelitian FTC UDINUS</strong> sudah aktif dan siap mengirim notifikasi peminjaman, verifikasi + panduan alat, pengingat pengembalian, serta laporan aset bermasalah.</p>
          <p style="font-size:12px;color:#64748b;">Portal: ${origin}</p>
        </div>`,
        text: `Koneksi Email SMTP Gmail untuk SIM-Aset Produk Penelitian FTC UDINUS berhasil. Portal: ${origin}`,
      },
      { forceEnabled: true },
    );

    if (!result.sent) {
      return NextResponse.json({ error: result.reason || 'Gagal mengirim email tes.' }, { status: 400 });
    }

    return NextResponse.json({ ok: true, message: `Email uji coba berhasil dikirim ke ${parsed.data.to}.` });
  } catch {
    return NextResponse.json({ error: 'Gagal memproses uji koneksi SMTP.' }, { status: 400 });
  }
}
