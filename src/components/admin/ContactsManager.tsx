'use client';

import { useCallback, useEffect, useState } from 'react';
import { ContactStatusBadge } from '@/components/StatusBadge';

type ContactRow = {
  id: string;
  code: string;
  name: string;
  roleTitle: string;
  specialization: string;
  roomLabel: string;
  dutyHours: string;
  availabilityStatus: 'available' | 'assisting' | 'offline';
  whatsapp: string;
  email: string;
  photoUrl: string | null;
  isEmergency: boolean;
};

const EMPTY_CONTACT = {
  code: '',
  name: '',
  roleTitle: '',
  specialization: '',
  roomLabel: '',
  dutyHours: '08:00 - 16:00 WIB',
  availabilityStatus: 'available' as 'available' | 'assisting' | 'offline',
  whatsapp: '',
  email: '',
  photoUrl: '',
  isEmergency: false,
};

export function ContactsManager() {
  const [items, setItems] = useState<ContactRow[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_CONTACT);
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch('/api/admin/contacts');
    if (res.ok) setItems((await res.json()).items ?? []);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function uploadPhoto(file: File) {
    const fd = new FormData();
    fd.set('file', file);
    fd.set('kind', 'image');
    const res = await fetch('/api/admin/uploads', { method: 'POST', body: fd });
    const d = await res.json();
    if (res.ok) setForm((p) => ({ ...p, photoUrl: d.url }));
    else setMsg(d.error);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const url = editingId ? `/api/admin/contacts/${editingId}` : '/api/admin/contacts';
    const res = await fetch(url, {
      method: editingId ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, photoUrl: form.photoUrl || null }),
    });
    const d = await res.json();
    if (!res.ok) return setMsg(d.error || 'Gagal menyimpan narahubung.');
    setMsg(editingId ? 'Data narahubung diperbarui.' : 'Narahubung baru ditambahkan.');
    setEditingId(null);
    setForm(EMPTY_CONTACT);
    load();
  }

  async function del(id: string) {
    if (!confirm('Hapus narahubung ini?')) return;
    const res = await fetch(`/api/admin/contacts/${id}`, { method: 'DELETE' });
    const d = await res.json().catch(() => ({}));
    if (!res.ok) return setMsg(d.error || 'Gagal menghapus narahubung.');
    setMsg('Narahubung dihapus.');
    load();
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-headline-md text-primary font-bold">Kelola Direktori Narahubung FTC</h1>
        <p className="text-body-sm text-on-surface-variant">
          Daftar personel pengelola produk penelitian yang dapat dihubungi PIC Pameran lewat WhatsApp &amp; Email.
        </p>
      </div>
      {msg && <div className="p-3 rounded-xl bg-primary-fixed text-on-primary-fixed text-body-sm font-medium">{msg}</div>}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        <form onSubmit={save} className="lg:col-span-5 bg-white p-5 rounded-xl border border-outline-variant/25 shadow-sm flex flex-col gap-3">
          <h2 className="text-title-md text-primary font-bold">{editingId ? 'Edit Narahubung' : 'Tambah Narahubung Baru'}</h2>
          <div className="grid grid-cols-2 gap-2">
            <input required placeholder="Kode (PIC-FTC-05)" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} className="bg-surface-container-low px-3 py-2 rounded-lg text-mono-data uppercase" />
            <select value={form.availabilityStatus} onChange={(e) => setForm({ ...form, availabilityStatus: e.target.value as typeof form.availabilityStatus })} className="bg-surface-container-low px-3 py-2 rounded-lg text-body-sm">
              <option value="available">Tersedia di Lab</option>
              <option value="assisting">Sedang Pendampingan</option>
              <option value="offline">Di Luar Jam Tugas</option>
            </select>
          </div>
          <input required placeholder="Nama Lengkap & Gelar *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="bg-surface-container-low px-3 py-2 rounded-lg text-body-sm" />
          <input required placeholder="Peran / Jabatan *" value={form.roleTitle} onChange={(e) => setForm({ ...form, roleTitle: e.target.value })} className="bg-surface-container-low px-3 py-2 rounded-lg text-body-sm" />
          <input placeholder="Bidang / Spesialisasi" value={form.specialization} onChange={(e) => setForm({ ...form, specialization: e.target.value })} className="bg-surface-container-low px-3 py-2 rounded-lg text-body-sm" />
          <div className="grid grid-cols-2 gap-2">
            <input placeholder="Ruang (Gedung H Lt. 3)" value={form.roomLabel} onChange={(e) => setForm({ ...form, roomLabel: e.target.value })} className="bg-surface-container-low px-3 py-2 rounded-lg text-body-sm" />
            <input placeholder="Jam Tugas" value={form.dutyHours} onChange={(e) => setForm({ ...form, dutyHours: e.target.value })} className="bg-surface-container-low px-3 py-2 rounded-lg text-body-sm" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <input required placeholder="WhatsApp (0812...)" value={form.whatsapp} onChange={(e) => setForm({ ...form, whatsapp: e.target.value })} className="bg-surface-container-low px-3 py-2 rounded-lg text-body-sm" />
            <input required type="email" placeholder="Email @dinus.ac.id" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="bg-surface-container-low px-3 py-2 rounded-lg text-body-sm" />
          </div>
          <div>
            <label className="text-label-sm text-on-surface-variant block mb-1">Foto Profil (Opsional)</label>
            <input type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => e.target.files?.[0] && uploadPhoto(e.target.files[0])} className="text-body-sm" />
          </div>
          <label className="flex items-center gap-2 text-body-sm">
            <input type="checkbox" checked={form.isEmergency} onChange={(e) => setForm({ ...form, isEmergency: e.target.checked })} className="accent-primary" />
            Jadikan Kontak Siaga Darurat FTC
          </label>
          <div className="flex gap-2">
            {editingId && <button type="button" onClick={() => { setEditingId(null); setForm(EMPTY_CONTACT); }} className="px-4 py-2 rounded-lg bg-surface-container text-title-sm">Batal</button>}
            <button type="submit" className="flex-1 py-2 rounded-lg bg-primary text-on-primary text-title-sm font-bold">Simpan Narahubung</button>
          </div>
        </form>

        <div className="lg:col-span-7 grid grid-cols-1 md:grid-cols-2 gap-3">
          {items.map((c) => (
            <div key={c.id} className="bg-white p-4 rounded-xl border border-outline-variant/25 shadow-sm flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <ContactStatusBadge status={c.availabilityStatus} />
                <span className="text-mono-data text-outline text-[12px]">{c.code}</span>
              </div>
              <div className="flex items-center gap-3">
                <img src={c.photoUrl || '/images/placeholders/avatar-default.svg'} alt={c.name} className="w-12 h-12 rounded-lg object-cover bg-surface-container" />
                <div className="min-w-0">
                  <div className="text-title-sm font-bold truncate">{c.name}</div>
                  <div className="text-body-sm text-primary truncate">{c.roleTitle}</div>
                </div>
              </div>
              <div className="text-body-sm text-on-surface-variant">
                WA: {c.whatsapp} • {c.email}
              </div>
              <div className="flex justify-end gap-2 pt-1 border-t border-surface-container">
                <button
                  type="button"
                  onClick={() => {
                    setEditingId(c.id);
                    setForm({ ...c, photoUrl: c.photoUrl ?? '' });
                  }}
                  className="text-label-md text-primary hover:underline"
                >
                  Edit
                </button>
                <button type="button" onClick={() => del(c.id)} className="text-label-md text-error hover:underline">
                  Hapus
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
