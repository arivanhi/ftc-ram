import { readFile } from 'node:fs/promises';
import { NextResponse } from 'next/server';
import { requireAdminApi } from '@/lib/auth';
import { getMimeFromFilename, resolveSafeUploadPath } from '@/lib/uploads';

export async function GET(
  _req: Request,
  context: { params: Promise<{ filename: string }> },
) {
  const auth = await requireAdminApi();
  if ('response' in auth) return auth.response;

  const { filename } = await context.params;
  const fullPath = resolveSafeUploadPath('private', filename);
  if (!fullPath) {
    return NextResponse.json({ error: 'Nama berkas tidak valid.' }, { status: 400 });
  }
  try {
    const data = await readFile(fullPath);
    return new NextResponse(data, {
      status: 200,
      headers: {
        'Content-Type': getMimeFromFilename(filename),
        'Content-Disposition': `inline; filename="${filename}"`,
        'X-Content-Type-Options': 'nosniff',
        'Cache-Control': 'private, no-store',
      },
    });
  } catch {
    return NextResponse.json({ error: 'Berkas tidak ditemukan.' }, { status: 404 });
  }
}
