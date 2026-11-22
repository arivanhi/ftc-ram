'use client';

import { useCallback, useEffect, useState } from 'react';
import { NotificationModal, type NotificationModalState } from '@/components/NotificationModal';

type Room = {
  id: string;
  floorId: string;
  code: string;
  name: string;
  subtitle: string;
  picName: string;
  picExt: string;
  capacity: number;
  operatingHours: string;
  gridZone: string;
  gridColSpan: number;
  notes: string;
  assets: Array<{ id: string }>;
};

type Floor = { id: string; floorNumber: number; label: string; rooms: Room[] };
type Building = { id: string; code: string; name: string; subtitle: string; icon: string; floors: Floor[] };

export function LocationsManager() {
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [notice, setNotice] = useState<NotificationModalState | null>(null);

  // Quick create forms
  const [bCode, setBCode] = useState('');
  const [bName, setBName] = useState('');
  const [bSub, setBSub] = useState('');

  const [fBuildingId, setFBuildingId] = useState('');
  const [fNumber, setFNumber] = useState(1);
  const [fLabel, setFLabel] = useState('Lt. 1');

  const [rForm, setRForm] = useState({
    floorId: '',
    code: '',
    name: '',
    subtitle: '',
    picName: '',
    picExt: '',
    capacity: 10,
    operatingHours: '08.00 - 16.30 WIB',
    gridZone: 'top' as 'top' | 'bottom',
    gridColSpan: 4,
    notes: '',
  });

  const load = useCallback(async () => {
    const res = await fetch('/api/locations');
    if (res.ok) {
      const d = await res.json();
      const list: Building[] = d.buildings ?? [];
      setBuildings(list);
      if (!fBuildingId && list[0]) setFBuildingId(list[0].id);
      if (!rForm.floorId && list[0]?.floors[0]) {
        setRForm((prev) => ({ ...prev, floorId: list[0].floors[0].id }));
      }
    }
  }, [fBuildingId, rForm.floorId]);

  useEffect(() => {
    load();
  }, [load]);

  async function addBuilding(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch('/api/admin/buildings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: bCode, name: bName, subtitle: bSub }),
    });
    const d = await res.json();
    if (res.ok) {
      setNotice({ type: 'success', title: 'Gedung Berhasil Ditambahkan', message: `Gedung ${d.building.name} telah disimpan.` });
      setBCode('');
      setBName('');
      setBSub('');
      load();
    } else {
      setNotice({ type: 'error', title: 'Gagal Menambahkan Gedung', message: d.error || 'Terjadi kesalahan.' });
    }
  }

  async function addFloor(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch('/api/admin/floors', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ buildingId: fBuildingId, floorNumber: Number(fNumber), label: fLabel }),
    });
    const d = await res.json();
    if (res.ok) {
      setNotice({ type: 'success', title: 'Lantai Berhasil Ditambahkan', message: `Lantai ${d.floor.label} telah disimpan.` });
      load();
    } else {
      setNotice({ type: 'error', title: 'Gagal Menambahkan Lantai', message: d.error || 'Terjadi kesalahan.' });
    }
  }

  async function addRoom(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch('/api/admin/rooms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...rForm, capacity: Number(rForm.capacity), gridColSpan: Number(rForm.gridColSpan) }),
    });
    const d = await res.json();
    if (res.ok) {
      setNotice({ type: 'success', title: 'Ruangan Berhasil Ditambahkan', message: `Ruangan ${d.room.code} telah ditambahkan ke denah.` });
      setRForm((p) => ({ ...p, code: '', name: '', subtitle: '', picName: '', picExt: '', notes: '' }));
      load();
    } else {
      setNotice({ type: 'error', title: 'Gagal Menambahkan Ruangan', message: d.error || 'Terjadi kesalahan.' });
    }
  }

  async function deleteRoom(id: string, code: string) {
    if (!confirm(`Hapus ruangan ${code}?`)) return;
    const res = await fetch(`/api/admin/rooms/${id}`, { method: 'DELETE' });
    const d = await res.json().catch(() => ({}));
    if (res.ok) {
      setNotice({ type: 'success', title: 'Ruangan Berhasil Dihapus', message: `Ruangan ${code} telah dihapus dari denah.` });
      load();
    } else {
      setNotice({ type: 'error', title: 'Gagal Menghapus Ruangan', message: d.error || 'Gagal menghapus ruangan.' });
    }
  }

  async function updateRoomGrid(room: Room, gridZone: 'top' | 'bottom', gridColSpan: number) {
    const res = await fetch(`/api/admin/rooms/${room.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ gridZone, gridColSpan }),
    });
    const d = await res.json().catch(() => ({}));
    if (res.ok) {
      setNotice({ type: 'success', title: 'Tata Letak Ruangan Diperbarui', message: `Posisi blok ruangan ${room.code} berhasil diubah.` });
      load();
    } else {
      setNotice({ type: 'error', title: 'Gagal Memperbarui Tata Letak', message: d.error || 'Gagal memperbarui tata letak.' });
    }
  }

  const allFloors = buildings.flatMap((b) => b.floors.map((f) => ({ id: f.id, label: `${b.name} — ${f.label}` })));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-headline-md text-primary font-bold">Kelola Gedung, Lantai &amp; Denah Blok Ruangan</h1>
        <p className="text-body-sm text-on-surface-variant">
          Atur zona atas/bawah koridor dan lebar kolom (1–12) setiap ruangan untuk membentuk denah modular interaktif.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <form onSubmit={addBuilding} className="bg-white p-4 rounded-xl border border-outline-variant/25 flex flex-col gap-2.5">
          <h2 className="text-title-sm text-primary font-bold">1. Tambah Gedung</h2>
          <input required placeholder="Kode (mis. G)" value={bCode} onChange={(e) => setBCode(e.target.value)} className="bg-surface-container-low px-3 py-2 rounded-lg text-body-sm" />
          <input required placeholder="Nama Gedung (mis. Gedung G)" value={bName} onChange={(e) => setBName(e.target.value)} className="bg-surface-container-low px-3 py-2 rounded-lg text-body-sm" />
          <input placeholder="Subjudul / Klaster Lab" value={bSub} onChange={(e) => setBSub(e.target.value)} className="bg-surface-container-low px-3 py-2 rounded-lg text-body-sm" />
          <button type="submit" className="py-2 rounded-lg bg-primary text-on-primary text-title-sm">Simpan Gedung</button>
        </form>

        <form onSubmit={addFloor} className="bg-white p-4 rounded-xl border border-outline-variant/25 flex flex-col gap-2.5">
          <h2 className="text-title-sm text-primary font-bold">2. Tambah Lantai</h2>
          <select required value={fBuildingId} onChange={(e) => setFBuildingId(e.target.value)} className="bg-surface-container-low px-3 py-2 rounded-lg text-body-sm">
            {buildings.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
          <input required type="number" value={fNumber} onChange={(e) => { setFNumber(Number(e.target.value)); setFLabel(`Lt. ${e.target.value}`); }} className="bg-surface-container-low px-3 py-2 rounded-lg text-body-sm" />
          <input required placeholder="Label (Lt. 1)" value={fLabel} onChange={(e) => setFLabel(e.target.value)} className="bg-surface-container-low px-3 py-2 rounded-lg text-body-sm" />
          <button type="submit" className="py-2 rounded-lg bg-primary text-on-primary text-title-sm">Simpan Lantai</button>
        </form>

        <form onSubmit={addRoom} className="bg-white p-4 rounded-xl border border-outline-variant/25 flex flex-col gap-2.5">
          <h2 className="text-title-sm text-primary font-bold">3. Tambah Ruangan ke Denah</h2>
          <select required value={rForm.floorId} onChange={(e) => setRForm({ ...rForm, floorId: e.target.value })} className="bg-surface-container-low px-3 py-2 rounded-lg text-body-sm">
            <option value="">-- Pilih Lantai --</option>
            {allFloors.map((f) => <option key={f.id} value={f.id}>{f.label}</option>)}
          </select>
          <div className="flex gap-2">
            <input required placeholder="Kode (H3.06)" value={rForm.code} onChange={(e) => setRForm({ ...rForm, code: e.target.value })} className="w-1/3 bg-surface-container-low px-3 py-2 rounded-lg text-body-sm uppercase" />
            <input required placeholder="Nama Ruangan" value={rForm.name} onChange={(e) => setRForm({ ...rForm, name: e.target.value })} className="flex-1 bg-surface-container-low px-3 py-2 rounded-lg text-body-sm" />
          </div>
          <div className="flex gap-2">
            <input placeholder="PIC Ruang" value={rForm.picName} onChange={(e) => setRForm({ ...rForm, picName: e.target.value })} className="flex-1 bg-surface-container-low px-3 py-2 rounded-lg text-body-sm" />
            <select value={rForm.gridZone} onChange={(e) => setRForm({ ...rForm, gridZone: e.target.value as 'top' | 'bottom' })} className="bg-surface-container-low px-2 py-2 rounded-lg text-body-sm">
              <option value="top">Atas Koridor</option>
              <option value="bottom">Bawah Koridor</option>
            </select>
            <input type="number" min={1} max={12} value={rForm.gridColSpan} onChange={(e) => setRForm({ ...rForm, gridColSpan: Number(e.target.value) })} className="w-16 bg-surface-container-low px-2 py-2 rounded-lg text-body-sm" title="Lebar kolom 1-12" />
          </div>
          <button type="submit" className="py-2 rounded-lg bg-primary text-on-primary text-title-sm">Simpan Ruangan</button>
        </form>
      </div>

      {/* Hierarchy List */}
      <div className="flex flex-col gap-4">
        {buildings.map((b) => (
          <div key={b.id} className="bg-white rounded-xl border border-outline-variant/25 p-5 shadow-sm flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h3 className="text-title-md text-primary font-bold">{b.name} ({b.code}) — {b.subtitle}</h3>
            </div>
            {b.floors.map((f) => (
              <div key={f.id} className="bg-surface-container-low rounded-xl p-4 flex flex-col gap-2.5">
                <div className="text-title-sm font-bold text-on-surface">{f.label} ({f.rooms.length} Ruangan)</div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
                  {f.rooms.map((r) => (
                    <div key={r.id} className="bg-white p-3 rounded-lg border border-outline-variant/30 flex flex-col gap-2">
                      <div className="flex items-center justify-between">
                        <span className="px-2 py-0.5 rounded bg-primary text-on-primary text-label-sm font-bold">{r.code}</span>
                        <span className="text-label-sm text-outline">{r.assets.length} Aset</span>
                      </div>
                      <div className="text-title-sm font-semibold">{r.name}</div>
                      <div className="text-body-sm text-on-surface-variant">PIC: {r.picName || '-'}</div>
                      <div className="flex items-center justify-between gap-2 pt-1 border-t border-surface-container">
                        <div className="flex items-center gap-1 text-body-sm">
                          <select
                            value={r.gridZone}
                            onChange={(e) => updateRoomGrid(r, e.target.value as 'top' | 'bottom', r.gridColSpan)}
                            className="bg-surface-container-low px-2 py-1 rounded text-[12px]"
                          >
                            <option value="top">Atas</option>
                            <option value="bottom">Bawah</option>
                          </select>
                          <select
                            value={r.gridColSpan}
                            onChange={(e) => updateRoomGrid(r, r.gridZone as 'top' | 'bottom', Number(e.target.value))}
                            className="bg-surface-container-low px-2 py-1 rounded text-[12px]"
                          >
                            {[3, 4, 5, 6, 7, 8, 12].map((n) => (
                              <option key={n} value={n}>Col {n}/12</option>
                            ))}
                          </select>
                        </div>
                        <button
                          type="button"
                          onClick={() => deleteRoom(r.id, r.code)}
                          className="text-label-sm text-error hover:underline"
                        >
                          Hapus
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>

      <NotificationModal notification={notice} onClose={() => setNotice(null)} />
    </div>
  );
}
