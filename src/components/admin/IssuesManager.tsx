'use client';

import { useCallback, useEffect, useState } from 'react';
import { UrgencyBadge } from '@/components/StatusBadge';
import { formatIndonesianDate } from '@/lib/format';
import { buildWhatsAppUrl } from '@/lib/loan-rules';

type AdminIssue = {
  id: string;
  ticketCode: string;
  assetId: string | null;
  assetCodeInput: string;
  assetName: string | null;
  assetCondition: string | null;
  reporterName: string;
  reporterContact: string;
  category: string;
  urgency: string;
  description: string;
  photoUrl: string | null;
  contactName: string | null;
  status: 'open' | 'in_progress' | 'resolved';
  resolutionNotes: string | null;
  createdAt: string;
};

export function IssuesManager() {
  const [issues, setIssues] = useState<AdminIssue[]>([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [msg, setMsg] = useState<string | null>(null);
  const [notesMap, setNotesMap] = useState<Record<string, string>>({});
  const [condMap, setCondMap] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    const sp = statusFilter ? `?status=${statusFilter}` : '';
    const res = await fetch(`/api/admin/issues${sp}`);
    if (res.ok) {
      const list: AdminIssue[] = (await res.json()).items ?? [];
      setIssues(list);
      const nextNotes: Record<string, string> = {};
      for (const item of list) nextNotes[item.id] = item.resolutionNotes ?? '';
      setNotesMap(nextNotes);
    }
  }, [statusFilter]);

  useEffect(() => {
    load();
  }, [load]);

  async function saveUpdate(ticket: AdminIssue, status: 'open' | 'in_progress' | 'resolved') {
    const body: Record<string, unknown> = {
      status,
      resolutionNotes: notesMap[ticket.id] || null,
    };
    if (condMap[ticket.id]) {
      body.updateAssetCondition = condMap[ticket.id];
    }

    const res = await fetch(`/api/admin/issues/${ticket.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const d = await res.json().catch(() => ({}));
    if (!res.ok) {
      setMsg(`Gagal memperbarui tiket: ${d.error || 'Terjadi kesalahan.'}`);
      return;
    }
    setMsg(`Tiket ${ticket.ticketCode} berhasil diperbarui.`);
    setCondMap((prev) => ({ ...prev, [ticket.id]: '' }));
    load();
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-headline-md text-primary font-bold">Laporan Kendala &amp; Kerusakan Aset</h1>
          <p className="text-body-sm text-on-surface-variant">
            Tindak lanjuti laporan kendala dari PIC Pameran dan sinkronkan kondisi aset langsung dari tiket.
          </p>
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-white border border-outline-variant/40 px-3.5 py-2 rounded-lg text-body-md"
        >
          <option value="">Semua Status</option>
          <option value="open">Terbuka (Open)</option>
          <option value="in_progress">Sedang Ditangani</option>
          <option value="resolved">Selesai (Resolved)</option>
        </select>
      </div>

      {msg && <div className="p-3 rounded-xl bg-[#ecfdf5] text-[#065f46] text-body-sm font-medium">{msg}</div>}

      <div className="flex flex-col gap-4">
        {issues.map((t) => {
          const isPhone = /^(\+?62|0)[0-9\s-]{7,}$/.test(t.reporterContact.trim());
          return (
            <div key={t.id} className="bg-white rounded-xl border border-outline-variant/25 p-5 shadow-sm flex flex-col gap-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-mono-data text-primary font-bold">{t.ticketCode}</span>
                    <UrgencyBadge urgency={t.urgency} />
                    <span className="px-2 py-0.5 rounded bg-surface-container text-label-sm uppercase">{t.status}</span>
                  </div>
                  <div className="text-title-sm font-bold mt-1">
                    {t.assetCodeInput} {t.assetName ? `— ${t.assetName}` : ''}
                  </div>
                  <div className="text-body-sm text-on-surface-variant">
                    Pelapor: <strong>{t.reporterName}</strong> ({t.reporterContact}) • {formatIndonesianDate(t.createdAt)}
                    {t.contactName ? ` • PIC: ${t.contactName}` : ''}
                  </div>
                </div>
                <div className="flex gap-2">
                  {isPhone && (
                    <a
                      href={buildWhatsAppUrl(
                        t.reporterContact,
                        `Halo ${t.reporterName}, tindak lanjut laporan kendala ${t.ticketCode} (${t.assetCodeInput}): `,
                      )}
                      target="_blank"
                      rel="noreferrer"
                      className="px-3 py-1.5 rounded-lg bg-[#059669] text-white text-label-md inline-flex items-center gap-1"
                    >
                      <span className="material-symbols-outlined text-[16px]">chat</span>
                      Hubungi Pelapor
                    </a>
                  )}
                  {t.photoUrl && (
                    <a
                      href={t.photoUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="px-3 py-1.5 rounded-lg bg-surface-container text-primary text-label-md inline-flex items-center gap-1"
                    >
                      <span className="material-symbols-outlined text-[16px]">image</span>
                      Foto Kendala
                    </a>
                  )}
                </div>
              </div>

              <p className="text-body-md bg-surface-container-low p-3 rounded-lg">{t.description}</p>

              <div className="grid grid-cols-1 md:grid-cols-12 gap-2.5 items-center pt-1">
                <input
                  value={notesMap[t.id] ?? ''}
                  onChange={(e) => setNotesMap((prev) => ({ ...prev, [t.id]: e.target.value }))}
                  placeholder="Catatan penanganan / perbaikan (tampil pada cek tiket publik)..."
                  className="md:col-span-5 bg-surface-container-low px-3 py-2 rounded-lg text-body-sm"
                />
                {t.assetId && (
                  <select
                    value={condMap[t.id] ?? ''}
                    onChange={(e) => setCondMap((prev) => ({ ...prev, [t.id]: e.target.value }))}
                    className="md:col-span-3 bg-surface-container-low px-3 py-2 rounded-lg text-body-sm"
                  >
                    <option value="">Jangan ubah kondisi aset</option>
                    <option value="rusak">Ubah Aset → Rusak</option>
                    <option value="maintenance">Ubah Aset → Perawatan</option>
                    <option value="prima">Ubah Aset → Kondisi Prima</option>
                  </select>
                )}
                <div className="md:col-span-4 flex flex-wrap justify-end gap-1.5">
                  <button type="button" onClick={() => saveUpdate(t, 'in_progress')} className="px-3 py-1.5 rounded-lg bg-secondary-container text-on-secondary-fixed text-label-md font-bold">
                    Proses
                  </button>
                  <button type="button" onClick={() => saveUpdate(t, 'resolved')} className="px-3 py-1.5 rounded-lg bg-[#059669] text-white text-label-md font-bold">
                    Tandai Selesai
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
