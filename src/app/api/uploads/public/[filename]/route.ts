import { readFile } from 'node:fs/promises';
import { NextResponse } from 'next/server';
import { getMimeFromFilename, resolveSafeUploadPath } from '@/lib/uploads';

export async function GET(
  _req: Request,
  context: { params: Promise<{ filename: string }> },
) {
  const { filename } = await context.params;
  const fullPath = resolveSafeUploadPath('public', filename);
  if (!fullPath) {
    return NextResponse.json({ error: 'Nama berkas tidak valid.' }, { status: 400 });
  }
  try {
    const data = await readFile(fullPath);
    return new NextResponse(data, {
      status: 200,
      headers: {
        'Content-Type': getMimeFromFilename(filename),
        'X-Content-Type-Options': 'nosniff',
        'Cache-Control': 'public, max-age=86400',
      },
    });
  } catch {
    return NextResponse.json({ error: 'Berkas tidak ditemukan.' }, { status: 404 });
  }
}
