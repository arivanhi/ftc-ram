'use client';

import { useCallback, useEffect, useState } from 'react';
import { LoanStatusBadge } from '@/components/StatusBadge';
import { formatIndonesianDate, LOAN_STATUS_META, type AssetCondition, type LoanStatus } from '@/lib/format';
import { buildWhatsAppUrl } from '@/lib/loan-rules';

type AdminLoanItem = {
  id: string;
  assetId: string;
  inventoryCode: string;
  assetName: string;
  returnCondition: string | null;
  returnNotes: string | null;
};

type AdminLoan = {
  id: string;
  ticketCode: string;
  borrowerName: string;
  borrowerIdType: string;
  borrowerIdValue: string;
  borrowerWhatsapp: string;
  borrowerUnitDetail: string | null;
  purposeTitle: string;
  usageLocationType: string;
  externalLocationDetail: string | null;
  startDate: string;
  endDate: string;
  dailySession: string;
  attachmentUrl: string | null;
  status: LoanStatus;
  adminNotes: string | null;
  items: AdminLoanItem[];
};

export function LoansManager() {
  const [statusFilter, setStatusFilter] = useState('');
  const [loans, setLoans] = useState<AdminLoan[]>([]);
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [returningLoan, setReturningLoan] = useState<AdminLoan | null>(null);
  const [returnState, setReturnState] = useState<Record<string, { returnCondition: AssetCondition; returnNotes: string }>>({});
  const [returnAdminNotes, setReturnAdminNotes] = useState('');

  const load = useCallback(async () => {
    const sp = statusFilter ? `?status=${statusFilter}` : '';
    const res = await fetch(`/api/admin/loans${sp}`);
    if (res.ok) setLoans((await res.json()).items ?? []);
  }, [statusFilter]);

  useEffect(() => {
    load();
  }, [load]);

  async function transition(loan: AdminLoan, status: 'approved' | 'rejected' | 'cancelled' | 'borrowed') {
    const promptText =
      status === 'rejected'
        ? 'Masukkan alasan penolakan (opsional):'
        : status === 'cancelled'
          ? 'Masukkan alasan pembatalan (opsional):'
          : 'Catatan Admin (opsional):';
    const adminNotes = window.prompt(promptText, loan.adminNotes ?? '');
    if (adminNotes === null) return;

    const res = await fetch(`/api/admin/loans/${loan.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, adminNotes: adminNotes || null }),
    });
    const d = await res.json();
    if (!res.ok) {
      setMsg({ type: 'err', text: d.error || 'Gagal mengubah status peminjaman.' });
      return;
    }
    setMsg({ type: 'ok', text: `Tiket ${loan.ticketCode} diubah menjadi ${LOAN_STATUS_META[status].label}.` });
    load();
  }

  function openReturnModal(loan: AdminLoan) {
    const init: Record<string, { returnCondition: AssetCondition; returnNotes: string }> = {};
    for (const item of loan.items) {
      init[item.assetId] = { returnCondition: 'prima', returnNotes: '' };
    }
    setReturnState(init);
    setReturnAdminNotes(loan.adminNotes ?? '');
    setReturningLoan(loan);
  }

  async function submitReturn(e: React.FormEvent) {
    e.preventDefault();
    if (!returningLoan) return;
    const items = returningLoan.items.map((item) => ({
      assetId: item.assetId,
      returnCondition: returnState[item.assetId]?.returnCondition ?? 'prima',
      returnNotes: returnState[item.assetId]?.returnNotes || null,
    }));

    const res = await fetch(`/api/admin/loans/${returningLoan.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'returned', adminNotes: returnAdminNotes || null, items }),
    });
    const d = await res.json();
    if (!res.ok) {
      setMsg({ type: 'err', text: d.error || 'Gagal mencatat pengembalian.' });
      return;
    }
    setMsg({ type: 'ok', text: `Pengembalian tiket ${returningLoan.ticketCode} tercatat dan status aset disinkronkan.` });
    setReturningLoan(null);
    load();
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-headline-md text-primary font-bold">Persetujuan &amp; Sirkulasi Peminjaman</h1>
          <p className="text-body-sm text-on-surface-variant">
            Verifikasi pengajuan PIC Pameran, serah terima aset, catat kondisi pengembalian per aset, dan hubungi peminjam via WhatsApp.
          </p>
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-white border border-outline-variant/40 px-3.5 py-2 rounded-lg text-body-md"
        >
          <option value="">Semua Status</option>
          <option value="pending">Menunggu Verifikasi</option>
          <option value="approved">Disetujui Admin</option>
          <option value="borrowed">Sedang Dipinjam</option>
          <option value="returned">Dikembalikan</option>
          <option value="rejected">Ditolak</option>
          <option value="cancelled">Dibatalkan</option>
        </select>
      </div>

      {msg && (
        <div className={`p-3.5 rounded-xl text-body-sm font-medium ${msg.type === 'err' ? 'bg-error-container text-on-error-container' : 'bg-[#ecfdf5] text-[#065f46]'}`}>
          {msg.text}
        </div>
      )}

      <div className="flex flex-col gap-4">
        {loans.length === 0 ? (
          <div className="p-8 bg-white rounded-xl border border-outline-variant/25 text-center text-on-surface-variant">
            Belum ada data peminjaman untuk filter ini.
          </div>
        ) : (
          loans.map((l) => {
            const waText = `Halo ${l.borrowerName}, info peminjaman aset FTC tiket ${l.ticketCode} (${l.purposeTitle}): status saat ini *${LOAN_STATUS_META[l.status]?.label ?? l.status}*.`;
            return (
              <div key={l.id} className="bg-white rounded-xl border border-outline-variant/25 p-5 shadow-sm flex flex-col gap-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-mono-data text-primary font-bold">{l.ticketCode}</span>
                      <LoanStatusBadge status={l.status} />
                    </div>
                    <h3 className="text-title-md font-bold mt-1">{l.purposeTitle}</h3>
                    <div className="text-body-sm text-on-surface-variant">
                      <strong>{l.borrowerName}</strong> • {l.borrowerIdType}: {l.borrowerIdValue}
                      {l.borrowerUnitDetail ? ` • ${l.borrowerUnitDetail}` : ''} • WA: {l.borrowerWhatsapp}
                    </div>
                    <div className="text-body-sm text-on-surface-variant mt-0.5">
                      Periode: <strong>{formatIndonesianDate(l.startDate)} – {formatIndonesianDate(l.endDate)}</strong> ({l.dailySession}) •{' '}
                      {l.usageLocationType === 'external'
                        ? `Luar Kampus: ${l.externalLocationDetail || '-'}`
                        : 'Internal Kampus'}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <a
                      href={buildWhatsAppUrl(l.borrowerWhatsapp, waText)}
                      target="_blank"
                      rel="noreferrer"
                      className="px-3 py-1.5 rounded-lg bg-[#059669] hover:bg-[#047857] text-white text-label-md inline-flex items-center gap-1"
                    >
                      <span className="material-symbols-outlined text-[16px]">chat</span>
                      Hubungi WA
                    </a>
                    {l.attachmentUrl && (
                      <a
                        href={l.attachmentUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="px-3 py-1.5 rounded-lg bg-surface-container text-primary text-label-md inline-flex items-center gap-1"
                      >
                        <span className="material-symbols-outlined text-[16px]">attach_file</span>
                        Lampiran
                      </a>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 bg-surface-container-low p-3 rounded-lg">
                  {l.items.map((item) => (
                    <div key={item.id} className="px-3 py-1.5 rounded-lg bg-white border border-outline-variant/30 text-body-sm">
                      <span className="font-mono font-bold text-primary">{item.inventoryCode}</span> — {item.assetName}
                      {item.returnCondition && (
                        <span className="ml-2 text-label-sm text-secondary">
                          (Kembali: {item.returnCondition}{item.returnNotes ? ` — ${item.returnNotes}` : ''})
                        </span>
                      )}
                    </div>
                  ))}
                </div>

                {l.adminNotes && (
                  <div className="text-body-sm text-on-surface-variant">Catatan Admin: {l.adminNotes}</div>
                )}

                <div className="flex flex-wrap items-center justify-end gap-2 pt-2 border-t border-surface-container">
                  {l.status === 'pending' && (
                    <>
                      <button type="button" onClick={() => transition(l, 'approved')} className="px-3.5 py-1.5 rounded-lg bg-primary text-on-primary text-title-sm">
                        Setujui
                      </button>
                      <button type="button" onClick={() => transition(l, 'rejected')} className="px-3.5 py-1.5 rounded-lg bg-error-container text-on-error-container text-title-sm">
                        Tolak
                      </button>
                      <button type="button" onClick={() => transition(l, 'cancelled')} className="px-3.5 py-1.5 rounded-lg bg-surface-container text-on-surface-variant text-title-sm">
                        Batalkan
                      </button>
                    </>
                  )}
                  {l.status === 'approved' && (
                    <>
                      <button type="button" onClick={() => transition(l, 'borrowed')} className="px-3.5 py-1.5 rounded-lg bg-secondary-container text-on-secondary-fixed text-title-sm font-bold">
                        Serahkan / Tandai Dipinjam
                      </button>
                      <button type="button" onClick={() => transition(l, 'cancelled')} className="px-3.5 py-1.5 rounded-lg bg-surface-container text-on-surface-variant text-title-sm">
                        Batalkan
                      </button>
                    </>
                  )}
                  {l.status === 'borrowed' && (
                    <button type="button" onClick={() => openReturnModal(l)} className="px-4 py-1.5 rounded-lg bg-[#059669] text-white text-title-sm font-bold">
                      Proses Pengembalian Per Aset
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Per-Asset Return Modal */}
      {returningLoan && (
        <div className="fixed inset-0 z-50 bg-on-surface/50 backdrop-blur-sm flex items-center justify-center p-4">
          <form onSubmit={submitReturn} className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-xl flex flex-col gap-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-headline-sm text-primary font-bold">
              Pengembalian Aset — {returningLoan.ticketCode}
            </h2>
            <p className="text-body-sm text-on-surface-variant">
              Catat kondisi masing-masing produk yang dikembalikan. Aset dengan kondisi Prima otomatis kembali Tersedia; Rusak/Perawatan otomatis menjadi Tidak Tersedia.
            </p>
            {returningLoan.items.map((item) => (
              <div key={item.assetId} className="p-4 rounded-xl bg-surface-container-low flex flex-col gap-2">
                <div className="text-title-sm font-bold text-primary">
                  {item.inventoryCode} — {item.assetName}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <select
                    value={returnState[item.assetId]?.returnCondition ?? 'prima'}
                    onChange={(e) =>
                      setReturnState((prev) => ({
                        ...prev,
                        [item.assetId]: { ...prev[item.assetId], returnCondition: e.target.value as AssetCondition },
                      }))
                    }
                    className="bg-white px-3 py-2 rounded-lg text-body-sm border border-outline-variant/40"
                  >
                    <option value="prima">Kondisi Prima (Otomatis Tersedia)</option>
                    <option value="maintenance">Perlu Perawatan / Kalibrasi</option>
                    <option value="rusak">Rusak / Perlu Perbaikan</option>
                  </select>
                  <input
                    placeholder="Catatan kondisi aset (opsional)"
                    value={returnState[item.assetId]?.returnNotes ?? ''}
                    onChange={(e) =>
                      setReturnState((prev) => ({
                        ...prev,
                        [item.assetId]: { ...prev[item.assetId], returnNotes: e.target.value },
                      }))
                    }
                    className="bg-white px-3 py-2 rounded-lg text-body-sm border border-outline-variant/40"
                  />
                </div>
              </div>
            ))}
            <input
              placeholder="Catatan umum pengembalian (opsional)"
              value={returnAdminNotes}
              onChange={(e) => setReturnAdminNotes(e.target.value)}
              className="bg-surface-container-low px-3.5 py-2 rounded-lg text-body-sm"
            />
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setReturningLoan(null)} className="px-4 py-2 rounded-lg bg-surface-container text-title-sm">Batal</button>
              <button type="submit" className="px-5 py-2 rounded-lg bg-[#059669] text-white text-title-sm font-bold">
                Simpan Pengembalian
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
