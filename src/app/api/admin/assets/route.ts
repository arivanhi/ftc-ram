import { NextResponse } from 'next/server';
import { asc, desc, eq, isNull } from 'drizzle-orm';
import { db } from '@/db';
import { assets, buildings, contacts, floors, rooms } from '@/db/schema';
import { requireAdminApi } from '@/lib/auth';
import { assetInputSchema } from '@/lib/validators';
import { resolveConditionChangeAvailability } from '@/lib/loan-rules';

export async function GET(req: Request) {
  const auth = await requireAdminApi();
  if ('response' in auth) return auth.response;

  const includeArchived = new URL(req.url).searchParams.get('includeArchived') === 'true';

  const rows = await db
    .select({
      asset: assets,
      roomCode: rooms.code,
      roomName: rooms.name,
      floorLabel: floors.label,
      buildingName: buildings.name,
      contactName: contacts.name,
    })
    .from(assets)
    .leftJoin(rooms, eq(assets.roomId, rooms.id))
    .leftJoin(floors, eq(rooms.floorId, floors.id))
    .leftJoin(buildings, eq(floors.buildingId, buildings.id))
    .leftJoin(contacts, eq(assets.contactId, contacts.id))
    .where(includeArchived ? undefined : isNull(assets.archivedAt))
    .orderBy(desc(assets.createdAt), asc(assets.inventoryCode));

  return NextResponse.json({
    items: rows.map((r) => ({
      ...r.asset,
      roomCode: r.roomCode,
      roomName: r.roomName,
      floorLabel: r.floorLabel,
      buildingName: r.buildingName,
      contactName: r.contactName,
    })),
  });
}

export async function POST(req: Request) {
  const auth = await requireAdminApi();
  if ('response' in auth) return auth.response;

  try {
    const parsed = assetInputSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Data aset tidak valid.', issues: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const input = parsed.data;
    const availCheck = resolveConditionChangeAvailability(
      'tersedia',
      input.condition,
      input.availability,
    );
    if (availCheck.error) {
      return NextResponse.json({ error: availCheck.error }, { status: 400 });
    }

    const [created] = await db
      .insert(assets)
      .values({
        inventoryCode: input.inventoryCode.toUpperCase(),
        name: input.name,
        category: input.category,
        description: input.description,
        specifications: input.specifications,
        condition: input.condition,
        availability: availCheck.availability,
        completionDate: input.completionDate,
        researchScheme: input.researchScheme,
        researcherTeam: input.researcherTeam,
        photoUrl: input.photoUrl,
        roomId: input.roomId,
        placementDetail: input.placementDetail,
        contactId: input.contactId,
        usageSummary: input.usageSummary,
        isPriority: input.isPriority,
      })
      .returning();

    return NextResponse.json({ asset: created }, { status: 201 });
  } catch (err: unknown) {
    const code = (err as { code?: string })?.code;
    if (code === '23505') {
      return NextResponse.json({ error: 'Kode inventaris sudah digunakan aset lain.' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Gagal menyimpan aset baru.' }, { status: 400 });
  }
}
