'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ConditionBadge, LoanStatusBadge, UrgencyBadge } from '@/components/StatusBadge';
import { formatIndonesianDate } from '@/lib/format';

type DashboardData = {
  kpis: {
    totalAssets: number;
    primaAssets: number;
    maintenanceAssets: number;
    rusakAssets: number;
    borrowedAssets: number;
  };
  pendingLoans: Array<{
    id: string;
    ticketCode: string;
    borrowerName: string;
    borrowerIdType: string;
    purposeTitle: string;
    startDate: string;
    endDate: string;
    status: string;
  }>;
  openIssues: Array<{
    id: string;
    ticketCode: string;
    assetCodeInput: string;
    reporterName: string;
    urgency: string;
    status: string;
  }>;
  attentionAssets: Array<{
    id: string;
    inventoryCode: string;
    name: string;
    condition: string;
    roomCode: string | null;
  }>;
};

export default function AdminDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);

  useEffect(() => {
    fetch('/api/admin/dashboard')
      .then((r) => (r.ok ? r.json() : null))
      .then(setData)
      .catch(() => {});
  }, []);

  const k = data?.kpis ?? {
    totalAssets: 0,
    primaAssets: 0,
    maintenanceAssets: 0,
    rusakAssets: 0,
    borrowedAssets: 0,
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-headline-lg text-primary font-bold">Ringkasan Pengelolaan Aset FTC</h1>
          <p className="text-body-md text-on-surface-variant">
            Pantau kondisi produk riset, persetujuan peminjaman pameran, dan tiket kendala terbaru.
          </p>
        </div>
        <Link
          href="/admin/aset"
          className="px-4 py-2.5 rounded-lg bg-primary text-on-primary text-title-sm inline-flex items-center gap-1.5"
        >
          <span className="material-symbols-outlined text-[18px]">add_circle</span>
          Tambah Aset Baru (UUID)
        </Link>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {[
          ['Total Aset', k.totalAssets, 'text-primary'],
          ['Kondisi Prima', k.primaAssets, 'text-[#059669]'],
          ['Perawatan', k.maintenanceAssets, 'text-secondary'],
          ['Rusak', k.rusakAssets, 'text-error'],
          ['Sedang Dipinjam', k.borrowedAssets, 'text-tertiary'],
        ].map(([lbl, val, cls]) => (
          <div key={String(lbl)} className="bg-white rounded-xl border border-outline-variant/25 p-4 shadow-sm">
            <div className="text-label-md text-on-surface-variant">{lbl}</div>
            <div className={`text-headline-xl font-bold mt-2 tabular-nums-code ${cls}`}>{val}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section className="bg-white rounded-xl border border-outline-variant/25 p-5 shadow-sm flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="text-title-md text-primary font-bold">Antrean Peminjaman Menunggu</h2>
            <Link href="/admin/peminjaman" className="text-label-md text-primary hover:underline">Kelola Semua →</Link>
          </div>
          {!data || data.pendingLoans.length === 0 ? (
            <p className="text-body-sm text-on-surface-variant">Tidak ada pengajuan peminjaman menunggu.</p>
          ) : (
            data.pendingLoans.map((l) => (
              <div key={l.id} className="p-3 rounded-lg bg-surface-container-low flex items-center justify-between gap-2">
                <div>
                  <div className="text-title-sm font-bold text-primary">{l.ticketCode} — {l.purposeTitle}</div>
                  <div className="text-body-sm text-on-surface-variant">
                    {l.borrowerName} ({l.borrowerIdType}) • {formatIndonesianDate(l.startDate)} – {formatIndonesianDate(l.endDate)}
                  </div>
                </div>
                <LoanStatusBadge status={l.status} />
              </div>
            ))
          )}
        </section>

        <section className="bg-white rounded-xl border border-outline-variant/25 p-5 shadow-sm flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="text-title-md text-primary font-bold">Tiket Kendala Aktif</h2>
            <Link href="/admin/kendala" className="text-label-md text-primary hover:underline">Kelola Semua →</Link>
          </div>
          {!data || data.openIssues.length === 0 ? (
            <p className="text-body-sm text-on-surface-variant">Tidak ada tiket kendala terbuka.</p>
          ) : (
            data.openIssues.map((t) => (
              <div key={t.id} className="p-3 rounded-lg bg-surface-container-low flex items-center justify-between gap-2">
                <div>
                  <div className="text-title-sm font-bold text-on-surface">{t.ticketCode} • {t.assetCodeInput}</div>
                  <div className="text-body-sm text-on-surface-variant">Pelapor: {t.reporterName}</div>
                </div>
                <UrgencyBadge urgency={t.urgency} />
              </div>
            ))
          )}
        </section>
      </div>

      <section className="bg-white rounded-xl border border-outline-variant/25 p-5 shadow-sm flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-title-md text-primary font-bold">Aset Membutuhkan Perhatian</h2>
          <Link href="/admin/aset" className="text-label-md text-primary hover:underline">Kelola Aset →</Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {(data?.attentionAssets ?? []).map((a) => (
            <div key={a.id} className="p-3 rounded-lg bg-surface-container-low flex items-center justify-between gap-2">
              <div className="min-w-0">
                <div className="text-mono-data text-primary font-bold">{a.inventoryCode}</div>
                <div className="text-title-sm truncate">{a.name}</div>
                <div className="text-body-sm text-on-surface-variant">Ruang: {a.roomCode ?? '-'}</div>
              </div>
              <ConditionBadge condition={a.condition} />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
