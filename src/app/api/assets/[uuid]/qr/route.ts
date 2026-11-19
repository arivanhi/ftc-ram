import { NextResponse } from 'next/server';
import { and, eq, isNull } from 'drizzle-orm';
import { db } from '@/db';
import { assets } from '@/db/schema';
import { isValidUuid } from '@/lib/uuid';
import { buildAssetPublicUrl, generateAssetQrPngBuffer } from '@/lib/qr';

export async function GET(
  req: Request,
  context: { params: Promise<{ uuid: string }> },
) {
  const { uuid } = await context.params;
  if (!isValidUuid(uuid)) {
    return NextResponse.json({ error: 'ID aset harus berupa UUID yang valid.' }, { status: 400 });
  }

  const found = await db
    .select({ id: assets.id, inventoryCode: assets.inventoryCode })
    .from(assets)
    .where(and(eq(assets.id, uuid), isNull(assets.archivedAt)))
    .limit(1);

  if (!found[0]) {
    return NextResponse.json({ error: 'Aset tidak ditemukan.' }, { status: 404 });
  }

  const origin = process.env.NEXT_PUBLIC_APP_URL || new URL(req.url).origin;
  const png = await generateAssetQrPngBuffer(buildAssetPublicUrl(uuid, origin));

  return new NextResponse(new Uint8Array(png), {
    status: 200,
    headers: {
      'Content-Type': 'image/png',
      'Content-Disposition': `inline; filename="qr-${found[0].inventoryCode}.png"`,
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
