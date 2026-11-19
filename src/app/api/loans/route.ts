import { NextResponse } from 'next/server';
import { and, eq, inArray, sql } from 'drizzle-orm';
import { db } from '@/db';
import { assets, loanItems, loans } from '@/db/schema';
import { publicLoanInputSchema } from '@/lib/validators';
import { checkAssetLoanEligibility, formatTicketCode } from '@/lib/loan-rules';
import { saveUploadedFile } from '@/lib/uploads';

async function parseLoanPayload(req: Request): Promise<{ data: unknown; attachment: File | null }> {
  const ct = req.headers.get('content-type') || '';
  if (ct.includes('multipart/form-data')) {
    const fd = await req.formData();
    const rawAssets = fd.getAll('assetIds').flatMap((v) =>
      String(v)
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
    );
    const file = fd.get('attachment');
    return {
      attachment: file instanceof File && file.size > 0 ? file : null,
      data: {
        borrowerName: String(fd.get('borrowerName') ?? ''),
        borrowerIdType: String(fd.get('borrowerIdType') ?? ''),
        borrowerIdValue: String(fd.get('borrowerIdValue') ?? ''),
        borrowerWhatsapp: String(fd.get('borrowerWhatsapp') ?? ''),
        borrowerUnitDetail: fd.get('borrowerUnitDetail') ? String(fd.get('borrowerUnitDetail')) : null,
        purposeTitle: String(fd.get('purposeTitle') ?? ''),
        usageLocationType: String(fd.get('usageLocationType') ?? 'internal'),
        externalLocationDetail: fd.get('externalLocationDetail')
          ? String(fd.get('externalLocationDetail'))
          : null,
        fundingCategory: String(fd.get('fundingCategory') ?? 'Pameran / Expo FTC'),
        startDate: String(fd.get('startDate') ?? ''),
        endDate: String(fd.get('endDate') ?? ''),
        dailySession: String(fd.get('dailySession') ?? 'Sesi Penuh (08.00 - 17.00 WIB)'),
        assetIds: rawAssets,
        integrityAgreed: String(fd.get('integrityAgreed')) === 'true',
      },
    };
  }
  return { data: await req.json(), attachment: null };
}

export async function POST(req: Request) {
  try {
    const { data, attachment } = await parseLoanPayload(req);
    const parsed = publicLoanInputSchema.safeParse(data);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Data pengajuan peminjaman tidak valid.', issues: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const input = parsed.data;
    let attachmentUrl: string | null = null;
    if (attachment) {
      const saved = await saveUploadedFile(attachment, 'private', 'any');
      attachmentUrl = saved.url;
    }

    const result = await db.transaction(async (tx) => {
      const targetAssets = await tx
        .select()
        .from(assets)
        .where(inArray(assets.id, input.assetIds));

      if (targetAssets.length !== input.assetIds.length) {
        return { error: 'Satu atau lebih aset tidak ditemukan.', status: 404 as const };
      }

      const activeBookings = await tx
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
            inArray(loanItems.assetId, input.assetIds),
            inArray(loans.status, ['approved', 'borrowed']),
          ),
        );

      for (const asset of targetAssets) {
        const assetBookings = activeBookings.filter((b) => b.assetId === asset.id);
        const check = checkAssetLoanEligibility(asset, assetBookings, input.startDate, input.endDate);
        if (!check.ok) {
          return {
            error: `${asset.inventoryCode} (${asset.name}): ${check.reason}`,
            status: 409 as const,
          };
        }
      }

      const year = new Date().getFullYear();
      const countRows = await tx
        .select({ count: sql<number>`count(*)::int` })
        .from(loans);
      let seq = (countRows[0]?.count ?? 0) + 1;
      let ticketCode = formatTicketCode('FTC', year, seq);

      while (true) {
        const dup = await tx
          .select({ id: loans.id })
          .from(loans)
          .where(eq(loans.ticketCode, ticketCode))
          .limit(1);
        if (!dup[0]) break;
        seq += 1;
        ticketCode = formatTicketCode('FTC', year, seq);
      }

      const [created] = await tx
        .insert(loans)
        .values({
          ticketCode,
          borrowerName: input.borrowerName,
          borrowerIdType: input.borrowerIdType,
          borrowerIdValue: input.borrowerIdValue,
          borrowerWhatsapp: input.borrowerWhatsapp,
          borrowerUnitDetail: input.borrowerUnitDetail,
          purposeTitle: input.purposeTitle,
          usageLocationType: input.usageLocationType,
          externalLocationDetail: input.externalLocationDetail,
          fundingCategory: input.fundingCategory,
          startDate: input.startDate,
          endDate: input.endDate,
          dailySession: input.dailySession,
          attachmentUrl,
          integrityAgreed: true,
          status: 'pending',
        })
        .returning({ id: loans.id, ticketCode: loans.ticketCode });

      await tx.insert(loanItems).values(
        input.assetIds.map((assetId) => ({ loanId: created.id, assetId })),
      );

      return { created, status: 201 as const };
    });

    if ('error' in result) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }
    return NextResponse.json(result.created, { status: 201 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Gagal mengirim pengajuan peminjaman.';
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
