'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { AvailabilityBadge, ConditionBadge } from '@/components/StatusBadge';
import { QrLabelModal } from '@/components/QrLabelModal';
import { formatIndonesianDate } from '@/lib/format';

type AssetSpec = { label: string; value: string };

type AdminAsset = {
  id: string;
  inventoryCode: string;
  name: string;
  category: string;
  description: string;
  specifications: AssetSpec[];
  condition: 'prima' | 'maintenance' | 'rusak';
  availability: 'tersedia' | 'dipinjam' | 'tidak_tersedia';
  completionDate: string;
  researchScheme: string | null;
  researcherTeam: string | null;
  photoUrl: string | null;
  roomId: string | null;
  placementDetail: string | null;
  contactId: string | null;
  usageSummary: string | null;
  isPriority: boolean;
  archivedAt: string | null;
  roomCode: string | null;
  roomName: string | null;
  contactName: string | null;
};

type RoomOption = { id: string; code: string; name: string };
type ContactOption = { id: string; code: string; name: string };

const EMPTY_FORM = {
  inventoryCode: '',
  name: '',
  category: 'IoT & Sensor Cerdas',
  description: '',
  specifications: [{ label: '', value: '' }] as AssetSpec[],
  condition: 'prima' as 'prima' | 'maintenance' | 'rusak',
  availability: 'tersedia' as 'tersedia' | 'dipinjam' | 'tidak_tersedia',
  completionDate: new Date().toISOString().slice(0, 10),
  researchScheme: '',
  researcherTeam: '',
  photoUrl: '',
  roomId: '',
  placementDetail: '',
  contactId: '',
  usageSummary: '',
  isPriority: false,
};

export function AssetsManager() {
  const [items, setItems] = useState<AdminAsset[]>([]);
  const [rooms, setRooms] = useState<RoomOption[]>([]);
  const [contacts, setContacts] = useState<ContactOption[]>([]);
  const [includeArchived, setIncludeArchived] = useState(false);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<AdminAsset | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'ok' | 'err' | 'warn'; msg: string } | null>(null);
  const [qrTarget, setQrTarget] = useState<AdminAsset | null>(null);

  const loadAll = useCallback(async () => {
    const [aRes, rRes, cRes] = await Promise.all([
      fetch(`/api/admin/assets?includeArchived=${includeArchived}`),
      fetch('/api/admin/rooms'),
      fetch('/api/admin/contacts'),
    ]);
    if (aRes.ok) setItems((await aRes.json()).items ?? []);
    if (rRes.ok) setRooms((await rRes.json()).items ?? []);
    if (cRes.ok) setContacts((await cRes.json()).items ?? []);
  }, [includeArchived]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  function openCreate() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setModalOpen(true);
  }

  function openEdit(a: AdminAsset) {
    setEditing(a);
    setForm({
      inventoryCode: a.inventoryCode,
      name: a.name,
      category: a.category,
      description: a.description,
      specifications: a.specifications?.length ? a.specifications : [{ label: '', value: '' }],
      condition: a.condition,
      availability: a.availability,
      completionDate: a.completionDate,
      researchScheme: a.researchScheme ?? '',
      researcherTeam: a.researcherTeam ?? '',
      photoUrl: a.photoUrl ?? '',
      roomId: a.roomId ?? '',
      placementDetail: a.placementDetail ?? '',
      contactId: a.contactId ?? '',
      usageSummary: a.usageSummary ?? '',
      isPriority: a.isPriority,
    });
    setModalOpen(true);
  }

  async function handlePhotoUpload(file: File) {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.set('file', file);
      fd.set('kind', 'image');
      const res = await fetch('/api/admin/uploads', { method: 'POST', body: fd });
      const body = await res.json();
      if (!res.ok) {
        setFeedback({ type: 'err', msg: body.error || 'Gagal mengunggah foto.' });
        return;
      }
      setForm((f) => ({ ...f, photoUrl: body.url }));
    } finally {
      setUploading(false);
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setFeedback(null);
    try {
      const payload = {
        ...form,
        specifications: form.specifications.filter((s) => s.label.trim() && s.value.trim()),
        roomId: form.roomId || null,
        contactId: form.contactId || null,
        photoUrl: form.photoUrl || null,
      };
      const url = editing ? `/api/admin/assets/${editing.id}` : '/api/admin/assets';
      const method = editing ? 'PATCH' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const body = await res.json();
      if (!res.ok) {
        setFeedback({ type: 'err', msg: body.error || 'Gagal menyimpan aset.' });
        return;
      }
      setModalOpen(false);
      if (body.affectedApprovedLoans?.length > 0) {
        const codes = body.affectedApprovedLoans.map((l: { ticketCode: string }) => l.ticketCode).join(', ');
        setFeedback({
          type: 'warn',
          msg: `Aset diperbarui. Peringatan: terdapat pinjaman Disetujui mendatang (${codes}) — tinjau di menu Peminjaman.`,
        });
      } else {
        setFeedback({
          type: 'ok',
          msg: editing
            ? `Aset ${body.asset.inventoryCode} berhasil diperbarui.`
            : `Aset baru berhasil dibuat dengan UUID: ${body.asset.id}`,
        });
      }
      loadAll();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(a: AdminAsset) {
    if (!confirm(`Hapus / arsipkan aset ${a.inventoryCode} (${a.name})?`)) return;
    const res = await fetch(`/api/admin/assets/${a.id}`, { method: 'DELETE' });
    const body = await res.json();
    if (!res.ok) {
      setFeedback({ type: 'err', msg: body.error || 'Gagal menghapus aset.' });
      return;
    }
    setFeedback({
      type: 'ok',
      msg:
        body.mode === 'archived'
          ? `Aset ${a.inventoryCode} diarsipkan karena memiliki riwayat peminjaman.`
          : `Aset ${a.inventoryCode} dihapus permanen.`,
    });
    loadAll();
  }

  async function handleRestore(a: AdminAsset) {
    const res = await fetch(`/api/admin/assets/${a.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ restore: true, availability: 'tersedia' }),
    });
    if (res.ok) {
      setFeedback({ type: 'ok', msg: `Aset ${a.inventoryCode} berhasil dipulihkan dari arsip.` });
      loadAll();
    }
  }

  const filtered = items.filter((i) => {
    if (!search.trim()) return true;
    const s = search.toLowerCase();
    return (
      i.name.toLowerCase().includes(s) ||
      i.inventoryCode.toLowerCase().includes(s) ||
      i.id.toLowerCase().includes(s)
    );
  });

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-headline-md text-primary font-bold">Kelola Aset Produk Penelitian &amp; QR Code</h1>
          <p className="text-body-sm text-on-surface-variant">
            Setiap aset baru otomatis mendapat UUID unik untuk URL detail dan label QR Code.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="px-4 py-2.5 rounded-lg bg-primary hover:bg-primary-container text-on-primary text-title-sm inline-flex items-center gap-1.5"
        >
          <span className="material-symbols-outlined text-[18px]">add_circle</span>
          Tambah Aset Baru
        </button>
      </div>

      {feedback && (
        <div
          className={`p-3.5 rounded-xl text-body-sm font-medium ${
            feedback.type === 'err'
              ? 'bg-error-container text-on-error-container'
              : feedback.type === 'warn'
                ? 'bg-secondary-fixed text-on-secondary-fixed'
                : 'bg-[#ecfdf5] text-[#065f46]'
          }`}
        >
          {feedback.msg}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-outline-variant/25">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Cari nama, kode inventaris, atau UUID..."
          className="bg-surface-container-low px-3.5 py-2 rounded-lg text-body-md min-w-[260px]"
        />
        <label className="flex items-center gap-2 text-body-sm cursor-pointer">
          <input
            type="checkbox"
            checked={includeArchived}
            onChange={(e) => setIncludeArchived(e.target.checked)}
            className="accent-primary"
          />
          Tampilkan aset yang diarsipkan
        </label>
      </div>

      <div className="bg-white rounded-xl border border-outline-variant/25 shadow-sm overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-surface-container-low text-label-sm text-on-surface-variant uppercase">
              <th className="py-3 px-4">Kode &amp; UUID</th>
              <th className="py-3 px-4">Produk</th>
              <th className="py-3 px-4">Tanggal Jadi</th>
              <th className="py-3 px-4">Lokasi &amp; Rak</th>
              <th className="py-3 px-4">Kondisi / Status</th>
              <th className="py-3 px-4 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-container">
            {filtered.map((a) => (
              <tr key={a.id} className={a.archivedAt ? 'bg-surface-container-low/50 opacity-75' : 'hover:bg-surface-container-low/40'}>
                <td className="py-3 px-4">
                  <div className="text-mono-data text-primary font-bold">{a.inventoryCode}</div>
                  <div className="text-[11px] font-mono text-outline truncate max-w-[140px]" title={a.id}>
                    {a.id}
                  </div>
                </td>
                <td className="py-3 px-4">
                  <div className="text-title-sm font-semibold text-on-surface">{a.name}</div>
                  <div className="text-body-sm text-on-surface-variant">
                    {a.category} {a.contactName ? `• PIC: ${a.contactName}` : ''}
                  </div>
                </td>
                <td className="py-3 px-4 text-body-sm whitespace-nowrap">
                  {formatIndonesianDate(a.completionDate)}
                </td>
                <td className="py-3 px-4 text-body-sm">
                  <div className="font-medium">{a.roomCode ?? '-'}</div>
                  <div className="text-on-surface-variant">{a.placementDetail ?? '-'}</div>
                </td>
                <td className="py-3 px-4">
                  <div className="flex flex-col gap-1 items-start">
                    <ConditionBadge condition={a.condition} />
                    <AvailabilityBadge availability={a.availability} />
                    {a.archivedAt && (
                      <span className="px-2 py-0.5 rounded bg-outline-variant/40 text-label-sm">Arsip</span>
                    )}
                  </div>
                </td>
                <td className="py-3 px-4 text-right whitespace-nowrap">
                  <div className="inline-flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setQrTarget(a)}
                      className="p-1.5 rounded bg-surface-container hover:bg-surface-container-high text-primary"
                      title="Cetak QR Code"
                    >
                      <span className="material-symbols-outlined text-[18px]">qr_code_2</span>
                    </button>
                    <Link
                      href={`/aset/${a.id}`}
                      target="_blank"
                      className="p-1.5 rounded bg-surface-container hover:bg-surface-container-high text-on-surface"
                      title="Buka halaman publik"
                    >
                      <span className="material-symbols-outlined text-[18px]">open_in_new</span>
                    </Link>
                    <button
                      type="button"
                      onClick={() => openEdit(a)}
                      className="px-2.5 py-1 rounded bg-primary/10 hover:bg-primary/20 text-primary text-label-md"
                    >
                      Edit
                    </button>
                    {a.archivedAt ? (
                      <button
                        type="button"
                        onClick={() => handleRestore(a)}
                        className="px-2.5 py-1 rounded bg-[#ecfdf5] text-[#065f46] text-label-md"
                      >
                        Pulihkan
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleDelete(a)}
                        className="px-2.5 py-1 rounded bg-error-container/60 hover:bg-error-container text-on-error-container text-label-md"
                      >
                        Hapus
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Create / Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-on-surface/50 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleSave}
            className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-xl overflow-hidden"
          >
            <div className="px-6 py-4 border-b border-surface-container flex items-center justify-between">
              <h2 className="text-headline-sm text-primary font-bold">
                {editing ? `Edit Aset ${editing.inventoryCode}` : 'Registrasi Aset Produk Penelitian Baru'}
              </h2>
              <button type="button" onClick={() => setModalOpen(false)} className="p-1.5 rounded bg-surface-container">
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <div className="p-6 overflow-y-auto grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-label-md block mb-1">Kode Inventaris *</label>
                <input
                  required
                  value={form.inventoryCode}
                  onChange={(e) => setForm({ ...form, inventoryCode: e.target.value })}
                  placeholder="FTC-IOT-009"
                  className="w-full bg-surface-container-low px-3 py-2 rounded-lg text-mono-data uppercase"
                />
              </div>
              <div>
                <label className="text-label-md block mb-1">Tanggal Jadi Aset *</label>
                <input
                  required
                  type="date"
                  value={form.completionDate}
                  onChange={(e) => setForm({ ...form, completionDate: e.target.value })}
                  className="w-full bg-surface-container-low px-3 py-2 rounded-lg"
                />
              </div>

              <div className="md:col-span-2">
                <label className="text-label-md block mb-1">Nama Produk Penelitian *</label>
                <input
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full bg-surface-container-low px-3 py-2 rounded-lg"
                />
              </div>

              <div>
                <label className="text-label-md block mb-1">Kategori *</label>
                <input
                  required
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  className="w-full bg-surface-container-low px-3 py-2 rounded-lg"
                />
              </div>
              <div>
                <label className="text-label-md block mb-1">Tim Peneliti</label>
                <input
                  value={form.researcherTeam}
                  onChange={(e) => setForm({ ...form, researcherTeam: e.target.value })}
                  className="w-full bg-surface-container-low px-3 py-2 rounded-lg"
                />
              </div>

              <div>
                <label className="text-label-md block mb-1">Kondisi Aset</label>
                <select
                  value={form.condition}
                  onChange={(e) => setForm({ ...form, condition: e.target.value as typeof form.condition })}
                  className="w-full bg-surface-container-low px-3 py-2 rounded-lg"
                >
                  <option value="prima">Kondisi Prima</option>
                  <option value="maintenance">Perawatan / Kalibrasi</option>
                  <option value="rusak">Perlu Perbaikan (Rusak)</option>
                </select>
              </div>
              <div>
                <label className="text-label-md block mb-1">
                  Ketersediaan {editing?.availability === 'dipinjam' && '(Terkunci: Sedang Dipinjam)'}
                </label>
                <select
                  disabled={editing?.availability === 'dipinjam' || form.condition === 'rusak'}
                  value={form.condition === 'rusak' && editing?.availability !== 'dipinjam' ? 'tidak_tersedia' : form.availability}
                  onChange={(e) => setForm({ ...form, availability: e.target.value as typeof form.availability })}
                  className="w-full bg-surface-container-low px-3 py-2 rounded-lg disabled:opacity-60"
                >
                  <option value="tersedia">Tersedia</option>
                  <option value="tidak_tersedia">Tidak Tersedia</option>
                  {editing?.availability === 'dipinjam' && <option value="dipinjam">Sedang Dipinjam</option>}
                </select>
              </div>

              <div>
                <label className="text-label-md block mb-1">Ruangan Penempatan</label>
                <select
                  value={form.roomId}
                  onChange={(e) => setForm({ ...form, roomId: e.target.value })}
                  className="w-full bg-surface-container-low px-3 py-2 rounded-lg"
                >
                  <option value="">-- Pilih Ruangan --</option>
                  {rooms.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.code} — {r.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-label-md block mb-1">Detail Letak (Lemari / Rak / Bay)</label>
                <input
                  value={form.placementDetail}
                  onChange={(e) => setForm({ ...form, placementDetail: e.target.value })}
                  placeholder="Contoh: Lemari Display Kaca A, Rak 2"
                  className="w-full bg-surface-container-low px-3 py-2 rounded-lg"
                />
              </div>

              <div>
                <label className="text-label-md block mb-1">Narahubung (PIC Produk)</label>
                <select
                  value={form.contactId}
                  onChange={(e) => setForm({ ...form, contactId: e.target.value })}
                  className="w-full bg-surface-container-low px-3 py-2 rounded-lg"
                >
                  <option value="">-- Pilih Narahubung --</option>
                  {contacts.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.code})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-label-md block mb-1">Skema / Hibah Riset</label>
                <input
                  value={form.researchScheme}
                  onChange={(e) => setForm({ ...form, researchScheme: e.target.value })}
                  className="w-full bg-surface-container-low px-3 py-2 rounded-lg"
                />
              </div>

              <div className="md:col-span-2">
                <label className="text-label-md block mb-1">Foto Produk (Disimpan dengan nama UUID)</label>
                <div className="flex items-center gap-3">
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={(e) => e.target.files?.[0] && handlePhotoUpload(e.target.files[0])}
                    className="text-body-sm"
                  />
                  {uploading && <span className="text-body-sm text-primary">Mengunggah...</span>}
                  {form.photoUrl && (
                    <img src={form.photoUrl} alt="Preview" className="h-12 w-16 object-cover rounded border" />
                  )}
                </div>
              </div>

              <div className="md:col-span-2">
                <label className="text-label-md block mb-1">Deskripsi Produk</label>
                <textarea
                  rows={2}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full bg-surface-container-low p-3 rounded-lg"
                />
              </div>

              <div className="md:col-span-2">
                <label className="text-label-md block mb-1">Ringkasan Cara Penggunaan (Tampil di Halaman Detail / Scan QR)</label>
                <textarea
                  rows={3}
                  value={form.usageSummary}
                  onChange={(e) => setForm({ ...form, usageSummary: e.target.value })}
                  placeholder="1) Pasang antena... 2) Nyalakan saklar daya..."
                  className="w-full bg-surface-container-low p-3 rounded-lg"
                />
              </div>

              <div className="md:col-span-2">
                <div className="flex items-center justify-between mb-1">
                  <label className="text-label-md">Spesifikasi Teknis</label>
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, specifications: [...form.specifications, { label: '', value: '' }] })}
                    className="text-label-sm text-primary hover:underline"
                  >
                    + Tambah Baris
                  </button>
                </div>
                <div className="space-y-2">
                  {form.specifications.map((s, idx) => (
                    <div key={idx} className="flex gap-2">
                      <input
                        placeholder="Label (mis. Prosesor)"
                        value={s.label}
                        onChange={(e) => {
                          const next = [...form.specifications];
                          next[idx] = { ...next[idx], label: e.target.value };
                          setForm({ ...form, specifications: next });
                        }}
                        className="flex-1 bg-surface-container-low px-3 py-1.5 rounded-lg text-body-sm"
                      />
                      <input
                        placeholder="Nilai (mis. Jetson Orin)"
                        value={s.value}
                        onChange={(e) => {
                          const next = [...form.specifications];
                          next[idx] = { ...next[idx], value: e.target.value };
                          setForm({ ...form, specifications: next });
                        }}
                        className="flex-1 bg-surface-container-low px-3 py-1.5 rounded-lg text-body-sm"
                      />
                    </div>
                  ))}
                </div>
              </div>

              <label className="md:col-span-2 flex items-center gap-2 text-body-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.isPriority}
                  onChange={(e) => setForm({ ...form, isPriority: e.target.checked })}
                  className="accent-primary"
                />
                Tandai sebagai Produk Prioritas Pameran FTC
              </label>
            </div>

            <div className="px-6 py-4 border-t border-surface-container flex justify-end gap-2">
              <button type="button" onClick={() => setModalOpen(false)} className="px-4 py-2 rounded-lg bg-surface-container text-title-sm">
                Batal
              </button>
              <button
                type="submit"
                disabled={saving || uploading}
                className="px-5 py-2 rounded-lg bg-primary text-on-primary text-title-sm font-bold disabled:opacity-50"
              >
                {saving ? 'Menyimpan...' : 'Simpan Aset'}
              </button>
            </div>
          </form>
        </div>
      )}

      <QrLabelModal
        open={Boolean(qrTarget)}
        onClose={() => setQrTarget(null)}
        items={
          qrTarget
            ? [
                {
                  id: qrTarget.id,
                  inventoryCode: qrTarget.inventoryCode,
                  name: qrTarget.name,
                  roomLabel: qrTarget.roomCode ? `${qrTarget.roomCode} • ${qrTarget.placementDetail ?? ''}` : qrTarget.placementDetail,
                },
              ]
            : []
        }
      />
    </div>
  );
}
