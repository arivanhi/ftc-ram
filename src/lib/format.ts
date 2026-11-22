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

const MIME_TO_EXTS: Record<string, readonly string[]> = {
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/webp': ['.webp'],
  'application/pdf': ['.pdf'],
};

export function isFileAccepted(
  file: { name: string; type?: string },
  accept?: string,
): boolean {
  if (!accept || !accept.trim()) return true;
  const lowerName = file.name.toLowerCase();
  const lowerType = (file.type ?? '').toLowerCase();
  const tokens = accept
    .split(',')
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean);

  return tokens.some((token) => {
    if (token.startsWith('.')) return lowerName.endsWith(token);
    if (token.endsWith('/*')) return lowerType.startsWith(token.slice(0, -1));
    if (lowerType && lowerType === token) return true;
    const exts = MIME_TO_EXTS[token];
    return exts ? exts.some((ext) => lowerName.endsWith(ext)) : false;
  });
}

export function isImageUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  return /\.(jpg|jpeg|png|webp)(\?.*)?$/i.test(url);
}

export function isSafeHttpUrl(rawUrl: string | null | undefined): boolean {
  if (!rawUrl) return false;
  try {
    const parsed = new URL(rawUrl.trim());
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

export type VideoEmbedInfo = {
  provider: 'youtube' | 'drive';
  embedUrl: string;
};

const YOUTUBE_ID_RE = /^[a-zA-Z0-9_-]{11}$/;
const DRIVE_ID_RE = /^[a-zA-Z0-9_-]{10,120}$/;

export function resolveVideoEmbedUrl(rawUrl: string | null | undefined): VideoEmbedInfo | null {
  if (!rawUrl || !isSafeHttpUrl(rawUrl)) return null;
  const parsed = new URL(rawUrl.trim());
  const host = parsed.hostname.toLowerCase();

  if (host === 'youtu.be' || host === 'www.youtu.be') {
    const id = parsed.pathname.split('/').filter(Boolean)[0] ?? '';
    return YOUTUBE_ID_RE.test(id)
      ? { provider: 'youtube', embedUrl: `https://www.youtube.com/embed/${id}` }
      : null;
  }

  if (
    host === 'youtube.com' ||
    host === 'www.youtube.com' ||
    host === 'm.youtube.com' ||
    host === 'music.youtube.com' ||
    host === 'youtube-nocookie.com' ||
    host === 'www.youtube-nocookie.com'
  ) {
    let id = '';
    if (parsed.pathname === '/watch') {
      id = parsed.searchParams.get('v') ?? '';
    } else {
      const m = /^\/(?:embed|shorts|live|v)\/([a-zA-Z0-9_-]{11})(?:\/|$)/.exec(parsed.pathname);
      if (m) id = m[1];
    }
    return YOUTUBE_ID_RE.test(id)
      ? { provider: 'youtube', embedUrl: `https://www.youtube.com/embed/${id}` }
      : null;
  }

  if (host === 'drive.google.com' || host === 'docs.google.com') {
    let id = '';
    const pathMatch = /^(?:\/u\/\d+)?\/file\/d\/([a-zA-Z0-9_-]{10,120})(?:\/|$)/.exec(parsed.pathname);
    if (pathMatch) {
      id = pathMatch[1];
    } else if (parsed.pathname === '/open' || parsed.pathname === '/uc') {
      id = parsed.searchParams.get('id') ?? '';
    }
    return DRIVE_ID_RE.test(id)
      ? { provider: 'drive', embedUrl: `https://drive.google.com/file/d/${id}/preview` }
      : null;
  }

  return null;
}

export type AssetCondition = keyof typeof CONDITION_META;
export type AssetAvailability = keyof typeof AVAILABILITY_META;
export type LoanStatus = keyof typeof LOAN_STATUS_META;
export type IssueUrgency = keyof typeof URGENCY_META;
export type ContactStatus = keyof typeof CONTACT_STATUS_META;
