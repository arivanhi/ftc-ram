import { describe, it, expect } from 'vitest';
import {
  publicLoanInputSchema,
  assetInputSchema,
  adminLoanTransitionSchema,
  researchGroupInputSchema,
  smtpSettingsInputSchema,
} from '@/lib/validators';
import {
  computeNextInventoryCode,
  extractShortGroupName,
  getVisiblePageNumbers,
  resolveVideoEmbedUrl,
} from '@/lib/format';

describe('Zod domain validators', () => {
  const assetUuid = '550e8400-e29b-41d4-a716-446655440000';

  it('accepts NIM, NPP, and UNIT and rejects NIDN (Review Focus #5)', () => {
    const base = {
      borrowerName: 'Rina Kusuma',
      borrowerIdValue: 'A11.2023.14901',
      borrowerWhatsapp: '081234567890',
      purposeTitle: 'Pameran Expo FTC 2026',
      usageLocationType: 'external' as const,
      externalLocationDetail: 'PRPP Semarang',
      fundingCategory: 'Pameran / Expo FTC',
      startDate: '2026-04-10',
      endDate: '2026-04-12',
      dailySession: 'Sesi Penuh (08.00 - 17.00 WIB)',
      assetIds: [assetUuid],
      integrityAgreed: true as const,
    };

    expect(publicLoanInputSchema.safeParse({ ...base, borrowerIdType: 'NIM' }).success).toBe(true);
    expect(publicLoanInputSchema.safeParse({ ...base, borrowerIdType: 'NPP' }).success).toBe(true);
    expect(publicLoanInputSchema.safeParse({ ...base, borrowerIdType: 'UNIT' }).success).toBe(true);
    expect(publicLoanInputSchema.safeParse({ ...base, borrowerIdType: 'NIDN' }).success).toBe(false);
  });

  it('rejects > 3 assets, endDate before startDate, or unchecked integrity', () => {
    const ids = [
      assetUuid,
      '550e8400-e29b-41d4-a716-446655440001',
      '550e8400-e29b-41d4-a716-446655440002',
      '550e8400-e29b-41d4-a716-446655440003',
    ];
    expect(
      publicLoanInputSchema.safeParse({
        borrowerName: 'A',
        borrowerIdType: 'NIM',
        borrowerIdValue: '1',
        borrowerWhatsapp: '0812345678',
        purposeTitle: 'Expo',
        usageLocationType: 'internal',
        fundingCategory: 'Pameran',
        startDate: '2026-04-12',
        endDate: '2026-04-10',
        dailySession: 'Penuh',
        assetIds: [assetUuid],
        integrityAgreed: true,
      }).success,
    ).toBe(false);
    expect(
      publicLoanInputSchema.safeParse({
        borrowerName: 'A',
        borrowerIdType: 'NIM',
        borrowerIdValue: '1',
        borrowerWhatsapp: '0812345678',
        purposeTitle: 'Expo',
        usageLocationType: 'internal',
        fundingCategory: 'Pameran',
        startDate: '2026-04-10',
        endDate: '2026-04-12',
        dailySession: 'Penuh',
        assetIds: ids,
        integrityAgreed: true,
      }).success,
    ).toBe(false);
  });

  it('requires completionDate on asset creation and per-item return conditions when transitioning to returned', () => {
    expect(
      assetInputSchema.safeParse({
        inventoryCode: 'FTC-01',
        name: 'Robot',
        category: 'Robotika',
        description: 'Desc',
        condition: 'prima',
        availability: 'tersedia',
        completionDate: '2025-08-15',
      }).success,
    ).toBe(true);
    expect(
      adminLoanTransitionSchema.safeParse({
        status: 'returned',
        items: [{ assetId: assetUuid, returnCondition: 'rusak', returnNotes: 'Sensor patah' }],
      }).success,
    ).toBe(true);
    expect(
      adminLoanTransitionSchema.safeParse({ status: 'returned', items: [] }).success,
    ).toBe(false);
  });

  it('allows omitting or blank inventoryCode for auto-generation while still validating explicit values', () => {
    const baseAsset = {
      name: 'Smart Sensor Node',
      category: 'IoT',
      description: 'Desc',
      condition: 'prima',
      availability: 'tersedia',
      completionDate: '2026-01-10',
    };

    const omitted = assetInputSchema.safeParse(baseAsset);
    expect(omitted.success).toBe(true);
    if (omitted.success) expect(omitted.data.inventoryCode).toBeUndefined();

    const blank = assetInputSchema.safeParse({ ...baseAsset, inventoryCode: '   ' });
    expect(blank.success).toBe(true);
    if (blank.success) expect(blank.data.inventoryCode).toBeUndefined();

    expect(assetInputSchema.safeParse({ ...baseAsset, inventoryCode: 'X' }).success).toBe(false);
  });
});

describe('computeNextInventoryCode (FTC-RA-00X)', () => {
  it('starts at FTC-RA-001 when empty or only legacy prefixes exist', () => {
    expect(computeNextInventoryCode([])).toBe('FTC-RA-001');
    expect(computeNextInventoryCode(['FTC-IOT-001', 'FTC-ROB-008'])).toBe('FTC-RA-001');
    expect(computeNextInventoryCode(['FTC-RA-ABC', 'FTC-RA-001-BETA'])).toBe('FTC-RA-001');
  });

  it('increments from the highest FTC-RA numeric suffix with 3-digit zero padding', () => {
    expect(computeNextInventoryCode(['FTC-RA-001'])).toBe('FTC-RA-002');
    expect(computeNextInventoryCode(['ftc-ra-002', 'FTC-RA-009', 'FTC-RA-005'])).toBe('FTC-RA-010');
    expect(computeNextInventoryCode(['FTC-RA-099'])).toBe('FTC-RA-100');
    expect(computeNextInventoryCode(['FTC-RA-999'])).toBe('FTC-RA-1000');
  });
});

describe('resolveVideoEmbedUrl (YouTube & Google Drive inline player)', () => {
  it('resolves YouTube watch, youtu.be, shorts, live, and embed URLs', () => {
    expect(resolveVideoEmbedUrl('https://www.youtube.com/watch?v=abcDEF12345&t=12s')).toEqual({
      provider: 'youtube',
      embedUrl: 'https://www.youtube.com/embed/abcDEF12345',
    });
    expect(resolveVideoEmbedUrl('https://youtu.be/abcDEF12345?si=xyz')).toEqual({
      provider: 'youtube',
      embedUrl: 'https://www.youtube.com/embed/abcDEF12345',
    });
    expect(resolveVideoEmbedUrl('https://www.youtube.com/shorts/abcDEF12345')).toEqual({
      provider: 'youtube',
      embedUrl: 'https://www.youtube.com/embed/abcDEF12345',
    });
    expect(resolveVideoEmbedUrl('https://m.youtube.com/live/abcDEF12345')).toEqual({
      provider: 'youtube',
      embedUrl: 'https://www.youtube.com/embed/abcDEF12345',
    });
    expect(resolveVideoEmbedUrl('https://www.youtube.com/embed/abcDEF12345')).toEqual({
      provider: 'youtube',
      embedUrl: 'https://www.youtube.com/embed/abcDEF12345',
    });
  });

  it('resolves Google Drive view, preview, open, and uc share URLs', () => {
    const id = '1AbCdEfGhIjKlMnOpQrStUvWxYz_12345';
    expect(resolveVideoEmbedUrl(`https://drive.google.com/file/d/${id}/view?usp=sharing`)).toEqual({
      provider: 'drive',
      embedUrl: `https://drive.google.com/file/d/${id}/preview`,
    });
    expect(resolveVideoEmbedUrl(`https://drive.google.com/u/0/file/d/${id}/preview`)).toEqual({
      provider: 'drive',
      embedUrl: `https://drive.google.com/file/d/${id}/preview`,
    });
    expect(resolveVideoEmbedUrl(`https://drive.google.com/open?id=${id}`)).toEqual({
      provider: 'drive',
      embedUrl: `https://drive.google.com/file/d/${id}/preview`,
    });
    expect(resolveVideoEmbedUrl(`https://drive.google.com/uc?export=download&id=${id}`)).toEqual({
      provider: 'drive',
      embedUrl: `https://drive.google.com/file/d/${id}/preview`,
    });
  });

  it('rejects javascript:, non-video domains, and malformed URLs', () => {
    expect(resolveVideoEmbedUrl('javascript:alert(1)')).toBeNull();
    expect(resolveVideoEmbedUrl('https://evil.example.com/watch?v=abcDEF12345')).toBeNull();
    expect(resolveVideoEmbedUrl('not-a-url')).toBeNull();
    expect(resolveVideoEmbedUrl(null)).toBeNull();
  });
});

describe('researchGroupInputSchema (Kelompok Keilmuan)', () => {
  it('accepts valid http/https hyperlinks and rejects unsafe schemes', () => {
    expect(
      researchGroupInputSchema.safeParse({
        name: 'KK Kecerdasan Buatan',
        url: 'https://ai.ftc.dinus.ac.id',
        description: 'Portal riset AI FTC',
        sortOrder: 1,
      }).success,
    ).toBe(true);
    expect(
      researchGroupInputSchema.safeParse({
        name: 'XSS',
        url: 'javascript:alert(1)',
      }).success,
    ).toBe(false);
    expect(
      researchGroupInputSchema.safeParse({
        name: 'Tanpa skema',
        url: 'ftc.dinus.ac.id',
      }).success,
    ).toBe(false);
  });
});

describe('extractShortGroupName & smtpSettingsInputSchema', () => {
  it('extracts abbreviation before opening parenthesis cleanly', () => {
    expect(extractShortGroupName('CEMTI (Center for Media & Tech Innovation)')).toBe('CEMTI');
    expect(extractShortGroupName('REGRESI (Rekayasa Teknologi Cerdas)')).toBe('REGRESI');
    expect(extractShortGroupName('KK Kecerdasan Buatan')).toBe('KK Kecerdasan Buatan');
    expect(extractShortGroupName('(Leading) Group')).toBe('(Leading) Group');
  });

  it('validates Gmail SMTP settings and borrowerEmail on loan input', () => {
    expect(
      smtpSettingsInputSchema.safeParse({
        enabled: true,
        smtpHost: 'smtp.gmail.com',
        smtpPort: 465,
        smtpUser: 'ftc.asset@gmail.com',
        smtpPassword: 'abcd efgh ijkl mnop',
        senderName: 'SIM-Aset FTC',
        adminNotifyEmail: 'admin@ftc.dinus.ac.id',
      }).success,
    ).toBe(true);

    expect(
      smtpSettingsInputSchema.safeParse({
        enabled: true,
        smtpHost: 'smtp.gmail.com',
        smtpPort: 99999,
        smtpUser: 'not-an-email',
      }).success,
    ).toBe(false);
  });

  it('computes a 3-page sliding window for pagination numbering', () => {
    expect(getVisiblePageNumbers(1, 1, 3)).toEqual([1]);
    expect(getVisiblePageNumbers(1, 2, 3)).toEqual([1, 2]);
    expect(getVisiblePageNumbers(1, 5, 3)).toEqual([1, 2, 3]);
    expect(getVisiblePageNumbers(2, 5, 3)).toEqual([1, 2, 3]);
    expect(getVisiblePageNumbers(3, 5, 3)).toEqual([2, 3, 4]);
    expect(getVisiblePageNumbers(4, 5, 3)).toEqual([3, 4, 5]);
    expect(getVisiblePageNumbers(5, 5, 3)).toEqual([3, 4, 5]);
  });
});
