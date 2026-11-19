import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { validateMagicBytes, resolveSafeUploadPath, saveUploadedFile } from '@/lib/uploads';

describe('secure upload validation & path safety', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'ftc-uploads-'));
    process.env.UPLOAD_DIR = tempDir;
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
    delete process.env.UPLOAD_DIR;
  });

  it('rejects disguised .png containing HTML/script bytes (Review Focus #2)', async () => {
    const fakePng = new File([Buffer.from('<html><script>alert(1)</script></html>')], 'evil.png', {
      type: 'image/png',
    });
    expect(validateMagicBytes(Buffer.from('<html>'), 'png')).toBe(false);
    await expect(saveUploadedFile(fakePng, 'public', 'image')).rejects.toThrow(/signature|format|valid/i);
  });

  it('saves valid PNG with UUID filename into public vs private directory', async () => {
    const validPngBytes = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00]);
    const file = new File([validPngBytes], 'photo.png', { type: 'image/png' });
    const pub = await saveUploadedFile(file, 'public', 'image');
    expect(pub.url).toMatch(/^\/api\/uploads\/public\/[0-9a-f-]{36}\.png$/);
    expect(existsSync(join(tempDir, 'public', pub.filename))).toBe(true);

    const priv = await saveUploadedFile(file, 'private', 'image');
    expect(priv.url).toMatch(/^\/api\/admin\/uploads\/[0-9a-f-]{36}\.png$/);
    expect(existsSync(join(tempDir, 'private', priv.filename))).toBe(true);
  });

  it('blocks path traversal and non-UUID filenames on serve path resolution (Review Focus #2)', () => {
    expect(resolveSafeUploadPath('public', '../../.env')).toBeNull();
    expect(resolveSafeUploadPath('public', '../private/550e8400-e29b-41d4-a716-446655440000.pdf')).toBeNull();
    expect(resolveSafeUploadPath('public', 'logo.png')).toBeNull();
    const ok = resolveSafeUploadPath('public', '550e8400-e29b-41d4-a716-446655440000.png');
    expect(ok).toContain(join('public', '550e8400-e29b-41d4-a716-446655440000.png'));
  });
});
