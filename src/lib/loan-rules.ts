import type { AssetAvailability, AssetCondition } from './format';

const BLOCKING_LOAN_STATUSES = new Set(['approved', 'borrowed']);

export function hasDateRangeOverlap(
  startA: string,
  endA: string,
  startB: string,
  endB: string,
): boolean {
  return startA <= endB && startB <= endA;
}

export function checkAssetLoanEligibility(
  asset: { condition: string; availability: string; archivedAt: Date | null },
  existingBookings: Array<{ startDate: string; endDate: string; status: string }>,
  startDate: string,
  endDate: string,
): { ok: true } | { ok: false; reason: string } {
  if (asset.archivedAt) {
    return { ok: false, reason: 'Aset sudah diarsipkan dan tidak dapat dipinjam.' };
  }
  if (asset.condition === 'rusak' || asset.availability === 'tidak_tersedia') {
    return { ok: false, reason: 'Aset sedang dalam perbaikan atau tidak tersedia untuk dipinjam.' };
  }
  for (const booking of existingBookings) {
    if (!BLOCKING_LOAN_STATUSES.has(booking.status)) continue;
    if (hasDateRangeOverlap(startDate, endDate, booking.startDate, booking.endDate)) {
      return {
        ok: false,
        reason: `Jadwal bentrok dengan peminjaman aktif (${booking.startDate} s/d ${booking.endDate}).`,
      };
    }
  }
  return { ok: true };
}

export function validateReturnItemsMembership(
  loanAssetIds: string[],
  submittedItems: Array<{ assetId: string; returnCondition: AssetCondition; returnNotes?: string | null }>,
): { ok: true } | { ok: false; reason: string } {
  const expectedSet = new Set(loanAssetIds);
  const seen = new Set<string>();
  for (const item of submittedItems) {
    if (!expectedSet.has(item.assetId)) {
      return { ok: false, reason: 'Terdapat aset yang bukan bagian dari tiket peminjaman ini.' };
    }
    if (seen.has(item.assetId)) {
      return { ok: false, reason: 'Daftar pengembalian mengandung aset duplikat.' };
    }
    seen.add(item.assetId);
  }
  if (seen.size !== expectedSet.size) {
    return { ok: false, reason: 'Kondisi pengembalian wajib diisi untuk setiap aset dalam tiket.' };
  }
  return { ok: true };
}

export function resolveReturnAssetUpdates(
  items: Array<{
    assetId: string;
    returnCondition: AssetCondition;
    returnNotes?: string | null;
  }>,
): Array<{
  assetId: string;
  nextCondition: AssetCondition;
  nextAvailability: 'tersedia' | 'tidak_tersedia';
}> {
  return items.map((item) => ({
    assetId: item.assetId,
    nextCondition: item.returnCondition,
    nextAvailability: item.returnCondition === 'prima' ? 'tersedia' : 'tidak_tersedia',
  }));
}

export function resolveConditionChangeAvailability(
  currentAvailability: AssetAvailability,
  newCondition: AssetCondition,
  requestedAvailability?: AssetAvailability,
): { availability: AssetAvailability; error?: string } {
  if (currentAvailability === 'dipinjam') {
    if (requestedAvailability && requestedAvailability !== 'dipinjam') {
      return {
        availability: 'dipinjam',
        error: 'Status ketersediaan terkunci selama aset masih dalam peminjaman aktif.',
      };
    }
    return { availability: 'dipinjam' };
  }

  if (requestedAvailability === 'dipinjam') {
    return {
      availability: currentAvailability,
      error: 'Status Sedang Dipinjam hanya diubah melalui persetujuan & serah terima peminjaman.',
    };
  }

  if (newCondition === 'rusak') {
    return { availability: 'tidak_tersedia' };
  }

  if (newCondition === 'maintenance') {
    return { availability: requestedAvailability ?? 'tidak_tersedia' };
  }

  return { availability: requestedAvailability ?? 'tersedia' };
}

export function formatTicketCode(prefix: 'FTC' | 'FTC-INC', year: number, sequence: number): string {
  return `${prefix}-${year}-${String(sequence).padStart(4, '0')}`;
}

export function buildWhatsAppUrl(rawPhone: string, message?: string): string {
  let digits = rawPhone.replace(/\D/g, '');
  if (digits.startsWith('0')) {
    digits = `62${digits.slice(1)}`;
  } else if (digits.startsWith('8')) {
    digits = `62${digits}`;
  }
  const base = `https://wa.me/${digits}`;
  if (!message) return base;
  return `${base}?text=${encodeURIComponent(message)}`;
}

export type RawLoanItemSummary = {
  assetId: string;
  inventoryCode: string;
  assetName: string;
  roomLabel?: string | null;
};

export type RawLoanWithItems = {
  id: string;
  ticketCode: string;
  borrowerName: string;
  borrowerIdType: string;
  borrowerIdValue: string;
  borrowerWhatsapp: string;
  borrowerUnitDetail: string | null;
  purposeTitle: string;
  usageLocationType: string;
  externalLocationDetail?: string | null;
  startDate: string;
  endDate: string;
  dailySession: string;
  attachmentUrl: string | null;
  status: string;
  adminNotes: string | null;
  items: RawLoanItemSummary[];
};

export type PublicLoanDto = {
  id: string;
  ticketCode: string;
  borrowerName: string;
  borrowerIdType: string;
  borrowerUnitDetail: string | null;
  purposeTitle: string;
  usageLocationType: string;
  startDate: string;
  endDate: string;
  dailySession: string;
  status: string;
  items: RawLoanItemSummary[];
  adminNotes?: string | null;
};

export function sanitizePublicLoan(loan: RawLoanWithItems, includeAdminNotes: boolean): PublicLoanDto {
  const dto: PublicLoanDto = {
    id: loan.id,
    ticketCode: loan.ticketCode,
    borrowerName: loan.borrowerName,
    borrowerIdType: loan.borrowerIdType,
    borrowerUnitDetail: loan.borrowerUnitDetail,
    purposeTitle: loan.purposeTitle,
    usageLocationType: loan.usageLocationType,
    startDate: loan.startDate,
    endDate: loan.endDate,
    dailySession: loan.dailySession,
    status: loan.status,
    items: loan.items,
  };
  if (includeAdminNotes) {
    dto.adminNotes = loan.adminNotes;
  }
  return dto;
}

export type RawIssueTicket = {
  id: string;
  ticketCode: string;
  assetCodeInput: string;
  reporterName: string;
  reporterContact: string;
  category: string;
  urgency: string;
  description: string;
  photoUrl: string | null;
  status: string;
  resolutionNotes: string | null;
  createdAt: Date | string;
};

export type PublicIssueDto = {
  ticketCode: string;
  assetCodeInput: string;
  category: string;
  urgency: string;
  status: string;
  resolutionNotes: string | null;
  createdAt: Date | string;
};

export function sanitizePublicIssue(ticket: RawIssueTicket): PublicIssueDto {
  return {
    ticketCode: ticket.ticketCode,
    assetCodeInput: ticket.assetCodeInput,
    category: ticket.category,
    urgency: ticket.urgency,
    status: ticket.status,
    resolutionNotes: ticket.resolutionNotes,
    createdAt: ticket.createdAt,
  };
}
