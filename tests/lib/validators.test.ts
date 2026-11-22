import { describe, it, expect } from 'vitest';
import { publicLoanInputSchema, assetInputSchema, adminLoanTransitionSchema } from '@/lib/validators';
import { computeNextInventoryCode } from '@/lib/format';

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
