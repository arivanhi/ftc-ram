import { NextResponse } from 'next/server';
import { queryPublicAssets } from '@/lib/asset-queries';
import { isValidUuid } from '@/lib/uuid';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const roomId = searchParams.get('roomId') || undefined;
  if (roomId && !isValidUuid(roomId)) {
    return NextResponse.json({ error: 'Parameter roomId harus UUID yang valid.' }, { status: 400 });
  }

  const data = await queryPublicAssets({
    q: searchParams.get('q') || undefined,
    category: searchParams.get('category') || undefined,
    roomId,
    condition: searchParams.get('condition') || undefined,
    availability: searchParams.get('availability') || undefined,
    sort: searchParams.get('sort') || undefined,
    page: Number(searchParams.get('page') || 1),
    limit: Number(searchParams.get('limit') || 12),
  });

  return NextResponse.json(data);
}
