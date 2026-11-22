const ID_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'] as const;

export function formatIndonesianDate(isoDate: string | Date | null | undefined): string {
  if (!isoDate) return 'Belum tercatat';
  if (typeof isoDate === 'string') {
    const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(isoDate.trim());
    if (match) {
      const year = Number(match[1]);
      const month = Number(match[2]);
      const day = Number(match[3]);
      if (month >= 1 && month <= 12) {
        return `${day} ${ID_MONTHS[month - 1]} ${year}`;
      }
    }
  }
  const d = isoDate instanceof Date ? isoDate : new Date(isoDate);
  if (Number.isNaN(d.getTime())) return 'Belum tercatat';
  return `${d.getUTCDate()} ${ID_MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

export const CONDITION_META = {
  prima: {
    label: 'Kondisi Prima',
    shortLabel: 'Prima',
    bgClass: 'bg-[#ecfdf5] text-[#065f46] border border-[#a7f3d0]',
    dotClass: 'bg-[#10b981]',
  },
  maintenance: {
    label: 'Perawatan / Kalibrasi',
    shortLabel: 'Perawatan',
    bgClass: 'bg-secondary-fixed text-on-secondary-fixed border border-[#fde68a]',
    dotClass: 'bg-[#f59e0b]',
  },
  rusak: {
    label: 'Perlu Perbaikan',
    shortLabel: 'Rusak',
    bgClass: 'bg-error-container text-on-error-container border border-[#fecdd3]',
    dotClass: 'bg-error',
  },
} as const;

export const AVAILABILITY_META = {
  tersedia: {
    label: 'Tersedia',
    bgClass: 'bg-[#ecfdf5] text-[#065f46]',
    dotClass: 'bg-[#10b981]',
  },
  dipinjam: {
    label: 'Sedang Dipinjam',
    bgClass: 'bg-primary-fixed text-on-primary-fixed',
    dotClass: 'bg-primary',
  },
  tidak_tersedia: {
    label: 'Tidak Tersedia',
    bgClass: 'bg-error-container text-on-error-container',
    dotClass: 'bg-error',
  },
} as const;

export const LOAN_STATUS_META = {
  pending: { label: 'Menunggu Verifikasi', bgClass: 'bg-surface-container-high text-on-surface-variant', dotClass: 'bg-outline' },
  approved: { label: 'Disetujui Admin', bgClass: 'bg-secondary-container/25 text-secondary', dotClass: 'bg-secondary-container' },
  borrowed: { label: 'Sedang Dipinjam', bgClass: 'bg-primary/10 text-primary', dotClass: 'bg-primary' },
  returned: { label: 'Dikembalikan', bgClass: 'bg-[#ecfdf5] text-[#065f46]', dotClass: 'bg-[#10b981]' },
  rejected: { label: 'Ditolak', bgClass: 'bg-error-container text-on-error-container', dotClass: 'bg-error' },
  cancelled: { label: 'Dibatalkan', bgClass: 'bg-surface-container text-outline', dotClass: 'bg-outline' },
} as const;

export const URGENCY_META = {
  rendah: { label: 'Rendah', bgClass: 'bg-[#ecfdf5] text-[#065f46]' },
  sedang: { label: 'Sedang', bgClass: 'bg-secondary-fixed text-on-secondary-fixed' },
  darurat: { label: 'Darurat', bgClass: 'bg-error-container text-on-error-container' },
} as const;

export const CONTACT_STATUS_META = {
  available: { label: 'Tersedia di Lab', bgClass: 'bg-[#ecfdf5] text-[#065f46]', dotClass: 'bg-[#10b981]' },
  assisting: { label: 'Sedang Pendampingan', bgClass: 'bg-secondary-fixed text-on-secondary-fixed', dotClass: 'bg-secondary' },
  offline: { label: 'Di Luar Jam Tugas', bgClass: 'bg-surface-container-high text-on-surface-variant', dotClass: 'bg-outline' },
} as const;

export const ASSET_CODE_PREFIX = 'FTC-RA-';

export function computeNextInventoryCode(existingCodes: readonly string[]): string {
  let maxNum = 0;
  for (const code of existingCodes) {
    const match = /^FTC-RA-(\d+)$/i.exec(code.trim());
    if (!match) continue;
    const num = Number.parseInt(match[1], 10);
    if (Number.isSafeInteger(num) && num > maxNum) {
      maxNum = num;
    }
  }
  return `${ASSET_CODE_PREFIX}${String(maxNum + 1).padStart(3, '0')}`;
}

export type AssetCondition = keyof typeof CONDITION_META;
export type AssetAvailability = keyof typeof AVAILABILITY_META;
export type LoanStatus = keyof typeof LOAN_STATUS_META;
export type IssueUrgency = keyof typeof URGENCY_META;
export type ContactStatus = keyof typeof CONTACT_STATUS_META;
