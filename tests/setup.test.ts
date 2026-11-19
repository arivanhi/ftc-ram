import { describe, it, expect } from 'vitest';
import { existsSync } from 'node:fs';
import { formatIndonesianDate, CONDITION_META, AVAILABILITY_META } from '@/lib/format';

describe('format utilities & local assets', () => {
  it('formats ISO date into Indonesian display format', () => {
    expect(formatIndonesianDate('2025-10-28')).toBe('28 Okt 2025');
    expect(formatIndonesianDate(null)).toBe('Belum tercatat');
  });

  it('defines labels for all condition and availability states', () => {
    expect(CONDITION_META.prima.label).toBe('Kondisi Prima');
    expect(CONDITION_META.maintenance.label).toBe('Perawatan / Kalibrasi');
    expect(CONDITION_META.rusak.label).toBe('Perlu Perbaikan');
    expect(AVAILABILITY_META.tersedia.label).toBe('Tersedia');
    expect(AVAILABILITY_META.dipinjam.label).toBe('Sedang Dipinjam');
    expect(AVAILABILITY_META.tidak_tersedia.label).toBe('Tidak Tersedia');
  });

  it('stores UDINUS logo locally', () => {
    expect(existsSync('public/images/logo-dinus.png')).toBe(true);
  });
});
