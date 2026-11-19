import { NextResponse } from 'next/server';
import { and, eq, ilike, isNull, sql } from 'drizzle-orm';
import { db } from '@/db';
import { assets, issueTickets } from '@/db/schema';
import { publicIssueInputSchema } from '@/lib/validators';
import { formatTicketCode } from '@/lib/loan-rules';
import { saveUploadedFile } from '@/lib/uploads';

async function parseIssuePayload(req: Request): Promise<{ data: unknown; photo: File | null }> {
  const ct = req.headers.get('content-type') || '';
  if (ct.includes('multipart/form-data')) {
    const fd = await req.formData();
    const file = fd.get('photo');
    return {
      photo: file instanceof File && file.size > 0 ? file : null,
      data: {
        assetId: fd.get('assetId') ? String(fd.get('assetId')) : null,
        assetCodeInput: String(fd.get('assetCodeInput') ?? ''),
        reporterName: String(fd.get('reporterName') ?? ''),
        reporterContact: String(fd.get('reporterContact') ?? ''),
        category: String(fd.get('category') ?? 'kerusakan'),
        urgency: String(fd.get('urgency') ?? 'sedang'),
        description: String(fd.get('description') ?? ''),
        assignedContactId: fd.get('assignedContactId') ? String(fd.get('assignedContactId')) : null,
      },
    };
  }
  return { data: await req.json(), photo: null };
}

export async function POST(req: Request) {
  try {
    const { data, photo } = await parseIssuePayload(req);
    const parsed = publicIssueInputSchema.safeParse(data);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Data laporan kendala tidak valid.', issues: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const input = parsed.data;
    let photoUrl: string | null = null;
    if (photo) {
      const saved = await saveUploadedFile(photo, 'private', 'image');
      photoUrl = saved.url;
    }

    const created = await db.transaction(async (tx) => {
      let resolvedAssetId = input.assetId;
      let resolvedContactId = input.assignedContactId;

      if (!resolvedAssetId) {
        const matched = await tx
          .select({ id: assets.id, contactId: assets.contactId })
          .from(assets)
          .where(and(isNull(assets.archivedAt), ilike(assets.inventoryCode, input.assetCodeInput)))
          .limit(1);
        if (matched[0]) {
          resolvedAssetId = matched[0].id;
          if (!resolvedContactId) resolvedContactId = matched[0].contactId;
        }
      } else if (!resolvedContactId) {
        const matched = await tx
          .select({ contactId: assets.contactId })
          .from(assets)
          .where(eq(assets.id, resolvedAssetId))
          .limit(1);
        if (matched[0]) resolvedContactId = matched[0].contactId;
      }

      const year = new Date().getFullYear();
      const countRows = await tx
        .select({ count: sql<number>`count(*)::int` })
        .from(issueTickets);
      let seq = (countRows[0]?.count ?? 0) + 1;
      let ticketCode = formatTicketCode('FTC-INC', year, seq);

      while (true) {
        const dup = await tx
          .select({ id: issueTickets.id })
          .from(issueTickets)
          .where(eq(issueTickets.ticketCode, ticketCode))
          .limit(1);
        if (!dup[0]) break;
        seq += 1;
        ticketCode = formatTicketCode('FTC-INC', year, seq);
      }

      const [row] = await tx
        .insert(issueTickets)
        .values({
          ticketCode,
          assetId: resolvedAssetId,
          assetCodeInput: input.assetCodeInput.toUpperCase(),
          reporterName: input.reporterName,
          reporterContact: input.reporterContact,
          category: input.category,
          urgency: input.urgency,
          description: input.description,
          photoUrl,
          assignedContactId: resolvedContactId,
          status: 'open',
        })
        .returning({ id: issueTickets.id, ticketCode: issueTickets.ticketCode });

      return row;
    });

    return NextResponse.json(created, { status: 201 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Gagal mengirim laporan kendala.';
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
