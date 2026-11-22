'use client';

import { useCallback, useEffect, useState } from 'react';
import { NotificationModal, type NotificationModalState } from '@/components/NotificationModal';
import { ConfirmModal, type ConfirmModalState } from '@/components/ConfirmModal';

type SmtpFormState = {
  enabled: boolean;
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  smtpPassword: string;
  hasAppPassword: boolean;
  senderName: string;
  adminNotifyEmail: string;
  reminderHoursBefore: number;
};

const DEFAULT_STATE: SmtpFormState = {
  enabled: false,
  smtpHost: 'smtp.gmail.com',
  smtpPort: 465,
  smtpUser: '',
  smtpPassword: '',
  hasAppPassword: false,
  senderName: 'SIM-Aset Penelitian FTC UDINUS',
  adminNotifyEmail: '',
  reminderHoursBefore: 24,
};

export function SmtpSettingsManager() {
  const [form, setForm] = useState<SmtpFormState>(DEFAULT_STATE);
  const [testEmail, setTestEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [reminding, setReminding] = useState(false);
  const [notice, setNotice] = useState<NotificationModalState | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<ConfirmModalState | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/smtp');
      if (res.ok) {
        const { settings } = await res.json();
        setForm({
          enabled: Boolean(settings.enabled),
          smtpHost: settings.smtpHost || 'smtp.gmail.com',
          smtpPort: Number(settings.smtpPort) || 465,
          smtpUser: settings.smtpUser || '',
          smtpPassword: '',
          hasAppPassword: Boolean(settings.hasAppPassword),
          senderName: settings.senderName || 'SIM-Aset Penelitian FTC UDINUS',
          adminNotifyEmail: settings.adminNotifyEmail || '',
          reminderHoursBefore: Number(settings.reminderHoursBefore) || 24,
        });
        if (!testEmail && (settings.adminNotifyEmail || settings.smtpUser)) {
          setTestEmail(settings.adminNotifyEmail || settings.smtpUser);
        }
      }
    } finally {
      setLoading(false);
    }
  }, [testEmail]);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function saveSettings(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch('/api/admin/smtp', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          enabled: form.enabled,
          smtpHost: form.smtpHost,
          smtpPort: Number(form.smtpPort),
          smtpUser: form.smtpUser,
          smtpPassword: form.smtpPassword || undefined,
          senderName: form.senderName,
          adminNotifyEmail: form.adminNotifyEmail,
          reminderHoursBefore: Number(form.reminderHoursBefore) || 24,
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setNotice({ type: 'error', title: 'Gagal Menyimpan SMTP', message: body.error || 'Gagal menyimpan pengaturan SMTP.' });
        return;
      }
      setForm((prev) => ({
        ...prev,
        smtpPassword: '',
        hasAppPassword: Boolean(body.settings?.hasAppPassword),
      }));
      setNotice({ type: 'success', title: 'Pengaturan SMTP Tersimpan', message: 'Konfigurasi Email SMTP Gmail berhasil diperbarui.' });
    } finally {
      setSaving(false);
    }
  }

  function clearAppPassword() {
    setConfirmDialog({
      title: 'Hapus Sandi Aplikasi Gmail?',
      message: 'Sandi aplikasi yang tersimpan akan dihapus dan notifikasi email SMTP akan dinonaktifkan sementara hingga Anda mengisi sandi baru.',
      confirmLabel: 'Ya, Hapus Sandi',
      tone: 'danger',
      onConfirm: async () => {
        setSaving(true);
        try {
          const res = await fetch('/api/admin/smtp', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              enabled: false,
              smtpHost: form.smtpHost,
              smtpPort: Number(form.smtpPort),
              smtpUser: form.smtpUser,
              clearPassword: true,
              senderName: form.senderName,
              adminNotifyEmail: form.adminNotifyEmail,
              reminderHoursBefore: Number(form.reminderHoursBefore) || 24,
            }),
          });
          if (res.ok) {
            setForm((prev) => ({ ...prev, enabled: false, smtpPassword: '', hasAppPassword: false }));
            setNotice({ type: 'success', title: 'Sandi Aplikasi Dihapus', message: 'Sandi Aplikasi Gmail yang tersimpan telah dihapus.' });
          }
        } finally {
          setSaving(false);
        }
      },
    });
  }

  async function handleTestMail(e: React.FormEvent) {
    e.preventDefault();
    setTesting(true);
    try {
      const res = await fetch('/api/admin/smtp/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: testEmail }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setNotice({ type: 'error', title: 'Gagal Mengirim Email Tes', message: body.error || 'Periksa kembali email Gmail & Sandi Aplikasi.' });
        return;
      }
      setNotice({ type: 'success', title: 'Email Tes Berhasil Dikirim', message: body.message || 'Email uji coba berhasil dikirim.' });
    } finally {
      setTesting(false);
    }
  }

  async function handleRunReminders() {
    setReminding(true);
    try {
      const res = await fetch('/api/admin/smtp/reminders', { method: 'POST' });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setNotice({ type: 'error', title: 'Gagal Menjalankan Pengingat', message: body.error || 'Terjadi kesalahan saat memeriksa pengingat.' });
        return;
      }
      setNotice({
        type: 'success',
        title: 'Pengecekan Pengingat Selesai',
        message: `${body.sent ?? 0} email pengingat terkirim, ${body.failed ?? 0} gagal (dari ${body.checked ?? 0} pinjaman jatuh tempo).`,
      });
    } finally {
      setReminding(false);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-headline-md text-primary font-bold">Pengaturan Email SMTP (Gmail)</h1>
        <p className="text-body-sm text-on-surface-variant">
          Konfigurasi akun Gmail &amp; Sandi Aplikasi untuk notifikasi otomatis ke Admin dan Peminjam. Sandi aplikasi disimpan terenkripsi di server.
        </p>
      </div>

      {loading ? (
        <div className="h-64 rounded-xl bg-surface-container-low animate-pulse" />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          <form
            onSubmit={saveSettings}
            className="lg:col-span-7 bg-white p-5 rounded-xl border border-outline-variant/25 shadow-sm flex flex-col gap-4"
          >
            <div className="flex items-center justify-between gap-3 pb-3 border-b border-surface-container">
              <div>
                <h2 className="text-title-md text-primary font-bold">Konfigurasi Gmail SMTP</h2>
                <p className="text-[12px] text-on-surface-variant">
                  Gunakan akun Gmail dengan Verifikasi 2 Langkah &amp; Sandi Aplikasi (16 karakter).
                </p>
              </div>
              <label className="inline-flex items-center gap-2 text-title-sm font-semibold cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.enabled}
                  onChange={(e) => setForm({ ...form, enabled: e.target.checked })}
                  className="h-4 w-4 accent-primary"
                />
                <span>Aktifkan SMTP</span>
              </label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-label-md block mb-1">Email Pengirim (Gmail SMTP) *</label>
                <input
                  type="email"
                  placeholder="simaset.ftc@gmail.com"
                  value={form.smtpUser}
                  onChange={(e) => setForm({ ...form, smtpUser: e.target.value })}
                  className="w-full bg-surface-container-low px-3.5 py-2 rounded-lg text-body-sm"
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-label-md">Sandi Aplikasi Gmail (App Password)</label>
                  {form.hasAppPassword && (
                    <span className="text-[11px] font-semibold text-[#065f46] bg-[#ecfdf5] px-2 py-0.5 rounded">
                      Tersimpan
                    </span>
                  )}
                </div>
                <input
                  type="password"
                  autoComplete="new-password"
                  placeholder={form.hasAppPassword ? 'Kosongkan jika tidak ingin mengubah' : 'xxxx xxxx xxxx xxxx'}
                  value={form.smtpPassword}
                  onChange={(e) => setForm({ ...form, smtpPassword: e.target.value })}
                  className="w-full bg-surface-container-low px-3.5 py-2 rounded-lg text-body-sm"
                />
                {form.hasAppPassword && (
                  <button
                    type="button"
                    onClick={clearAppPassword}
                    className="text-[11px] text-error hover:underline mt-1"
                  >
                    Hapus sandi tersimpan
                  </button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-label-md block mb-1">Email Tujuan Notifikasi Admin</label>
                <input
                  type="email"
                  placeholder="Kosongkan untuk pakai Email SMTP di atas"
                  value={form.adminNotifyEmail}
                  onChange={(e) => setForm({ ...form, adminNotifyEmail: e.target.value })}
                  className="w-full bg-surface-container-low px-3.5 py-2 rounded-lg text-body-sm"
                />
              </div>
              <div>
                <label className="text-label-md block mb-1">Nama Tampilan Pengirim</label>
                <input
                  value={form.senderName}
                  onChange={(e) => setForm({ ...form, senderName: e.target.value })}
                  className="w-full bg-surface-container-low px-3.5 py-2 rounded-lg text-body-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-label-md block mb-1">SMTP Host</label>
                <input
                  value={form.smtpHost}
                  onChange={(e) => setForm({ ...form, smtpHost: e.target.value })}
                  className="w-full bg-surface-container-low px-3.5 py-2 rounded-lg text-body-sm font-mono"
                />
              </div>
              <div>
                <label className="text-label-md block mb-1">SMTP Port</label>
                <select
                  value={form.smtpPort}
                  onChange={(e) => setForm({ ...form, smtpPort: Number(e.target.value) })}
                  className="w-full bg-surface-container-low px-3 py-2 rounded-lg text-body-sm"
                >
                  <option value={465}>465 (SSL — Gmail Rekomendasi)</option>
                  <option value={587}>587 (STARTTLS)</option>
                </select>
              </div>
              <div>
                <label className="text-label-md block mb-1">Pengingat Kembali (Jam)</label>
                <input
                  type="number"
                  min={1}
                  max={168}
                  value={form.reminderHoursBefore}
                  onChange={(e) => setForm({ ...form, reminderHoursBefore: Number(e.target.value) })}
                  className="w-full bg-surface-container-low px-3.5 py-2 rounded-lg text-body-sm"
                />
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-surface-container">
              <button
                type="submit"
                disabled={saving}
                className="px-5 py-2.5 rounded-lg bg-primary hover:bg-primary-container disabled:opacity-50 text-on-primary text-title-sm font-bold inline-flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-[18px]">save</span>
                {saving ? 'Menyimpan...' : 'Simpan Pengaturan SMTP'}
              </button>
            </div>
          </form>

          <div className="lg:col-span-5 flex flex-col gap-4">
            {/* Test SMTP Card */}
            <form
              onSubmit={handleTestMail}
              className="bg-white p-5 rounded-xl border border-outline-variant/25 shadow-sm flex flex-col gap-3"
            >
              <h3 className="text-title-md text-primary font-bold">Uji Kirim Email SMTP</h3>
              <p className="text-body-sm text-on-surface-variant">
                Simpan konfigurasi terlebih dahulu, lalu kirim email tes untuk memastikan akun Gmail &amp; Sandi Aplikasi bekerja.
              </p>
              <div className="flex gap-2">
                <input
                  required
                  type="email"
                  placeholder="tujuan@dinus.ac.id"
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                  className="flex-1 bg-surface-container-low px-3 py-2 rounded-lg text-body-sm"
                />
                <button
                  type="submit"
                  disabled={testing}
                  className="px-4 py-2 rounded-lg bg-secondary-container hover:bg-secondary-fixed-dim text-on-secondary-fixed text-title-sm font-bold disabled:opacity-50"
                >
                  {testing ? 'Mengirim...' : 'Kirim Tes'}
                </button>
              </div>
            </form>

            {/* Automatic Notifications Overview + Manual Reminder Trigger */}
            <div className="bg-white p-5 rounded-xl border border-outline-variant/25 shadow-sm flex flex-col gap-3">
              <h3 className="text-title-md text-primary font-bold">Cakupan Notifikasi Otomatis</h3>
              <ul className="text-body-sm text-on-surface-variant space-y-1.5 list-disc pl-5">
                <li><strong>Ke Admin:</strong> Pengajuan aset akan dipinjam baru &amp; laporan aset bermasalah (termasuk pengembalian kondisi rusak/perawatan).</li>
                <li><strong>Ke Peminjam (Saat Pengajuan):</strong> Konfirmasi kode tiket &amp; waktu peminjaman.</li>
                <li><strong>Ke Peminjam (Saat Diverifikasi Admin):</strong> 1 email terpadu berisi status verifikasi, waktu peminjaman, info lengkap aset, serta tata cara penggunaan &amp; SOP terkait.</li>
                <li><strong>Ke Peminjam (Pengingat Pengembalian):</strong> Otomatis setiap jam untuk pinjaman jatuh tempo (≤ H-1 / terlambat) atau kirim manual di menu Peminjaman.</li>
              </ul>
              <button
                type="button"
                disabled={reminding}
                onClick={handleRunReminders}
                className="mt-1 px-4 py-2 rounded-lg bg-surface-container hover:bg-surface-container-high text-primary text-title-sm font-semibold inline-flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-[18px]">notifications_active</span>
                {reminding ? 'Memeriksa...' : 'Cek & Kirim Pengingat Pengembalian Sekarang'}
              </button>
            </div>

            {/* Gmail App Password Mini Guide */}
            <div className="bg-surface-container-low p-4 rounded-xl border border-outline-variant/25 text-body-sm text-on-surface-variant">
              <div className="text-title-sm font-bold text-primary mb-1">Cara Membuat Sandi Aplikasi Gmail:</div>
              <ol className="list-decimal pl-5 space-y-1 text-[13px]">
                <li>Buka <strong>myaccount.google.com</strong> → menu <strong>Keamanan</strong>.</li>
                <li>Aktifkan <strong>Verifikasi 2 Langkah</strong> terlebih dahulu.</li>
                <li>Cari menu <strong>Sandi aplikasi (App passwords)</strong>, buat nama aplikasi (mis. <em>SIM-Aset FTC</em>), lalu tempel 16 karakter sandi ke form di samping.</li>
              </ol>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal request={confirmDialog} onClose={() => setConfirmDialog(null)} />
      <NotificationModal notification={notice} onClose={() => setNotice(null)} />
    </div>
  );
}
