import QRCode from 'qrcode';

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
