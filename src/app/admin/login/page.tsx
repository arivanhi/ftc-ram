'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const body = await res.json();
      if (!res.ok) {
        setError(body.error || 'Gagal masuk.');
        return;
      }
      router.push('/admin');
      router.refresh();
    } catch {
      setError('Kesalahan jaringan saat masuk.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-surface-container-lowest rounded-2xl border border-outline-variant/30 shadow-md p-8 flex flex-col gap-6">
        <div className="flex flex-col items-center text-center gap-2">
          <img src="/images/logo-dinus.png" alt="Logo UDINUS" className="h-14 w-auto" />
          <span className="px-2.5 py-0.5 rounded-full bg-secondary-container/25 text-secondary text-label-sm uppercase">
            CMS Pengelola Aset FTC
          </span>
          <h1 className="text-headline-md text-primary font-bold">Masuk Panel Admin FTC</h1>
          <p className="text-body-sm text-on-surface-variant">
            Khusus pengelola data aset produk penelitian Fakultas Teknologi Cerdas UDINUS.
          </p>
        </div>

        {error && (
          <div className="p-3 rounded-lg bg-error-container text-on-error-container text-body-sm font-medium">
            {error}
          </div>
        )}

        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <div>
            <label className="text-label-md text-on-surface-variant block mb-1">Email Admin</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@ftc.dinus.ac.id"
              className="w-full bg-surface-container-low px-3.5 py-2.5 rounded-lg text-body-md border border-outline-variant/30 focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div>
            <label className="text-label-md text-on-surface-variant block mb-1">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-surface-container-low px-3.5 py-2.5 rounded-lg text-body-md border border-outline-variant/30 focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-lg bg-primary hover:bg-primary-container disabled:opacity-50 text-on-primary text-title-sm font-bold shadow-sm"
          >
            {loading ? 'Memverifikasi...' : 'Masuk CMS Admin'}
          </button>
        </form>

        <div className="text-center pt-2 border-t border-surface-container">
          <Link href="/" className="text-body-sm text-primary hover:underline">
            ← Kembali ke Portal Publik PIC Pameran
          </Link>
        </div>
      </div>
    </div>
  );
}
