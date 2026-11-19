'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

const NAV_ITEMS = [
  { href: '/', label: 'Katalog & Kondisi Aset' },
  { href: '/denah', label: 'Penempatan & Denah Lab' },
  { href: '/peminjaman', label: 'Peminjaman Aset' },
  { href: '/tutorial', label: 'Tutorial & SOP' },
  { href: '/narahubung', label: 'Narahubung & Bantuan' },
];

export function PublicHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [adminUser, setAdminUser] = useState<{ name: string; email: string } | null>(null);

  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.authenticated && d.user) setAdminUser(d.user);
      })
      .catch(() => {});
  }, []);

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

        <form onSubmit={onSearchSubmit} className="hidden xl:flex items-center flex-1 max-w-md mx-space-lg">
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

        <div className="flex items-center gap-space-sm min-w-max">
          {adminUser ? (
            <Link
              href="/admin"
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-primary text-on-primary text-title-sm hover:bg-primary-container transition-colors shadow-sm"
            >
              <span className="material-symbols-outlined text-[18px]">admin_panel_settings</span>
              <span className="hidden sm:inline">Panel CMS Admin</span>
            </Link>
          ) : (
            <Link
              href="/admin/login"
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-surface-container hover:bg-surface-container-high text-primary text-title-sm transition-colors"
            >
              <span className="material-symbols-outlined text-[18px]">login</span>
              <span>Login Admin</span>
            </Link>
          )}
        </div>
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
        </div>
      </nav>
    </header>
  );
}
