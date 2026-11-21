import Link from 'next/link';
import { notFound } from 'next/navigation';
import { and, asc, eq, inArray, isNull } from 'drizzle-orm';
import { db } from '@/db';
import { assets, buildings, contacts, floors, loanItems, loans, rooms, tutorials } from '@/db/schema';
import { isValidUuid } from '@/lib/uuid';
import { formatIndonesianDate } from '@/lib/format';
import { buildWhatsAppUrl } from '@/lib/loan-rules';
import { PublicHeader } from '@/components/PublicHeader';
import { PublicFooter } from '@/components/PublicFooter';
import { AvailabilityBadge, ConditionBadge } from '@/components/StatusBadge';
import { SafeStepsRenderer } from '@/components/SafeStepsRenderer';

export const dynamic = 'force-dynamic';

export default async function AssetDetailPage({
  params,
}: {
  params: Promise<{ uuid: string }>;
}) {
  const { uuid } = await params;
  if (!isValidUuid(uuid)) notFound();

  const rows = await db
    .select({
      asset: assets,
      room: rooms,
      floor: floors,
      building: buildings,
      contact: contacts,
    })
    .from(assets)
    .leftJoin(rooms, eq(assets.roomId, rooms.id))
    .leftJoin(floors, eq(rooms.floorId, floors.id))
    .leftJoin(buildings, eq(floors.buildingId, buildings.id))
    .leftJoin(contacts, eq(assets.contactId, contacts.id))
    .where(and(eq(assets.id, uuid), isNull(assets.archivedAt)))
    .limit(1);

  if (!rows[0]) notFound();

  const { asset, room, floor, building, contact } = rows[0];
  const [linkedTutorials, activeBookings] = await Promise.all([
    db.select().from(tutorials).where(eq(tutorials.assetId, uuid)).orderBy(asc(tutorials.docCode)),
    db
      .select({
        startDate: loans.startDate,
        endDate: loans.endDate,
        status: loans.status,
        purposeTitle: loans.purposeTitle,
      })
      .from(loanItems)
      .innerJoin(loans, eq(loanItems.loanId, loans.id))
      .where(and(eq(loanItems.assetId, uuid), inArray(loans.status, ['approved', 'borrowed'])))
      .orderBy(asc(loans.startDate)),
  ]);

  const canBorrow = asset.condition !== 'rusak' && asset.availability !== 'tidak_tersedia';
  const roomFullLabel = room
    ? `${building?.name ?? ''} ${floor?.label ?? ''} • ${room.code} (${room.name})`.trim()
    : 'Ruangan belum ditentukan';

  return (
    <>
      <PublicHeader />
      <main className="w-full pt-36 pb-12 flex-1">
        <div className="max-w-[1440px] mx-auto px-gutter flex flex-col gap-space-lg">
          <div className="flex items-center gap-2 text-body-sm text-on-surface-variant">
            <Link href="/" className="hover:text-primary">Katalog Aset</Link>
            <span className="material-symbols-outlined text-[14px]">chevron_right</span>
            <span className="text-primary font-semibold">{asset.inventoryCode}</span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-lg items-start">
            {/* Main Dossier */}
            <div className="lg:col-span-8 flex flex-col gap-space-lg">
              <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/25 shadow-sm overflow-hidden">
                <div className="grid grid-cols-1 md:grid-cols-12">
                  <div className="md:col-span-5 bg-surface-container aspect-[16/10] md:aspect-auto">
                    <img
                      src={asset.photoUrl || '/images/placeholders/asset-default.svg'}
                      alt={asset.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="md:col-span-7 p-space-lg flex flex-col justify-between gap-4">
                    <div>
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <span className="px-2.5 py-0.5 rounded bg-primary text-on-primary text-mono-data font-bold tabular-nums-code">
                          {asset.inventoryCode}
                        </span>
                        <ConditionBadge condition={asset.condition} />
                        <AvailabilityBadge availability={asset.availability} />
                      </div>
                      <h1 className="text-headline-md text-primary font-bold">{asset.name}</h1>
                      <p className="text-body-md text-on-surface-variant mt-2">{asset.description}</p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-surface-container-low p-3.5 rounded-xl text-body-sm">
                      <div>
                        <span className="text-label-sm text-outline uppercase block">Tanggal Jadi Aset</span>
                        <span className="text-title-sm text-on-surface font-bold tabular-nums-code">
                          {formatIndonesianDate(asset.completionDate)}
                        </span>
                      </div>
                      <div>
                        <span className="text-label-sm text-outline uppercase block">Kategori</span>
                        <span className="text-title-sm text-on-surface font-semibold">{asset.category}</span>
                      </div>
                      <div>
                        <span className="text-label-sm text-outline uppercase block">Tim Peneliti</span>
                        <span className="text-body-md text-on-surface">{asset.researcherTeam || '-'}</span>
                      </div>
                      <div>
                        <span className="text-label-sm text-outline uppercase block">Skema Riset</span>
                        <span className="text-body-md text-on-surface">{asset.researchScheme || '-'}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Peletakan & Lokasi */}
              <section className="bg-surface-container-lowest rounded-xl border border-outline-variant/25 shadow-sm p-space-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="w-11 h-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-[24px]">location_on</span>
                  </div>
                  <div>
                    <span className="text-label-sm text-secondary uppercase font-bold">Lokasi Peletakan Aset</span>
                    <h2 className="text-title-md text-on-surface font-bold">{roomFullLabel}</h2>
                    <p className="text-body-md text-on-surface-variant mt-0.5">
                      Posisi spesifik: <strong className="text-primary">{asset.placementDetail || 'Belum diisi'}</strong>
                    </p>
                  </div>
                </div>
                {room && (
                  <Link
                    href={`/denah?asset=${asset.id}`}
                    className="px-4 py-2.5 rounded-lg bg-surface-container hover:bg-surface-container-high text-primary text-title-sm inline-flex items-center gap-1.5 shrink-0"
                  >
                    <span className="material-symbols-outlined text-[18px]">map</span>
                    Sorot di Denah Lab
                  </Link>
                )}
              </section>

              {/* Cara Penggunaan & Panduan */}
              <section className="bg-surface-container-lowest rounded-xl border border-outline-variant/25 shadow-sm p-space-lg flex flex-col gap-4">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-[24px]">menu_book</span>
                  <h2 className="text-headline-sm text-primary font-bold">Cara Penggunaan &amp; Panduan Demo</h2>
                </div>

                {asset.usageSummary ? (
                  <div className="p-4 rounded-xl bg-surface-container-low">
                    <div className="text-label-sm text-secondary uppercase font-bold mb-2">Ringkasan Cepat PIC Pameran</div>
                    <SafeStepsRenderer content={asset.usageSummary} />
                  </div>
                ) : (
                  <p className="text-body-md text-on-surface-variant">
                    Ringkasan cara penggunaan belum diisi. Hubungi narahubung produk sebelum mengoperasikan.
                  </p>
                )}

                {linkedTutorials.length > 0 && (
                  <div className="flex flex-col gap-3 pt-2">
                    <h3 className="text-title-sm text-on-surface font-bold">Modul SOP &amp; Video Terkait</h3>
                    {linkedTutorials.map((tut) => (
                      <div key={tut.id} className="p-4 rounded-xl border border-outline-variant/40 bg-white flex flex-col gap-2">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="text-mono-data text-outline font-semibold">{tut.docCode}</span>
                          <span className="px-2 py-0.5 rounded bg-surface-container text-primary text-label-sm uppercase">
                            {tut.format.replace('_', ' ')} • v{tut.version}
                          </span>
                        </div>
                        <h4 className="text-title-md text-on-surface font-bold">{tut.title}</h4>
                        <p className="text-body-sm text-on-surface-variant">{tut.summary}</p>
                        {tut.stepsMarkdown && (
                          <div className="pt-2 border-t border-surface-container">
                            <SafeStepsRenderer content={tut.stepsMarkdown} />
                          </div>
                        )}
                        <div className="flex flex-wrap gap-2 pt-2">
                          {tut.fileUrl && (
                            <a
                              href={tut.fileUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="px-3.5 py-1.5 rounded-lg bg-primary text-on-primary text-title-sm inline-flex items-center gap-1"
                            >
                              <span className="material-symbols-outlined text-[18px]">download</span>
                              Unduh Berkas SOP
                            </a>
                          )}
                          {tut.videoUrl && (
                            <a
                              href={tut.videoUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="px-3.5 py-1.5 rounded-lg bg-secondary text-on-secondary text-title-sm inline-flex items-center gap-1"
                            >
                              <span className="material-symbols-outlined text-[18px]">play_circle</span>
                              Tonton Video Demo
                            </a>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              {/* Spesifikasi */}
              {asset.specifications.length > 0 && (
                <section className="bg-surface-container-lowest rounded-xl border border-outline-variant/25 shadow-sm p-space-lg">
                  <h2 className="text-headline-sm text-primary font-bold mb-3">Spesifikasi Teknis</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {asset.specifications.map((spec, idx) => (
                      <div key={idx} className="p-3 rounded-lg bg-surface-container-low flex justify-between gap-2 text-body-sm">
                        <span className="text-outline">{spec.label}</span>
                        <span className="font-semibold text-on-surface text-right">{spec.value}</span>
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </div>

            {/* Right Column: Contact, Actions, QR, Bookings */}
            <aside className="lg:col-span-4 flex flex-col gap-space-lg">
              {/* CTA Card */}
              <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/25 shadow-sm p-space-lg flex flex-col gap-3">
                <h2 className="text-title-md text-primary font-bold">Aksi Cepat PIC Pameran</h2>
                {canBorrow ? (
                  <Link
                    href={`/peminjaman?asset=${asset.id}`}
                    className="w-full py-2.5 px-4 rounded-lg bg-secondary-container hover:bg-secondary-fixed-dim text-on-secondary-fixed text-title-sm font-bold text-center inline-flex items-center justify-center gap-1.5 shadow-sm"
                  >
                    <span className="material-symbols-outlined text-[18px]">touch_app</span>
                    Ajukan Pinjam Aset Ini
                  </Link>
                ) : (
                  <div className="p-3 rounded-lg bg-error-container/50 text-on-error-container text-body-sm">
                    Aset sedang tidak tersedia untuk peminjaman saat ini.
                  </div>
                )}
                <Link
                  href={`/narahubung?asset=${encodeURIComponent(asset.inventoryCode)}`}
                  className="w-full py-2.5 px-4 rounded-lg bg-surface-container-low hover:bg-surface-container text-on-surface text-title-sm text-center inline-flex items-center justify-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-[18px] text-error">report</span>
                  Laporkan Kendala / Kerusakan
                </Link>
              </div>

              {/* Narahubung Card */}
              <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/25 shadow-sm p-space-lg flex flex-col gap-3">
                <span className="text-label-sm text-secondary uppercase font-bold">Narahubung Produk</span>
                {contact ? (
                  <>
                    <div className="flex items-center gap-3">
                      <img
                        src={contact.photoUrl || '/images/placeholders/avatar-default.svg'}
                        alt={contact.name}
                        className="w-14 h-14 rounded-xl object-cover bg-surface-container"
                      />
                      <div className="min-w-0">
                        <div className="text-title-md text-on-surface font-bold truncate">{contact.name}</div>
                        <div className="text-body-sm text-primary font-medium">{contact.roleTitle}</div>
                        <div className="text-body-sm text-on-surface-variant">{contact.roomLabel} • {contact.dutyHours}</div>
                      </div>
                    </div>
                    <div className="flex gap-2 pt-1">
                      <a
                        href={buildWhatsAppUrl(
                          contact.whatsapp,
                          `Halo ${contact.name}, saya PIC Pameran ingin menanyakan aset ${asset.inventoryCode} (${asset.name}).`,
                        )}
                        target="_blank"
                        rel="noreferrer"
                        className="flex-1 py-2 px-3 rounded-lg bg-[#059669] hover:bg-[#047857] text-white text-title-sm inline-flex items-center justify-center gap-1.5"
                      >
                        <span className="material-symbols-outlined text-[18px]">chat</span>
                        WhatsApp
                      </a>
                      <a
                        href={`mailto:${contact.email}`}
                        className="flex-1 py-2 px-3 rounded-lg bg-surface-container hover:bg-surface-container-high text-primary text-title-sm inline-flex items-center justify-center gap-1.5"
                      >
                        <span className="material-symbols-outlined text-[18px]">mail</span>
                        Email
                      </a>
                    </div>
                  </>
                ) : (
                  <p className="text-body-sm text-on-surface-variant">Narahubung belum ditetapkan untuk aset ini.</p>
                )}
              </div>

              {/* Active Bookings */}
              {activeBookings.length > 0 && (
                <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/25 shadow-sm p-space-lg flex flex-col gap-2">
                  <h3 className="text-title-sm text-primary font-bold">Jadwal Terpesan / Dipinjam</h3>
                  {activeBookings.map((b, idx) => (
                    <div key={idx} className="p-2.5 rounded-lg bg-surface-container-low text-body-sm">
                      <div className="font-semibold text-on-surface">{b.purposeTitle}</div>
                      <div className="text-on-surface-variant tabular-nums-code">
                        {formatIndonesianDate(b.startDate)} – {formatIndonesianDate(b.endDate)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </aside>
          </div>
        </div>
      </main>
      <PublicFooter />
    </>
  );
}
