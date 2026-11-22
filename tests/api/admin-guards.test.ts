import { describe, it, expect, vi } from 'vitest';
import { NextResponse } from 'next/server';

vi.mock('@/lib/auth', () => ({
  requireAdminApi: vi.fn(async () => ({
    response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
  })),
}));

import { GET as getDashboard } from '@/app/api/admin/dashboard/route';
import { POST as createAsset } from '@/app/api/admin/assets/route';
import { PATCH as patchLoan } from '@/app/api/admin/loans/[uuid]/route';
import { PATCH as patchIssue } from '@/app/api/admin/issues/[uuid]/route';
import { GET as getPrivateUpload } from '@/app/api/admin/uploads/[filename]/route';
import { GET as getAssetQr } from '@/app/api/assets/[uuid]/qr/route';
import { GET as getResearchGroups, POST as createResearchGroup } from '@/app/api/admin/research-groups/route';
import { PATCH as patchResearchGroup, DELETE as deleteResearchGroup } from '@/app/api/admin/research-groups/[uuid]/route';
import { GET as getSmtp, PUT as putSmtp } from '@/app/api/admin/smtp/route';
import { POST as testSmtp } from '@/app/api/admin/smtp/test/route';
import { POST as runReminders } from '@/app/api/admin/smtp/reminders/route';
import { POST as remindLoan } from '@/app/api/admin/loans/[uuid]/remind/route';

describe('Admin API auth guard enforcement', () => {
  const validUuid = '550e8400-e29b-41d4-a716-446655440000';

  it('rejects unauthenticated requests with 401 on dashboard, assets, loans, issues, private uploads, and QR endpoint', async () => {
    expect((await getDashboard()).status).toBe(401);
    expect(
      (await createAsset(new Request('http://localhost/api/admin/assets', { method: 'POST', body: '{}' }))).status,
    ).toBe(401);
    expect(
      (
        await patchLoan(
          new Request('http://localhost/api/admin/loans/' + validUuid, { method: 'PATCH', body: '{}' }),
          { params: Promise.resolve({ uuid: validUuid }) },
        )
      ).status,
    ).toBe(401);
    expect(
      (
        await patchIssue(
          new Request('http://localhost/api/admin/issues/' + validUuid, { method: 'PATCH', body: '{}' }),
          { params: Promise.resolve({ uuid: validUuid }) },
        )
      ).status,
    ).toBe(401);
    expect(
      (
        await getPrivateUpload(new Request('http://localhost/api/admin/uploads/x.pdf'), {
          params: Promise.resolve({ filename: validUuid + '.pdf' }),
        })
      ).status,
    ).toBe(401);
    expect(
      (
        await getAssetQr(new Request('http://localhost/api/assets/' + validUuid + '/qr'), {
          params: Promise.resolve({ uuid: validUuid }),
        })
      ).status,
    ).toBe(401);
    expect((await getResearchGroups()).status).toBe(401);
    expect(
      (await createResearchGroup(new Request('http://localhost/api/admin/research-groups', { method: 'POST', body: '{}' }))).status,
    ).toBe(401);
    expect(
      (
        await patchResearchGroup(
          new Request('http://localhost/api/admin/research-groups/' + validUuid, { method: 'PATCH', body: '{}' }),
          { params: Promise.resolve({ uuid: validUuid }) },
        )
      ).status,
    ).toBe(401);
    expect(
      (
        await deleteResearchGroup(
          new Request('http://localhost/api/admin/research-groups/' + validUuid, { method: 'DELETE' }),
          { params: Promise.resolve({ uuid: validUuid }) },
        )
      ).status,
    ).toBe(401);
    expect((await getSmtp()).status).toBe(401);
    expect((await putSmtp(new Request('http://localhost/api/admin/smtp', { method: 'PUT', body: '{}' }))).status).toBe(401);
    expect((await testSmtp(new Request('http://localhost/api/admin/smtp/test', { method: 'POST', body: '{}' }))).status).toBe(401);
    expect((await runReminders(new Request('http://localhost/api/admin/smtp/reminders', { method: 'POST' }))).status).toBe(401);
    expect(
      (
        await remindLoan(
          new Request('http://localhost/api/admin/loans/' + validUuid + '/remind', { method: 'POST' }),
          { params: Promise.resolve({ uuid: validUuid }) },
        )
      ).status,
    ).toBe(401);
  });
});
