import { NextResponse } from 'next/server';
import { and, eq, inArray, sql } from 'drizzle-orm';
import { db } from '@/db';
import { assets, loanItems, loans } from '@/db/schema';
import { requireAdminApi } from '@/lib/auth';
import { isValidUuid } from '@/lib/uuid';
import { assetPatchSchema } from '@/lib/validators';
import { resolveConditionChangeAvailability } from '@/lib/loan-rules';
import type { AssetAvailability, AssetCondition } from '@/lib/format';

export async function GET(
  _req: Request,
  context: { params: Promise<{ uuid: string }> },
) {
  const auth = await requireAdminApi();
  if ('response' in auth) return auth.response;

  const { uuid } = await context.params;
  if (!isValidUuid(uuid)) {
    return NextResponse.json({ error: 'UUID aset tidak valid.' }, { status: 400 });
  }

  const rows = await db.select().from(assets).where(eq(assets.id, uuid)).limit(1);
  if (!rows[0]) {
    return NextResponse.json({ error: 'Aset tidak ditemukan.' }, { status: 404 });
  }
  return NextResponse.json({ asset: rows[0] });
}

export async function PATCH(
  req: Request,
  context: { params: Promise<{ uuid: string }> },
) {
  const auth = await requireAdminApi();
  if ('response' in auth) return auth.response;

  const { uuid } = await context.params;
  if (!isValidUuid(uuid)) {
    return NextResponse.json({ error: 'UUID aset tidak valid.' }, { status: 400 });
  }

  try {
    const parsed = assetPatchSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Data pembaruan aset tidak valid.', issues: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const existingRows = await db.select().from(assets).where(eq(assets.id, uuid)).limit(1);
    const existing = existingRows[0];
    if (!existing) {
      return NextResponse.json({ error: 'Aset tidak ditemukan.' }, { status: 404 });
    }

    const input = parsed.data;
    const nextCondition = (input.condition ?? existing.condition) as AssetCondition;
    const availResult = resolveConditionChangeAvailability(
      existing.availability as AssetAvailability,
      nextCondition,
      input.availability,
    );
    if (availResult.error) {
      return NextResponse.json({ error: availResult.error }, { status: 409 });
    }

    const updateValues: Partial<typeof assets.$inferInsert> = {
      updatedAt: new Date(),
      condition: nextCondition,
      availability: availResult.availability,
    };

    if (input.inventoryCode !== undefined) updateValues.inventoryCode = input.inventoryCode.toUpperCase();
    if (input.name !== undefined) updateValues.name = input.name;
    if (input.category !== undefined) updateValues.category = input.category;
    if (input.description !== undefined) updateValues.description = input.description;
    if (input.specifications !== undefined) updateValues.specifications = input.specifications;
    if (input.completionDate !== undefined) updateValues.completionDate = input.completionDate;
    if (input.researchScheme !== undefined) updateValues.researchScheme = input.researchScheme;
    if (input.researcherTeam !== undefined) updateValues.researcherTeam = input.researcherTeam;
    if (input.photoUrl !== undefined) updateValues.photoUrl = input.photoUrl;
    if (input.roomId !== undefined) updateValues.roomId = input.roomId;
    if (input.placementDetail !== undefined) updateValues.placementDetail = input.placementDetail;
    if (input.contactId !== undefined) updateValues.contactId = input.contactId;
    if (input.usageSummary !== undefined) updateValues.usageSummary = input.usageSummary;
    if (input.isPriority !== undefined) updateValues.isPriority = input.isPriority;
    if (input.restore === true) updateValues.archivedAt = null;

    const [updated] = await db
      .update(assets)
      .set(updateValues)
      .where(eq(assets.id, uuid))
      .returning();

    let affectedApprovedLoans: Array<{ id: string; ticketCode: string; startDate: string; endDate: string; borrowerName: string }> = [];
    if (nextCondition === 'rusak' || nextCondition === 'maintenance') {
      affectedApprovedLoans = await db
        .select({
          id: loans.id,
          ticketCode: loans.ticketCode,
          startDate: loans.startDate,
          endDate: loans.endDate,
          borrowerName: loans.borrowerName,
        })
        .from(loanItems)
        .innerJoin(loans, eq(loanItems.loanId, loans.id))
        .where(and(eq(loanItems.assetId, uuid), eq(loans.status, 'approved')));
    }

    return NextResponse.json({ asset: updated, affectedApprovedLoans });
  } catch (err: unknown) {
    const code = (err as { code?: string })?.code;
    if (code === '23505') {
      return NextResponse.json({ error: 'Kode inventaris sudah digunakan aset lain.' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Gagal memperbarui aset.' }, { status: 400 });
  }
}

export async function DELETE(
  _req: Request,
  context: { params: Promise<{ uuid: string }> },
) {
  const auth = await requireAdminApi();
  if ('response' in auth) return auth.response;

  const { uuid } = await context.params;
  if (!isValidUuid(uuid)) {
    return NextResponse.json({ error: 'UUID aset tidak valid.' }, { status: 400 });
  }

  const activeBorrow = await db
    .select({ id: loans.id })
    .from(loanItems)
    .innerJoin(loans, eq(loanItems.loanId, loans.id))
    .where(and(eq(loanItems.assetId, uuid), inArray(loans.status, ['borrowed'])))
    .limit(1);

  if (activeBorrow[0]) {
    return NextResponse.json(
      { error: 'Aset sedang dipinjam aktif; selesaikan pengembalian terlebih dahulu.' },
      { status: 409 },
    );
  }

  const history = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(loanItems)
    .where(eq(loanItems.assetId, uuid));

  if ((history[0]?.count ?? 0) > 0) {
    const [archived] = await db
      .update(assets)
      .set({ archivedAt: new Date(), availability: 'tidak_tersedia', updatedAt: new Date() })
      .where(eq(assets.id, uuid))
      .returning();
    if (!archived) return NextResponse.json({ error: 'Aset tidak ditemukan.' }, { status: 404 });
    return NextResponse.json({ mode: 'archived', asset: archived });
  }

  const deleted = await db.delete(assets).where(eq(assets.id, uuid)).returning({ id: assets.id });
  if (!deleted[0]) return NextResponse.json({ error: 'Aset tidak ditemukan.' }, { status: 404 });
  return NextResponse.json({ mode: 'deleted', id: uuid });
}
