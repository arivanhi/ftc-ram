import QRCode from 'qrcode';

const SAFE_HOST_RE = /^[a-z0-9.-]+(?::\d{1,5})?$/i;

export function resolveRequestOrigin(req: Request): string {
  const fwdHost = req.headers.get('x-forwarded-host')?.split(',')[0]?.trim();
  const fwdProto = req.headers.get('x-forwarded-proto')?.split(',')[0]?.trim().toLowerCase();
  if (fwdHost && SAFE_HOST_RE.test(fwdHost)) {
    const proto = fwdProto === 'http' || fwdProto === 'https' ? fwdProto : 'https';
    return `${proto}://${fwdHost}`;
  }
  const host = req.headers.get('host')?.trim();
  if (host && SAFE_HOST_RE.test(host) && !host.startsWith('0.0.0.0') && !host.startsWith('127.0.0.1')) {
    return `${fwdProto === 'https' ? 'https' : 'http'}://${host}`;
  }
  return process.env.NEXT_PUBLIC_APP_URL || new URL(req.url).origin;
}

export function buildAssetPublicUrl(uuid: string, origin?: string): string {
  const base = (origin || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:4031').replace(/\/+$/, '');
  return `${base}/aset/${uuid}`;
}

export async function generateAssetQrPngBuffer(assetUrl: string): Promise<Buffer> {
  return QRCode.toBuffer(assetUrl, {
    type: 'png',
    width: 320,
    margin: 2,
    color: { dark: '#003369', light: '#FFFFFF' },
  });
}
