'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { AvailabilityBadge, ConditionBadge } from '@/components/StatusBadge';
import { PaginationBar } from '@/components/PaginationBar';
import { formatIndonesianDate } from '@/lib/format';

type AssetItem = {
  id: string;
  inventoryCode: string;
  name: string;
  category: string;
  description: string;
  specifications: Array<{ label: string; value: string }>;
  condition: string;
  availability: string;
  completionDate: string;
  researcherTeam: string | null;
  photoUrl: string | null;
  placementDetail: string | null;
  roomCode: string | null;
  roomName: string | null;
  floorLabel: string | null;
  buildingName: string | null;
  contactName: string | null;
};

type CatalogResponse = {
  items: AssetItem[];
  total: number;
  page: number;
  totalPages: number;
  kpis: { total: number; prima: number; maintenance: number; rusak: number; dipinjam: number };
  urgentAssets: Array<{ id: string; inventoryCode: string; name: string; condition: string; roomCode: string | null }>;
  openIssueCount: number;
  filters: {
    categories: string[];
    rooms: Array<{ id: string; code: string; name: string; buildingName: string; floorLabel: string }>;
  };
};

export function CatalogClient() {
  const searchParams = useSearchParams();
  const initialQ = searchParams.get('q') ?? '';

  const [q, setQ] = useState(initialQ);
  const [category, setCategory] = useState('');
  const [roomId, setRoomId] = useState('');
  const [condition, setCondition] = useState('');
  const [sort, setSort] = useState('newest');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [data, setData] = useState<CatalogResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setQ(initialQ);
    setPage(1);
  }, [initialQ]);

  const loadData = useCallback(async () => {
    setLoading(true);
    const sp = new URLSearchParams();
    if (q.trim()) sp.set('q', q.trim());
    if (category) sp.set('category', category);
    if (roomId) sp.set('roomId', roomId);
    if (condition) sp.set('condition', condition);
    if (sort) sp.set('sort', sort);
    sp.set('page', String(page));
    sp.set('limit', String(pageSize));
    try {
      const res = await fetch(`/api/assets?${sp.toString()}`);
      if (res.ok) setData(await res.json());
    } finally {
      setLoading(false);
    }
  }, [q, category, roomId, condition, sort, page, pageSize]);

  useEffect(() => {
    const t = setTimeout(loadData, 150);
    return () => clearTimeout(t);
  }, [loadData]);

  const kpis = data?.kpis ?? { total: 0, prima: 0, maintenance: 0, rusak: 0, dipinjam: 0 };
  const primaPct = kpis.total > 0 ? Math.round((kpis.prima / kpis.total) * 1000) / 10 : 0;
  const circ = 2 * Math.PI * 14;
  const primaDash = kpis.total > 0 ? (kpis.prima / kpis.total) * circ : 0;
  const maintDash = kpis.total > 0 ? (kpis.maintenance / kpis.total) * circ : 0;
  const rusakDash = kpis.total > 0 ? (kpis.rusak / kpis.total) * circ : 0;

  const exportUrl = (() => {
    const sp = new URLSearchParams();
    if (q.trim()) sp.set('q', q.trim());
    if (category) sp.set('category', category);
    if (roomId) sp.set('roomId', roomId);
    if (condition) sp.set('condition', condition);
    return `/api/assets/export?${sp.toString()}`;
  })();

  function resetFilters() {
    setQ('');
    setCategory('');
    setRoomId('');
    setCondition('');
    setSort('newest');
    setPage(1);
  }

  return (
    <div className="w-full max-w-[1440px] mx-auto px-gutter flex flex-col gap-space-lg">
      {/* Sub-Header Status Bar & Quick Actions */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-space-md bg-surface-container-lowest p-space-lg rounded-xl border border-outline-variant/30 shadow-sm">
        <div className="flex flex-col">
          <div className="flex items-center gap-2 text-secondary text-label-sm uppercase tracking-wider mb-1">
            <span className="w-2 h-2 rounded-full bg-secondary inline-block" />
            Portal Inventaris Produk Riset • Fakultas Teknologi Cerdas
          </div>
          <h1 className="text-headline-lg text-primary tracking-tight">
            Katalog &amp; Kondisi Aset Penelitian
          </h1>
          <p className="text-body-md text-on-surface-variant max-w-2xl mt-0.5">
            Pantau kondisi terkini, lokasi peletakan, tanggal jadi, panduan penggunaan, dan narahubung setiap produk penelitian FTC UDINUS untuk kebutuhan pameran dan riset.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 self-start lg:self-center">
          <a
            href={exportUrl}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface text-title-sm transition-colors shadow-sm"
          >
            <span className="material-symbols-outlined text-[18px] text-primary">download</span>
            <span>Unduh Rekap (XLSX)</span>
          </a>
          <Link
            href="/peminjaman"
            className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-lg bg-primary hover:bg-tertiary text-on-primary text-title-sm transition-all shadow-sm"
          >
            <span className="material-symbols-outlined text-[18px]">assignment_add</span>
            <span>Ajukan Peminjaman</span>
          </Link>
        </div>
      </div>

      {/* 5 KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-space-md">
        <div className="bg-surface-container-lowest p-space-md rounded-xl border border-outline-variant/25 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-label-md text-on-surface-variant">Total Aset Produk</span>
            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
              <span className="material-symbols-outlined text-[20px]">science</span>
            </div>
          </div>
          <div className="mt-4">
            <div className="text-headline-xl text-primary font-bold tabular-nums-code">{kpis.total}</div>
            <div className="text-body-sm text-on-surface-variant mt-1">Tercatat di sistem FTC</div>
          </div>
        </div>

        <div className="bg-surface-container-lowest p-space-md rounded-xl border border-outline-variant/25 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-label-md text-on-surface-variant">Kondisi Prima</span>
            <div className="w-9 h-9 rounded-lg bg-[#ecfdf5] flex items-center justify-center text-[#059669]">
              <span className="material-symbols-outlined text-[20px]">check_circle</span>
            </div>
          </div>
          <div className="mt-4">
            <div className="flex items-baseline gap-2">
              <span className="text-headline-xl text-[#059669] font-bold tabular-nums-code">{kpis.prima}</span>
              <span className="px-2 py-0.5 rounded-full bg-[#ecfdf5] text-[#065f46] text-label-sm">{primaPct}%</span>
            </div>
            <div className="text-body-sm text-on-surface-variant mt-1">Siap tampil pameran</div>
          </div>
        </div>

        <div className="bg-surface-container-lowest p-space-md rounded-xl border border-outline-variant/25 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-label-md text-on-surface-variant">Perawatan / Kalibrasi</span>
            <div className="w-9 h-9 rounded-lg bg-secondary-fixed/60 flex items-center justify-center text-secondary">
              <span className="material-symbols-outlined text-[20px]">build_circle</span>
            </div>
          </div>
          <div className="mt-4">
            <div className="text-headline-xl text-secondary font-bold tabular-nums-code">{kpis.maintenance}</div>
            <div className="text-body-sm text-on-surface-variant mt-1">Sedang dicek teknisi</div>
          </div>
        </div>

        <div className="bg-surface-container-lowest p-space-md rounded-xl border border-outline-variant/25 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-label-md text-on-surface-variant">Perlu Perbaikan</span>
            <div className="w-9 h-9 rounded-lg bg-error-container flex items-center justify-center text-error">
              <span className="material-symbols-outlined text-[20px]">warning</span>
            </div>
          </div>
          <div className="mt-4">
            <div className="text-headline-xl text-error font-bold tabular-nums-code">{kpis.rusak}</div>
            <div className="text-body-sm text-on-surface-variant mt-1">{data?.openIssueCount ?? 0} tiket kendala aktif</div>
          </div>
        </div>

        <div className="col-span-2 md:col-span-1 bg-surface-container-lowest p-space-md rounded-xl border border-outline-variant/25 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-label-md text-on-surface-variant">Sedang Dipinjam</span>
            <div className="w-9 h-9 rounded-lg bg-primary-fixed flex items-center justify-center text-primary">
              <span className="material-symbols-outlined text-[20px]">assignment_ind</span>
            </div>
          </div>
          <div className="mt-4">
            <div className="text-headline-xl text-tertiary-container font-bold tabular-nums-code">{kpis.dipinjam}</div>
            <div className="text-body-sm text-on-surface-variant mt-1">Dipakai pameran / riset</div>
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-surface-container-lowest p-space-md rounded-xl border border-outline-variant/25 shadow-sm flex flex-col gap-3">
        <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
          <div className="w-full md:max-w-lg flex items-center bg-surface-container-low rounded-lg px-3.5 py-2.5 focus-within:bg-white focus-within:ring-2 focus-within:ring-primary/30 transition-all">
            <span className="material-symbols-outlined text-outline text-[20px] mr-2">search</span>
            <input
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setPage(1);
              }}
              className="w-full bg-transparent text-body-md text-on-surface placeholder:text-outline focus:outline-none"
              placeholder="Cari nama produk, kode inventaris (FTC-IOT-001), rak, tim..."
              type="text"
            />
          </div>

          <div className="flex items-center gap-2 self-end md:self-auto">
            <span className="text-label-sm text-on-surface-variant hidden sm:inline">Tampilan:</span>
            <div className="flex items-center bg-surface-container-low p-1 rounded-lg">
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={`px-3 py-1 rounded text-title-sm flex items-center gap-1 ${
                  viewMode === 'grid' ? 'bg-white text-primary shadow-sm' : 'text-on-surface-variant'
                }`}
              >
                <span className="material-symbols-outlined text-[18px]">grid_view</span>
                <span className="hidden sm:inline">Grid</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={`px-3 py-1 rounded text-title-sm flex items-center gap-1 ${
                  viewMode === 'table' ? 'bg-white text-primary shadow-sm' : 'text-on-surface-variant'
                }`}
              >
                <span className="material-symbols-outlined text-[18px]">table_rows</span>
                <span className="hidden sm:inline">Tabel</span>
              </button>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={category}
            onChange={(e) => {
              setCategory(e.target.value);
              setPage(1);
            }}
            className="bg-surface-container-low text-on-surface text-body-md px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            <option value="">Semua Kategori Produk</option>
            {(data?.filters.categories ?? []).map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>

          <select
            value={roomId}
            onChange={(e) => {
              setRoomId(e.target.value);
              setPage(1);
            }}
            className="bg-surface-container-low text-on-surface text-body-md px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            <option value="">Semua Ruangan / Lab</option>
            {(data?.filters.rooms ?? []).map((r) => (
              <option key={r.id} value={r.id}>
                {r.code} • {r.name} ({r.buildingName} {r.floorLabel})
              </option>
            ))}
          </select>

          <select
            value={condition}
            onChange={(e) => {
              setCondition(e.target.value);
              setPage(1);
            }}
            className="bg-surface-container-low text-on-surface text-body-md px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            <option value="">Semua Kondisi</option>
            <option value="prima">Kondisi Prima</option>
            <option value="maintenance">Perawatan / Kalibrasi</option>
            <option value="rusak">Perlu Perbaikan</option>
          </select>

          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className="bg-surface-container-low text-on-surface text-body-md px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            <option value="newest">Urutan: Baru Ditambahkan</option>
            <option value="completion_date">Urutan: Tanggal Jadi Terbaru</option>
            <option value="code">Urutan: Kode Aset (A–Z)</option>
            <option value="priority">Urutan: Prioritas Pameran</option>
          </select>

          {(q || category || roomId || condition) && (
            <button
              type="button"
              onClick={resetFilters}
              className="text-body-sm text-primary font-semibold hover:underline ml-1"
            >
              Reset Filter
            </button>
          )}
        </div>
      </div>

      {/* Main Split Area */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-lg items-start">
        <div className="lg:col-span-9 flex flex-col gap-space-md">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="text-headline-sm text-on-surface">Daftar Produk Penelitian FTC</h2>
              <span className="px-2.5 py-0.5 rounded-full bg-surface-container text-on-surface-variant text-label-sm">
                {data?.total ?? 0} Unit
              </span>
            </div>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-space-md">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-80 rounded-xl bg-surface-container-low animate-pulse" />
              ))}
            </div>
          ) : !data || data.items.length === 0 ? (
            <div className="bg-surface-container-lowest rounded-xl p-10 text-center border border-outline-variant/25">
              <span className="material-symbols-outlined text-[40px] text-outline">inventory_2</span>
              <p className="text-title-md text-on-surface mt-2">Tidak ada aset yang cocok dengan filter.</p>
              <button
                type="button"
                onClick={resetFilters}
                className="mt-3 px-4 py-2 rounded-lg bg-primary text-on-primary text-title-sm"
              >
                Tampilkan Semua Aset
              </button>
            </div>
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-space-md">
              {data.items.map((item) => {
                const canBorrow = item.condition !== 'rusak' && item.availability !== 'tidak_tersedia';
                return (
                  <div
                    key={item.id}
                    className="flex flex-col bg-surface-container-lowest rounded-xl border border-outline-variant/25 shadow-sm hover:shadow-md transition-all overflow-hidden group"
                  >
                    <Link href={`/aset/${item.id}`} className="relative w-full aspect-[16/10] bg-surface-container overflow-hidden block">
                      <img
                        src={item.photoUrl || '/images/placeholders/asset-default.svg'}
                        alt={item.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      <div className="absolute top-2.5 left-2.5">
                        <span className="px-2.5 py-1 rounded-md bg-white/95 backdrop-blur text-mono-data text-primary font-bold shadow-sm tabular-nums-code">
                          {item.inventoryCode}
                        </span>
                      </div>
                      <div className="absolute top-2.5 right-2.5">
                        <ConditionBadge condition={item.condition} />
                      </div>
                    </Link>

                    <div className="p-space-md flex flex-col flex-1 justify-between gap-3">
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <span className="text-body-sm text-on-surface-variant flex items-center gap-1 truncate">
                            <span className="material-symbols-outlined text-[15px] text-primary">location_on</span>
                            {item.roomCode ? `${item.roomCode} • ${item.roomName}` : 'Lokasi belum diatur'}
                          </span>
                          <AvailabilityBadge availability={item.availability} />
                        </div>

                        <Link href={`/aset/${item.id}`}>
                          <h3 className="text-title-md text-on-surface font-bold line-clamp-2 group-hover:text-primary transition-colors">
                            {item.name}
                          </h3>
                        </Link>

                        <div className="mt-2.5 p-2.5 rounded-lg bg-surface-container-low text-body-sm flex flex-col gap-1">
                          <div className="flex justify-between gap-2">
                            <span className="text-outline shrink-0">Tanggal Jadi:</span>
                            <span className="font-semibold text-on-surface tabular-nums-code">
                              {formatIndonesianDate(item.completionDate)}
                            </span>
                          </div>
                          <div className="flex justify-between gap-2">
                            <span className="text-outline shrink-0">Letak Rak:</span>
                            <span className="font-medium text-on-surface truncate">
                              {item.placementDetail || '-'}
                            </span>
                          </div>
                          <div className="flex justify-between gap-2">
                            <span className="text-outline shrink-0">Narahubung:</span>
                            <span className="font-medium text-primary truncate">
                              {item.contactName || '-'}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 pt-1">
                        <Link
                          href={`/aset/${item.id}`}
                          className="flex-1 py-2 px-3 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface text-title-sm text-center transition-colors"
                        >
                          Detail &amp; Cara Pakai
                        </Link>
                        {canBorrow ? (
                          <Link
                            href={`/peminjaman?asset=${item.id}`}
                            className="flex-1 py-2 px-3 rounded-lg bg-secondary-container hover:bg-secondary-fixed-dim text-on-secondary-fixed text-title-sm font-bold text-center transition-colors shadow-sm inline-flex items-center justify-center gap-1"
                          >
                            <span className="material-symbols-outlined text-[16px]">touch_app</span>
                            Pinjam
                          </Link>
                        ) : (
                          <span className="flex-1 py-2 px-3 rounded-lg bg-surface-container-low text-outline text-title-sm text-center cursor-not-allowed">
                            Tidak Tersedia
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/25 shadow-sm overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-surface-container-low text-label-sm text-on-surface-variant uppercase">
                    <th className="py-3 px-4">Kode</th>
                    <th className="py-3 px-4">Nama Produk</th>
                    <th className="py-3 px-4">Tanggal Jadi</th>
                    <th className="py-3 px-4">Peletakan</th>
                    <th className="py-3 px-4">Kondisi / Status</th>
                    <th className="py-3 px-4">Narahubung</th>
                    <th className="py-3 px-4 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-container">
                  {data.items.map((item) => (
                    <tr key={item.id} className="hover:bg-surface-container-low/50">
                      <td className="py-3 px-4 text-mono-data text-primary font-bold tabular-nums-code whitespace-nowrap">
                        {item.inventoryCode}
                      </td>
                      <td className="py-3 px-4">
                        <Link href={`/aset/${item.id}`} className="text-title-sm text-on-surface hover:text-primary font-semibold">
                          {item.name}
                        </Link>
                        <div className="text-body-sm text-on-surface-variant">{item.category}</div>
                      </td>
                      <td className="py-3 px-4 text-body-sm whitespace-nowrap tabular-nums-code">
                        {formatIndonesianDate(item.completionDate)}
                      </td>
                      <td className="py-3 px-4 text-body-sm">
                        <div className="font-medium text-on-surface">{item.roomCode ?? '-'}</div>
                        <div className="text-on-surface-variant">{item.placementDetail ?? '-'}</div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex flex-col gap-1 items-start">
                          <ConditionBadge condition={item.condition} />
                          <AvailabilityBadge availability={item.availability} />
                        </div>
                      </td>
                      <td className="py-3 px-4 text-body-sm">{item.contactName ?? '-'}</td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <Link
                          href={`/aset/${item.id}`}
                          className="px-3 py-1.5 rounded-lg bg-surface-container hover:bg-surface-container-high text-primary text-label-md"
                        >
                          Detail
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {data && data.total > 0 && (
            <PaginationBar
              page={page}
              pageSize={pageSize}
              totalItems={data.total}
              itemLabel="produk"
              onPageChange={setPage}
              onPageSizeChange={(nextSize) => {
                setPageSize(nextSize);
                setPage(1);
              }}
            />
          )}
        </div>

        {/* Right Sidebar */}
        <aside className="lg:col-span-3 flex flex-col gap-space-lg">
          <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/25 shadow-sm p-space-md flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-error" />
                <h3 className="text-title-sm text-on-surface font-bold uppercase tracking-wider">
                  Perlu Tindakan ({data?.urgentAssets.length ?? 0})
                </h3>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-error-container text-on-error-container text-label-sm">
                {data?.openIssueCount ?? 0} Tiket
              </span>
            </div>

            {!data || data.urgentAssets.length === 0 ? (
              <p className="text-body-sm text-on-surface-variant">Seluruh aset saat ini dalam kondisi prima.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {data.urgentAssets.map((a) => (
                  <Link
                    key={a.id}
                    href={`/aset/${a.id}`}
                    className="p-2.5 rounded-lg bg-surface-container-low hover:bg-surface-container transition-colors flex flex-col gap-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className={`text-label-sm font-bold ${a.condition === 'rusak' ? 'text-error' : 'text-secondary'}`}>
                        {a.condition === 'rusak' ? 'Perlu Perbaikan' : 'Jadwal Perawatan'}
                      </span>
                      <span className="text-mono-data text-primary font-bold">{a.inventoryCode}</span>
                    </div>
                    <div className="text-title-sm text-on-surface line-clamp-1">{a.name}</div>
                    <div className="text-body-sm text-on-surface-variant">Ruang: {a.roomCode ?? '-'}</div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/25 shadow-sm p-space-md flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h3 className="text-title-sm text-on-surface font-bold">Distribusi Kondisi Aset</h3>
              <span className="material-symbols-outlined text-outline text-[18px]">pie_chart</span>
            </div>
            <div className="flex items-center justify-center py-2">
              <div className="relative w-36 h-36 flex items-center justify-center">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                  <circle className="stroke-surface-container" cx="18" cy="18" fill="none" r="14" strokeWidth="4" />
                  <circle cx="18" cy="18" fill="none" r="14" stroke="#059669" strokeDasharray={`${primaDash} ${circ}`} strokeDashoffset={0} strokeWidth="4" />
                  <circle cx="18" cy="18" fill="none" r="14" stroke="#feae2c" strokeDasharray={`${maintDash} ${circ}`} strokeDashoffset={-primaDash} strokeWidth="4" />
                  <circle cx="18" cy="18" fill="none" r="14" stroke="#ba1a1a" strokeDasharray={`${rusakDash} ${circ}`} strokeDashoffset={-(primaDash + maintDash)} strokeWidth="4" />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                  <span className="text-headline-sm font-bold text-primary">{primaPct}%</span>
                  <span className="text-label-sm text-on-surface-variant uppercase">Rasio Prima</span>
                </div>
              </div>
            </div>
            <div className="flex flex-col gap-1.5 text-body-sm">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-[#059669]" />Prima / Siap Pameran</span>
                <strong>{kpis.prima} unit</strong>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-secondary-container" />Perawatan / Kalibrasi</span>
                <strong>{kpis.maintenance} unit</strong>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-error" />Perlu Perbaikan</span>
                <strong>{kpis.rusak} unit</strong>
              </div>
            </div>
          </div>

          <div className="bg-primary p-space-md rounded-xl text-on-primary shadow-sm flex flex-col gap-3">
            <div className="flex items-center gap-2 text-secondary-fixed text-label-sm uppercase">
              <span className="material-symbols-outlined text-[18px]">campaign</span>
              Panduan PIC Pameran FTC
            </div>
            <h4 className="text-headline-sm font-bold">Persiapan Demo Produk</h4>
            <p className="text-body-sm text-on-primary/85">
              Cek lokasi rak di Denah Lab, pelajari langkah pengoperasian di Tutorial &amp; SOP, dan simpan kontak narahubung sebelum membawa aset ke lokasi expo.
            </p>
            <Link
              href="/tutorial"
              className="pt-2 border-t border-white/15 text-title-sm text-secondary-fixed hover:text-white inline-flex items-center gap-1"
            >
              Buka Panduan &amp; Checklist <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
            </Link>
          </div>
        </aside>
      </div>
    </div>
  );
}
