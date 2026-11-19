import { NextResponse } from 'next/server';
import { queryPublicAssets } from '@/lib/asset-queries';
import { buildAssetsWorkbookBuffer } from '@/lib/export-xlsx';
import { isValidUuid } from '@/lib/uuid';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const roomId = searchParams.get('roomId') || undefined;
  if (roomId && !isValidUuid(roomId)) {
    return NextResponse.json({ error: 'Parameter roomId tidak valid.' }, { status: 400 });
  }

  const data = await queryPublicAssets({
    q: searchParams.get('q') || undefined,
    category: searchParams.get('category') || undefined,
    roomId,
    condition: searchParams.get('condition') || undefined,
    availability: searchParams.get('availability') || undefined,
    sort: searchParams.get('sort') || 'code',
    page: 1,
    limit: 5000,
    maxLimit: 5000,
  });

  const rows = data.items.map((item) => ({
    inventoryCode: item.inventoryCode,
    name: item.name,
    category: item.category,
    condition: item.condition,
    availability: item.availability,
    completionDate: item.completionDate,
    locationLabel: [
      item.buildingName,
      item.floorLabel,
      item.roomCode ? `${item.roomCode} - ${item.roomName}` : null,
      item.placementDetail ? `(${item.placementDetail})` : null,
    ]
      .filter(Boolean)
      .join(' '),
    contactName: item.contactName ?? '-',
    researcherTeam: item.researcherTeam ?? '-',
  }));

  const buf = await buildAssetsWorkbookBuffer(rows);
  return new NextResponse(new Uint8Array(buf), {
    status: 200,
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename="rekap-aset-penelitian-ftc.xlsx"',
    },
  });
}
