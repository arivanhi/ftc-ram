'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { extractShortGroupName, isSafeHttpUrl } from '@/lib/format';

const NAV_ITEMS = [
  { href: '/', label: 'Katalog & Kondisi Aset' },
  { href: '/denah', label: 'Penempatan & Denah Lab' },
  { href: '/peminjaman', label: 'Peminjaman Aset' },
  { href: '/tutorial', label: 'Tutorial & SOP' },
  { href: '/narahubung', label: 'Narahubung & Bantuan' },
];

type ResearchGroupLink = {
  id: string;
  name: string;
  url: string;
  description: string;
};

export function PublicHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [adminUser, setAdminUser] = useState<{ name: string; email: string } | null>(null);
  const [researchGroups, setResearchGroups] = useState<ResearchGroupLink[]>([]);
  const [kkOpen, setKkOpen] = useState(false);
  const kkRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.authenticated && d.user) setAdminUser(d.user);
      })
      .catch(() => {});

    fetch('/api/research-groups')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        const list = Array.isArray(d?.items) ? d.items : [];
        setResearchGroups(list.filter((g: ResearchGroupLink) => isSafeHttpUrl(g.url)));
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!kkOpen) return;
    function onPointerDown(e: MouseEvent) {
      if (kkRef.current && !kkRef.current.contains(e.target as Node)) setKkOpen(false);
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setKkOpen(false);
    }
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [kkOpen]);

  function onSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    const q = search.trim();
    router.push(q ? `/?q=${encodeURIComponent(q)}` : '/');
  }

  return (
    <header className="fixed top-0 left-0 w-full z-50 bg-surface-container-lowest/95 backdrop-blur-md shadow-[0_1px_8px_rgba(0,0,0,0.04)] no-print">
      <div className="h-20 w-full max-w-[1440px] mx-auto px-gutter flex items-center justify-between gap-space-md">
        <Link href="/" className="flex items-center gap-space-md min-w-max">
          <img
            src="/images/logo-dinus.png"
            alt="Logo UDINUS"
            className="h-10 w-auto object-contain"
          />
          <div className="flex flex-col justify-center">
            <div className="flex items-center gap-1.5">
              <span className="text-title-md text-primary font-bold tracking-tight">
                SIM-Aset Penelitian
              </span>
              <span className="px-2 py-0.5 rounded-full bg-secondary-container/25 text-secondary text-label-sm uppercase font-bold">
                FTC
              </span>
            </div>
            <span className="text-body-sm text-on-surface-variant hidden sm:inline-block leading-tight">
              Fakultas Teknologi Cerdas (FTC) — Universitas Dian Nuswantoro
            </span>
          </div>
        </Link>

        <div className="hidden lg:flex items-center gap-4 ml-auto min-w-0">
          {researchGroups.length > 0 && (
            <div ref={kkRef} data-kelompok-keilmuan className="relative flex items-center gap-4 shrink-0">
              {researchGroups.length <= 5 ? (
                researchGroups.map((g) => (
                  <a
                    key={g.id}
                    href={g.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    title={g.description ? `${g.name} — ${g.description}` : g.name}
                    className="text-title-sm font-semibold text-primary hover:text-secondary hover:underline whitespace-nowrap transition-colors"
                  >
                    {extractShortGroupName(g.name)}
                  </a>
                ))
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => setKkOpen((o) => !o)}
                    aria-expanded={kkOpen}
                    className="inline-flex items-center gap-0.5 text-title-sm font-semibold text-primary hover:text-secondary whitespace-nowrap transition-colors"
                  >
                    <span>Kelompok Keilmuan</span>
                    <span className="material-symbols-outlined text-[16px]">
                      {kkOpen ? 'expand_less' : 'expand_more'}
                    </span>
                  </button>
                  {kkOpen && (
                    <div className="absolute right-0 top-full mt-2 w-72 rounded-xl bg-white border border-outline-variant/30 shadow-lg py-1.5 z-50">
                      {researchGroups.map((g) => (
                        <a
                          key={g.id}
                          href={g.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={() => setKkOpen(false)}
                          className="flex items-start justify-between gap-2 px-3.5 py-2 hover:bg-surface-container-low transition-colors"
                        >
                          <div className="min-w-0">
                            <div className="text-title-sm font-semibold text-primary truncate">
                              {extractShortGroupName(g.name)}
                            </div>
                            <div className="text-[12px] text-on-surface-variant line-clamp-1">
                              {g.name}
                            </div>
                          </div>
                          <span className="material-symbols-outlined text-[15px] text-primary shrink-0 mt-0.5">
                            open_in_new
                          </span>
                        </a>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          <form onSubmit={onSearchSubmit} className="flex items-center w-64 xl:w-80 shrink-0">
            <div className="w-full flex items-center bg-surface-container-low rounded-lg px-space-md py-2 focus-within:bg-surface-container-lowest focus-within:ring-2 focus-within:ring-primary/30 transition-all">
              <span className="material-symbols-outlined text-outline text-[20px] mr-2">search</span>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-transparent text-body-md text-on-surface placeholder:text-outline focus:outline-none"
                placeholder="Cari produk riset, kode inventaris, rak..."
                type="text"
              />
            </div>
          </form>
        </div>

        {adminUser && (
          <div className="flex items-center gap-space-sm min-w-max">
            <Link
              href="/admin"
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-primary text-on-primary text-title-sm hover:bg-primary-container transition-colors shadow-sm"
            >
              <span className="material-symbols-outlined text-[18px]">admin_panel_settings</span>
              <span className="hidden sm:inline">Panel CMS Admin</span>
            </Link>
          </div>
        )}
      </div>

      <nav className="w-full bg-surface-container-low border-t border-outline-variant/20">
        <div className="max-w-[1440px] mx-auto px-gutter py-2 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          {NAV_ITEMS.map((item) => {
            const active =
              item.href === '/'
                ? pathname === '/' || pathname.startsWith('/aset/')
                : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={
                  active
                    ? 'px-space-md py-1.5 rounded-lg bg-primary-container text-on-primary text-title-sm whitespace-nowrap shadow-sm transition-colors'
                    : 'px-space-md py-1.5 rounded-lg text-title-sm text-on-surface-variant hover:bg-surface-container hover:text-on-surface whitespace-nowrap transition-colors'
                }
              >
                {item.label}
              </Link>
            );
          })}
          {researchGroups.length > 0 && (
            <div className="flex lg:hidden items-center gap-3 pl-3 ml-1 border-l border-outline-variant/40">
              {researchGroups.map((g) => (
                <a
                  key={g.id}
                  href={g.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  title={g.name}
                  className="text-title-sm font-semibold text-primary hover:underline whitespace-nowrap"
                >
                  {extractShortGroupName(g.name)}
                </a>
              ))}
            </div>
          )}
        </div>
      </nav>
    </header>
  );
}
