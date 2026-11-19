import { Suspense } from 'react';
import { PublicHeader } from '@/components/PublicHeader';
import { PublicFooter } from '@/components/PublicFooter';
import { LoanPortalClient } from '@/components/LoanPortalClient';

export default function PeminjamanPage() {
  return (
    <>
      <PublicHeader />
      <main className="w-full pt-36 pb-12 flex-1">
        <Suspense fallback={<div className="max-w-[1440px] mx-auto px-gutter py-12 text-on-surface-variant">Memuat layanan peminjaman aset...</div>}>
          <LoanPortalClient />
        </Suspense>
      </main>
      <PublicFooter />
    </>
  );
}
