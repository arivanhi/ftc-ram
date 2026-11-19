import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { assets, issueTickets } from '@/db/schema';
import { requireAdminApi } from '@/lib/auth';
import { isValidUuid } from '@/lib/uuid';
import { adminIssueUpdateSchema } from '@/lib/validators';
import { resolveConditionChangeAvailability } from '@/lib/loan-rules';
import type { AssetAvailability } from '@/lib/format';

export async function PATCH(
  req: Request,
  context: { params: Promise<{ uuid: string }> },
) {
  const auth = await requireAdminApi();
  if ('response' in auth) return auth.response;

  const { uuid } = await context.params;
  if (!isValidUuid(uuid)) {
    return NextResponse.json({ error: 'UUID tiket kendala tidak valid.' }, { status: 400 });
  }

  try {
    const parsed = adminIssueUpdateSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Data pembaruan kendala tidak valid.', issues: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const input = parsed.data;
    const updated = await db.transaction(async (tx) => {
      const rows = await tx.select().from(issueTickets).where(eq(issueTickets.id, uuid)).limit(1);
      const existing = rows[0];
      if (!existing) return null;

      const [ticket] = await tx
        .update(issueTickets)
        .set({
          status: input.status,
          resolutionNotes: input.resolutionNotes,
          assignedContactId: input.assignedContactId ?? existing.assignedContactId,
          updatedAt: new Date(),
        })
        .where(eq(issueTickets.id, uuid))
        .returning();

      if (input.updateAssetCondition && existing.assetId) {
        const assetRows = await tx
          .select()
          .from(assets)
          .where(eq(assets.id, existing.assetId))
          .limit(1);
        if (assetRows[0]) {
          const avail = resolveConditionChangeAvailability(
            assetRows[0].availability as AssetAvailability,
            input.updateAssetCondition,
          );
          await tx
            .update(assets)
            .set({
              condition: input.updateAssetCondition,
              availability: avail.availability,
              updatedAt: new Date(),
            })
            .where(eq(assets.id, existing.assetId));
        }
      }

      return ticket;
    });

    if (!updated) return NextResponse.json({ error: 'Tiket kendala tidak ditemukan.' }, { status: 404 });
    return NextResponse.json({ ticket: updated });
  } catch {
    return NextResponse.json({ error: 'Gagal memperbarui tiket kendala.' }, { status: 400 });
  }
}
