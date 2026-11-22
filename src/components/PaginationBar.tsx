'use client';

import { getVisiblePageNumbers } from '@/lib/format';

export const DEFAULT_PAGE_SIZE_OPTIONS = [5, 10, 50, 100] as const;

export function PaginationBar({
  page,
  pageSize,
  totalItems,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = DEFAULT_PAGE_SIZE_OPTIONS,
  itemLabel = 'aset',
}: {
  page: number;
  pageSize: number;
  totalItems: number;
  onPageChange: (nextPage: number) => void;
  onPageSizeChange: (nextSize: number) => void;
  pageSizeOptions?: readonly number[];
  itemLabel?: string;
}) {
  if (totalItems <= 0) return null;

  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safePage = Math.min(totalPages, Math.max(1, page));
  const startItem = (safePage - 1) * pageSize + 1;
  const endItem = Math.min(totalItems, safePage * pageSize);
  const visiblePages = getVisiblePageNumbers(safePage, totalPages, 3);

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-surface-container-lowest p-3.5 rounded-xl border border-outline-variant/25 shadow-sm">
      <div className="flex flex-wrap items-center gap-2.5 text-body-sm text-on-surface-variant">
        <label className="inline-flex items-center gap-1.5">
          <span>Tampilkan</span>
          <select
            aria-label="Jumlah data per halaman"
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            className="bg-surface-container-low border border-outline-variant/40 rounded-lg px-2.5 py-1 text-body-sm font-semibold text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
          >
            {pageSizeOptions.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </label>
        <span className="tabular-nums-code">
          Menampilkan <strong>{startItem}–{endItem}</strong> dari <strong>{totalItems}</strong> {itemLabel}
        </span>
      </div>

      <nav aria-label="Navigasi halaman" className="flex items-center gap-1.5 self-end sm:self-auto">
        <button
          type="button"
          disabled={safePage <= 1}
          onClick={() => onPageChange(Math.max(1, safePage - 1))}
          className="px-2.5 py-1.5 rounded-lg bg-surface-container-low hover:bg-surface-container text-on-surface text-label-md font-semibold inline-flex items-center gap-0.5 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <span className="material-symbols-outlined text-[16px]">chevron_left</span>
          Prev
        </button>

        {visiblePages.map((num) => {
          const active = num === safePage;
          return (
            <button
              key={num}
              type="button"
              aria-current={active ? 'page' : undefined}
              onClick={() => onPageChange(num)}
              className={`min-w-[34px] px-2.5 py-1.5 rounded-lg text-label-md font-bold tabular-nums-code transition-colors ${
                active
                  ? 'bg-primary text-on-primary shadow-sm'
                  : 'bg-surface-container-low hover:bg-surface-container text-on-surface'
              }`}
            >
              {num}
            </button>
          );
        })}

        <button
          type="button"
          disabled={safePage >= totalPages}
          onClick={() => onPageChange(Math.min(totalPages, safePage + 1))}
          className="px-2.5 py-1.5 rounded-lg bg-surface-container-low hover:bg-surface-container text-on-surface text-label-md font-semibold inline-flex items-center gap-0.5 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          Next
          <span className="material-symbols-outlined text-[16px]">chevron_right</span>
        </button>
      </nav>
    </div>
  );
}
