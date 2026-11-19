'use client';

import { useCallback, useEffect, useState } from 'react';

type TutorialRow = {
  id: string;
  docCode: string;
  assetId: string | null;
  title: string;
  category: string;
  format: string;
  summary: string;
  stepsMarkdown: string | null;
  fileUrl: string | null;
  videoUrl: string | null;
  version: string;
  instructorName: string | null;
};

type FaqRow = { id: string; question: string; answer: string; sortOrder: number };
type AssetOption = { id: string; inventoryCode: string; name: string };

const EMPTY_TUT = {
  docCode: '',
  assetId: '',
  title: '',
  category: 'pengoperasian',
  format: 'panduan_teks',
  summary: '',
  stepsMarkdown: '',
  fileUrl: '',
  videoUrl: '',
  version: '1.0',
  instructorName: '',
};

export function TutorialsManager() {
  const [tab, setTab] = useState<'tutorials' | 'faqs'>('tutorials');
  const [tutorials, setTutorials] = useState<TutorialRow[]>([]);
  const [faqs, setFaqs] = useState<FaqRow[]>([]);
  const [assets, setAssets] = useState<AssetOption[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_TUT);
  const [faqQ, setFaqQ] = useState('');
  const [faqA, setFaqA] = useState('');
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [tRes, fRes, aRes] = await Promise.all([
      fetch('/api/admin/tutorials'),
      fetch('/api/admin/faqs'),
      fetch('/api/admin/assets'),
    ]);
    if (tRes.ok) setTutorials((await tRes.json()).items ?? []);
    if (fRes.ok) setFaqs((await fRes.json()).items ?? []);
    if (aRes.ok) setAssets((await aRes.json()).items ?? []);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function uploadPdf(file: File) {
    const fd = new FormData();
    fd.set('file', file);
    fd.set('kind', 'any');
    const res = await fetch('/api/admin/uploads', { method: 'POST', body: fd });
    const body = await res.json();
    if (!res.ok) return setMsg(body.error || 'Gagal mengunggah berkas.');
    setForm((p) => ({ ...p, fileUrl: body.url }));
    setMsg('Berkas panduan berhasil diunggah.');
  }

  async function saveTutorial(e: React.FormEvent) {
    e.preventDefault();
    const url = editingId ? `/api/admin/tutorials/${editingId}` : '/api/admin/tutorials';
    const method = editingId ? 'PATCH' : 'POST';
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, assetId: form.assetId || null, fileUrl: form.fileUrl || null, videoUrl: form.videoUrl || null }),
    });
    const body = await res.json();
    if (!res.ok) return setMsg(body.error || 'Gagal menyimpan tutorial.');
    setMsg(editingId ? 'Tutorial diperbarui.' : 'Tutorial baru ditambahkan.');
    setEditingId(null);
    setForm(EMPTY_TUT);
    load();
  }

  async function deleteTutorial(id: string) {
    if (!confirm('Hapus panduan ini?')) return;
    if ((await fetch(`/api/admin/tutorials/${id}`, { method: 'DELETE' })).ok) load();
  }

  async function saveFaq(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch('/api/admin/faqs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question: faqQ, answer: faqA, sortOrder: faqs.length + 1 }),
    });
    if (res.ok) {
      setFaqQ('');
      setFaqA('');
      setMsg('FAQ baru ditambahkan.');
      load();
    }
  }

  async function deleteFaq(id: string) {
    if (!confirm('Hapus FAQ ini?')) return;
    if ((await fetch(`/api/admin/faqs/${id}`, { method: 'DELETE' })).ok) load();
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-headline-md text-primary font-bold">Kelola Tutorial, SOP &amp; FAQ</h1>
          <p className="text-body-sm text-on-surface-variant">
            Susun panduan cara penggunaan produk (langkah teks, PDF/gambar, atau link YouTube/Drive).
          </p>
        </div>
        <div className="flex gap-2 bg-surface-container-low p-1 rounded-lg">
          <button type="button" onClick={() => setTab('tutorials')} className={`px-3.5 py-1.5 rounded text-title-sm ${tab === 'tutorials' ? 'bg-primary text-on-primary' : 'text-on-surface-variant'}`}>
            Panduan &amp; SOP ({tutorials.length})
          </button>
          <button type="button" onClick={() => setTab('faqs')} className={`px-3.5 py-1.5 rounded text-title-sm ${tab === 'faqs' ? 'bg-primary text-on-primary' : 'text-on-surface-variant'}`}>
            FAQ ({faqs.length})
          </button>
        </div>
      </div>

      {msg && <div className="p-3 rounded-xl bg-primary-fixed text-on-primary-fixed text-body-sm font-medium">{msg}</div>}

      {tab === 'tutorials' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          <form onSubmit={saveTutorial} className="lg:col-span-5 bg-white p-5 rounded-xl border border-outline-variant/25 shadow-sm flex flex-col gap-3">
            <h2 className="text-title-md text-primary font-bold">
              {editingId ? 'Edit Panduan' : 'Tambah Panduan / SOP Baru'}
            </h2>
            <div className="grid grid-cols-2 gap-2">
              <input required placeholder="Kode Dok (SOP-FTC-01)" value={form.docCode} onChange={(e) => setForm({ ...form, docCode: e.target.value })} className="bg-surface-container-low px-3 py-2 rounded-lg text-mono-data uppercase" />
              <input placeholder="Versi (1.0)" value={form.version} onChange={(e) => setForm({ ...form, version: e.target.value })} className="bg-surface-container-low px-3 py-2 rounded-lg text-body-sm" />
            </div>
            <input required placeholder="Judul Panduan / Tutorial *" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="bg-surface-container-low px-3 py-2 rounded-lg text-body-sm" />
            <select value={form.assetId} onChange={(e) => setForm({ ...form, assetId: e.target.value })} className="bg-surface-container-low px-3 py-2 rounded-lg text-body-sm">
              <option value="">Umum FTC (Semua Aset)</option>
              {assets.map((a) => <option key={a.id} value={a.id}>{a.inventoryCode} — {a.name}</option>)}
            </select>
            <div className="grid grid-cols-2 gap-2">
              <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="bg-surface-container-low px-3 py-2 rounded-lg text-body-sm">
                <option value="pengoperasian">Pengoperasian Alat</option>
                <option value="video_demo">Video Demo</option>
                <option value="persiapan_pameran">Persiapan Pameran</option>
                <option value="perawatan">Perawatan Ringan</option>
                <option value="k3">Keselamatan &amp; Checklist</option>
              </select>
              <select value={form.format} onChange={(e) => setForm({ ...form, format: e.target.value })} className="bg-surface-container-low px-3 py-2 rounded-lg text-body-sm">
                <option value="panduan_teks">Panduan Teks</option>
                <option value="pdf">Dokumen PDF</option>
                <option value="video">Video Demo</option>
                <option value="checklist">Checklist</option>
              </select>
            </div>
            <input placeholder="Penyusun / Instruktur" value={form.instructorName} onChange={(e) => setForm({ ...form, instructorName: e.target.value })} className="bg-surface-container-low px-3 py-2 rounded-lg text-body-sm" />
            <textarea rows={2} placeholder="Ringkasan singkat" value={form.summary} onChange={(e) => setForm({ ...form, summary: e.target.value })} className="bg-surface-container-low p-3 rounded-lg text-body-sm" />
            <textarea rows={5} placeholder="Langkah penggunaan (gunakan ## Judul, 1. Langkah, - Poin)" value={form.stepsMarkdown} onChange={(e) => setForm({ ...form, stepsMarkdown: e.target.value })} className="bg-surface-container-low p-3 rounded-lg text-body-sm" />
            <input placeholder="Tautan Video (YouTube / Google Drive)" value={form.videoUrl} onChange={(e) => setForm({ ...form, videoUrl: e.target.value })} className="bg-surface-container-low px-3 py-2 rounded-lg text-body-sm" />
            <div className="flex flex-col gap-1">
              <label className="text-label-sm text-on-surface-variant">Unggah PDF / Gambar SOP (Opsional)</label>
              <input type="file" accept=".pdf,image/jpeg,image/png,image/webp" onChange={(e) => e.target.files?.[0] && uploadPdf(e.target.files[0])} className="text-body-sm" />
              {form.fileUrl && <span className="text-[12px] text-primary truncate">Terunggah: {form.fileUrl}</span>}
            </div>
            <div className="flex gap-2">
              {editingId && (
                <button type="button" onClick={() => { setEditingId(null); setForm(EMPTY_TUT); }} className="px-4 py-2 rounded-lg bg-surface-container text-title-sm">Batal</button>
              )}
              <button type="submit" className="flex-1 py-2 rounded-lg bg-primary text-on-primary text-title-sm font-bold">
                {editingId ? 'Perbarui Panduan' : 'Simpan Panduan'}
              </button>
            </div>
          </form>

          <div className="lg:col-span-7 flex flex-col gap-3">
            {tutorials.map((t) => (
              <div key={t.id} className="bg-white p-4 rounded-xl border border-outline-variant/25 shadow-sm flex flex-col gap-1.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-mono-data text-primary font-bold">{t.docCode} • v{t.version}</span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingId(t.id);
                        setForm({
                          docCode: t.docCode,
                          assetId: t.assetId ?? '',
                          title: t.title,
                          category: t.category,
                          format: t.format,
                          summary: t.summary,
                          stepsMarkdown: t.stepsMarkdown ?? '',
                          fileUrl: t.fileUrl ?? '',
                          videoUrl: t.videoUrl ?? '',
                          version: t.version,
                          instructorName: t.instructorName ?? '',
                        });
                      }}
                      className="text-label-md text-primary hover:underline"
                    >
                      Edit
                    </button>
                    <button type="button" onClick={() => deleteTutorial(t.id)} className="text-label-md text-error hover:underline">
                      Hapus
                    </button>
                  </div>
                </div>
                <h3 className="text-title-sm font-bold">{t.title}</h3>
                <p className="text-body-sm text-on-surface-variant">{t.summary}</p>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          <form onSubmit={saveFaq} className="lg:col-span-5 bg-white p-5 rounded-xl border border-outline-variant/25 shadow-sm flex flex-col gap-3">
            <h2 className="text-title-md text-primary font-bold">Tambah FAQ Baru</h2>
            <input required placeholder="Pertanyaan..." value={faqQ} onChange={(e) => setFaqQ(e.target.value)} className="bg-surface-container-low px-3 py-2 rounded-lg text-body-sm" />
            <textarea required rows={4} placeholder="Jawaban..." value={faqA} onChange={(e) => setFaqA(e.target.value)} className="bg-surface-container-low p-3 rounded-lg text-body-sm" />
            <button type="submit" className="py-2 rounded-lg bg-primary text-on-primary text-title-sm font-bold">Simpan FAQ</button>
          </form>
          <div className="lg:col-span-7 flex flex-col gap-3">
            {faqs.map((f) => (
              <div key={f.id} className="bg-white p-4 rounded-xl border border-outline-variant/25 flex justify-between gap-3">
                <div>
                  <div className="text-title-sm font-bold">{f.question}</div>
                  <p className="text-body-sm text-on-surface-variant mt-1">{f.answer}</p>
                </div>
                <button type="button" onClick={() => deleteFaq(f.id)} className="text-label-md text-error shrink-0">Hapus</button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
