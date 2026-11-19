import { Suspense } from 'react';
import { PublicHeader } from '@/components/PublicHeader';
import { PublicFooter } from '@/components/PublicFooter';
import { ContactHelpdeskClient } from '@/components/ContactHelpdeskClient';

export default function NarahubungPage() {
  return (
    <>
      <PublicHeader />
      <main className="w-full pt-36 pb-12 flex-1">
        <Suspense fallback={<div className="max-w-[1440px] mx-auto px-gutter py-12 text-on-surface-variant">Memuat direktori narahubung FTC...</div>}>
          <ContactHelpdeskClient />
        </Suspense>
      </main>
      <PublicFooter />
    </>
  );
}
