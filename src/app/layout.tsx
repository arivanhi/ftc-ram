import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'SIM-Aset Penelitian FTC — Universitas Dian Nuswantoro',
  description:
    'Sistem Informasi Manajemen Aset Produk Penelitian Fakultas Teknologi Cerdas (FTC) UDINUS untuk pemantauan kondisi, denah peletakan, panduan penggunaan, narahubung, dan peminjaman pameran.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,300..700,0..1,-50..200&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-surface font-sans text-body-md text-on-surface antialiased min-h-screen flex flex-col">
        {children}
      </body>
    </html>
  );
}
