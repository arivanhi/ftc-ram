import { PublicHeader } from '@/components/PublicHeader';
import { PublicFooter } from '@/components/PublicFooter';
import { TutorialClient } from '@/components/TutorialClient';

export default function TutorialPage() {
  return (
    <>
      <PublicHeader />
      <main className="w-full pt-36 pb-12 flex-1">
        <TutorialClient />
      </main>
      <PublicFooter />
    </>
  );
}
