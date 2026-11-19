import { describe, it, expect } from 'vitest';
import ExcelJS from 'exceljs';
import { buildAssetsWorkbookBuffer } from '@/lib/export-xlsx';
import { generateAssetQrPngBuffer, buildAssetPublicUrl } from '@/lib/qr';
import { GET as getAssetByUuid } from '@/app/api/assets/[uuid]/route';

describe('XLSX export, QR generator, and UUID route guard', () => {
  it('generates valid XLSX buffer containing Tanggal Jadi Aset column', async () => {
    const buf = await buildAssetsWorkbookBuffer([
      {
        inventoryCode: 'FTC-IOT-001',
        name: 'Smart Agriculture Node',
        category: 'IoT & Sensor',
        condition: 'prima',
        availability: 'tersedia',
        completionDate: '2025-09-12',
        locationLabel: 'Gedung H Lt. 3 - H3.03 (Rak A1)',
        contactName: 'M. Yusuf, S.T.',
        researcherTeam: 'Tim IoT FTC',
      },
    ]);
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(buf as unknown as ArrayBuffer);
    const ws = wb.getWorksheet('Aset Produk Penelitian FTC');
    expect(ws).toBeDefined();
    expect(ws!.getRow(1).values).toEqual(
      expect.arrayContaining(['Kode Inventaris', 'Tanggal Jadi Aset', 'Narahubung']),
    );
    expect(ws!.getRow(2).getCell(1).value).toBe('FTC-IOT-001');
  });

  it('generates valid PNG QR code encoding /aset/[uuid]', async () => {
    const url = buildAssetPublicUrl(
      '550e8400-e29b-41d4-a716-446655440000',
      'http://ssh.haweb.my.id:4031',
    );
    expect(url).toBe('http://ssh.haweb.my.id:4031/aset/550e8400-e29b-41d4-a716-446655440000');
    const png = await generateAssetQrPngBuffer(url);
    expect(png.subarray(0, 4)).toEqual(Buffer.from([0x89, 0x50, 0x4e, 0x47]));
  });

  it('returns 400 on non-UUID asset parameter without hitting DB (Review Focus #5)', async () => {
    const res = await getAssetByUuid(new Request('http://localhost/api/assets/1'), {
      params: Promise.resolve({ uuid: '1' }),
    });
    expect(res.status).toBe(400);
  });
});
