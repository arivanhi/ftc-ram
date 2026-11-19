import { Suspense } from 'react';
import { PublicHeader } from '@/components/PublicHeader';
import { PublicFooter } from '@/components/PublicFooter';
import { CatalogClient } from '@/components/CatalogClient';

export default function HomePage() {
  return (
    <>
      <PublicHeader />
      <main className="w-full pt-36 pb-12 flex-1">
        <Suspense fallback={<div className="max-w-[1440px] mx-auto px-gutter py-12 text-on-surface-variant">Memuat katalog aset FTC...</div>}>
          <CatalogClient />
        </Suspense>
      </main>
      <PublicFooter />
    </>
  );
}
