import { describe, it, expect } from 'vitest';
import {
  hasDateRangeOverlap,
  checkAssetLoanEligibility,
  resolveReturnAssetUpdates,
  resolveConditionChangeAvailability,
  buildWhatsAppUrl,
  sanitizePublicLoan,
  sanitizePublicIssue,
} from '@/lib/loan-rules';

describe('loan & asset domain rules', () => {
  it('treats inclusive boundary dates as overlapping and next-day as free (Review Focus #1)', () => {
    expect(hasDateRangeOverlap('2026-04-10', '2026-04-12', '2026-04-12', '2026-04-14')).toBe(true);
    expect(hasDateRangeOverlap('2026-04-10', '2026-04-12', '2026-04-13', '2026-04-14')).toBe(false);
  });

  it('allows future dates on currently dipinjam asset if non-overlapping, blocks rusak/archived', () => {
    const active = [{ startDate: '2026-04-01', endDate: '2026-04-05', status: 'borrowed' }];
    expect(
      checkAssetLoanEligibility(
        { condition: 'prima', availability: 'dipinjam', archivedAt: null },
        active,
        '2026-04-10',
        '2026-04-12',
      ).ok,
    ).toBe(true);
    expect(
      checkAssetLoanEligibility(
        { condition: 'prima', availability: 'dipinjam', archivedAt: null },
        active,
        '2026-04-05',
        '2026-04-06',
      ).ok,
    ).toBe(false);
    expect(
      checkAssetLoanEligibility(
        { condition: 'rusak', availability: 'tidak_tersedia', archivedAt: null },
        [],
        '2026-04-10',
        '2026-04-12',
      ).ok,
    ).toBe(false);
    expect(
      checkAssetLoanEligibility(
        { condition: 'prima', availability: 'tersedia', archivedAt: new Date() },
        [],
        '2026-04-10',
        '2026-04-12',
      ).ok,
    ).toBe(false);
  });

  it('computes independent per-asset updates on mixed-condition return (Review Focus #3)', () => {
    const updates = resolveReturnAssetUpdates([
      { assetId: 'a1', returnCondition: 'prima' },
      { assetId: 'a2', returnCondition: 'rusak', returnNotes: 'Layar retak' },
      { assetId: 'a3', returnCondition: 'maintenance', returnNotes: 'Perlu kalibrasi' },
    ]);
    expect(updates).toEqual([
      { assetId: 'a1', nextCondition: 'prima', nextAvailability: 'tersedia' },
      { assetId: 'a2', nextCondition: 'rusak', nextAvailability: 'tidak_tersedia' },
      { assetId: 'a3', nextCondition: 'maintenance', nextAvailability: 'tidak_tersedia' },
    ]);
  });

  it('enforces condition-availability invariants and locks dipinjam against manual edits', () => {
    expect(resolveConditionChangeAvailability('tersedia', 'rusak').availability).toBe('tidak_tersedia');
    expect(resolveConditionChangeAvailability('dipinjam', 'rusak').availability).toBe('dipinjam');
    expect(resolveConditionChangeAvailability('dipinjam', 'prima', 'tersedia').error).toBeDefined();
  });

  it('normalizes Indonesian phone formats into valid wa.me URLs (Review Focus #4)', () => {
    expect(buildWhatsAppUrl('0812-3456-7890', 'Halo FTC')).toBe(
      'https://wa.me/6281234567890?text=Halo%20FTC',
    );
    expect(buildWhatsAppUrl('+62 812 3456 7890')).toBe('https://wa.me/6281234567890');
  });

  it('strips borrower phone/id/attachment and reporter PII from public DTOs', () => {
    const pubLoan = sanitizePublicLoan(
      {
        id: 'u1',
        ticketCode: 'FTC-2026-0001',
        borrowerName: 'Budi',
        borrowerIdType: 'NIM',
        borrowerIdValue: 'A11.2023.0001',
        borrowerWhatsapp: '08123456789',
        borrowerUnitDetail: 'Teknik Informatika',
        purposeTitle: 'Pameran FTC',
        usageLocationType: 'external',
        startDate: '2026-04-10',
        endDate: '2026-04-12',
        dailySession: 'Penuh',
        attachmentUrl: '/api/admin/uploads/secret.pdf',
        status: 'approved',
        adminNotes: 'Ambil jam 8',
        items: [],
      },
      false,
    );
    expect(pubLoan).not.toHaveProperty('borrowerWhatsapp');
    expect(pubLoan).not.toHaveProperty('borrowerIdValue');
    expect(pubLoan).not.toHaveProperty('attachmentUrl');
    expect(pubLoan).not.toHaveProperty('adminNotes');

    const pubIssue = sanitizePublicIssue({
      id: 'i1',
      ticketCode: 'FTC-INC-2026-0001',
      assetCodeInput: 'FTC-IOT-001',
      reporterName: 'Ani',
      reporterContact: '08999999999',
      category: 'kerusakan',
      urgency: 'darurat',
      description: 'Mati total',
      photoUrl: '/api/admin/uploads/bug.png',
      status: 'open',
      resolutionNotes: null,
      createdAt: new Date(),
    });
    expect(pubIssue).not.toHaveProperty('reporterName');
    expect(pubIssue).not.toHaveProperty('reporterContact');
    expect(pubIssue).not.toHaveProperty('photoUrl');
  });
});
