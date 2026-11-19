import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { validateReturnItemsMembership } from '@/lib/loan-rules';
import { normalizePagination } from '@/lib/asset-queries';

describe('Final review Important fixes', () => {
  const a1 = '550e8400-e29b-41d4-a716-446655440001';
  const a2 = '550e8400-e29b-41d4-a716-446655440002';
  const foreign = '550e8400-e29b-41d4-a716-446655449999';

  it('rejects foreign or duplicate assetIds during loan return (Finding #2)', () => {
    expect(
      validateReturnItemsMembership([a1, a2], [
        { assetId: a1, returnCondition: 'prima' },
        { assetId: a2, returnCondition: 'rusak' },
      ]).ok,
    ).toBe(true);

    expect(
      validateReturnItemsMembership([a1], [
        { assetId: a1, returnCondition: 'prima' },
        { assetId: foreign, returnCondition: 'rusak' },
      ]).ok,
    ).toBe(false);

    expect(
      validateReturnItemsMembership([a1, a2], [
        { assetId: a1, returnCondition: 'prima' },
        { assetId: a1, returnCondition: 'prima' },
      ]).ok,
    ).toBe(false);
  });

  it('sanitizes non-numeric page/limit and supports maxLimit=5000 for export (Finding #4)', () => {
    expect(normalizePagination(Number('abc'), Number('foo'))).toEqual({ page: 1, limit: 12, offset: 0 });
    expect(normalizePagination(-3, 0)).toEqual({ page: 1, limit: 1, offset: 0 });
    expect(normalizePagination(1, 5000, 100)).toEqual({ page: 1, limit: 100, offset: 0 });
    expect(normalizePagination(1, 5000, 5000)).toEqual({ page: 1, limit: 5000, offset: 0 });
  });

  it('uses exact lower() matching instead of wildcard ilike on public loan & issue lookup (Finding #1)', () => {
    const loansPub = readFileSync('src/app/api/loans/public/route.ts', 'utf8');
    const issueLookup = readFileSync('src/app/api/issues/lookup/route.ts', 'utf8');
    expect(loansPub).not.toMatch(/\bilike\s*\(/);
    expect(issueLookup).not.toMatch(/\bilike\s*\(/);
  });

  it('locks asset rows with FOR UPDATE inside loan approval/handover transaction (Finding #3)', () => {
    const adminLoansPatch = readFileSync('src/app/api/admin/loans/[uuid]/route.ts', 'utf8');
    expect(adminLoansPatch).toMatch(/\.for\(['"]update['"]\)/);
  });

  it('does not include joke YouTube placeholder URL in FTC seed data', () => {
    const seedSrc = readFileSync('scripts/init-db.mjs', 'utf8');
    expect(seedSrc).not.toContain('dQw4w9WgXcQ');
  });
});
