import { NextResponse } from 'next/server';
import { asc, desc, eq, ilike, isNull, sql } from 'drizzle-orm';
import { db } from '@/db';
import { assets, buildings, contacts, floors, rooms } from '@/db/schema';
import { requireAdminApi } from '@/lib/auth';
import { assetInputSchema } from '@/lib/validators';
import { resolveConditionChangeAvailability } from '@/lib/loan-rules';
import { ASSET_CODE_PREFIX, computeNextInventoryCode } from '@/lib/format';

const ASSET_CODE_LOCK_KEY = 84729104;

export async function GET(req: Request) {
  const auth = await requireAdminApi();
  if ('response' in auth) return auth.response;

  const includeArchived = new URL(req.url).searchParams.get('includeArchived') === 'true';

  const [rows, raCodeRows] = await Promise.all([
    db
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
      .orderBy(desc(assets.createdAt), asc(assets.inventoryCode)),
    db
      .select({ inventoryCode: assets.inventoryCode })
      .from(assets)
      .where(ilike(assets.inventoryCode, `${ASSET_CODE_PREFIX}%`)),
  ]);

  return NextResponse.json({
    nextInventoryCode: computeNextInventoryCode(raCodeRows.map((r) => r.inventoryCode)),
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

    const created = await db.transaction(async (tx) => {
      await tx.execute(sql`SELECT pg_advisory_xact_lock(${ASSET_CODE_LOCK_KEY})`);

      let inventoryCode = input.inventoryCode?.toUpperCase();
      if (!inventoryCode) {
        const raCodeRows = await tx
          .select({ inventoryCode: assets.inventoryCode })
          .from(assets)
          .where(ilike(assets.inventoryCode, `${ASSET_CODE_PREFIX}%`));
        inventoryCode = computeNextInventoryCode(raCodeRows.map((r) => r.inventoryCode));
      }

      const [row] = await tx
        .insert(assets)
        .values({
          inventoryCode,
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
      return row;
    });

    return NextResponse.json({ asset: created }, { status: 201 });
  } catch (err: unknown) {
    const code = (err as { code?: string })?.code;
    if (code === '23505') {
      return NextResponse.json({ error: 'Kode inventaris sudah digunakan aset lain.' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Gagal menyimpan aset baru.' }, { status: 400 });
  }
}
