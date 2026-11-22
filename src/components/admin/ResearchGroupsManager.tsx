'use client';

import { useCallback, useEffect, useState } from 'react';

type ResearchGroupRow = {
  id: string;
  name: string;
  url: string;
  description: string;
  sortOrder: number;
};

const EMPTY_FORM = {
  name: '',
  url: '',
  description: '',
  sortOrder: 0,
};

export function ResearchGroupsManager() {
  const [items, setItems] = useState<ResearchGroupRow[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const load = useCallback(async () => {
    const res = await fetch('/api/admin/research-groups');
    if (res.ok) setItems((await res.json()).items ?? []);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMsg(null);
    try {
      const url = editingId ? `/api/admin/research-groups/${editingId}` : '/api/admin/research-groups';
      const res = await fetch(url, {
        method: editingId ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          url: form.url,
          description: form.description,
          sortOrder: Number(form.sortOrder) || 0,
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMsg({ type: 'err', text: body.error || 'Gagal menyimpan Kelompok Keilmuan.' });
        return;
      }
      setMsg({
        type: 'ok',
        text: editingId ? 'Tautan Kelompok Keilmuan diperbarui.' : 'Tautan Kelompok Keilmuan berhasil ditambahkan.',
      });
      setEditingId(null);
      setForm(EMPTY_FORM);
      load();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(item: ResearchGroupRow) {
    if (!confirm(`Hapus tautan "${item.name}"?`)) return;
    const res = await fetch(`/api/admin/research-groups/${item.id}`, { method: 'DELETE' });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      setMsg({ type: 'err', text: body.error || 'Gagal menghapus Kelompok Keilmuan.' });
      return;
    }
    if (editingId === item.id) {
      setEditingId(null);
      setForm(EMPTY_FORM);
    }
    setMsg({ type: 'ok', text: `Tautan "${item.name}" dihapus.` });
    load();
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-headline-md text-primary font-bold">Kelola Tautan Kelompok Keilmuan</h1>
        <p className="text-body-sm text-on-surface-variant">
          Tambahkan hyperlink menuju web Kelompok Keilmuan FTC. Tautan akan tampil di halaman publik tepat di sebelah kiri kotak pencarian.
        </p>
      </div>

      {msg && (
        <div
          className={`p-3 rounded-xl text-body-sm font-medium ${
            msg.type === 'err'
              ? 'bg-error-container text-on-error-container'
              : 'bg-primary-fixed text-on-primary-fixed'
          }`}
        >
          {msg.text}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        <form
          onSubmit={handleSubmit}
          className="lg:col-span-5 bg-white p-5 rounded-xl border border-outline-variant/25 shadow-sm flex flex-col gap-3"
        >
          <h2 className="text-title-md text-primary font-bold">
            {editingId ? 'Edit Kelompok Keilmuan' : 'Tambah Hyperlink Kelompok Keilmuan'}
          </h2>
          <div>
            <label className="text-label-sm text-on-surface-variant block mb-1">Nama Tautan / Kelompok Keilmuan *</label>
            <input
              required
              placeholder="Contoh: KK Kecerdasan Buatan"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full bg-surface-container-low px-3 py-2 rounded-lg text-body-sm"
            />
          </div>
          <div>
            <label className="text-label-sm text-on-surface-variant block mb-1">URL Website Tujuan *</label>
            <input
              required
              type="url"
              placeholder="https://kk-ai.ftc.dinus.ac.id"
              value={form.url}
              onChange={(e) => setForm({ ...form, url: e.target.value })}
              className="w-full bg-surface-container-low px-3 py-2 rounded-lg text-body-sm"
            />
          </div>
          <div>
            <label className="text-label-sm text-on-surface-variant block mb-1">Keterangan Singkat (Opsional)</label>
            <input
              placeholder="Fokus riset AI, Visi Komputer, dan Robotika"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="w-full bg-surface-container-low px-3 py-2 rounded-lg text-body-sm"
            />
          </div>
          <div>
            <label className="text-label-sm text-on-surface-variant block mb-1">Urutan Tampil</label>
            <input
              type="number"
              min={0}
              max={999}
              value={form.sortOrder}
              onChange={(e) => setForm({ ...form, sortOrder: Number(e.target.value) })}
              className="w-full bg-surface-container-low px-3 py-2 rounded-lg text-body-sm"
            />
          </div>
          <div className="flex gap-2 pt-1">
            {editingId && (
              <button
                type="button"
                onClick={() => {
                  setEditingId(null);
                  setForm(EMPTY_FORM);
                }}
                className="px-4 py-2 rounded-lg bg-surface-container text-title-sm"
              >
                Batal
              </button>
            )}
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-2 rounded-lg bg-primary text-on-primary text-title-sm font-bold disabled:opacity-50"
            >
              {saving ? 'Menyimpan...' : editingId ? 'Perbarui Tautan' : 'Simpan Tautan'}
            </button>
          </div>
        </form>

        <div className="lg:col-span-7 flex flex-col gap-3">
          {items.length === 0 ? (
            <div className="bg-white p-6 rounded-xl border border-outline-variant/25 text-center text-body-sm text-on-surface-variant">
              Belum ada tautan Kelompok Keilmuan. Tambahkan melalui form di samping agar muncul di sebelah kiri searchbar portal publik.
            </div>
          ) : (
            items.map((item) => (
              <div
                key={item.id}
                className="bg-white p-4 rounded-xl border border-outline-variant/25 shadow-sm flex items-start justify-between gap-3"
              >
                <div className="min-w-0 flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded bg-surface-container text-label-sm font-mono text-outline">
                      #{item.sortOrder}
                    </span>
                    <h3 className="text-title-sm font-bold text-on-surface truncate">{item.name}</h3>
                  </div>
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-body-sm text-primary hover:underline inline-flex items-center gap-1 break-all"
                  >
                    <span>{item.url}</span>
                    <span className="material-symbols-outlined text-[15px] shrink-0">open_in_new</span>
                  </a>
                  {item.description && (
                    <p className="text-body-sm text-on-surface-variant">{item.description}</p>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingId(item.id);
                      setForm({
                        name: item.name,
                        url: item.url,
                        description: item.description,
                        sortOrder: item.sortOrder,
                      });
                    }}
                    className="text-label-md text-primary hover:underline"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(item)}
                    className="text-label-md text-error hover:underline"
                  >
                    Hapus
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
