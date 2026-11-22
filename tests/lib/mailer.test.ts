import { describe, it, expect } from 'vitest';
import {
  encryptSecret,
  decryptSecret,
  buildAdminNewLoanEmail,
  buildAdminIssueReportEmail,
  buildBorrowerLoanSubmittedEmail,
  buildBorrowerLoanApprovedEmail,
  buildBorrowerReturnReminderEmail,
} from '@/lib/mailer';

describe('SMTP secret encryption and notification templates', () => {
  it('encrypts and decrypts Gmail App Password cleanly while stripping spaces', () => {
    process.env.SESSION_SECRET = 'test-session-secret-for-aes-gcm-key';
    const enc = encryptSecret('abcd efgh ijkl mnop');
    expect(enc).not.toContain('abcd');
    expect(decryptSecret(enc)).toBe('abcdefghijklmnop');
    expect(decryptSecret('corrupted:data')).toBe('');
  });

  it('builds escaped admin notifications for new loans and asset issues', () => {
    const newLoan = buildAdminNewLoanEmail({
      ticketCode: 'FTC-2026-0001',
      borrowerName: 'Rina <script>alert(1)</script>',
      borrowerIdType: 'NIM',
      borrowerIdValue: 'A11.2023.14901',
      borrowerEmail: 'rina@mhs.dinus.ac.id',
      borrowerWhatsapp: '08123456789',
      purposeTitle: 'Expo FTC 2026',
      startDate: '2026-11-25',
      endDate: '2026-11-27',
      dailySession: 'Sesi Penuh (08.00 - 17.00 WIB)',
      locationLabel: 'Internal Kampus',
      assets: [{ inventoryCode: 'FTC-RA-001', name: 'DINUS-Bot R3' }],
      appUrl: 'https://ftc.haweb.my.id',
    });
    expect(newLoan.subject).toContain('FTC-2026-0001');
    expect(newLoan.html).not.toContain('<script>');
    expect(newLoan.html).toContain('FTC-RA-001');
    expect(newLoan.html).toContain('https://ftc.haweb.my.id/admin/peminjaman');

    const issue = buildAdminIssueReportEmail({
      ticketCode: 'FTC-INC-2026-0002',
      assetCodeInput: 'FTC-RA-001',
      reporterName: 'Budi',
      reporterContact: '0812999999',
      category: 'kerusakan',
      urgency: 'darurat',
      description: 'Sensor LiDAR tidak menyala.',
      appUrl: 'https://ftc.haweb.my.id',
    });
    expect(issue.subject).toContain('DARURAT');
    expect(issue.html).toContain('FTC-RA-001');
    expect(issue.html).toContain('Sensor LiDAR tidak menyala.');
  });

  it('combines verification + loan schedule + full asset details + usage guide into ONE email on approval', () => {
    const submitted = buildBorrowerLoanSubmittedEmail({
      ticketCode: 'FTC-2026-0003',
      borrowerName: 'Rina',
      purposeTitle: 'Expo FTC',
      startDate: '2026-11-25',
      endDate: '2026-11-27',
      dailySession: 'Sesi Penuh (08.00 - 17.00 WIB)',
      locationLabel: 'Internal Kampus',
      assets: [{ inventoryCode: 'FTC-RA-001', name: 'DINUS-Bot R3' }],
      appUrl: 'https://ftc.haweb.my.id',
    });
    expect(submitted.subject).toContain('FTC-2026-0003');
    expect(submitted.html).toContain('25 Nov 2026');
    expect(submitted.html).toContain('27 Nov 2026');

    const approved = buildBorrowerLoanApprovedEmail({
      ticketCode: 'FTC-2026-0003',
      borrowerName: 'Rina',
      purposeTitle: 'Expo FTC',
      startDate: '2026-11-25',
      endDate: '2026-11-27',
      dailySession: 'Sesi Penuh (08.00 - 17.00 WIB)',
      locationLabel: 'Internal Kampus',
      adminNotes: 'Ambil di Lab E1.01 pukul 08.00 WIB',
      appUrl: 'https://ftc.haweb.my.id',
      assets: [
        {
          id: '550e8400-e29b-41d4-a716-446655440000',
          inventoryCode: 'FTC-RA-001',
          name: 'DINUS-Bot R3',
          category: 'Robotika',
          locationLabel: 'Gedung E • Lt. 1 • E1.01 — Bay Parkir #2',
          contactName: 'Ahmad Fauzi',
          contactWhatsapp: '081234567802',
          usageSummary: '1) Putar E-Stop searah jarum jam. 2) Tekan Power 3 detik.',
          tutorials: [
            {
              title: 'Panduan Demo DINUS-Bot',
              stepsMarkdown: '1. Cek baterai > 50%\n2. Pilih mode demo',
              videoUrl: 'https://youtu.be/abcDEF12345',
              fileUrl: null,
            },
          ],
        },
      ],
    });
    expect(approved.subject).toMatch(/Diverifikasi|Disetujui/i);
    expect(approved.html).toContain('FTC-RA-001');
    expect(approved.html).toContain('Putar E-Stop searah jarum jam');
    expect(approved.html).toContain('Panduan Demo DINUS-Bot');
    expect(approved.html).toContain('Cek baterai');
    expect(approved.html).toContain('Ambil di Lab E1.01');
    expect(approved.html).toContain('/aset/550e8400-e29b-41d4-a716-446655440000');

    const reminder = buildBorrowerReturnReminderEmail({
      ticketCode: 'FTC-2026-0003',
      borrowerName: 'Rina',
      purposeTitle: 'Expo FTC',
      startDate: '2026-11-25',
      endDate: '2026-11-27',
      daysRemaining: 0,
      assets: [{ inventoryCode: 'FTC-RA-001', name: 'DINUS-Bot R3' }],
      appUrl: 'https://ftc.haweb.my.id',
    });
    expect(reminder.subject).toMatch(/Pengingat Pengembalian/i);
    expect(reminder.html).toContain('FTC-RA-001');
    expect(reminder.html).toContain('27 Nov 2026');
  });
});
