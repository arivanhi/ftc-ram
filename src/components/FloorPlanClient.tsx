'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';

type PlacedAsset = {
  id: string;
  inventoryCode: string;
  name: string;
  category: string;
  condition: string;
  availability: string;
  placementDetail: string | null;
};

type FloorRoom = {
  id: string;
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
  assets: PlacedAsset[];
};

type FloorNode = {
  id: string;
  floorNumber: number;
  label: string;
  rooms: FloorRoom[];
  metrics: { total: number; prima: number; attention: number; dipinjam: number };
};

type BuildingNode = {
  id: string;
  code: string;
  name: string;
  subtitle: string;
  icon: string;
  floors: FloorNode[];
};

const COL_SPAN_CLASS: Record<number, string> = {
  1: 'md:col-span-1',
  2: 'md:col-span-2',
  3: 'md:col-span-3',
  4: 'md:col-span-4',
  5: 'md:col-span-5',
  6: 'md:col-span-6',
  7: 'md:col-span-7',
  8: 'md:col-span-8',
  9: 'md:col-span-9',
  10: 'md:col-span-10',
  11: 'md:col-span-11',
  12: 'md:col-span-12',
};

export function FloorPlanClient() {
  const searchParams = useSearchParams();
  const assetParam = searchParams.get('asset') ?? '';

  const [buildings, setBuildings] = useState<BuildingNode[]>([]);
  const [selectedBuildingId, setSelectedBuildingId] = useState('');
  const [selectedFloorId, setSelectedFloorId] = useState('');
  const [selectedRoomId, setSelectedRoomId] = useState('');
  const [spotlightQuery, setSpotlightQuery] = useState('');
  const [spotlightMsg, setSpotlightMsg] = useState<string | null>(null);
  const [highlightedAssetId, setHighlightedAssetId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function init() {
      setLoading(true);
      try {
        const res = await fetch('/api/locations');
        if (!res.ok) return;
        const json = await res.json();
        const bList: BuildingNode[] = json.buildings ?? [];
        setBuildings(bList);

        if (assetParam) {
          const spotRes = await fetch(`/api/locations/spotlight?assetId=${encodeURIComponent(assetParam)}`);
          if (spotRes.ok) {
            const spot = await spotRes.json();
            if (spot.match) {
              setSelectedBuildingId(spot.match.buildingId);
              setSelectedFloorId(spot.match.floorId);
              setSelectedRoomId(spot.match.roomId);
              setHighlightedAssetId(spot.match.assetId);
              setSpotlightMsg(`Ditemukan: ${spot.match.inventoryCode} di Ruang ${spot.match.roomCode} (${spot.match.placementDetail || '-'})`);
              return;
            }
          }
        }

        const firstB = bList[0];
        // Pick floor with most rooms by default so modular grid looks full immediately
        const defaultF =
          firstB?.floors.slice().sort((a, b) => b.rooms.length - a.rooms.length)[0] ?? firstB?.floors[0];
        if (firstB) setSelectedBuildingId(firstB.id);
        if (defaultF) {
          setSelectedFloorId(defaultF.id);
          if (defaultF.rooms[0]) setSelectedRoomId(defaultF.rooms[0].id);
        }
      } finally {
        setLoading(false);
      }
    }
    init();
  }, [assetParam]);

  const activeBuilding = buildings.find((b) => b.id === selectedBuildingId) ?? buildings[0];
  const activeFloor = activeBuilding?.floors.find((f) => f.id === selectedFloorId) ?? activeBuilding?.floors[0];
  const activeRoom = activeFloor?.rooms.find((r) => r.id === selectedRoomId) ?? activeFloor?.rooms[0];

  function selectBuilding(b: BuildingNode) {
    setSelectedBuildingId(b.id);
    const f = b.floors.slice().sort((a, c) => c.rooms.length - a.rooms.length)[0] ?? b.floors[0];
    setSelectedFloorId(f?.id ?? '');
    setSelectedRoomId(f?.rooms[0]?.id ?? '');
    setHighlightedAssetId(null);
  }

  function selectFloor(f: FloorNode) {
    setSelectedFloorId(f.id);
    setSelectedRoomId(f.rooms[0]?.id ?? '');
    setHighlightedAssetId(null);
  }

  async function handleSpotlight(e: React.FormEvent) {
    e.preventDefault();
    if (!spotlightQuery.trim()) return;
    setSpotlightMsg(null);
    const res = await fetch(`/api/locations/spotlight?q=${encodeURIComponent(spotlightQuery.trim())}`);
    if (!res.ok) return;
    const { match } = await res.json();
    if (!match) {
      setSpotlightMsg(`Aset atau ruang "${spotlightQuery}" tidak ditemukan di denah.`);
      return;
    }
    setSelectedBuildingId(match.buildingId);
    setSelectedFloorId(match.floorId);
    setSelectedRoomId(match.roomId);
    setHighlightedAssetId(match.assetId);
    setSpotlightMsg(`Ditemukan: ${match.inventoryCode} — ${match.assetName} di ${match.roomCode} (${match.placementDetail || '-'})`);
  }

  const topRooms = (activeFloor?.rooms ?? []).filter((r) => r.gridZone !== 'bottom');
  const bottomRooms = (activeFloor?.rooms ?? []).filter((r) => r.gridZone === 'bottom');

  function dotColor(condition: string, availability: string) {
    if (condition === 'rusak') return 'bg-error';
    if (condition === 'maintenance') return 'bg-[#f59e0b]';
    if (availability === 'dipinjam') return 'bg-primary';
    return 'bg-[#10b981]';
  }

  function renderRoomCard(room: FloorRoom) {
    const isSelected = activeRoom?.id === room.id;
    const spanClass = COL_SPAN_CLASS[Math.min(12, Math.max(1, room.gridColSpan))] ?? 'md:col-span-4';
    return (
      <div
        key={room.id}
        onClick={() => setSelectedRoomId(room.id)}
        className={`${spanClass} bg-surface-container-lowest rounded-lg p-3.5 flex flex-col justify-between cursor-pointer transition-all ${
          isSelected ? 'ring-2 ring-primary shadow-md' : 'shadow-sm hover:bg-surface-container/60 border border-outline-variant/25'
        }`}
      >
        <div className="flex items-center justify-between gap-2">
          <span className={`px-2 py-0.5 rounded text-label-sm font-bold tabular-nums-code ${isSelected ? 'bg-primary text-on-primary' : 'bg-surface-container-high text-on-surface'}`}>
            {room.code}
          </span>
          <span className="text-label-sm text-primary font-semibold">
            {room.assets.length} Aset
          </span>
        </div>
        <div className="my-2">
          <div className="text-title-sm text-on-surface font-bold">{room.name}</div>
          <div className="text-body-sm text-on-surface-variant line-clamp-1">{room.subtitle}</div>
        </div>
        <div className="flex flex-wrap gap-1.5 pt-1">
          {room.assets.slice(0, 3).map((a) => (
            <span
              key={a.id}
              className={`px-2 py-0.5 rounded text-[11px] font-medium flex items-center gap-1 ${
                highlightedAssetId === a.id
                  ? 'bg-secondary-container text-on-secondary-fixed font-bold ring-2 ring-secondary'
                  : 'bg-surface-container text-on-surface'
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${dotColor(a.condition, a.availability)}`} />
              {a.inventoryCode}
            </span>
          ))}
          {room.assets.length > 3 && (
            <span className="px-2 py-0.5 rounded bg-surface-container-low text-outline text-[11px]">
              +{room.assets.length - 3}
            </span>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-[1440px] mx-auto px-gutter flex flex-col gap-space-md">
      {/* Header & Spotlight */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-space-md bg-surface-container-lowest p-space-lg rounded-xl border border-outline-variant/25 shadow-sm">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-1 text-label-sm text-on-surface-variant uppercase">
            <span>Infrastruktur FTC</span>
            <span className="material-symbols-outlined text-[14px]">chevron_right</span>
            <span className="text-primary font-semibold">Pemetaan Peletakan Aset Produk Penelitian</span>
          </div>
          <h1 className="text-headline-lg text-primary tracking-tight">
            Sistem Denah Modular &amp; Penempatan Aset
          </h1>
          <p className="text-body-md text-on-surface-variant max-w-2xl">
            Klik ruangan pada denah atau gunakan pencarian sorot untuk mengetahui gedung, lantai, ruangan, dan posisi rak setiap produk riset FTC.
          </p>
        </div>

        <form onSubmit={handleSpotlight} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 min-w-[300px]">
          <div className="relative flex-1">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[20px]">my_location</span>
            <input
              value={spotlightQuery}
              onChange={(e) => setSpotlightQuery(e.target.value)}
              className="w-full pl-10 pr-3 py-2.5 rounded-lg bg-surface-container-low text-body-md text-on-surface placeholder:text-outline focus:outline-none focus:bg-white focus:ring-2 focus:ring-primary/30"
              placeholder="Lacak aset (mis. DINUS-Bot, FTC-IOT)..."
              type="text"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2.5 rounded-lg bg-primary hover:bg-primary-container text-on-primary text-title-sm inline-flex items-center justify-center gap-1.5 shadow-sm"
          >
            <span className="material-symbols-outlined text-[18px]">travel_explore</span>
            Sorot
          </button>
        </form>
      </div>

      {spotlightMsg && (
        <div className="px-4 py-2.5 rounded-xl bg-secondary-fixed/60 text-on-secondary-fixed text-body-sm font-medium flex items-center justify-between">
          <span>{spotlightMsg}</span>
          <button type="button" onClick={() => setSpotlightMsg(null)} className="text-secondary font-bold">Tutup</button>
        </div>
      )}

      {/* Building & Floor Switcher */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-space-md">
        <div className="xl:col-span-8 flex flex-wrap items-center gap-1.5 bg-surface-container-low p-1.5 rounded-xl">
          {buildings.map((b) => {
            const active = activeBuilding?.id === b.id;
            return (
              <button
                key={b.id}
                type="button"
                onClick={() => selectBuilding(b)}
                className={`flex-1 min-w-[180px] flex items-center gap-3 px-4 py-2.5 rounded-lg text-left transition-all ${
                  active ? 'bg-white text-primary shadow-sm' : 'text-on-surface-variant hover:bg-surface-container'
                }`}
              >
                <span className={`material-symbols-outlined text-[22px] ${active ? 'text-primary' : 'text-outline'}`}>
                  {b.icon || 'domain'}
                </span>
                <div className="min-w-0">
                  <div className="text-title-sm font-semibold truncate">{b.name}</div>
                  <div className="text-label-sm text-on-surface-variant truncate">{b.subtitle}</div>
                </div>
              </button>
            );
          })}
        </div>

        <div className="xl:col-span-4 flex items-center justify-between bg-surface-container-low p-1.5 rounded-xl">
          <span className="px-3 text-label-md text-on-surface-variant uppercase">Lantai:</span>
          <div className="flex items-center gap-1 flex-wrap justify-end">
            {(activeBuilding?.floors ?? []).map((f) => {
              const active = activeFloor?.id === f.id;
              return (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => selectFloor(f)}
                  className={`px-3.5 py-1.5 rounded-lg text-title-sm transition-colors ${
                    active ? 'bg-primary-container text-on-primary shadow-sm' : 'text-on-surface-variant hover:bg-surface-container'
                  }`}
                >
                  {f.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Floorplan Blueprint + Right Drawer */}
      {loading ? (
        <div className="h-96 rounded-xl bg-surface-container-low animate-pulse" />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-md items-start">
          <div className="lg:col-span-8 bg-surface-container-lowest p-space-md rounded-xl border border-outline-variant/25 shadow-sm flex flex-col gap-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-secondary-container" />
                <span className="text-title-sm text-primary font-bold">
                  Denah Aktif: {activeBuilding?.name ?? '-'} — {activeFloor?.label ?? '-'}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-label-sm">
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-surface-container-low">
                  <span className="w-2 h-2 rounded-full bg-[#10b981]" /> Prima
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-surface-container-low">
                  <span className="w-2 h-2 rounded-full bg-primary" /> Dipinjam
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-surface-container-low">
                  <span className="w-2 h-2 rounded-full bg-[#f59e0b]" /> Perawatan
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-surface-container-low">
                  <span className="w-2 h-2 rounded-full bg-error" /> Rusak
                </span>
              </div>
            </div>

            <div
              className="relative w-full bg-surface-container-low rounded-xl p-4 flex flex-col gap-3"
              style={{
                backgroundImage: 'radial-gradient(rgba(0,51,105,0.12) 1px, transparent 1px)',
                backgroundSize: '22px 22px',
              }}
            >
              {topRooms.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                  {topRooms.map(renderRoomCard)}
                </div>
              )}

              <div className="w-full py-2 px-4 bg-surface-container rounded-md flex items-center justify-between text-label-sm text-on-surface-variant">
                <span className="inline-flex items-center gap-1">
                  <span className="material-symbols-outlined text-[16px]">straight</span>
                  KORIDOR UTAMA {activeFloor?.label?.toUpperCase() ?? ''} • AKSES LOGISTIK PAMERAN
                </span>
                <span className="hidden sm:inline">{activeBuilding?.code} — Zona FTC</span>
              </div>

              {bottomRooms.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                  {bottomRooms.map(renderRoomCard)}
                </div>
              )}
            </div>

            {/* Real Floor Metrics Strip (replaces fake IoT sensors) */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-surface-container-high">
              <div>
                <span className="text-label-sm text-on-surface-variant block">Total Aset Lantai Ini</span>
                <span className="text-title-md text-primary font-bold">{activeFloor?.metrics.total ?? 0} Unit</span>
              </div>
              <div>
                <span className="text-label-sm text-on-surface-variant block">Siap Pameran (Prima)</span>
                <span className="text-title-md text-[#059669] font-bold">{activeFloor?.metrics.prima ?? 0} Unit</span>
              </div>
              <div>
                <span className="text-label-sm text-on-surface-variant block">Perawatan / Rusak</span>
                <span className="text-title-md text-secondary font-bold">{activeFloor?.metrics.attention ?? 0} Unit</span>
              </div>
              <div>
                <span className="text-label-sm text-on-surface-variant block">Sedang Dipinjam</span>
                <span className="text-title-md text-tertiary font-bold">{activeFloor?.metrics.dipinjam ?? 0} Unit</span>
              </div>
            </div>
          </div>

          {/* Right Column: Room Detail Drawer */}
          <aside className="lg:col-span-4 bg-surface-container-lowest rounded-xl border border-outline-variant/25 shadow-md p-space-lg flex flex-col gap-4">
            {activeRoom ? (
              <>
                <div className="flex items-start justify-between gap-2 pb-3 border-b border-surface-container">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded bg-primary text-on-primary text-label-sm font-bold">
                        {activeRoom.code}
                      </span>
                      <span className="text-label-sm text-on-surface-variant uppercase">
                        {activeBuilding?.name} — {activeFloor?.label}
                      </span>
                    </div>
                    <h2 className="text-headline-sm text-on-surface font-bold mt-1">{activeRoom.name}</h2>
                  </div>
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="p-2 rounded-lg bg-surface-container hover:bg-surface-container-high text-primary no-print"
                    title="Cetak Daftar Inventaris Ruang"
                  >
                    <span className="material-symbols-outlined text-[20px]">print</span>
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div className="bg-surface-container-low p-3 rounded-lg">
                    <span className="text-label-sm text-on-surface-variant block">Penanggung Jawab</span>
                    <span className="text-title-sm text-on-surface font-semibold block">{activeRoom.picName || '-'}</span>
                    {activeRoom.picExt && <span className="text-body-sm text-primary">Ext. {activeRoom.picExt}</span>}
                  </div>
                  <div className="bg-surface-container-low p-3 rounded-lg">
                    <span className="text-label-sm text-on-surface-variant block">Kapasitas &amp; Jam</span>
                    <span className="text-title-sm text-on-surface font-semibold block">{activeRoom.capacity} Orang</span>
                    <span className="text-body-sm text-on-surface-variant">{activeRoom.operatingHours}</span>
                  </div>
                </div>

                {activeRoom.notes && (
                  <p className="text-body-sm text-on-surface-variant bg-surface-container-low/60 p-3 rounded-lg">
                    {activeRoom.notes}
                  </p>
                )}

                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="text-title-sm text-on-surface font-bold">
                      Daftar Aset Terpasang ({activeRoom.assets.length} Unit)
                    </span>
                  </div>

                  {activeRoom.assets.length === 0 ? (
                    <p className="text-body-sm text-on-surface-variant py-4 text-center bg-surface-container-low rounded-lg">
                      Belum ada aset yang ditempatkan di ruangan ini.
                    </p>
                  ) : (
                    <div className="flex flex-col gap-2 max-h-[380px] overflow-y-auto pr-1">
                      {activeRoom.assets.map((a) => (
                        <Link
                          key={a.id}
                          href={`/aset/${a.id}`}
                          className={`p-3 rounded-lg flex items-center justify-between gap-2 transition-colors ${
                            highlightedAssetId === a.id
                              ? 'bg-secondary-fixed/60 ring-2 ring-secondary'
                              : 'bg-surface-container-low hover:bg-surface-container'
                          }`}
                        >
                          <div className="min-w-0">
                            <div className="text-title-sm text-on-surface font-semibold truncate">{a.name}</div>
                            <div className="text-body-sm text-on-surface-variant truncate">
                              Letak: <span className="text-primary font-semibold">{a.placementDetail || '-'}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <span className={`w-2 h-2 rounded-full ${dotColor(a.condition, a.availability)}`} />
                            <span className="text-mono-data text-on-surface-variant font-bold">{a.inventoryCode}</span>
                          </div>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 pt-2 no-print">
                  <Link
                    href="/peminjaman"
                    className="flex-1 py-2.5 rounded-lg bg-primary hover:bg-primary-container text-on-primary text-title-sm text-center inline-flex items-center justify-center gap-1.5"
                  >
                    <span className="material-symbols-outlined text-[18px]">edit_calendar</span>
                    Reservasi Alat
                  </Link>
                  <Link
                    href="/narahubung"
                    className="px-4 py-2.5 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface text-title-sm inline-flex items-center gap-1"
                  >
                    <span className="material-symbols-outlined text-secondary text-[18px]">report</span>
                    Lapor
                  </Link>
                </div>
              </>
            ) : (
              <p className="text-body-sm text-on-surface-variant">Pilih ruangan pada denah untuk melihat daftar aset.</p>
            )}
          </aside>
        </div>
      )}
    </div>
  );
}
