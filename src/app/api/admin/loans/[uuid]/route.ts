import { NextResponse } from 'next/server';
import { and, asc, eq, inArray, ne } from 'drizzle-orm';
import { db } from '@/db';
import { assets, loanItems, loans } from '@/db/schema';
import { requireAdminApi } from '@/lib/auth';
import { isValidUuid } from '@/lib/uuid';
import { adminLoanTransitionSchema } from '@/lib/validators';
import {
  checkAssetLoanEligibility,
  resolveReturnAssetUpdates,
  validateReturnItemsMembership,
} from '@/lib/loan-rules';

export async function PATCH(
  req: Request,
  context: { params: Promise<{ uuid: string }> },
) {
  const auth = await requireAdminApi();
  if ('response' in auth) return auth.response;

  const { uuid } = await context.params;
  if (!isValidUuid(uuid)) {
    return NextResponse.json({ error: 'UUID peminjaman tidak valid.' }, { status: 400 });
  }

  try {
    const parsed = adminLoanTransitionSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Transisi status peminjaman tidak valid.', issues: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const input = parsed.data;
    const outcome = await db.transaction(async (tx) => {
      const loanRows = await tx.select().from(loans).where(eq(loans.id, uuid)).limit(1);
      const loan = loanRows[0];
      if (!loan) return { error: 'Data peminjaman tidak ditemukan.', status: 404 as const };

      const items = await tx
        .select({ item: loanItems, asset: assets })
        .from(loanItems)
        .innerJoin(assets, eq(loanItems.assetId, assets.id))
        .where(eq(loanItems.loanId, uuid));

      const assetIds = items.map((i) => i.asset.id);
      // Lock target asset rows in deterministic UUID order to prevent concurrent double-approval/handover races.
      const lockedAssets =
        assetIds.length > 0
          ? await tx
              .select()
              .from(assets)
              .where(inArray(assets.id, assetIds))
              .orderBy(asc(assets.id))
              .for('update')
          : [];
      const lockedById = new Map(lockedAssets.map((a) => [a.id, a]));
      const now = new Date();

      if (input.status === 'approved') {
        if (loan.status !== 'pending') {
          return { error: 'Hanya pengajuan berstatus Menunggu yang dapat disetujui.', status: 409 as const };
        }
        const otherBookings = await tx
          .select({
            assetId: loanItems.assetId,
            startDate: loans.startDate,
            endDate: loans.endDate,
            status: loans.status,
          })
          .from(loanItems)
          .innerJoin(loans, eq(loanItems.loanId, loans.id))
          .where(
            and(
              inArray(loanItems.assetId, assetIds),
              inArray(loans.status, ['approved', 'borrowed']),
              ne(loans.id, uuid),
            ),
          );

        for (const id of assetIds) {
          const asset = lockedById.get(id)!;
          const check = checkAssetLoanEligibility(
            asset,
            otherBookings.filter((b) => b.assetId === asset.id),
            loan.startDate,
            loan.endDate,
          );
          if (!check.ok) {
            return { error: `${asset.inventoryCode}: ${check.reason}`, status: 409 as const };
          }
        }

        const [updated] = await tx
          .update(loans)
          .set({ status: 'approved', adminNotes: input.adminNotes ?? loan.adminNotes, approvedAt: now, updatedAt: now })
          .where(eq(loans.id, uuid))
          .returning();
        return { loan: updated, status: 200 as const };
      }

      if (input.status === 'rejected') {
        if (loan.status !== 'pending') {
          return { error: 'Hanya pengajuan berstatus Menunggu yang dapat ditolak.', status: 409 as const };
        }
        const [updated] = await tx
          .update(loans)
          .set({ status: 'rejected', adminNotes: input.adminNotes ?? loan.adminNotes, updatedAt: now })
          .where(eq(loans.id, uuid))
          .returning();
        return { loan: updated, status: 200 as const };
      }

      if (input.status === 'cancelled') {
        if (loan.status !== 'pending' && loan.status !== 'approved') {
          return { error: 'Hanya pengajuan Menunggu atau Disetujui yang dapat dibatalkan.', status: 409 as const };
        }
        const [updated] = await tx
          .update(loans)
          .set({ status: 'cancelled', adminNotes: input.adminNotes ?? loan.adminNotes, updatedAt: now })
          .where(eq(loans.id, uuid))
          .returning();
        return { loan: updated, status: 200 as const };
      }

      if (input.status === 'borrowed') {
        if (loan.status !== 'approved') {
          return { error: 'Peminjaman harus berstatus Disetujui sebelum diserahkan.', status: 409 as const };
        }
        for (const id of assetIds) {
          const asset = lockedById.get(id)!;
          if (asset.availability === 'dipinjam') {
            return {
              error: `Aset ${asset.inventoryCode} saat ini masih berstatus Sedang Dipinjam pada transaksi lain.`,
              status: 409 as const,
            };
          }
          if (asset.condition === 'rusak' || asset.availability === 'tidak_tersedia') {
            return {
              error: `Aset ${asset.inventoryCode} sedang tidak tersedia / rusak.`,
              status: 409 as const,
            };
          }
        }
        const [updated] = await tx
          .update(loans)
          .set({ status: 'borrowed', adminNotes: input.adminNotes ?? loan.adminNotes, borrowedAt: now, updatedAt: now })
          .where(eq(loans.id, uuid))
          .returning();
        await tx
          .update(assets)
          .set({ availability: 'dipinjam', updatedAt: now })
          .where(inArray(assets.id, assetIds));
        return { loan: updated, status: 200 as const };
      }

      // status === 'returned'
      if (loan.status !== 'borrowed') {
        return { error: 'Hanya pinjaman berstatus Sedang Dipinjam yang dapat dikembalikan.', status: 409 as const };
      }

      const membership = validateReturnItemsMembership(assetIds, input.items);
      if (!membership.ok) {
        return { error: membership.reason, status: 400 as const };
      }
      const byAsset = new Map(input.items.map((i) => [i.assetId, i]));

      const updates = resolveReturnAssetUpdates(input.items);
      for (const u of updates) {
        const raw = byAsset.get(u.assetId)!;
        await tx
          .update(loanItems)
          .set({ returnCondition: raw.returnCondition, returnNotes: raw.returnNotes ?? null })
          .where(and(eq(loanItems.loanId, uuid), eq(loanItems.assetId, u.assetId)));

        await tx
          .update(assets)
          .set({
            condition: u.nextCondition,
            availability: u.nextAvailability,
            updatedAt: now,
          })
          .where(eq(assets.id, u.assetId));
      }

      const [updated] = await tx
        .update(loans)
        .set({ status: 'returned', adminNotes: input.adminNotes ?? loan.adminNotes, returnedAt: now, updatedAt: now })
        .where(eq(loans.id, uuid))
        .returning();

      return { loan: updated, status: 200 as const };
    });

    if ('error' in outcome) {
      return NextResponse.json({ error: outcome.error }, { status: outcome.status });
    }
    return NextResponse.json({ loan: outcome.loan });
  } catch {
    return NextResponse.json({ error: 'Gagal memperbarui status peminjaman.' }, { status: 400 });
  }
}
