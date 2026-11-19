import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { join, resolve, sep } from 'node:path';

export type UploadVisibility = 'public' | 'private';
export type UploadKind = 'image' | 'document' | 'any';

const IMAGE_EXTS = new Set(['jpg', 'jpeg', 'png', 'webp']);
const DOC_EXTS = new Set(['pdf']);
const SAFE_FILENAME_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|jpeg|png|webp|pdf)$/i;

const MIME_BY_EXT: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  pdf: 'application/pdf',
};

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const MAX_PDF_BYTES = 10 * 1024 * 1024;

export function getUploadRoot(): string {
  return resolve(process.env.UPLOAD_DIR || join(process.cwd(), 'uploads'));
}

export function validateMagicBytes(buf: Buffer, ext: string): boolean {
  const e = ext.toLowerCase();
  if (e === 'jpg' || e === 'jpeg') {
    return buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff;
  }
  if (e === 'png') {
    return (
      buf.length >= 8 &&
      buf[0] === 0x89 &&
      buf[1] === 0x50 &&
      buf[2] === 0x4e &&
      buf[3] === 0x47 &&
      buf[4] === 0x0d &&
      buf[5] === 0x0a &&
      buf[6] === 0x1a &&
      buf[7] === 0x0a
    );
  }
  if (e === 'webp') {
    return (
      buf.length >= 12 &&
      buf.subarray(0, 4).toString('ascii') === 'RIFF' &&
      buf.subarray(8, 12).toString('ascii') === 'WEBP'
    );
  }
  if (e === 'pdf') {
    return buf.length >= 5 && buf.subarray(0, 5).toString('ascii') === '%PDF-';
  }
  return false;
}

export function getMimeFromFilename(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase() ?? '';
  return MIME_BY_EXT[ext] ?? 'application/octet-stream';
}

export async function saveUploadedFile(
  file: File,
  visibility: UploadVisibility,
  allowedKind: UploadKind,
): Promise<{ filename: string; url: string; mimeType: string; size: number }> {
  const ext = (file.name.split('.').pop() ?? '').toLowerCase();
  const isImage = IMAGE_EXTS.has(ext);
  const isDoc = DOC_EXTS.has(ext);

  if (allowedKind === 'image' && !isImage) {
    throw new Error('Format berkas tidak valid. Gunakan JPG, PNG, atau WEBP.');
  }
  if (allowedKind === 'document' && !isDoc) {
    throw new Error('Format berkas tidak valid. Gunakan PDF.');
  }
  if (allowedKind === 'any' && !isImage && !isDoc) {
    throw new Error('Format berkas tidak valid. Gunakan JPG, PNG, WEBP, atau PDF.');
  }

  const maxBytes = isDoc ? MAX_PDF_BYTES : MAX_IMAGE_BYTES;
  if (file.size <= 0 || file.size > maxBytes) {
    throw new Error(`Ukuran berkas melebihi batas maksimal (${isDoc ? '10 MB' : '5 MB'}).`);
  }

  const buf = Buffer.from(await file.arrayBuffer());
  if (!validateMagicBytes(buf, ext)) {
    throw new Error('Isi berkas tidak cocok dengan format/signature yang diizinkan.');
  }

  const filename = `${randomUUID()}.${ext}`;
  const dir = join(getUploadRoot(), visibility);
  await mkdir(dir, { recursive: true });
  await writeFile(join(dir, filename), buf);

  const url =
    visibility === 'public'
      ? `/api/uploads/public/${filename}`
      : `/api/admin/uploads/${filename}`;

  return { filename, url, mimeType: MIME_BY_EXT[ext], size: buf.length };
}

export function resolveSafeUploadPath(
  visibility: UploadVisibility,
  filename: string,
): string | null {
  if (!SAFE_FILENAME_RE.test(filename)) return null;
  const baseDir = resolve(getUploadRoot(), visibility);
  const candidate = resolve(baseDir, filename);
  if (!candidate.startsWith(baseDir + sep)) return null;
  return candidate;
}
