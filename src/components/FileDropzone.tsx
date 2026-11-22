'use client';

import { useRef, useState } from 'react';
import { isFileAccepted, isImageUrl } from '@/lib/format';

type FileDropzoneProps = {
  accept: string;
  onFileSelect: (file: File) => void;
  onClear?: () => void;
  uploading?: boolean;
  disabled?: boolean;
  previewUrl?: string | null;
  fileName?: string | null;
  idleLabel?: string;
  hint?: string;
  compact?: boolean;
};

export function FileDropzone({
  accept,
  onFileSelect,
  onClear,
  uploading = false,
  disabled = false,
  previewUrl = null,
  fileName = null,
  idleLabel = 'Seret & lepas berkas di sini, atau klik untuk memilih',
  hint,
  compact = false,
}: FileDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const dragDepth = useRef(0);
  const [dragging, setDragging] = useState(false);
  const [dropError, setDropError] = useState<string | null>(null);

  const isBusy = uploading || disabled;

  function handleFile(file: File | undefined) {
    if (!file || isBusy) return;
    if (!isFileAccepted(file, accept)) {
      setDropError(`Format "${file.name}" tidak didukung. ${hint ?? ''}`.trim());
      return;
    }
    setDropError(null);
    onFileSelect(file);
  }

  function openPicker() {
    if (!isBusy) inputRef.current?.click();
  }

  function handleDragEnter(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (isBusy) return;
    dragDepth.current += 1;
    setDragging(true);
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!isBusy) e.dataTransfer.dropEffect = 'copy';
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    dragDepth.current = Math.max(0, dragDepth.current - 1);
    if (dragDepth.current === 0) setDragging(false);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    dragDepth.current = 0;
    setDragging(false);
    handleFile(e.dataTransfer?.files?.[0]);
  }

  const hasUploadedImage = Boolean(previewUrl && isImageUrl(previewUrl));
  const hasUploadedDoc = Boolean(previewUrl && !isImageUrl(previewUrl));
  const hasSelection = Boolean(previewUrl || fileName);

  return (
    <div className="flex flex-col gap-1.5">
      <div
        role="button"
        tabIndex={isBusy ? -1 : 0}
        aria-disabled={isBusy}
        onClick={openPicker}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            openPicker();
          }
        }}
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`relative overflow-hidden w-full rounded-xl border-2 border-dashed transition-all select-none ${
          compact ? 'px-3 py-2.5' : 'p-4'
        } ${
          isBusy
            ? 'cursor-wait bg-surface-container-low border-primary/50'
            : dragging
              ? 'border-primary bg-primary/5 ring-2 ring-primary/20 cursor-copy'
              : 'border-outline-variant/70 bg-surface-container-low hover:bg-surface-container hover:border-primary/60 cursor-pointer'
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          disabled={isBusy}
          className="sr-only"
          onChange={(e) => {
            const f = e.target.files?.[0];
            e.target.value = '';
            handleFile(f);
          }}
        />

        {dragging ? (
          <div className="flex items-center justify-center gap-2 py-1 text-primary text-title-sm font-semibold">
            <span className="material-symbols-outlined text-[22px]">download</span>
            <span>Lepaskan berkas di sini</span>
          </div>
        ) : compact ? (
          <div className="flex items-center justify-between gap-2 text-body-sm">
            <div className="flex items-center gap-2 min-w-0">
              <span className="material-symbols-outlined text-primary text-[18px] shrink-0">cloud_upload</span>
              <span className="truncate text-on-surface">
                {fileName || (previewUrl ? 'Berkas terunggah (seret untuk ganti)' : idleLabel)}
              </span>
            </div>
            {hasSelection && onClear && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setDropError(null);
                  onClear();
                }}
                className="text-label-sm text-error hover:underline shrink-0"
              >
                Hapus
              </button>
            )}
          </div>
        ) : hasSelection ? (
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              {hasUploadedImage && previewUrl ? (
                <img
                  src={previewUrl}
                  alt="Pratinjau berkas"
                  className="h-14 w-16 object-cover rounded-lg border border-outline-variant/40 bg-white shrink-0"
                />
              ) : (
                <div className="h-12 w-12 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[24px]">
                    {hasUploadedDoc ? 'picture_as_pdf' : 'description'}
                  </span>
                </div>
              )}
              <div className="min-w-0">
                <div className="text-title-sm text-on-surface font-semibold truncate">
                  {fileName || (hasUploadedImage ? 'Gambar berhasil diunggah' : 'Berkas panduan terunggah')}
                </div>
                <div className="text-[12px] text-on-surface-variant flex flex-wrap items-center gap-x-2 gap-y-0.5">
                  <span>Seret berkas lain atau klik untuk mengganti</span>
                  {previewUrl && (
                    <a
                      href={previewUrl}
                      target="_blank"
                      rel="noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="text-primary font-semibold hover:underline"
                    >
                      Lihat berkas
                    </a>
                  )}
                </div>
              </div>
            </div>
            {onClear && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setDropError(null);
                  onClear();
                }}
                className="px-2.5 py-1 rounded-lg bg-error-container/70 hover:bg-error-container text-on-error-container text-label-sm shrink-0"
              >
                Hapus
              </button>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center text-center gap-1 py-1">
            <span className="material-symbols-outlined text-primary text-[28px]">cloud_upload</span>
            <span className="text-title-sm text-on-surface font-semibold">{idleLabel}</span>
            {hint && <span className="text-[12px] text-on-surface-variant">{hint}</span>}
          </div>
        )}

        {/* Scoped loading modal strictly inside upload area */}
        {uploading && (
          <div
            role="status"
            aria-live="polite"
            className="absolute inset-0 z-10 bg-white/85 backdrop-blur-[2px] flex items-center justify-center p-2"
          >
            <div className="bg-white border border-primary/25 shadow-md rounded-xl px-4 py-2 flex items-center gap-2.5">
              <span className="material-symbols-outlined text-primary text-[20px] animate-spin">
                progress_activity
              </span>
              <div className="text-left">
                <div className="text-title-sm text-primary font-bold leading-tight">
                  Mengunggah berkas...
                </div>
                {!compact && (
                  <div className="text-[11px] text-on-surface-variant leading-tight">
                    Mohon tunggu hingga unggahan selesai
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {dropError && (
        <p className="text-[12px] text-error font-medium">{dropError}</p>
      )}
    </div>
  );
}
