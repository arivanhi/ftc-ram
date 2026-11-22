'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';

const ADMIN_NAV = [
  { href: '/admin', label: 'Ringkasan', icon: 'dashboard' },
  { href: '/admin/aset', label: 'Aset & QR Code', icon: 'science' },
  { href: '/admin/lokasi', label: 'Gedung & Denah', icon: 'map' },
  { href: '/admin/tutorial', label: 'Tutorial & FAQ', icon: 'menu_book' },
  { href: '/admin/kelompok-keilmuan', label: 'Kelompok Keilmuan', icon: 'groups' },
  { href: '/admin/narahubung', label: 'Narahubung', icon: 'support_agent' },
  { href: '/admin/peminjaman', label: 'Peminjaman', icon: 'assignment_turned_in' },
  { href: '/admin/kendala', label: 'Laporan Kendala', icon: 'report_problem' },
  { href: '/admin/smtp', label: 'Pengaturan SMTP', icon: 'mail' },
];

export function AdminShell({
  user,
  children,
}: {
  user: { name: string; email: string };
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/admin/login');
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-surface flex flex-col lg:flex-row">
      {/* Sidebar */}
      <aside className="lg:w-64 lg:shrink-0 bg-primary text-on-primary flex flex-col no-print">
        <div className="p-4 flex items-center justify-between border-b border-white/10">
          <Link href="/admin" className="flex items-center gap-2.5">
            <img src="/images/logo-dinus.png" alt="UDINUS" className="h-8 w-auto bg-white rounded-md p-0.5" />
            <div>
              <div className="text-title-sm font-bold leading-tight">CMS Aset FTC</div>
              <div className="text-[11px] text-secondary-fixed">UDINUS Admin</div>
            </div>
          </Link>
          <button
            type="button"
            onClick={() => setMenuOpen((o) => !o)}
            className="lg:hidden p-1.5 rounded bg-white/10"
          >
            <span className="material-symbols-outlined text-[20px]">menu</span>
          </button>
        </div>

        <nav className={`p-3 flex-1 flex-col gap-1 ${menuOpen ? 'flex' : 'hidden lg:flex'}`}>
          {ADMIN_NAV.map((item) => {
            const active =
              item.href === '/admin' ? pathname === '/admin' : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMenuOpen(false)}
                className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-title-sm transition-colors ${
                  active
                    ? 'bg-secondary-container text-on-secondary-fixed font-bold shadow-sm'
                    : 'text-on-primary/85 hover:bg-white/10'
                }`}
              >
                <span className="material-symbols-outlined text-[20px]">{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            );
          })}

          <div className="mt-auto pt-4 border-t border-white/10 flex flex-col gap-1.5">
            <div className="px-3 py-1 text-[12px] text-on-primary/75 truncate">
              {user.name} ({user.email})
            </div>
            <Link
              href="/"
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/10 hover:bg-white/15 text-body-sm"
            >
              <span className="material-symbols-outlined text-[18px]">public</span>
              Lihat Portal Publik
            </Link>
            <button
              type="button"
              onClick={logout}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-error/80 hover:bg-error text-body-sm text-left"
            >
              <span className="material-symbols-outlined text-[18px]">logout</span>
              Keluar
            </button>
          </div>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-8 max-w-[1440px] w-full mx-auto">{children}</main>
    </div>
  );
}
