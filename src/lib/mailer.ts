import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';
import nodemailer from 'nodemailer';
import { and, eq, inArray, isNotNull } from 'drizzle-orm';
import { db } from '@/db';
import {
  assets,
  buildings,
  contacts,
  floors,
  issueTickets,
  loanItems,
  loans,
  rooms,
  smtpSettings,
  tutorials,
} from '@/db/schema';
import { formatIndonesianDate, isSafeHttpUrl } from '@/lib/format';

export type SmtpConfig = {
  id: string | null;
  enabled: boolean;
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  smtpPassword: string;
  hasAppPassword: boolean;
  senderName: string;
  adminNotifyEmail: string;
  reminderHoursBefore: number;
};

export type EmailMessage = {
  subject: string;
  html: string;
  text: string;
};

export type SendMailResult = {
  sent: boolean;
  reason?: string;
};

function deriveEncryptionKey(): Buffer {
  const secret = process.env.SESSION_SECRET || 'ftc-local-dev-smtp-key';
  return createHash('sha256').update(`ftc-smtp:${secret}`).digest();
}

export function encryptSecret(plain: string): string {
  const normalized = plain.replace(/\s+/g, '');
  if (!normalized) return '';
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', deriveEncryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(normalized, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted.toString('hex')}`;
}

export function decryptSecret(encoded: string): string {
  if (!encoded) return '';
  const parts = encoded.split(':');
  if (parts.length !== 3) return '';
  try {
    const [ivHex, tagHex, dataHex] = parts;
    const iv = Buffer.from(ivHex, 'hex');
    const tag = Buffer.from(tagHex, 'hex');
    const data = Buffer.from(dataHex, 'hex');
    const decipher = createDecipheriv('aes-256-gcm', deriveEncryptionKey(), iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8');
  } catch {
    return '';
  }
}

function escapeHtml(value: string | null | undefined): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function multilineHtml(value: string | null | undefined): string {
  return escapeHtml(value).replace(/\r?\n/g, '<br/>');
}

function wrapEmailLayout(title: string, badge: string, bodyHtml: string, appUrl: string): string {
  const safeAppUrl = isSafeHttpUrl(appUrl) ? appUrl.replace(/\/+$/, '') : '';
  return `<!DOCTYPE html>
<html lang="id">
<body style="margin:0;padding:24px;background:#f4f6fa;font-family:Segoe UI,Arial,sans-serif;color:#1b2432;">
  <div style="max-width:640px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #dfe5ef;">
    <div style="background:#003369;color:#ffffff;padding:20px 24px;">
      <div style="font-size:11px;letter-spacing:0.06em;text-transform:uppercase;color:#fcd34d;font-weight:700;">${escapeHtml(badge)}</div>
      <h1 style="margin:6px 0 0;font-size:18px;line-height:1.35;">${escapeHtml(title)}</h1>
      <div style="font-size:12px;color:#dbe7f5;margin-top:4px;">SIM-Aset Produk Penelitian — Fakultas Teknologi Cerdas (FTC) UDINUS</div>
    </div>
    <div style="padding:24px;font-size:14px;line-height:1.6;">
      ${bodyHtml}
    </div>
    <div style="background:#f8fafc;border-top:1px solid #e5eaf2;padding:14px 24px;font-size:12px;color:#64748b;">
      Email otomatis dari SIM-Aset Penelitian FTC UDINUS.${safeAppUrl ? ` Portal: <a href="${escapeHtml(safeAppUrl)}" style="color:#003369;">${escapeHtml(safeAppUrl)}</a>` : ''}
    </div>
  </div>
</body>
</html>`;
}

export function buildAdminNewLoanEmail(data: {
  ticketCode: string;
  borrowerName: string;
  borrowerIdType: string;
  borrowerIdValue: string;
  borrowerEmail: string | null;
  borrowerWhatsapp: string;
  purposeTitle: string;
  startDate: string;
  endDate: string;
  dailySession: string;
  locationLabel: string;
  assets: Array<{ inventoryCode: string; name: string }>;
  appUrl: string;
}): EmailMessage {
  const assetListHtml = data.assets
    .map((a) => `<li><strong>${escapeHtml(a.inventoryCode)}</strong> — ${escapeHtml(a.name)}</li>`)
    .join('');
  const adminUrl = `${data.appUrl.replace(/\/+$/, '')}/admin/peminjaman`;

  const body = `
    <p>Terdapat pengajuan peminjaman produk penelitian FTC baru yang menunggu verifikasi admin:</p>
    <table style="width:100%;border-collapse:collapse;margin:12px 0;font-size:13px;">
      <tr><td style="padding:6px 8px;background:#f8fafc;width:36%;"><strong>Kode Tiket</strong></td><td style="padding:6px 8px;">${escapeHtml(data.ticketCode)}</td></tr>
      <tr><td style="padding:6px 8px;background:#f8fafc;"><strong>Pemohon</strong></td><td style="padding:6px 8px;">${escapeHtml(data.borrowerName)} (${escapeHtml(data.borrowerIdType)}: ${escapeHtml(data.borrowerIdValue)})</td></tr>
      <tr><td style="padding:6px 8px;background:#f8fafc;"><strong>Kontak</strong></td><td style="padding:6px 8px;">WA: ${escapeHtml(data.borrowerWhatsapp)}${data.borrowerEmail ? ` • Email: ${escapeHtml(data.borrowerEmail)}` : ''}</td></tr>
      <tr><td style="padding:6px 8px;background:#f8fafc;"><strong>Keperluan / Acara</strong></td><td style="padding:6px 8px;">${escapeHtml(data.purposeTitle)}</td></tr>
      <tr><td style="padding:6px 8px;background:#f8fafc;"><strong>Waktu Peminjaman</strong></td><td style="padding:6px 8px;"><strong>${escapeHtml(formatIndonesianDate(data.startDate))} – ${escapeHtml(formatIndonesianDate(data.endDate))}</strong> (${escapeHtml(data.dailySession)})</td></tr>
      <tr><td style="padding:6px 8px;background:#f8fafc;"><strong>Lokasi</strong></td><td style="padding:6px 8px;">${escapeHtml(data.locationLabel)}</td></tr>
    </table>
    <p style="margin-bottom:6px;"><strong>Aset yang Diajukan:</strong></p>
    <ul style="margin-top:0;padding-left:20px;">${assetListHtml}</ul>
    <p style="margin-top:18px;">
      <a href="${escapeHtml(adminUrl)}" style="display:inline-block;background:#003369;color:#ffffff;text-decoration:none;padding:10px 18px;border-radius:8px;font-weight:700;">Buka Dashboard Verifikasi Peminjaman</a>
    </p>
  `;

  return {
    subject: `[SIM-Aset FTC] Pengajuan Peminjaman Baru — ${data.ticketCode}`,
    html: wrapEmailLayout(`Pengajuan Peminjaman Baru (${data.ticketCode})`, 'NOTIFIKASI ADMIN • PEMINJAMAN', body, data.appUrl),
    text: `Pengajuan peminjaman baru ${data.ticketCode} oleh ${data.borrowerName} (${data.borrowerIdType}: ${data.borrowerIdValue}) untuk ${data.purposeTitle} pada ${formatIndonesianDate(data.startDate)} - ${formatIndonesianDate(data.endDate)}. Aset: ${data.assets.map((a) => `${a.inventoryCode} ${a.name}`).join(', ')}. Kelola di ${adminUrl}`,
  };
}

export function buildAdminIssueReportEmail(data: {
  ticketCode: string;
  assetCodeInput: string;
  reporterName: string;
  reporterContact: string;
  category: string;
  urgency: string;
  description: string;
  appUrl: string;
}): EmailMessage {
  const adminUrl = `${data.appUrl.replace(/\/+$/, '')}/admin/kendala`;
  const urgencyUpper = data.urgency.toUpperCase();

  const body = `
    <p>Laporan aset bermasalah baru telah masuk ke sistem SIM-Aset FTC:</p>
    <table style="width:100%;border-collapse:collapse;margin:12px 0;font-size:13px;">
      <tr><td style="padding:6px 8px;background:#f8fafc;width:36%;"><strong>Kode Tiket</strong></td><td style="padding:6px 8px;">${escapeHtml(data.ticketCode)}</td></tr>
      <tr><td style="padding:6px 8px;background:#f8fafc;"><strong>Kode Aset</strong></td><td style="padding:6px 8px;"><strong>${escapeHtml(data.assetCodeInput)}</strong></td></tr>
      <tr><td style="padding:6px 8px;background:#f8fafc;"><strong>Kategori / Urgensi</strong></td><td style="padding:6px 8px;">${escapeHtml(data.category)} • <strong>${escapeHtml(urgencyUpper)}</strong></td></tr>
      <tr><td style="padding:6px 8px;background:#f8fafc;"><strong>Pelapor</strong></td><td style="padding:6px 8px;">${escapeHtml(data.reporterName)} (${escapeHtml(data.reporterContact)})</td></tr>
    </table>
    <div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:8px;padding:12px 14px;">
      <strong>Detail Kendala:</strong><br/>${multilineHtml(data.description)}
    </div>
    <p style="margin-top:18px;">
      <a href="${escapeHtml(adminUrl)}" style="display:inline-block;background:#b91c1c;color:#ffffff;text-decoration:none;padding:10px 18px;border-radius:8px;font-weight:700;">Tindak Lanjuti Laporan Kendala</a>
    </p>
  `;

  return {
    subject: `[SIM-Aset FTC] Laporan Aset Bermasalah (${urgencyUpper}) — ${data.ticketCode}`,
    html: wrapEmailLayout(`Aset Bermasalah: ${data.assetCodeInput}`, 'NOTIFIKASI ADMIN • ASET BERMASALAH', body, data.appUrl),
    text: `Laporan aset bermasalah ${data.ticketCode} (${urgencyUpper}) untuk ${data.assetCodeInput} dari ${data.reporterName} (${data.reporterContact}): ${data.description}. Cek di ${adminUrl}`,
  };
}

export function buildBorrowerLoanSubmittedEmail(data: {
  ticketCode: string;
  borrowerName: string;
  purposeTitle: string;
  startDate: string;
  endDate: string;
  dailySession: string;
  locationLabel: string;
  assets: Array<{ inventoryCode: string; name: string }>;
  appUrl: string;
}): EmailMessage {
  const assetListHtml = data.assets
    .map((a) => `<li><strong>${escapeHtml(a.inventoryCode)}</strong> — ${escapeHtml(a.name)}</li>`)
    .join('');
  const trackUrl = `${data.appUrl.replace(/\/+$/, '')}/peminjaman`;

  const body = `
    <p>Halo <strong>${escapeHtml(data.borrowerName)}</strong>,</p>
    <p>Pengajuan peminjaman aset penelitian FTC Anda telah kami terima dengan status <strong>Menunggu Verifikasi Admin</strong>.</p>
    <table style="width:100%;border-collapse:collapse;margin:12px 0;font-size:13px;">
      <tr><td style="padding:6px 8px;background:#f8fafc;width:36%;"><strong>Kode Tiket</strong></td><td style="padding:6px 8px;"><strong>${escapeHtml(data.ticketCode)}</strong></td></tr>
      <tr><td style="padding:6px 8px;background:#f8fafc;"><strong>Keperluan / Acara</strong></td><td style="padding:6px 8px;">${escapeHtml(data.purposeTitle)}</td></tr>
      <tr><td style="padding:6px 8px;background:#f8fafc;"><strong>Waktu Peminjaman</strong></td><td style="padding:6px 8px;"><strong>${escapeHtml(formatIndonesianDate(data.startDate))} – ${escapeHtml(formatIndonesianDate(data.endDate))}</strong> (${escapeHtml(data.dailySession)})</td></tr>
      <tr><td style="padding:6px 8px;background:#f8fafc;"><strong>Lokasi</strong></td><td style="padding:6px 8px;">${escapeHtml(data.locationLabel)}</td></tr>
    </table>
    <p style="margin-bottom:6px;"><strong>Aset yang Diajukan:</strong></p>
    <ul style="margin-top:0;padding-left:20px;">${assetListHtml}</ul>
    <p>Setelah pengajuan diverifikasi oleh Admin FTC, Anda akan menerima email pemberitahuan verifikasi lengkap dengan informasi aset serta tata cara penggunaannya.</p>
    <p><a href="${escapeHtml(trackUrl)}" style="color:#003369;font-weight:700;">Lacak Status Pengajuan Anda</a></p>
  `;

  return {
    subject: `[SIM-Aset FTC] Pengajuan Peminjaman Diterima — ${data.ticketCode}`,
    html: wrapEmailLayout(`Pengajuan Peminjaman Diterima (${data.ticketCode})`, 'KONFIRMASI WAKTU PEMINJAMAN', body, data.appUrl),
    text: `Halo ${data.borrowerName}, pengajuan ${data.ticketCode} untuk ${data.purposeTitle} pada ${formatIndonesianDate(data.startDate)} - ${formatIndonesianDate(data.endDate)} (${data.dailySession}) telah diterima dan menunggu verifikasi admin.`,
  };
}

export type ApprovedAssetGuideItem = {
  id: string;
  inventoryCode: string;
  name: string;
  category: string;
  locationLabel: string;
  contactName: string | null;
  contactWhatsapp: string | null;
  usageSummary: string | null;
  tutorials: Array<{
    title: string;
    stepsMarkdown: string | null;
    videoUrl: string | null;
    fileUrl: string | null;
  }>;
};

export function buildBorrowerLoanApprovedEmail(data: {
  ticketCode: string;
  borrowerName: string;
  purposeTitle: string;
  startDate: string;
  endDate: string;
  dailySession: string;
  locationLabel: string;
  adminNotes: string | null;
  assets: ApprovedAssetGuideItem[];
  appUrl: string;
}): EmailMessage {
  const baseUrl = data.appUrl.replace(/\/+$/, '');

  const assetCardsHtml = data.assets
    .map((asset) => {
      const detailUrl = `${baseUrl}/aset/${asset.id}`;
      const tutorialsHtml =
        asset.tutorials.length > 0
          ? `<div style="margin-top:10px;padding-top:10px;border-top:1px dashed #cbd5e1;">
              <div style="font-weight:700;color:#003369;margin-bottom:6px;">Modul SOP &amp; Panduan Terkait:</div>
              ${asset.tutorials
                .map((t) => {
                  const links: string[] = [];
                  if (t.videoUrl && isSafeHttpUrl(t.videoUrl)) {
                    links.push(`<a href="${escapeHtml(t.videoUrl)}" style="color:#003369;">Tautan Video</a>`);
                  }
                  if (t.fileUrl) {
                    const absFile = t.fileUrl.startsWith('/') ? `${baseUrl}${t.fileUrl}` : t.fileUrl;
                    if (isSafeHttpUrl(absFile)) {
                      links.push(`<a href="${escapeHtml(absFile)}" style="color:#003369;">Unduh Berkas SOP</a>`);
                    }
                  }
                  return `<div style="margin-bottom:8px;padding:8px 10px;background:#ffffff;border-radius:6px;border:1px solid #e2e8f0;">
                    <div style="font-weight:600;">${escapeHtml(t.title)}</div>
                    ${t.stepsMarkdown ? `<div style="font-size:12px;color:#334155;margin-top:4px;">${multilineHtml(t.stepsMarkdown)}</div>` : ''}
                    ${links.length > 0 ? `<div style="font-size:12px;margin-top:4px;">${links.join(' • ')}</div>` : ''}
                  </div>`;
                })
                .join('')}
            </div>`
          : '';

      return `<div style="margin:12px 0;padding:14px 16px;background:#f8fafc;border:1px solid #dbe4f0;border-radius:10px;">
        <div style="font-size:12px;font-weight:700;color:#003369;">${escapeHtml(asset.inventoryCode)} • ${escapeHtml(asset.category)}</div>
        <div style="font-size:15px;font-weight:700;margin:2px 0 6px;">${escapeHtml(asset.name)}</div>
        <div style="font-size:13px;color:#475569;">
          <strong>Lokasi Aset:</strong> ${escapeHtml(asset.locationLabel)}<br/>
          ${asset.contactName ? `<strong>Narahubung (PIC):</strong> ${escapeHtml(asset.contactName)}${asset.contactWhatsapp ? ` (WA: ${escapeHtml(asset.contactWhatsapp)})` : ''}<br/>` : ''}
        </div>
        <div style="margin-top:10px;padding:10px 12px;background:#ffffff;border-left:3px solid #003369;border-radius:6px;font-size:13px;">
          <strong>Tata Cara Penggunaan:</strong><br/>
          ${asset.usageSummary ? multilineHtml(asset.usageSummary) : 'Silakan cek halaman detail aset atau hubungi narahubung produk sebelum mengoperasikan.'}
        </div>
        ${tutorialsHtml}
        <div style="margin-top:8px;font-size:12px;">
          <a href="${escapeHtml(detailUrl)}" style="color:#003369;font-weight:700;">Buka Halaman Detail &amp; Video Panduan Aset →</a>
        </div>
      </div>`;
    })
    .join('');

  const body = `
    <p>Halo <strong>${escapeHtml(data.borrowerName)}</strong>,</p>
    <p>Kabar baik! Pengajuan peminjaman produk penelitian FTC Anda <strong>telah diverifikasi dan disetujui</strong> oleh Admin FTC.</p>
    <table style="width:100%;border-collapse:collapse;margin:12px 0;font-size:13px;">
      <tr><td style="padding:6px 8px;background:#ecfdf5;width:36%;"><strong>Status</strong></td><td style="padding:6px 8px;background:#ecfdf5;color:#065f46;"><strong>Diverifikasi &amp; Disetujui Admin</strong></td></tr>
      <tr><td style="padding:6px 8px;background:#f8fafc;"><strong>Kode Tiket</strong></td><td style="padding:6px 8px;"><strong>${escapeHtml(data.ticketCode)}</strong></td></tr>
      <tr><td style="padding:6px 8px;background:#f8fafc;"><strong>Keperluan / Acara</strong></td><td style="padding:6px 8px;">${escapeHtml(data.purposeTitle)}</td></tr>
      <tr><td style="padding:6px 8px;background:#f8fafc;"><strong>Waktu Peminjaman</strong></td><td style="padding:6px 8px;"><strong>${escapeHtml(formatIndonesianDate(data.startDate))} – ${escapeHtml(formatIndonesianDate(data.endDate))}</strong> (${escapeHtml(data.dailySession)})</td></tr>
      <tr><td style="padding:6px 8px;background:#f8fafc;"><strong>Lokasi Penggunaan</strong></td><td style="padding:6px 8px;">${escapeHtml(data.locationLabel)}</td></tr>
      ${data.adminNotes ? `<tr><td style="padding:6px 8px;background:#fffbeb;"><strong>Catatan Admin</strong></td><td style="padding:6px 8px;background:#fffbeb;">${multilineHtml(data.adminNotes)}</td></tr>` : ''}
    </table>
    <h2 style="font-size:15px;color:#003369;margin:18px 0 6px;">Informasi Aset &amp; Tata Cara Penggunaan</h2>
    <p style="margin-top:0;font-size:13px;color:#475569;">Mohon pelajari tata cara penggunaan setiap aset di bawah ini sebelum pengambilan maupun saat pameran:</p>
    ${assetCardsHtml}
    <p style="margin-top:16px;padding:12px 14px;background:#fef3c7;border-radius:8px;font-size:13px;color:#78350f;">
      <strong>Pengingat Pengembalian:</strong> Harap kembalikan seluruh aset beserta kelengkapannya paling lambat pada <strong>${escapeHtml(formatIndonesianDate(data.endDate))}</strong>.
    </p>
  `;

  const textAssets = data.assets
    .map(
      (a) =>
        `- ${a.inventoryCode} ${a.name} (${a.locationLabel})\n  Tata Cara: ${a.usageSummary || 'Lihat detail aset'}\n  Detail: ${baseUrl}/aset/${a.id}`,
    )
    .join('\n');

  return {
    subject: `[SIM-Aset FTC] Peminjaman Diverifikasi & Panduan Penggunaan Aset — ${data.ticketCode}`,
    html: wrapEmailLayout(`Peminjaman Diverifikasi (${data.ticketCode})`, 'VERIFIKASI & PANDUAN PENGGUNAAN ASET', body, data.appUrl),
    text: `Halo ${data.borrowerName}, peminjaman ${data.ticketCode} (${data.purposeTitle}) pada ${formatIndonesianDate(data.startDate)} - ${formatIndonesianDate(data.endDate)} TELAH DIVERIFIKASI.\n\nInformasi Aset & Tata Cara Penggunaan:\n${textAssets}\n\nBatas pengembalian: ${formatIndonesianDate(data.endDate)}.`,
  };
}

export function buildBorrowerLoanStatusEmail(data: {
  ticketCode: string;
  borrowerName: string;
  purposeTitle: string;
  status: 'borrowed' | 'rejected';
  startDate: string;
  endDate: string;
  adminNotes: string | null;
  assets: Array<{ inventoryCode: string; name: string }>;
  appUrl: string;
}): EmailMessage {
  const isBorrowed = data.status === 'borrowed';
  const assetListHtml = data.assets
    .map((a) => `<li><strong>${escapeHtml(a.inventoryCode)}</strong> — ${escapeHtml(a.name)}</li>`)
    .join('');

  const body = isBorrowed
    ? `
      <p>Halo <strong>${escapeHtml(data.borrowerName)}</strong>,</p>
      <p>Serah terima aset untuk tiket <strong>${escapeHtml(data.ticketCode)}</strong> (${escapeHtml(data.purposeTitle)}) telah dicatat dengan status <strong>Sedang Dipinjam</strong>.</p>
      <ul style="padding-left:20px;">${assetListHtml}</ul>
      <p>Batas pengembalian aset adalah <strong>${escapeHtml(formatIndonesianDate(data.endDate))}</strong>. Jika terjadi kendala teknis saat penggunaan, segera hubungi narahubung atau kirim laporan kendala di portal SIM-Aset FTC.</p>
      ${data.adminNotes ? `<p><strong>Catatan Admin:</strong> ${multilineHtml(data.adminNotes)}</p>` : ''}
    `
    : `
      <p>Halo <strong>${escapeHtml(data.borrowerName)}</strong>,</p>
      <p>Mohon maaf, pengajuan peminjaman tiket <strong>${escapeHtml(data.ticketCode)}</strong> (${escapeHtml(data.purposeTitle)}) untuk tanggal ${escapeHtml(formatIndonesianDate(data.startDate))} – ${escapeHtml(formatIndonesianDate(data.endDate))} <strong>belum dapat disetujui</strong>.</p>
      ${data.adminNotes ? `<p><strong>Alasan / Catatan Admin:</strong> ${multilineHtml(data.adminNotes)}</p>` : ''}
      <p>Anda dapat menghubungi Admin FTC atau mengajukan jadwal peminjaman alternatif melalui portal.</p>
    `;

  return {
    subject: isBorrowed
      ? `[SIM-Aset FTC] Serah Terima Aset Sedang Dipinjam — ${data.ticketCode}`
      : `[SIM-Aset FTC] Status Pengajuan Peminjaman Ditolak — ${data.ticketCode}`,
    html: wrapEmailLayout(
      isBorrowed ? `Aset Diserahkan (${data.ticketCode})` : `Pengajuan Ditolak (${data.ticketCode})`,
      isBorrowed ? 'SERAH TERIMA PEMINJAMAN' : 'STATUS PENGAJUAN PEMINJAMAN',
      body,
      data.appUrl,
    ),
    text: isBorrowed
      ? `Halo ${data.borrowerName}, serah terima tiket ${data.ticketCode} tercatat Sedang Dipinjam. Batas pengembalian: ${formatIndonesianDate(data.endDate)}.`
      : `Halo ${data.borrowerName}, pengajuan ${data.ticketCode} belum dapat disetujui. ${data.adminNotes || ''}`,
  };
}

export function buildBorrowerReturnReminderEmail(data: {
  ticketCode: string;
  borrowerName: string;
  purposeTitle: string;
  startDate: string;
  endDate: string;
  daysRemaining: number;
  assets: Array<{ inventoryCode: string; name: string }>;
  appUrl: string;
}): EmailMessage {
  const urgencyText =
    data.daysRemaining < 0
      ? `telah melewati batas pengembalian selama <strong>${Math.abs(data.daysRemaining)} hari</strong>`
      : data.daysRemaining === 0
        ? 'jatuh tempo <strong>hari ini</strong>'
        : `akan jatuh tempo dalam <strong>${data.daysRemaining} hari lagi</strong>`;

  const assetListHtml = data.assets
    .map((a) => `<li><strong>${escapeHtml(a.inventoryCode)}</strong> — ${escapeHtml(a.name)}</li>`)
    .join('');

  const body = `
    <p>Halo <strong>${escapeHtml(data.borrowerName)}</strong>,</p>
    <p>Ini adalah peringatan pengembalian aset penelitian FTC untuk tiket <strong>${escapeHtml(data.ticketCode)}</strong> (${escapeHtml(data.purposeTitle)}).</p>
    <div style="margin:12px 0;padding:12px 14px;background:${data.daysRemaining < 0 ? '#fef2f2' : '#fffbeb'};border:1px solid ${data.daysRemaining < 0 ? '#fecaca' : '#fde68a'};border-radius:8px;color:${data.daysRemaining < 0 ? '#991b1b' : '#92400e'};">
      Masa peminjaman Anda (${escapeHtml(formatIndonesianDate(data.startDate))} – <strong>${escapeHtml(formatIndonesianDate(data.endDate))}</strong>) ${urgencyText}.
    </div>
    <p style="margin-bottom:6px;"><strong>Daftar Aset yang Perlu Dikembalikan:</strong></p>
    <ul style="margin-top:0;padding-left:20px;">${assetListHtml}</ul>
    <p>Mohon pastikan seluruh unit, adaptor, kabel, dan aksesori dikembalikan lengkap kepada Admin / Lab FTC sesuai jadwal.</p>
  `;

  return {
    subject: `[SIM-Aset FTC] Pengingat Pengembalian Aset — ${data.ticketCode}`,
    html: wrapEmailLayout(`Pengingat Pengembalian (${data.ticketCode})`, 'PERINGATAN PENGEMBALIAN ASET', body, data.appUrl),
    text: `Halo ${data.borrowerName}, pengingat pengembalian untuk tiket ${data.ticketCode} (${data.purposeTitle}). Batas pengembalian: ${formatIndonesianDate(data.endDate)}. Aset: ${data.assets.map((a) => `${a.inventoryCode} ${a.name}`).join(', ')}.`,
  };
}

export async function getSmtpConfig(): Promise<SmtpConfig> {
  const rows = await db.select().from(smtpSettings).limit(1);
  const row = rows[0];
  if (!row) {
    return {
      id: null,
      enabled: false,
      smtpHost: 'smtp.gmail.com',
      smtpPort: 465,
      smtpUser: '',
      smtpPassword: '',
      hasAppPassword: false,
      senderName: 'SIM-Aset Penelitian FTC UDINUS',
      adminNotifyEmail: '',
      reminderHoursBefore: 24,
    };
  }
  const decrypted = decryptSecret(row.smtpPasswordEnc);
  return {
    id: row.id,
    enabled: row.enabled,
    smtpHost: row.smtpHost,
    smtpPort: row.smtpPort,
    smtpUser: row.smtpUser,
    smtpPassword: decrypted,
    hasAppPassword: decrypted.length > 0,
    senderName: row.senderName,
    adminNotifyEmail: row.adminNotifyEmail,
    reminderHoursBefore: row.reminderHoursBefore,
  };
}

export async function sendMailViaSmtp(
  payload: { to: string; subject: string; html: string; text: string },
  options?: { forceEnabled?: boolean },
): Promise<SendMailResult> {
  const recipient = payload.to.trim();
  if (!recipient) return { sent: false, reason: 'Alamat email penerima kosong.' };

  const cfg = await getSmtpConfig();
  if (!options?.forceEnabled && !cfg.enabled) {
    return { sent: false, reason: 'Notifikasi email SMTP belum diaktifkan.' };
  }
  if (!cfg.smtpHost || !cfg.smtpUser || !cfg.smtpPassword) {
    return { sent: false, reason: 'Konfigurasi email SMTP atau Sandi Aplikasi Gmail belum lengkap.' };
  }

  try {
    const transporter = nodemailer.createTransport({
      host: cfg.smtpHost,
      port: cfg.smtpPort,
      secure: cfg.smtpPort === 465,
      auth: {
        user: cfg.smtpUser,
        pass: cfg.smtpPassword,
      },
      connectionTimeout: 10_000,
      greetingTimeout: 10_000,
      socketTimeout: 15_000,
    });

    const fromHeader = cfg.senderName
      ? `"${cfg.senderName.replace(/"/g, '')}" <${cfg.smtpUser}>`
      : cfg.smtpUser;

    await transporter.sendMail({
      from: fromHeader,
      to: recipient,
      subject: payload.subject,
      html: payload.html,
      text: payload.text,
    });

    return { sent: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Gagal mengirim email via SMTP.';
    console.error('[mailer] SMTP send error:', message);
    return { sent: false, reason: message };
  }
}

export function resolveDefaultAppUrl(): string {
  return (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000').replace(/\/+$/, '');
}

async function resolveAdminRecipient(): Promise<string> {
  const cfg = await getSmtpConfig();
  return (cfg.adminNotifyEmail || cfg.smtpUser || process.env.ADMIN_EMAIL || '').trim();
}

export async function notifyLoanSubmitted(loanId: string, appUrl = resolveDefaultAppUrl()): Promise<void> {
  try {
    const [loan] = await db.select().from(loans).where(eq(loans.id, loanId)).limit(1);
    if (!loan) return;
    const itemRows = await db
      .select({ inventoryCode: assets.inventoryCode, name: assets.name })
      .from(loanItems)
      .innerJoin(assets, eq(loanItems.assetId, assets.id))
      .where(eq(loanItems.loanId, loanId));

    const locationLabel =
      loan.usageLocationType === 'external'
        ? `Luar Kampus: ${loan.externalLocationDetail || '-'}`
        : 'Internal Kampus UDINUS';

    const adminEmail = await resolveAdminRecipient();
    if (adminEmail) {
      const msg = buildAdminNewLoanEmail({
        ticketCode: loan.ticketCode,
        borrowerName: loan.borrowerName,
        borrowerIdType: loan.borrowerIdType,
        borrowerIdValue: loan.borrowerIdValue,
        borrowerEmail: loan.borrowerEmail,
        borrowerWhatsapp: loan.borrowerWhatsapp,
        purposeTitle: loan.purposeTitle,
        startDate: loan.startDate,
        endDate: loan.endDate,
        dailySession: loan.dailySession,
        locationLabel,
        assets: itemRows,
        appUrl,
      });
      await sendMailViaSmtp({ to: adminEmail, ...msg });
    }

    if (loan.borrowerEmail) {
      const msg = buildBorrowerLoanSubmittedEmail({
        ticketCode: loan.ticketCode,
        borrowerName: loan.borrowerName,
        purposeTitle: loan.purposeTitle,
        startDate: loan.startDate,
        endDate: loan.endDate,
        dailySession: loan.dailySession,
        locationLabel,
        assets: itemRows,
        appUrl,
      });
      await sendMailViaSmtp({ to: loan.borrowerEmail, ...msg });
    }
  } catch (err) {
    console.error('[mailer] notifyLoanSubmitted error:', err);
  }
}

export async function notifyLoanApprovedWithGuides(
  loanId: string,
  appUrl = resolveDefaultAppUrl(),
): Promise<SendMailResult> {
  try {
    const [loan] = await db.select().from(loans).where(eq(loans.id, loanId)).limit(1);
    if (!loan || !loan.borrowerEmail) {
      return { sent: false, reason: 'Email peminjam tidak tersedia.' };
    }

    const assetRows = await db
      .select({
        id: assets.id,
        inventoryCode: assets.inventoryCode,
        name: assets.name,
        category: assets.category,
        placementDetail: assets.placementDetail,
        usageSummary: assets.usageSummary,
        roomCode: rooms.code,
        roomName: rooms.name,
        floorLabel: floors.label,
        buildingName: buildings.name,
        contactName: contacts.name,
        contactWhatsapp: contacts.whatsapp,
      })
      .from(loanItems)
      .innerJoin(assets, eq(loanItems.assetId, assets.id))
      .leftJoin(rooms, eq(assets.roomId, rooms.id))
      .leftJoin(floors, eq(rooms.floorId, floors.id))
      .leftJoin(buildings, eq(floors.buildingId, buildings.id))
      .leftJoin(contacts, eq(assets.contactId, contacts.id))
      .where(eq(loanItems.loanId, loanId));

    const assetIds = assetRows.map((a) => a.id);
    const tutorialRows =
      assetIds.length > 0
        ? await db
            .select({
              assetId: tutorials.assetId,
              title: tutorials.title,
              stepsMarkdown: tutorials.stepsMarkdown,
              videoUrl: tutorials.videoUrl,
              fileUrl: tutorials.fileUrl,
            })
            .from(tutorials)
            .where(inArray(tutorials.assetId, assetIds))
        : [];

    const guideItems: ApprovedAssetGuideItem[] = assetRows.map((a) => {
      const locParts = [a.buildingName, a.floorLabel, a.roomCode ? `${a.roomCode} (${a.roomName ?? ''})` : null, a.placementDetail]
        .filter(Boolean);
      return {
        id: a.id,
        inventoryCode: a.inventoryCode,
        name: a.name,
        category: a.category,
        locationLabel: locParts.length > 0 ? locParts.join(' • ') : 'Lab FTC UDINUS',
        contactName: a.contactName,
        contactWhatsapp: a.contactWhatsapp,
        usageSummary: a.usageSummary,
        tutorials: tutorialRows
          .filter((t) => t.assetId === a.id)
          .map((t) => ({
            title: t.title,
            stepsMarkdown: t.stepsMarkdown,
            videoUrl: t.videoUrl,
            fileUrl: t.fileUrl,
          })),
      };
    });

    const locationLabel =
      loan.usageLocationType === 'external'
        ? `Luar Kampus: ${loan.externalLocationDetail || '-'}`
        : 'Internal Kampus UDINUS';

    const msg = buildBorrowerLoanApprovedEmail({
      ticketCode: loan.ticketCode,
      borrowerName: loan.borrowerName,
      purposeTitle: loan.purposeTitle,
      startDate: loan.startDate,
      endDate: loan.endDate,
      dailySession: loan.dailySession,
      locationLabel,
      adminNotes: loan.adminNotes,
      assets: guideItems,
      appUrl,
    });
    return await sendMailViaSmtp({ to: loan.borrowerEmail, ...msg });
  } catch (err) {
    console.error('[mailer] notifyLoanApprovedWithGuides error:', err);
    return { sent: false, reason: 'Gagal menyiapkan email verifikasi.' };
  }
}

export async function notifyLoanStatusChange(
  loanId: string,
  status: 'borrowed' | 'rejected',
  appUrl = resolveDefaultAppUrl(),
): Promise<SendMailResult> {
  try {
    const [loan] = await db.select().from(loans).where(eq(loans.id, loanId)).limit(1);
    if (!loan || !loan.borrowerEmail) return { sent: false, reason: 'Email peminjam tidak tersedia.' };

    const itemRows = await db
      .select({ inventoryCode: assets.inventoryCode, name: assets.name })
      .from(loanItems)
      .innerJoin(assets, eq(loanItems.assetId, assets.id))
      .where(eq(loanItems.loanId, loanId));

    const msg = buildBorrowerLoanStatusEmail({
      ticketCode: loan.ticketCode,
      borrowerName: loan.borrowerName,
      purposeTitle: loan.purposeTitle,
      status,
      startDate: loan.startDate,
      endDate: loan.endDate,
      adminNotes: loan.adminNotes,
      assets: itemRows,
      appUrl,
    });
    return await sendMailViaSmtp({ to: loan.borrowerEmail, ...msg });
  } catch (err) {
    console.error('[mailer] notifyLoanStatusChange error:', err);
    return { sent: false, reason: 'Gagal mengirim notifikasi status.' };
  }
}

export async function notifyIssueReported(issueId: string, appUrl = resolveDefaultAppUrl()): Promise<void> {
  try {
    const [ticket] = await db.select().from(issueTickets).where(eq(issueTickets.id, issueId)).limit(1);
    if (!ticket) return;
    const adminEmail = await resolveAdminRecipient();
    if (!adminEmail) return;

    const msg = buildAdminIssueReportEmail({
      ticketCode: ticket.ticketCode,
      assetCodeInput: ticket.assetCodeInput,
      reporterName: ticket.reporterName,
      reporterContact: ticket.reporterContact,
      category: ticket.category,
      urgency: ticket.urgency,
      description: ticket.description,
      appUrl,
    });
    await sendMailViaSmtp({ to: adminEmail, ...msg });
  } catch (err) {
    console.error('[mailer] notifyIssueReported error:', err);
  }
}

export async function notifyDamagedReturnToAdmin(
  loanId: string,
  damagedItems: Array<{ inventoryCode: string; name: string; returnCondition: string; returnNotes: string | null }>,
  appUrl = resolveDefaultAppUrl(),
): Promise<void> {
  if (damagedItems.length === 0) return;
  try {
    const [loan] = await db.select().from(loans).where(eq(loans.id, loanId)).limit(1);
    if (!loan) return;
    const adminEmail = await resolveAdminRecipient();
    if (!adminEmail) return;

    const summary = damagedItems
      .map(
        (d) =>
          `${d.inventoryCode} (${d.name}) — kondisi: ${d.returnCondition.toUpperCase()}${d.returnNotes ? ` (${d.returnNotes})` : ''}`,
      )
      .join('\n');

    const msg = buildAdminIssueReportEmail({
      ticketCode: loan.ticketCode,
      assetCodeInput: damagedItems.map((d) => d.inventoryCode).join(', '),
      reporterName: `Pengembalian oleh ${loan.borrowerName}`,
      reporterContact: loan.borrowerWhatsapp,
      category: 'pengembalian_bermasalah',
      urgency: damagedItems.some((d) => d.returnCondition === 'rusak') ? 'darurat' : 'sedang',
      description: `Aset dikembalikan dengan kondisi tidak prima:\n${summary}`,
      appUrl,
    });
    await sendMailViaSmtp({ to: adminEmail, ...msg });
  } catch (err) {
    console.error('[mailer] notifyDamagedReturnToAdmin error:', err);
  }
}

function diffCalendarDaysFromToday(isoDate: string): number {
  const nowWib = new Date(Date.now() + 7 * 60 * 60 * 1000);
  const todayUtc = Date.UTC(nowWib.getUTCFullYear(), nowWib.getUTCMonth(), nowWib.getUTCDate());
  const parts = isoDate.split('-').map(Number);
  if (parts.length !== 3 || parts.some(Number.isNaN)) return 0;
  const targetUtc = Date.UTC(parts[0], parts[1] - 1, parts[2]);
  return Math.round((targetUtc - todayUtc) / (24 * 60 * 60 * 1000));
}

export async function sendLoanReturnReminder(
  loanId: string,
  appUrl = resolveDefaultAppUrl(),
): Promise<SendMailResult> {
  const [loan] = await db.select().from(loans).where(eq(loans.id, loanId)).limit(1);
  if (!loan) return { sent: false, reason: 'Data peminjaman tidak ditemukan.' };
  if (!loan.borrowerEmail) return { sent: false, reason: 'Peminjam tidak memiliki alamat email.' };

  const itemRows = await db
    .select({ inventoryCode: assets.inventoryCode, name: assets.name })
    .from(loanItems)
    .innerJoin(assets, eq(loanItems.assetId, assets.id))
    .where(eq(loanItems.loanId, loanId));

  const msg = buildBorrowerReturnReminderEmail({
    ticketCode: loan.ticketCode,
    borrowerName: loan.borrowerName,
    purposeTitle: loan.purposeTitle,
    startDate: loan.startDate,
    endDate: loan.endDate,
    daysRemaining: diffCalendarDaysFromToday(loan.endDate),
    assets: itemRows,
    appUrl,
  });

  const result = await sendMailViaSmtp({ to: loan.borrowerEmail, ...msg });
  if (result.sent) {
    await db
      .update(loans)
      .set({ returnReminderSentAt: new Date(), updatedAt: new Date() })
      .where(eq(loans.id, loanId));
  }
  return result;
}

export async function sendDueReturnReminders(
  appUrl = resolveDefaultAppUrl(),
): Promise<{ checked: number; sent: number; failed: number }> {
  const cfg = await getSmtpConfig();
  if (!cfg.enabled || !cfg.smtpUser || !cfg.smtpPassword) {
    return { checked: 0, sent: 0, failed: 0 };
  }

  const activeLoans = await db
    .select()
    .from(loans)
    .where(and(eq(loans.status, 'borrowed'), isNotNull(loans.borrowerEmail)));

  const maxDaysAhead = Math.max(1, Math.ceil(cfg.reminderHoursBefore / 24));
  const minIntervalMs = 20 * 60 * 60 * 1000;
  const nowMs = Date.now();

  let checked = 0;
  let sent = 0;
  let failed = 0;

  for (const loan of activeLoans) {
    const daysLeft = diffCalendarDaysFromToday(loan.endDate);
    if (daysLeft > maxDaysAhead) continue;
    if (loan.returnReminderSentAt && nowMs - loan.returnReminderSentAt.getTime() < minIntervalMs) {
      continue;
    }
    checked += 1;
    const res = await sendLoanReturnReminder(loan.id, appUrl);
    if (res.sent) sent += 1;
    else failed += 1;
  }

  return { checked, sent, failed };
}
