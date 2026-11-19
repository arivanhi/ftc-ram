import ExcelJS from 'exceljs';
import { AVAILABILITY_META, CONDITION_META, formatIndonesianDate, type AssetAvailability, type AssetCondition } from './format';

export type AssetExportRow = {
  inventoryCode: string;
  name: string;
  category: string;
  condition: string;
  availability: string;
  completionDate: string;
  locationLabel: string;
  contactName: string;
  researcherTeam: string;
};

export async function buildAssetsWorkbookBuffer(rows: AssetExportRow[]): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'SIM-Aset Penelitian FTC UDINUS';
  wb.created = new Date();

  const ws = wb.addWorksheet('Aset Produk Penelitian FTC');
  ws.columns = [
    { header: 'Kode Inventaris', key: 'inventoryCode', width: 18 },
    { header: 'Nama Produk Penelitian', key: 'name', width: 38 },
    { header: 'Kategori', key: 'category', width: 24 },
    { header: 'Kondisi', key: 'condition', width: 22 },
    { header: 'Ketersediaan', key: 'availability', width: 18 },
    { header: 'Tanggal Jadi Aset', key: 'completionDate', width: 18 },
    { header: 'Lokasi & Peletakan', key: 'locationLabel', width: 36 },
    { header: 'Narahubung', key: 'contactName', width: 26 },
    { header: 'Tim Peneliti', key: 'researcherTeam', width: 30 },
  ];

  ws.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  ws.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF003369' } };

  for (const r of rows) {
    ws.addRow({
      inventoryCode: r.inventoryCode,
      name: r.name,
      category: r.category,
      condition: CONDITION_META[r.condition as AssetCondition]?.label ?? r.condition,
      availability: AVAILABILITY_META[r.availability as AssetAvailability]?.label ?? r.availability,
      completionDate: formatIndonesianDate(r.completionDate),
      locationLabel: r.locationLabel || '-',
      contactName: r.contactName || '-',
      researcherTeam: r.researcherTeam || '-',
    });
  }

  const arrBuf = await wb.xlsx.writeBuffer();
  return Buffer.from(arrBuf);
}
