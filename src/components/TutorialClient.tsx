'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { SafeStepsRenderer } from '@/components/SafeStepsRenderer';
import { VideoEmbed } from '@/components/VideoEmbed';
import { buildWhatsAppUrl } from '@/lib/loan-rules';
import { isSafeHttpUrl, resolveVideoEmbedUrl } from '@/lib/format';

type TutorialItem = {
  id: string;
  docCode: string;
  title: string;
  category: string;
  format: string;
  summary: string;
  stepsMarkdown: string | null;
  fileUrl: string | null;
  videoUrl: string | null;
  version: string;
  instructorName: string | null;
  asset: { id: string; name: string; inventoryCode: string } | null;
};

type FaqItem = { id: string; question: string; answer: string };
type SupportContact = { id: string; name: string; roleTitle: string; whatsapp: string; roomLabel: string };

const CATEGORIES = [
  { key: '', label: 'Semua Klaster', icon: 'apps' },
  { key: 'pengoperasian', label: 'Pengoperasian Alat', icon: 'precision_manufacturing' },
  { key: 'video_demo', label: 'Video Demo', icon: 'smart_display' },
  { key: 'persiapan_pameran', label: 'Persiapan Pameran', icon: 'campaign' },
  { key: 'perawatan', label: 'Perawatan Ringan', icon: 'build' },
  { key: 'k3', label: 'Keselamatan & Checklist', icon: 'health_and_safety' },
];

const EXHIBITION_CHECKLIST = [
  'Cek kondisi fisik & baterai/adaptor tiap produk sebelum berangkat',
  'Pastikan stiker QR Code menempel jelas untuk akses panduan cepat',
  'Unduh atau baca langkah menyalakan & shutdown produk di halaman ini',
  'Simpan nomor WhatsApp narahubung produk di ponsel PIC Pameran',
  'Dokumentasikan foto kondisi aset sebelum dan sesudah acara',
];

export function TutorialClient() {
  const [q, setQ] = useState('');
  const [category, setCategory] = useState('');
  const [items, setItems] = useState<TutorialItem[]>([]);
  const [faqs, setFaqs] = useState<FaqItem[]>([]);
  const [supportContacts, setSupportContacts] = useState<SupportContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTutorial, setActiveTutorial] = useState<TutorialItem | null>(null);
  const [checkedSteps, setCheckedSteps] = useState<Record<number, boolean>>({});
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    const t = setTimeout(async () => {
      setLoading(true);
      const sp = new URLSearchParams();
      if (q.trim()) sp.set('q', q.trim());
      if (category) sp.set('category', category);
      try {
        const res = await fetch(`/api/tutorials?${sp.toString()}`);
        if (res.ok) {
          const d = await res.json();
          setItems(d.items ?? []);
          setFaqs(d.faqs ?? []);
          setSupportContacts(d.supportContacts ?? []);
        }
      } finally {
        setLoading(false);
      }
    }, 150);
    return () => clearTimeout(t);
  }, [q, category]);

  return (
    <div className="w-full max-w-[1440px] mx-auto px-gutter flex flex-col gap-space-xl">
      {/* Hero Banner */}
      <section className="relative rounded-xl bg-gradient-to-r from-primary to-primary-container text-on-primary p-space-lg md:p-space-xl overflow-hidden shadow-sm">
        <div className="relative z-10 max-w-3xl flex flex-col gap-4">
          <div className="flex items-center gap-2 text-secondary-fixed text-title-sm uppercase font-bold">
            <span className="material-symbols-outlined text-[24px]">menu_book</span>
            Dokumentasi &amp; Panduan Operasional FTC
          </div>
          <h1 className="text-headline-lg md:text-headline-xl text-on-primary font-bold tracking-tight">
            Pusat Tutorial &amp; Cara Penggunaan Produk Penelitian FTC UDINUS
          </h1>
          <p className="text-body-lg text-on-primary/90 max-w-2xl">
            Panduan langkah demi langkah, dokumen PDF, checklist persiapan pameran, dan video demonstrasi agar setiap PIC Pameran dapat mengoperasikan produk dengan aman.
          </p>
          <div className="flex items-center gap-2 bg-white p-1.5 rounded-lg shadow-md max-w-2xl">
            <span className="material-symbols-outlined text-outline text-[22px] ml-2">search</span>
            <input
              ref={inputRef}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Cari panduan, nama produk (DINUS-Bot, IoT, BISINDO), atau kode SOP..."
              className="flex-1 bg-transparent text-body-md text-on-surface placeholder:text-outline focus:outline-none py-1.5"
            />
            <span className="hidden sm:inline px-2 py-1 rounded bg-surface-container text-on-surface-variant text-label-sm">
              Ctrl+K
            </span>
          </div>
        </div>
      </section>

      {/* Category Filter Pills */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
        {CATEGORIES.map((c) => {
          const active = category === c.key;
          return (
            <button
              key={c.key}
              type="button"
              onClick={() => setCategory(c.key)}
              className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-title-sm whitespace-nowrap transition-colors shadow-sm ${
                active
                  ? 'bg-primary text-on-primary'
                  : 'bg-surface-container-lowest text-on-surface-variant hover:bg-surface-container-high border border-outline-variant/25'
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">{c.icon}</span>
              {c.label}
            </button>
          );
        })}
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-space-lg items-start">
        <section className="xl:col-span-8 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-headline-sm text-on-surface font-bold">Daftar Modul &amp; Panduan Penggunaan</h2>
              <p className="text-body-sm text-on-surface-variant">Menampilkan {items.length} panduan terverifikasi FTC</p>
            </div>
          </div>

          {loading ? (
            <div className="h-64 rounded-xl bg-surface-container-low animate-pulse" />
          ) : items.length === 0 ? (
            <div className="p-8 rounded-xl bg-surface-container-lowest border border-outline-variant/25 text-center text-on-surface-variant">
              Belum ada panduan yang sesuai dengan pencarian Anda.
            </div>
          ) : (
            items.map((tut) => (
              <article
                key={tut.id}
                className="bg-surface-container-lowest rounded-xl border border-outline-variant/25 shadow-sm hover:shadow-md transition-shadow p-space-md flex flex-col gap-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded bg-primary-container text-on-primary text-label-sm uppercase">
                      {tut.format.replace('_', ' ')}
                    </span>
                    <span className="text-mono-data text-outline font-semibold">{tut.docCode}</span>
                  </div>
                  {tut.asset && (
                    <Link
                      href={`/aset/${tut.asset.id}`}
                      className="px-2.5 py-0.5 rounded-full bg-surface-container text-primary text-label-sm hover:bg-primary-fixed"
                    >
                      Aset: {tut.asset.inventoryCode} — {tut.asset.name}
                    </Link>
                  )}
                </div>

                <h3 className="text-title-md text-on-surface font-bold">{tut.title}</h3>
                <p className="text-body-md text-on-surface-variant">{tut.summary}</p>
                <VideoEmbed url={tut.videoUrl} title={tut.title} />

                <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-surface-container-high">
                  <div className="text-body-sm text-on-surface-variant">
                    Versi {tut.version} {tut.instructorName ? `• Penyusun: ${tut.instructorName}` : ''}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setActiveTutorial(tut)}
                      className="px-3.5 py-1.5 rounded-lg bg-surface-container-high hover:bg-primary-fixed text-primary text-title-sm inline-flex items-center gap-1"
                    >
                      <span className="material-symbols-outlined text-[18px]">visibility</span>
                      Buka Baca Cepat
                    </button>
                    {tut.fileUrl && (
                      <a
                        href={tut.fileUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="px-3.5 py-1.5 rounded-lg bg-primary hover:bg-tertiary text-on-primary text-title-sm inline-flex items-center gap-1"
                      >
                        <span className="material-symbols-outlined text-[18px]">download</span>
                        Unduh Berkas
                      </a>
                    )}
                    {tut.videoUrl && isSafeHttpUrl(tut.videoUrl) && !resolveVideoEmbedUrl(tut.videoUrl) && (
                      <a
                        href={tut.videoUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="px-3.5 py-1.5 rounded-lg bg-secondary hover:bg-secondary/90 text-on-secondary text-title-sm inline-flex items-center gap-1"
                      >
                        <span className="material-symbols-outlined text-[18px]">play_circle</span>
                        Tonton Video
                      </a>
                    )}
                  </div>
                </div>
              </article>
            ))
          )}
        </section>

        {/* Right Sidebar: Exhibition Checklist (replaces Level 3 Quiz) + Support Contacts */}
        <aside className="xl:col-span-4 flex flex-col gap-space-lg">
          <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/25 shadow-sm p-space-lg border-t-4 border-t-secondary-container flex flex-col gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-lg bg-secondary-container/20 text-secondary flex items-center justify-center">
                <span className="material-symbols-outlined text-[24px]">fact_check</span>
              </div>
              <div>
                <span className="text-label-sm text-secondary uppercase font-bold">Panduan Cepat</span>
                <h3 className="text-title-md text-on-surface font-bold">Checklist Persiapan PIC Pameran</h3>
              </div>
            </div>
            <p className="text-body-sm text-on-surface-variant">
              Centang langkah berikut saat menyiapkan produk penelitian FTC sebelum dibawa ke lokasi pameran:
            </p>
            <div className="flex flex-col gap-2">
              {EXHIBITION_CHECKLIST.map((step, i) => (
                <label
                  key={i}
                  className="flex items-start gap-2.5 p-2.5 rounded-lg bg-surface-container-low hover:bg-surface-container cursor-pointer text-body-sm"
                >
                  <input
                    type="checkbox"
                    checked={Boolean(checkedSteps[i])}
                    onChange={(e) => setCheckedSteps((prev) => ({ ...prev, [i]: e.target.checked }))}
                    className="mt-0.5 accent-primary"
                  />
                  <span className={checkedSteps[i] ? 'line-through text-outline' : 'text-on-surface'}>
                    {step}
                  </span>
                </label>
              ))}
            </div>
            <Link
              href="/peminjaman"
              className="w-full py-2.5 rounded-lg bg-secondary-container hover:bg-secondary-fixed-dim text-on-secondary-fixed text-title-sm font-bold text-center"
            >
              Lanjut ke Form Peminjaman Aset
            </Link>
          </div>

          <div className="bg-primary text-on-primary rounded-xl p-space-lg shadow-sm flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-secondary-fixed text-[24px]">contact_support</span>
              <h4 className="text-title-md font-bold">Bantuan Teknis Narahubung FTC</h4>
            </div>
            <p className="text-body-sm text-on-primary/85">
              Mengalami kendala saat menyalakan atau mendemokan alat di pameran? Hubungi langsung PIC terkait:
            </p>
            <div className="flex flex-col gap-2">
              {supportContacts.map((c) => (
                <div key={c.id} className="flex items-center justify-between gap-2 bg-white/10 rounded-lg px-3 py-2">
                  <div className="min-w-0">
                    <div className="text-title-sm font-semibold truncate">{c.name}</div>
                    <div className="text-body-sm text-on-primary/80 truncate">{c.roleTitle}</div>
                  </div>
                  <a
                    href={buildWhatsAppUrl(c.whatsapp, `Halo ${c.name}, saya butuh bantuan teknis produk penelitian FTC.`)}
                    target="_blank"
                    rel="noreferrer"
                    className="w-9 h-9 rounded-full bg-secondary-container text-on-secondary-fixed flex items-center justify-center shrink-0"
                    title="Chat WhatsApp"
                  >
                    <span className="material-symbols-outlined text-[18px]">chat</span>
                  </a>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>

      {/* FAQ Section */}
      {faqs.length > 0 && (
        <section className="bg-surface-container-lowest rounded-xl border border-outline-variant/25 shadow-sm p-space-lg flex flex-col gap-4">
          <div className="border-b border-surface-container-high pb-3">
            <span className="text-label-sm text-primary uppercase font-bold">Tanya Jawab Teknis</span>
            <h2 className="text-headline-md text-on-surface font-bold">Frequently Asked Questions (FAQ)</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {faqs.map((faq) => (
              <div key={faq.id} className="bg-surface-container-low rounded-xl p-4 flex flex-col gap-1.5">
                <div className="flex items-start gap-2">
                  <span className="material-symbols-outlined text-primary text-[20px] shrink-0 mt-0.5">help</span>
                  <h4 className="text-title-sm font-bold text-on-surface">{faq.question}</h4>
                </div>
                <p className="text-body-md text-on-surface-variant pl-7">{faq.answer}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Quick Read Modal */}
      {activeTutorial && (
        <div className="fixed inset-0 z-50 bg-on-surface/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[88vh] flex flex-col shadow-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-outline-variant/30 flex items-start justify-between gap-4">
              <div>
                <span className="text-mono-data text-outline font-semibold">{activeTutorial.docCode}</span>
                <h3 className="text-headline-sm text-primary font-bold">{activeTutorial.title}</h3>
              </div>
              <button
                type="button"
                onClick={() => setActiveTutorial(null)}
                className="p-2 rounded-lg bg-surface-container hover:bg-surface-container-high"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>
            <div className="p-6 overflow-y-auto flex flex-col gap-4">
              <VideoEmbed url={activeTutorial.videoUrl} title={activeTutorial.title} />
              <p className="text-body-md text-on-surface-variant">{activeTutorial.summary}</p>
              <SafeStepsRenderer content={activeTutorial.stepsMarkdown} />
              <div className="flex flex-wrap gap-2 pt-2">
                {activeTutorial.fileUrl && (
                  <a
                    href={activeTutorial.fileUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="px-4 py-2 rounded-lg bg-primary text-on-primary text-title-sm inline-flex items-center gap-1.5"
                  >
                    <span className="material-symbols-outlined text-[18px]">download</span>
                    Buka / Unduh Lampiran
                  </a>
                )}
                {activeTutorial.videoUrl && isSafeHttpUrl(activeTutorial.videoUrl) && !resolveVideoEmbedUrl(activeTutorial.videoUrl) && (
                  <a
                    href={activeTutorial.videoUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="px-4 py-2 rounded-lg bg-secondary text-on-secondary text-title-sm inline-flex items-center gap-1.5"
                  >
                    <span className="material-symbols-outlined text-[18px]">open_in_new</span>
                    Buka Tautan Video
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
