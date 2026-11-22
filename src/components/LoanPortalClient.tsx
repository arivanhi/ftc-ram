'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { AvailabilityBadge, ConditionBadge, LoanStatusBadge } from '@/components/StatusBadge';
import { FileDropzone } from '@/components/FileDropzone';
import { formatIndonesianDate } from '@/lib/format';

type SelectableAsset = {
  id: string;
  inventoryCode: string;
  name: string;
  category: string;
  condition: string;
  availability: string;
  photoUrl: string | null;
  roomCode: string | null;
  roomName: string | null;
};

type PublicLoan = {
  id: string;
  ticketCode: string;
  borrowerName: string;
  borrowerIdType: string;
  borrowerUnitDetail: string | null;
  purposeTitle: string;
  usageLocationType: string;
  startDate: string;
  endDate: string;
  dailySession: string;
  status: string;
  adminNotes?: string | null;
  items: Array<{ assetId: string; inventoryCode: string; assetName: string; roomLabel?: string | null }>;
};

type BookingSlot = {
  ticketCode: string;
  purposeTitle: string;
  startDate: string;
  endDate: string;
  dailySession: string;
  status: string;
};

const FUNDING_OPTIONS = [
  'Pameran / Expo FTC',
  'Riset Dosen FTC',
  'Tugas Akhir / Skripsi',
  'Kemitraan Industri / Komersial',
];

function todayIso(offsetDays = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}

export function LoanPortalClient() {
  const searchParams = useSearchParams();
  const preselectedAssetId = searchParams.get('asset') ?? '';

  const [tab, setTab] = useState<'form' | 'track'>('form');
  const [allAssets, setAllAssets] = useState<SelectableAsset[]>([]);
  const [assetQuery, setAssetQuery] = useState('');
  const [selectedAssets, setSelectedAssets] = useState<SelectableAsset[]>([]);
  const [availabilitySlots, setAvailabilitySlots] = useState<BookingSlot[]>([]);

  // Form fields (NIM / NPP / UNIT — never NIDN)
  const [borrowerName, setBorrowerName] = useState('');
  const [borrowerIdType, setBorrowerIdType] = useState<'NIM' | 'NPP' | 'UNIT'>('NIM');
  const [borrowerIdValue, setBorrowerIdValue] = useState('');
  const [borrowerWhatsapp, setBorrowerWhatsapp] = useState('');
  const [borrowerUnitDetail, setBorrowerUnitDetail] = useState('');
  const [purposeTitle, setPurposeTitle] = useState('');
  const [startDate, setStartDate] = useState(() => todayIso(1));
  const [endDate, setEndDate] = useState(() => todayIso(3));
  const [dailySession, setDailySession] = useState('Sesi Penuh (08.00 - 17.00 WIB)');
  const [usageLocationType, setUsageLocationType] = useState<'internal' | 'external'>('internal');
  const [externalLocationDetail, setExternalLocationDetail] = useState('');
  const [fundingCategory, setFundingCategory] = useState(FUNDING_OPTIONS[0]);
  const [attachment, setAttachment] = useState<File | null>(null);
  const [integrityAgreed, setIntegrityAgreed] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [createdTicket, setCreatedTicket] = useState<{ id: string; ticketCode: string } | null>(null);

  // Tracking state
  const [trackQuery, setTrackQuery] = useState('');
  const [trackStatus, setTrackStatus] = useState('');
  const [loans, setLoans] = useState<PublicLoan[]>([]);
  const [loadingLoans, setLoadingLoans] = useState(false);

  useEffect(() => {
    fetch('/api/assets?limit=100')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        const list: SelectableAsset[] = d?.items ?? [];
        setAllAssets(list);
        if (preselectedAssetId) {
          const found = list.find((a) => a.id === preselectedAssetId);
          if (found) setSelectedAssets([found]);
        }
      })
      .catch(() => {});
  }, [preselectedAssetId]);

  const primarySelectedId = selectedAssets[0]?.id ?? '';
  useEffect(() => {
    if (!primarySelectedId) {
      setAvailabilitySlots([]);
      return;
    }
    fetch(`/api/loans/availability?assetId=${primarySelectedId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setAvailabilitySlots(d?.bookings ?? []))
      .catch(() => {});
  }, [primarySelectedId]);

  const loadPublicLoans = useCallback(async () => {
    setLoadingLoans(true);
    try {
      const sp = new URLSearchParams();
      if (trackQuery.trim()) sp.set('q', trackQuery.trim());
      if (trackStatus) sp.set('status', trackStatus);
      const res = await fetch(`/api/loans/public?${sp.toString()}`);
      if (res.ok) {
        const d = await res.json();
        setLoans(d.items ?? []);
      }
    } finally {
      setLoadingLoans(false);
    }
  }, [trackQuery, trackStatus]);

  useEffect(() => {
    loadPublicLoans();
  }, [loadPublicLoans]);

  function addAsset(asset: SelectableAsset) {
    if (selectedAssets.some((a) => a.id === asset.id)) return;
    if (selectedAssets.length >= 3) {
      setFormError('Maksimal 3 aset produk penelitian dalam satu pengajuan.');
      return;
    }
    setFormError(null);
    setSelectedAssets((prev) => [...prev, asset]);
    setAssetQuery('');
  }

  function removeAsset(id: string) {
    setSelectedAssets((prev) => prev.filter((a) => a.id !== id));
  }

  const filteredCandidates = allAssets
    .filter((a) => a.condition !== 'rusak' && a.availability !== 'tidak_tersedia')
    .filter((a) => !selectedAssets.some((s) => s.id === a.id))
    .filter((a) => {
      if (!assetQuery.trim()) return false;
      const needle = assetQuery.toLowerCase();
      return (
        a.name.toLowerCase().includes(needle) ||
        a.inventoryCode.toLowerCase().includes(needle) ||
        a.category.toLowerCase().includes(needle)
      );
    })
    .slice(0, 6);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);

    if (selectedAssets.length === 0) {
      setFormError('Pilih minimal 1 aset produk penelitian untuk dipinjam.');
      return;
    }
    if (!integrityAgreed) {
      setFormError('Anda harus menyetujui Pakta Integritas sebelum mengirim pengajuan.');
      return;
    }

    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.set('borrowerName', borrowerName);
      fd.set('borrowerIdType', borrowerIdType);
      fd.set('borrowerIdValue', borrowerIdValue);
      fd.set('borrowerWhatsapp', borrowerWhatsapp);
      if (borrowerUnitDetail.trim()) fd.set('borrowerUnitDetail', borrowerUnitDetail.trim());
      fd.set('purposeTitle', purposeTitle);
      fd.set('usageLocationType', usageLocationType);
      if (usageLocationType === 'external' && externalLocationDetail.trim()) {
        fd.set('externalLocationDetail', externalLocationDetail.trim());
      }
      fd.set('fundingCategory', fundingCategory);
      fd.set('startDate', startDate);
      fd.set('endDate', endDate);
      fd.set('dailySession', dailySession);
      fd.set('integrityAgreed', 'true');
      for (const a of selectedAssets) fd.append('assetIds', a.id);
      if (attachment) fd.set('attachment', attachment);

      const res = await fetch('/api/loans', { method: 'POST', body: fd });
      const body = await res.json();
      if (!res.ok) {
        setFormError(body.error || 'Pengajuan peminjaman gagal dikirim.');
        return;
      }

      setCreatedTicket(body);
      setBorrowerName('');
      setBorrowerIdValue('');
      setBorrowerWhatsapp('');
      setBorrowerUnitDetail('');
      setPurposeTitle('');
      setExternalLocationDetail('');
      setAttachment(null);
      setIntegrityAgreed(false);
      setSelectedAssets([]);
      loadPublicLoans();
    } catch {
      setFormError('Terjadi kesalahan jaringan saat mengirim pengajuan.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-[1440px] w-full mx-auto px-gutter flex flex-col gap-space-lg">
      {/* Top Banner */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-surface-container-lowest p-space-md rounded-xl border border-outline-variant/25 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
            <span className="material-symbols-outlined text-[28px]">assignment_turned_in</span>
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-headline-sm text-primary font-bold">
                Layanan Sirkulasi &amp; Peminjaman Aset Produk Penelitian FTC
              </h1>
              <span className="px-2 py-0.5 rounded-full bg-secondary-container/25 text-secondary text-label-sm uppercase">
                Tanpa Login
              </span>
            </div>
            <p className="text-body-sm text-on-surface-variant">
              Ajukan peminjaman produk riset untuk pameran, expo, atau demo kampus menggunakan NIM, NPP, atau Unit kerja.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setTab(tab === 'form' ? 'track' : 'form')}
          className="px-4 py-2 rounded-lg bg-surface-container-high hover:bg-surface-variant text-on-surface text-title-sm inline-flex items-center gap-1.5 self-start lg:self-center"
        >
          <span className="material-symbols-outlined text-[18px]">track_changes</span>
          {tab === 'form' ? 'Lihat Pelacakan Tiket' : 'Buat Pengajuan Baru'}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 bg-surface-container-low p-1.5 rounded-xl overflow-x-auto">
        <button
          type="button"
          onClick={() => setTab('form')}
          className={`px-4 py-2 rounded-lg text-title-sm inline-flex items-center gap-1.5 whitespace-nowrap ${
            tab === 'form' ? 'bg-primary-container text-on-primary shadow-sm' : 'text-on-surface-variant hover:bg-surface-container'
          }`}
        >
          <span className="material-symbols-outlined text-[18px]">add_circle</span>
          Pengajuan Baru
        </button>
        <button
          type="button"
          onClick={() => setTab('track')}
          className={`px-4 py-2 rounded-lg text-title-sm inline-flex items-center gap-1.5 whitespace-nowrap ${
            tab === 'track' ? 'bg-primary-container text-on-primary shadow-sm' : 'text-on-surface-variant hover:bg-surface-container'
          }`}
        >
          <span className="material-symbols-outlined text-[18px]">pending_actions</span>
          Pelacakan Tiket &amp; Jadwal Aktif
          <span className="px-2 py-0.5 rounded-full bg-white/80 text-primary text-label-sm">{loans.length}</span>
        </button>
      </div>

      {/* Created Ticket Confirmation */}
      {createdTicket && (
        <div className="p-space-lg rounded-xl bg-[#ecfdf5] border border-[#a7f3d0] text-[#065f46] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <span className="material-symbols-outlined text-[28px] text-[#059669]">check_circle</span>
            <div>
              <h2 className="text-title-md font-bold">Pengajuan Peminjaman Berhasil Dikirim!</h2>
              <p className="text-body-sm mt-0.5">
                Simpan kode tiket berikut untuk memantau status persetujuan Admin FTC:
              </p>
              <div className="mt-2 inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-white border border-[#a7f3d0] text-primary text-title-md font-bold tabular-nums-code">
                {createdTicket.ticketCode}
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                setTrackQuery(createdTicket.ticketCode);
                setTab('track');
              }}
              className="px-4 py-2 rounded-lg bg-primary text-on-primary text-title-sm"
            >
              Lacak Tiket Ini
            </button>
            <button
              type="button"
              onClick={() => setCreatedTicket(null)}
              className="px-3 py-2 rounded-lg bg-white text-[#065f46] text-title-sm"
            >
              Tutup
            </button>
          </div>
        </div>
      )}

      {tab === 'form' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-lg items-start">
          <form onSubmit={handleSubmit} className="lg:col-span-8 bg-surface-container-lowest rounded-xl border border-outline-variant/25 p-space-lg shadow-sm flex flex-col gap-space-lg">
            {formError && (
              <div className="p-3.5 rounded-lg bg-error-container text-on-error-container text-body-sm font-medium">
                {formError}
              </div>
            )}

            {/* Section 1 */}
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2.5">
                <span className="w-7 h-7 rounded-full bg-primary text-on-primary text-label-md flex items-center justify-center font-bold">1</span>
                <h2 className="text-title-md text-on-surface font-bold">Identitas Pemohon / PIC Pameran</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 bg-surface-container-low/60 p-4 rounded-xl">
                <div>
                  <label className="text-label-md text-on-surface-variant block mb-1">Nama Lengkap Pemohon *</label>
                  <input
                    required
                    value={borrowerName}
                    onChange={(e) => setBorrowerName(e.target.value)}
                    placeholder="Nama lengkap PIC / penanggung jawab"
                    className="w-full bg-white px-3.5 py-2 rounded-lg text-body-md border border-outline-variant/40 focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="text-label-md text-on-surface-variant block mb-1">Jenis &amp; Nomor Identitas (NIM / NPP / Unit) *</label>
                  <div className="flex gap-2">
                    <select
                      value={borrowerIdType}
                      onChange={(e) => setBorrowerIdType(e.target.value as 'NIM' | 'NPP' | 'UNIT')}
                      className="bg-white px-3 py-2 rounded-lg text-body-md font-semibold border border-outline-variant/40 focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      <option value="NIM">NIM</option>
                      <option value="NPP">NPP</option>
                      <option value="UNIT">Unit</option>
                    </select>
                    <input
                      required
                      value={borrowerIdValue}
                      onChange={(e) => setBorrowerIdValue(e.target.value)}
                      placeholder={
                        borrowerIdType === 'NIM'
                          ? 'Contoh: A11.2023.14890'
                          : borrowerIdType === 'NPP'
                            ? 'Contoh: 0686.11.2019.742'
                            : 'Contoh: Humas FTC / BEM FTC'
                      }
                      className="flex-1 bg-white px-3.5 py-2 rounded-lg text-body-md border border-outline-variant/40 focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-label-md text-on-surface-variant block mb-1">Nomor WhatsApp Aktif *</label>
                  <input
                    required
                    value={borrowerWhatsapp}
                    onChange={(e) => setBorrowerWhatsapp(e.target.value)}
                    placeholder="0812xxxxxxxx (tidak ditampilkan ke publik)"
                    className="w-full bg-white px-3.5 py-2 rounded-lg text-body-md border border-outline-variant/40 focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="text-label-md text-on-surface-variant block mb-1">Program Studi / Bagian / Tim</label>
                  <input
                    value={borrowerUnitDetail}
                    onChange={(e) => setBorrowerUnitDetail(e.target.value)}
                    placeholder="Contoh: Tim Pameran FTC / Prodi S1 Teknik Informatika"
                    className="w-full bg-white px-3.5 py-2 rounded-lg text-body-md border border-outline-variant/40 focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="text-label-md text-on-surface-variant block mb-1">Nama Acara Pameran / Keperluan Peminjaman *</label>
                  <input
                    required
                    value={purposeTitle}
                    onChange={(e) => setPurposeTitle(e.target.value)}
                    placeholder="Contoh: Pameran Produk Inovasi FTC pada Open House UDINUS 2026"
                    className="w-full bg-white px-3.5 py-2 rounded-lg text-body-md border border-outline-variant/40 focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>
            </div>

            {/* Section 2 */}
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="w-7 h-7 rounded-full bg-primary text-on-primary text-label-md flex items-center justify-center font-bold">2</span>
                  <h2 className="text-title-md text-on-surface font-bold">Produk Penelitian yang Dipinjam</h2>
                </div>
                <span className="text-label-sm text-outline">Maks. 3 Aset Sekaligus ({selectedAssets.length}/3)</span>
              </div>

              <div className="relative">
                <div className="flex items-center bg-surface-container-low rounded-lg px-3.5 py-2.5 border border-outline-variant/30">
                  <span className="material-symbols-outlined text-outline text-[20px] mr-2">search</span>
                  <input
                    value={assetQuery}
                    onChange={(e) => setAssetQuery(e.target.value)}
                    placeholder="Ketik kode inventaris (FTC-IOT-001) atau nama produk untuk menambahkan..."
                    className="w-full bg-transparent text-body-md focus:outline-none"
                  />
                </div>
                {filteredCandidates.length > 0 && (
                  <div className="absolute left-0 right-0 mt-1 bg-white rounded-xl border border-outline-variant/40 shadow-lg z-20 overflow-hidden">
                    {filteredCandidates.map((a) => (
                      <button
                        key={a.id}
                        type="button"
                        onClick={() => addAsset(a)}
                        className="w-full px-4 py-2.5 text-left hover:bg-surface-container-low flex items-center justify-between gap-2 border-b last:border-b-0 border-surface-container"
                      >
                        <div>
                          <div className="text-title-sm text-primary font-semibold">{a.name}</div>
                          <div className="text-body-sm text-on-surface-variant">{a.inventoryCode} • {a.roomCode ?? 'Lab FTC'}</div>
                        </div>
                        <AvailabilityBadge availability={a.availability} />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {selectedAssets.length === 0 ? (
                <div className="p-4 rounded-xl bg-surface-container-low/60 text-body-sm text-on-surface-variant">
                  Belum ada aset dipilih. Cari di kolom atas atau klik tombol cepat di bawah:
                  <div className="flex flex-wrap gap-2 mt-2">
                    {allAssets
                      .filter((a) => a.condition !== 'rusak' && a.availability !== 'tidak_tersedia')
                      .slice(0, 4)
                      .map((a) => (
                        <button
                          key={a.id}
                          type="button"
                          onClick={() => addAsset(a)}
                          className="px-2.5 py-1 rounded-lg bg-white border border-outline-variant/40 text-label-md text-primary hover:bg-surface-container"
                        >
                          + {a.inventoryCode} ({a.name.slice(0, 26)})
                        </button>
                      ))}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {selectedAssets.map((a) => (
                    <div key={a.id} className="p-3 bg-surface-container-low/70 rounded-xl flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <img
                          src={a.photoUrl || '/images/placeholders/asset-default.svg'}
                          alt={a.name}
                          className="w-14 h-14 rounded-lg object-cover bg-white shrink-0"
                        />
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="text-title-sm text-primary font-bold truncate">{a.name}</span>
                            <span className="px-1.5 py-0.5 rounded bg-surface-container-highest text-mono-data text-[12px]">
                              {a.inventoryCode}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <ConditionBadge condition={a.condition} />
                            <AvailabilityBadge availability={a.availability} />
                          </div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeAsset(a.id)}
                        className="p-1.5 rounded-lg text-outline hover:text-error hover:bg-error-container/30"
                        title="Hapus aset"
                      >
                        <span className="material-symbols-outlined text-[20px]">delete</span>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Section 3 */}
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2.5">
                <span className="w-7 h-7 rounded-full bg-primary text-on-primary text-label-md flex items-center justify-center font-bold">3</span>
                <h2 className="text-title-md text-on-surface font-bold">Periode &amp; Lokasi Penggunaan</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="text-label-md text-on-surface-variant block mb-1">Tanggal Mulai *</label>
                  <input
                    required
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full bg-surface-container-low px-3.5 py-2 rounded-lg text-body-md border border-outline-variant/30"
                  />
                </div>
                <div>
                  <label className="text-label-md text-on-surface-variant block mb-1">Tanggal Selesai *</label>
                  <input
                    required
                    type="date"
                    value={endDate}
                    min={startDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full bg-surface-container-low px-3.5 py-2 rounded-lg text-body-md border border-outline-variant/30"
                  />
                </div>
                <div>
                  <label className="text-label-md text-on-surface-variant block mb-1">Sesi Pemakaian</label>
                  <select
                    value={dailySession}
                    onChange={(e) => setDailySession(e.target.value)}
                    className="w-full bg-surface-container-low px-3 py-2 rounded-lg text-body-md border border-outline-variant/30"
                  >
                    <option>Sesi Penuh (08.00 - 17.00 WIB)</option>
                    <option>Sesi Pagi (08.00 - 12.00 WIB)</option>
                    <option>Sesi Siang (13.00 - 17.00 WIB)</option>
                    <option>Pameran Multi-Hari (Sesuai Jadwal Acara)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                <label className={`flex items-start gap-2.5 p-3.5 rounded-xl cursor-pointer border ${usageLocationType === 'internal' ? 'bg-primary-fixed/40 border-primary' : 'bg-surface-container-low border-transparent'}`}>
                  <input
                    type="radio"
                    name="loc"
                    checked={usageLocationType === 'internal'}
                    onChange={() => setUsageLocationType('internal')}
                    className="mt-1 accent-primary"
                  />
                  <div>
                    <div className="text-title-sm font-semibold">Internal Kampus UDINUS</div>
                    <div className="text-body-sm text-on-surface-variant">Pameran/demo di area gedung kampus atau laboratorium FTC.</div>
                  </div>
                </label>
                <label className={`flex items-start gap-2.5 p-3.5 rounded-xl cursor-pointer border ${usageLocationType === 'external' ? 'bg-secondary-fixed/50 border-secondary' : 'bg-surface-container-low border-transparent'}`}>
                  <input
                    type="radio"
                    name="loc"
                    checked={usageLocationType === 'external'}
                    onChange={() => setUsageLocationType('external')}
                    className="mt-1 accent-secondary"
                  />
                  <div>
                    <div className="text-title-sm font-semibold">Dibawa Keluar Kampus (Pameran Luar)</div>
                    <div className="text-body-sm text-on-surface-variant">Cantumkan lokasi expo/acara luar kampus untuk verifikasi Admin.</div>
                  </div>
                </label>
              </div>

              {usageLocationType === 'external' && (
                <div>
                  <label className="text-label-md text-on-surface-variant block mb-1">Lokasi Pameran / Tujuan Luar Kampus *</label>
                  <input
                    required
                    value={externalLocationDetail}
                    onChange={(e) => setExternalLocationDetail(e.target.value)}
                    placeholder="Contoh: PRPP Jawa Tengah / Lawang Sewu Semarang"
                    className="w-full bg-surface-container-low px-3.5 py-2 rounded-lg text-body-md border border-outline-variant/30"
                  />
                </div>
              )}

              <div>
                <label className="text-label-md text-on-surface-variant block mb-1.5">Kategori Keperluan</label>
                <div className="flex flex-wrap gap-2">
                  {FUNDING_OPTIONS.map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => setFundingCategory(opt)}
                      className={`px-3.5 py-1.5 rounded-full text-label-md transition-colors ${
                        fundingCategory === opt
                          ? 'bg-primary-container text-on-primary shadow-sm'
                          : 'bg-surface-container-low text-on-surface hover:bg-surface-container'
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Section 4 */}
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2.5">
                <span className="w-7 h-7 rounded-full bg-primary text-on-primary text-label-md flex items-center justify-center font-bold">4</span>
                <h2 className="text-title-md text-on-surface font-bold">Dokumen Pendukung &amp; Pakta Integritas</h2>
              </div>
              <FileDropzone
                accept=".pdf,image/jpeg,image/png,image/webp"
                fileName={attachment?.name ?? null}
                idleLabel="Seret & lepas Surat Tugas / Pengantar Pameran, atau klik (Opsional)"
                hint="PDF maks 10 MB atau JPG/PNG maks 5 MB (hanya dapat dilihat Admin FTC)"
                onFileSelect={(file) => setAttachment(file)}
                onClear={() => setAttachment(null)}
              />

              <label className="bg-secondary-container/15 p-4 rounded-xl flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={integrityAgreed}
                  onChange={(e) => setIntegrityAgreed(e.target.checked)}
                  className="mt-1 h-4 w-4 accent-secondary"
                />
                <span className="text-body-sm text-on-surface leading-relaxed">
                  <strong className="text-secondary">Pakta Integritas Peminjaman FTC:</strong> Saya bertanggung jawab menjaga keutuhan, keamanan, dan kelengkapan aset produk penelitian selama masa peminjaman, mengikuti panduan penggunaan resmi, serta mengembalikannya tepat waktu.
                </span>
              </label>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={submitting}
                className="w-full sm:w-auto px-6 py-2.5 rounded-lg bg-primary hover:bg-tertiary disabled:opacity-50 text-on-primary text-title-sm shadow-md inline-flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined text-[18px]">send</span>
                {submitting ? 'Mengirim Pengajuan...' : 'Kirim Pengajuan Peminjaman'}
              </button>
            </div>
          </form>

          {/* Right Sidebar: Availability & Rules */}
          <aside className="lg:col-span-4 flex flex-col gap-space-lg">
            <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/25 p-space-lg shadow-sm flex flex-col gap-3">
              <div className="flex items-center gap-2 text-primary">
                <span className="material-symbols-outlined text-[22px]">date_range</span>
                <h3 className="text-title-md font-bold">Jadwal Terpesan Aset Terpilih</h3>
              </div>
              {selectedAssets[0] ? (
                <>
                  <p className="text-body-sm text-on-surface-variant">
                    Alokasi aktif untuk <strong className="text-primary">{selectedAssets[0].inventoryCode} — {selectedAssets[0].name}</strong>:
                  </p>
                  {availabilitySlots.length === 0 ? (
                    <div className="p-3.5 rounded-lg bg-[#ecfdf5] text-[#065f46] text-body-sm font-medium">
                      Belum ada jadwal peminjaman bentrok untuk aset ini.
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2">
                      {availabilitySlots.map((slot, i) => (
                        <div key={i} className="p-3 rounded-lg bg-surface-container-low text-body-sm">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-semibold text-on-surface tabular-nums-code">
                              {formatIndonesianDate(slot.startDate)} – {formatIndonesianDate(slot.endDate)}
                            </span>
                            <LoanStatusBadge status={slot.status} />
                          </div>
                          <div className="text-on-surface-variant mt-1">{slot.purposeTitle}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <p className="text-body-sm text-on-surface-variant">
                  Pilih aset pada langkah 2 untuk melihat jadwal peminjaman yang sudah disetujui/berjalan.
                </p>
              )}
            </div>

            <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/25 p-space-lg shadow-sm flex flex-col gap-3">
              <div className="flex items-center gap-2 text-primary">
                <span className="material-symbols-outlined text-[22px]">gavel</span>
                <h3 className="text-title-md font-bold">Ketentuan Sirkulasi Aset FTC</h3>
              </div>
              <ul className="space-y-2.5 text-body-sm text-on-surface-variant">
                <li className="flex items-start gap-2">
                  <span className="material-symbols-outlined text-secondary text-[18px] mt-0.5">warning</span>
                  <span>Satu aset fisik tidak dapat dipinjam pada rentang tanggal yang beririsan.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="material-symbols-outlined text-primary text-[18px] mt-0.5">verified_user</span>
                  <span>Serah terima alat dilakukan setelah Admin FTC menyetujui tiket pengajuan Anda.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="material-symbols-outlined text-outline text-[18px] mt-0.5">fact_check</span>
                  <span>Saat pengembalian, Admin akan memeriksa kondisi masing-masing produk yang dipinjam.</span>
                </li>
              </ul>
              <Link href="/narahubung" className="text-title-sm text-primary hover:underline inline-flex items-center gap-1 pt-1">
                Butuh bantuan cepat? Buka Direktori Narahubung →
              </Link>
            </div>
          </aside>
        </div>
      ) : (
        /* Tracking & Public Schedule Table */
        <section className="bg-surface-container-lowest rounded-xl border border-outline-variant/25 p-space-lg shadow-sm flex flex-col gap-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <h2 className="text-title-md text-primary font-bold">Pelacakan Kode Tiket &amp; Jadwal Sirkulasi</h2>
              <p className="text-body-sm text-on-surface-variant">
                Cari dengan kode tiket (mis. FTC-2026-0001) atau NIM/NPP/Unit Anda untuk melihat status dan catatan Admin.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <input
                value={trackQuery}
                onChange={(e) => setTrackQuery(e.target.value)}
                placeholder="Cari kode tiket atau NIM/NPP/Unit..."
                className="bg-surface-container-low px-3.5 py-2 rounded-lg text-body-md border border-outline-variant/30 min-w-[240px]"
              />
              <select
                value={trackStatus}
                onChange={(e) => setTrackStatus(e.target.value)}
                className="bg-surface-container-low px-3 py-2 rounded-lg text-body-md border border-outline-variant/30"
              >
                <option value="">Semua Status Aktif</option>
                <option value="pending">Menunggu Verifikasi</option>
                <option value="approved">Disetujui Admin</option>
                <option value="borrowed">Sedang Dipinjam</option>
                <option value="returned">Dikembalikan</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-container-low text-label-sm text-on-surface-variant uppercase">
                  <th className="py-3 px-4 rounded-l-lg">Kode Tiket</th>
                  <th className="py-3 px-4">Produk Dipinjam</th>
                  <th className="py-3 px-4">Pemohon &amp; Keperluan</th>
                  <th className="py-3 px-4">Periode</th>
                  <th className="py-3 px-4 rounded-r-lg">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-container">
                {loadingLoans ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-on-surface-variant">Memuat data peminjaman...</td>
                  </tr>
                ) : loans.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-on-surface-variant">Tidak ada tiket yang cocok.</td>
                  </tr>
                ) : (
                  loans.map((l) => (
                    <tr key={l.id} className="hover:bg-surface-container-low/50">
                      <td className="py-3.5 px-4 text-mono-data text-primary font-bold tabular-nums-code whitespace-nowrap">
                        {l.ticketCode}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex flex-col gap-1">
                          {l.items.map((item) => (
                            <Link
                              key={item.assetId}
                              href={`/aset/${item.assetId}`}
                              className="text-title-sm text-on-surface hover:text-primary font-semibold"
                            >
                              {item.assetName}{' '}
                              <span className="text-mono-data text-outline font-normal">({item.inventoryCode})</span>
                            </Link>
                          ))}
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="text-title-sm font-semibold">{l.purposeTitle}</div>
                        <div className="text-body-sm text-on-surface-variant">
                          {l.borrowerName} ({l.borrowerIdType}){l.borrowerUnitDetail ? ` • ${l.borrowerUnitDetail}` : ''}
                        </div>
                        {l.adminNotes && (
                          <div className="mt-1 text-body-sm text-primary bg-primary-fixed/40 px-2 py-0.5 rounded inline-block">
                            Catatan Admin: {l.adminNotes}
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-body-sm whitespace-nowrap tabular-nums-code">
                        <div>{formatIndonesianDate(l.startDate)} – {formatIndonesianDate(l.endDate)}</div>
                        <div className="text-on-surface-variant">{l.usageLocationType === 'external' ? 'Luar Kampus' : 'Internal Kampus'}</div>
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <LoanStatusBadge status={l.status} />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
