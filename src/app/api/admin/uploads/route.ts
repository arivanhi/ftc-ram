import { NextResponse } from 'next/server';
import { requireAdminApi } from '@/lib/auth';
import { saveUploadedFile, type UploadKind } from '@/lib/uploads';

export async function POST(req: Request) {
  const auth = await requireAdminApi();
  if ('response' in auth) return auth.response;

  try {
    const formData = await req.formData();
    const file = formData.get('file');
    const rawKind = String(formData.get('kind') ?? 'any');
    const kind: UploadKind =
      rawKind === 'image' || rawKind === 'document' ? rawKind : 'any';

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'Berkas wajib dilampirkan.' }, { status: 400 });
    }

    const saved = await saveUploadedFile(file, 'public', kind);
    return NextResponse.json(saved, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Gagal mengunggah berkas.';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
