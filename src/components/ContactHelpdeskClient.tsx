'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ContactStatusBadge, UrgencyBadge } from '@/components/StatusBadge';
import { FileDropzone } from '@/components/FileDropzone';
import { buildWhatsAppUrl } from '@/lib/loan-rules';
import { formatIndonesianDate } from '@/lib/format';

type ContactItem = {
  id: string;
  code: string;
  name: string;
  roleTitle: string;
  specialization: string;
  roomLabel: string;
  dutyHours: string;
  availabilityStatus: string;
  whatsapp: string;
  email: string;
  photoUrl: string | null;
  isEmergency: boolean;
  handledAssetCount: number;
};

type LookupTicket = {
  ticketCode: string;
  assetCodeInput: string;
  category: string;
  urgency: string;
  status: string;
  resolutionNotes: string | null;
  createdAt: string;
};

const ISSUE_STATUS_LABEL: Record<string, string> = {
  open: 'Menunggu Penanganan',
  in_progress: 'Sedang Ditangani Teknisi',
  resolved: 'Selesai Diperbaiki',
};

export function ContactHelpdeskClient() {
  const searchParams = useSearchParams();
  const initialAssetCode = searchParams.get('asset') ?? '';

  const [contacts, setContacts] = useState<ContactItem[]>([]);
  const [openIssueCount, setOpenIssueCount] = useState(0);
  const [assetCodes, setAssetCodes] = useState<Array<{ inventoryCode: string; name: string }>>([]);

  // Form states
  const [category, setCategory] = useState<'kerusakan' | 'konsultasi_demo' | 'akses_sistem' | 'perawatan'>('kerusakan');
  const [assetCodeInput, setAssetCodeInput] = useState(initialAssetCode);
  const [assignedContactId, setAssignedContactId] = useState('');
  const [reporterName, setReporterName] = useState('');
  const [reporterContact, setReporterContact] = useState('');
  const [description, setDescription] = useState('');
  const [urgency, setUrgency] = useState<'rendah' | 'sedang' | 'darurat'>('sedang');
  const [photo, setPhoto] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [createdTicketCode, setCreatedTicketCode] = useState<string | null>(null);

  // Ticket status lookup
  const [lookupCode, setLookupCode] = useState('');
  const [lookupResult, setLookupResult] = useState<LookupTicket | null>(null);
  const [lookupSearched, setLookupSearched] = useState(false);

  useEffect(() => {
    setAssetCodeInput(initialAssetCode);
  }, [initialAssetCode]);

  useEffect(() => {
    fetch('/api/contacts')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        setContacts(d?.items ?? []);
        setOpenIssueCount(d?.openIssueCount ?? 0);
      })
      .catch(() => {});

    fetch('/api/assets?limit=100')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        setAssetCodes((d?.items ?? []).map((a: { inventoryCode: string; name: string }) => ({
          inventoryCode: a.inventoryCode,
          name: a.name,
        })));
      })
      .catch(() => {});
  }, []);

  const emergencyContact = contacts.find((c) => c.isEmergency) ?? contacts[0];

  function selectPicForTicket(contactId: string) {
    setAssignedContactId(contactId);
    document.getElementById('form-tiket')?.scrollIntoView({ behavior: 'smooth' });
  }

  async function submitTicket(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg(null);
    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.set('category', category);
      fd.set('assetCodeInput', assetCodeInput);
      if (assignedContactId) fd.set('assignedContactId', assignedContactId);
      fd.set('reporterName', reporterName);
      fd.set('reporterContact', reporterContact);
      fd.set('description', description);
      fd.set('urgency', urgency);
      if (photo) fd.set('photo', photo);

      const res = await fetch('/api/issues', { method: 'POST', body: fd });
      const body = await res.json();
      if (!res.ok) {
        setErrorMsg(body.error || 'Gagal mengirim laporan kendala.');
        return;
      }

      setCreatedTicketCode(body.ticketCode);
      setAssetCodeInput('');
      setReporterName('');
      setReporterContact('');
      setDescription('');
      setPhoto(null);
      setOpenIssueCount((n) => n + 1);
    } catch {
      setErrorMsg('Kesalahan jaringan saat mengirim laporan.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleLookup(e: React.FormEvent) {
    e.preventDefault();
    if (!lookupCode.trim()) return;
    setLookupSearched(true);
    const res = await fetch(`/api/issues/lookup?code=${encodeURIComponent(lookupCode.trim())}`);
    if (res.ok) {
      const d = await res.json();
      setLookupResult(d.ticket ?? null);
    }
  }

  return (
    <div className="w-full max-w-[1440px] mx-auto px-gutter flex flex-col gap-space-xl">
      {/* Header Strip */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div className="max-w-3xl flex flex-col gap-1">
          <span className="px-2.5 py-0.5 rounded-full bg-primary/10 text-primary text-label-sm uppercase self-start">
            Layanan Teknis &amp; Narahubung FTC
          </span>
          <h1 className="text-headline-lg md:text-headline-xl text-primary font-bold tracking-tight">
            Direktori Narahubung &amp; Pusat Bantuan Aset Penelitian
          </h1>
          <p className="text-body-md text-on-surface-variant">
            Hubungi narahubung setiap produk penelitian FTC untuk konsultasi pameran, panduan teknis, atau pelaporan kerusakan aset.
          </p>
        </div>

        <div className="flex items-center gap-3 bg-surface-container-lowest p-3 rounded-xl border border-outline-variant/25 shadow-sm self-start lg:self-auto">
          <div className="flex items-center gap-2.5 px-3 py-1.5 bg-surface-container-low rounded-lg">
            <span className="material-symbols-outlined text-primary text-[22px]">engineering</span>
            <div>
              <div className="text-label-sm text-on-surface-variant uppercase">Narahubung Aktif</div>
              <div className="text-title-sm font-bold">{contacts.length} Personel</div>
            </div>
          </div>
          <div className="flex items-center gap-2.5 px-3 py-1.5 bg-surface-container-low rounded-lg">
            <span className="material-symbols-outlined text-secondary text-[22px]">confirmation_number</span>
            <div>
              <div className="text-label-sm text-on-surface-variant uppercase">Tiket Kendala Aktif</div>
              <div className="text-title-sm font-bold">{openIssueCount} Tiket</div>
            </div>
          </div>
        </div>
      </div>

      {/* Emergency & Helpdesk Bento */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-md">
        <div className="lg:col-span-8 bg-error/5 rounded-xl border border-error/15 p-space-lg flex flex-col justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-error text-on-error flex items-center justify-center shrink-0 shadow-sm">
              <span className="material-symbols-outlined text-[26px]">emergency_home</span>
            </div>
            <div>
              <span className="text-label-sm uppercase font-bold text-error">Respon Cepat Pameran &amp; Lab</span>
              <h2 className="text-headline-sm text-on-surface font-bold">Kontak Siaga Kendala Teknis Produk FTC</h2>
              <p className="text-body-sm text-on-surface-variant mt-0.5">
                Gunakan kontak siaga apabila produk penelitian mengalami korsleting, error mendadak saat demo pameran, atau kendala baterai.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-white/90 rounded-xl p-4 border border-outline-variant/25">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-surface-container text-primary flex items-center justify-center">
                <span className="material-symbols-outlined text-[20px]">phone_in_talk</span>
              </div>
              <div>
                <div className="text-label-sm text-on-surface-variant">Sekretariat FTC UDINUS</div>
                <div className="text-title-sm font-bold">(024) 3517261 <span className="text-error">ext. 3201</span></div>
              </div>
            </div>
            {emergencyContact && (
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-label-sm text-on-surface-variant">WhatsApp Siaga FTC</div>
                  <div className="text-title-sm font-bold truncate">{emergencyContact.name}</div>
                </div>
                <a
                  href={buildWhatsAppUrl(emergencyContact.whatsapp, 'Halo, saya PIC Pameran FTC butuh bantuan teknis segera.')}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3.5 py-2 rounded-lg bg-secondary text-on-secondary text-label-md inline-flex items-center gap-1 shrink-0"
                >
                  Chat WA <span className="material-symbols-outlined text-[16px]">arrow_outward</span>
                </a>
              </div>
            )}
          </div>
        </div>

        <div className="lg:col-span-4 bg-primary text-on-primary rounded-xl p-space-lg flex flex-col justify-between gap-4 shadow-sm">
          <div>
            <span className="px-2 py-0.5 rounded-full bg-secondary-container text-on-secondary-fixed text-label-sm uppercase">
              Digital Helpdesk FTC
            </span>
            <h3 className="text-headline-sm font-bold mt-2">Pelaporan &amp; Cek Status Tiket</h3>
            <p className="text-body-sm text-on-primary/80 mt-1">
              Laporan kendala langsung masuk ke CMS Admin FTC dan dapat dilacak status perbaikannya lewat kode tiket.
            </p>
          </div>
          <a
            href="#form-tiket"
            className="w-full py-2.5 rounded-lg bg-white text-primary text-title-sm font-bold text-center hover:bg-surface-container-low"
          >
            Buat Tiket Laporan Kendala
          </a>
        </div>
      </div>

      {/* Contact Directory Grid */}
      <section className="flex flex-col gap-4">
        <div>
          <span className="text-label-sm text-secondary uppercase font-bold">Narahubung Produk &amp; Teknisi Lab</span>
          <h2 className="text-headline-md text-primary font-bold">Personel Pengelola Aset Penelitian FTC</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-space-md">
          {contacts.map((c) => (
            <div
              key={c.id}
              className="bg-surface-container-lowest rounded-xl border border-outline-variant/25 p-space-md shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between gap-4"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-3">
                  <ContactStatusBadge status={c.availabilityStatus} />
                  <span className="text-mono-data text-outline text-[12px]">{c.code}</span>
                </div>
                <div className="flex items-center gap-3 mb-3">
                  <img
                    src={c.photoUrl || '/images/placeholders/avatar-default.svg'}
                    alt={c.name}
                    className="w-14 h-14 rounded-xl object-cover bg-surface-container shrink-0"
                  />
                  <div className="min-w-0">
                    <h3 className="text-title-md text-on-surface font-bold truncate">{c.name}</h3>
                    <p className="text-body-sm text-primary font-medium truncate">{c.roleTitle}</p>
                    <p className="text-label-sm text-on-surface-variant truncate">{c.specialization}</p>
                  </div>
                </div>
                <div className="space-y-1.5 bg-surface-container-low p-3 rounded-lg text-body-sm">
                  <div className="flex justify-between gap-2">
                    <span className="text-on-surface-variant">Ruang:</span>
                    <span className="font-semibold text-right">{c.roomLabel || '-'}</span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="text-on-surface-variant">Jam Tugas:</span>
                    <span className="font-medium text-right">{c.dutyHours}</span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="text-on-surface-variant">Aset Dipegang:</span>
                    <span className="font-bold text-primary">{c.handledAssetCount} Produk</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <a
                  href={buildWhatsAppUrl(c.whatsapp, `Halo ${c.name}, saya ingin menanyakan aset produk penelitian FTC.`)}
                  target="_blank"
                  rel="noreferrer"
                  className="flex-1 py-2 px-2.5 rounded-lg bg-[#059669] hover:bg-[#047857] text-white text-title-sm inline-flex items-center justify-center gap-1"
                >
                  <span className="material-symbols-outlined text-[17px]">chat</span>
                  WA
                </a>
                <a
                  href={`mailto:${c.email}`}
                  className="flex-1 py-2 px-2.5 rounded-lg bg-surface-container hover:bg-surface-container-high text-primary text-title-sm inline-flex items-center justify-center gap-1"
                >
                  <span className="material-symbols-outlined text-[17px]">mail</span>
                  Email
                </a>
                <button
                  type="button"
                  onClick={() => selectPicForTicket(c.id)}
                  className="p-2 rounded-lg bg-primary-container text-on-primary hover:bg-primary"
                  title="Pilih sebagai PIC Tiket Kendala"
                >
                  <span className="material-symbols-outlined text-[18px]">assignment_turned_in</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Issue Form + Info Sidebar */}
      <div id="form-tiket" className="grid grid-cols-1 lg:grid-cols-12 gap-space-lg items-start">
        <div className="lg:col-span-7 bg-surface-container-lowest rounded-xl border border-outline-variant/25 p-space-lg shadow-sm">
          <div className="flex items-center gap-3 pb-4 border-b border-surface-container-high mb-4">
            <div className="w-10 h-10 rounded-lg bg-primary-container text-on-primary flex items-center justify-center">
              <span className="material-symbols-outlined text-[22px]">confirmation_number</span>
            </div>
            <div>
              <h3 className="text-headline-sm text-primary font-bold">Lapor Kendala &amp; Kerusakan Aset</h3>
              <p className="text-body-sm text-on-surface-variant">
                Laporan langsung diteruskan ke Admin FTC untuk tindak lanjut perbaikan.
              </p>
            </div>
          </div>

          {errorMsg && (
            <div className="mb-4 p-3 rounded-lg bg-error-container text-on-error-container text-body-sm font-medium">
              {errorMsg}
            </div>
          )}

          {createdTicketCode && (
            <div className="mb-4 p-4 rounded-xl bg-[#ecfdf5] border border-[#a7f3d0] text-[#065f46] text-body-sm">
              <strong>Laporan berhasil dicatat!</strong> Kode tiket Anda:{' '}
              <span className="font-mono font-bold text-primary bg-white px-2 py-0.5 rounded">{createdTicketCode}</span>
            </div>
          )}

          <form onSubmit={submitTicket} className="space-y-4">
            <div>
              <label className="text-title-sm font-semibold block mb-1.5">Jenis Kendala *</label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  ['kerusakan', 'Kerusakan Alat'],
                  ['konsultasi_demo', 'Konsultasi Demo'],
                  ['akses_sistem', 'Akses Software/AI'],
                  ['perawatan', 'Usulan Perawatan'],
                ].map(([val, lbl]) => (
                  <label
                    key={val}
                    className={`p-2.5 rounded-lg cursor-pointer text-body-sm font-medium flex items-center gap-2 ${
                      category === val ? 'bg-primary-container text-on-primary' : 'bg-surface-container-low hover:bg-surface-container'
                    }`}
                  >
                    <input
                      type="radio"
                      name="cat"
                      checked={category === val}
                      onChange={() => setCategory(val as typeof category)}
                      className="sr-only"
                    />
                    {lbl}
                  </label>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-title-sm font-semibold block mb-1">Kode Inventaris Aset *</label>
                <input
                  required
                  list="ftc-asset-codes"
                  value={assetCodeInput}
                  onChange={(e) => setAssetCodeInput(e.target.value)}
                  placeholder="Contoh: FTC-IOT-001"
                  className="w-full bg-surface-container-low px-3 py-2 rounded-lg text-mono-data uppercase border border-outline-variant/30"
                />
                <datalist id="ftc-asset-codes">
                  {assetCodes.map((a) => (
                    <option key={a.inventoryCode} value={a.inventoryCode}>
                      {a.name}
                    </option>
                  ))}
                </datalist>
              </div>
              <div>
                <label className="text-title-sm font-semibold block mb-1">Narahubung / PIC Dituju</label>
                <select
                  value={assignedContactId}
                  onChange={(e) => setAssignedContactId(e.target.value)}
                  className="w-full bg-surface-container-low px-3 py-2 rounded-lg text-body-sm border border-outline-variant/30"
                >
                  <option value="">Otomatis (Sesuai PIC Aset)</option>
                  {contacts.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.code})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-title-sm font-semibold block mb-1">Nama Pelapor *</label>
                <input
                  required
                  value={reporterName}
                  onChange={(e) => setReporterName(e.target.value)}
                  placeholder="Nama Anda (PIC Pameran / Peneliti)"
                  className="w-full bg-surface-container-low px-3 py-2 rounded-lg text-body-sm border border-outline-variant/30"
                />
              </div>
              <div>
                <label className="text-title-sm font-semibold block mb-1">Kontak WA / Email Pelapor *</label>
                <input
                  required
                  value={reporterContact}
                  onChange={(e) => setReporterContact(e.target.value)}
                  placeholder="0812xxxxxxxx (khusus untuk Admin)"
                  className="w-full bg-surface-container-low px-3 py-2 rounded-lg text-body-sm border border-outline-variant/30"
                />
              </div>
            </div>

            <div>
              <label className="text-title-sm font-semibold block mb-1">Deskripsi Gejala / Kendala *</label>
              <textarea
                required
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Jelaskan gejala error, kerusakan fisik, atau komponen yang bermasalah..."
                className="w-full bg-surface-container-low p-3 rounded-lg text-body-sm border border-outline-variant/30"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-title-sm font-semibold block mb-1">Tingkat Urgensi</label>
                <div className="flex gap-2">
                  {(['rendah', 'sedang', 'darurat'] as const).map((u) => (
                    <button
                      key={u}
                      type="button"
                      onClick={() => setUrgency(u)}
                      className={`flex-1 py-2 rounded-lg text-label-md capitalize ${
                        urgency === u
                          ? u === 'darurat'
                            ? 'bg-error text-white'
                            : u === 'sedang'
                              ? 'bg-secondary-container text-on-secondary-fixed'
                              : 'bg-[#059669] text-white'
                          : 'bg-surface-container-low text-on-surface-variant'
                      }`}
                    >
                      {u}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-title-sm font-semibold block mb-1">Foto Kendala (Opsional)</label>
                <FileDropzone
                  compact
                  accept="image/jpeg,image/png,image/webp"
                  uploading={submitting && Boolean(photo)}
                  fileName={photo?.name ?? null}
                  idleLabel="Seret foto atau klik (JPG/PNG maks 5 MB)"
                  hint="JPG, PNG, atau WEBP maks 5 MB"
                  onFileSelect={(file) => setPhoto(file)}
                  onClear={() => setPhoto(null)}
                />
              </div>
            </div>

            <div className="flex justify-end pt-1">
              <button
                type="submit"
                disabled={submitting}
                className="w-full sm:w-auto px-6 py-2.5 rounded-lg bg-primary hover:bg-primary-container disabled:opacity-50 text-on-primary text-title-sm shadow-sm inline-flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined text-[18px]">send</span>
                {submitting ? 'Mengirim...' : 'Kirim Tiket Kendala'}
              </button>
            </div>
          </form>
        </div>

        {/* Right Column: Ticket Lookup + Office Info */}
        <div className="lg:col-span-5 flex flex-col gap-space-md">
          <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/25 p-space-md shadow-sm flex flex-col gap-3">
            <h4 className="text-title-md text-primary font-bold">Cek Status Tiket Kendala</h4>
            <form onSubmit={handleLookup} className="flex gap-2">
              <input
                value={lookupCode}
                onChange={(e) => setLookupCode(e.target.value)}
                placeholder="Masukkan kode (FTC-INC-2026-0001)"
                className="flex-1 bg-surface-container-low px-3 py-2 rounded-lg text-mono-data uppercase border border-outline-variant/30"
              />
              <button type="submit" className="px-4 py-2 rounded-lg bg-primary text-on-primary text-title-sm">
                Cek
              </button>
            </form>
            {lookupSearched && (
              lookupResult ? (
                <div className="p-3.5 rounded-lg bg-surface-container-low flex flex-col gap-1.5 text-body-sm">
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-primary">{lookupResult.ticketCode}</span>
                    <UrgencyBadge urgency={lookupResult.urgency} />
                  </div>
                  <div>Aset: <strong>{lookupResult.assetCodeInput}</strong></div>
                  <div>Status: <strong className="text-primary">{ISSUE_STATUS_LABEL[lookupResult.status] ?? lookupResult.status}</strong></div>
                  <div>Dilaporkan: {formatIndonesianDate(lookupResult.createdAt)}</div>
                  {lookupResult.resolutionNotes && (
                    <div className="pt-1 border-t border-surface-container-high text-on-surface">
                      Catatan Teknisi: {lookupResult.resolutionNotes}
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-body-sm text-error">Kode tiket kendala tidak ditemukan.</p>
              )
            )}
          </div>

          <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/25 p-space-md shadow-sm flex flex-col gap-3">
            <h4 className="text-title-md text-primary font-bold">Jam Layanan Sekretariat &amp; Lab FTC</h4>
            <div className="space-y-1.5 text-body-sm">
              <div className="flex justify-between p-2 rounded bg-surface-container-low">
                <span>Senin – Kamis</span>
                <strong className="tabular-nums-code">08:00 – 16:00 WIB</strong>
              </div>
              <div className="flex justify-between p-2 rounded bg-surface-container-low">
                <span>Jumat</span>
                <strong className="tabular-nums-code">08:00 – 15:30 WIB</strong>
              </div>
              <div className="flex justify-between p-2 rounded bg-surface-container-low">
                <span>Sabtu &amp; Minggu</span>
                <span className="text-label-sm uppercase text-secondary">Pameran / Izin Khusus</span>
              </div>
            </div>
          </div>

          <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/25 p-space-md shadow-sm flex flex-col gap-3">
            <h4 className="text-title-md text-primary font-bold">Lokasi Sekretariat Aset FTC UDINUS</h4>
            <div className="p-3 rounded-lg bg-surface-container-low text-body-sm">
              <div className="font-bold text-primary">Gedung H, Lantai 2–3 — Fakultas Teknologi Cerdas</div>
              <p className="text-on-surface-variant mt-1">
                Jl. Imam Bonjol No. 207, Pendrikan Kidul, Semarang Tengah, Kota Semarang, Jawa Tengah 50131.
              </p>
            </div>
            <div className="flex items-center justify-between text-body-sm">
              <a
                href="https://maps.google.com/?q=Universitas+Dian+Nuswantoro+Semarang"
                target="_blank"
                rel="noreferrer"
                className="text-secondary font-bold hover:underline inline-flex items-center gap-1"
              >
                Buka di Google Maps <span className="material-symbols-outlined text-[15px]">open_in_new</span>
              </a>
              <Link href="/tutorial" className="text-primary font-semibold hover:underline">
                Buka Modul Tutorial →
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
