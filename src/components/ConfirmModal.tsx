'use client';

import { useEffect, useState } from 'react';

export type ConfirmModalState = {
  title: string;
  message: string;
  detail?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: 'danger' | 'primary' | 'warning';
  inputLabel?: string;
  inputPlaceholder?: string;
  defaultInputValue?: string;
  onConfirm: (inputValue: string) => Promise<void> | void;
};

const TONE_STYLE = {
  danger: {
    icon: 'delete_forever',
    iconBg: 'bg-error-container text-error',
    confirmBtn: 'bg-error hover:bg-error/90 text-white',
  },
  warning: {
    icon: 'warning',
    iconBg: 'bg-secondary-fixed text-secondary',
    confirmBtn: 'bg-secondary hover:bg-secondary/90 text-white',
  },
  primary: {
    icon: 'task_alt',
    iconBg: 'bg-primary/10 text-primary',
    confirmBtn: 'bg-primary hover:bg-primary-container text-on-primary',
  },
} as const;

export function ConfirmModal({
  request,
  onClose,
}: {
  request: ConfirmModalState | null;
  onClose: () => void;
}) {
  const [inputValue, setInputValue] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setInputValue(request?.defaultInputValue ?? '');
    setBusy(false);
  }, [request]);

  useEffect(() => {
    if (!request || busy) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [request, busy, onClose]);

  if (!request) return null;

  const tone = TONE_STYLE[request.tone ?? 'danger'];

  async function handleConfirm(e?: React.FormEvent) {
    e?.preventDefault();
    if (!request || busy) return;
    setBusy(true);
    try {
      await request.onConfirm(inputValue);
      onClose();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-modal-title"
      onClick={() => !busy && onClose()}
      className="fixed inset-0 z-[55] bg-on-surface/50 backdrop-blur-sm flex items-center justify-center p-4"
    >
      <form
        onSubmit={handleConfirm}
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-outline-variant/25 flex flex-col items-center text-center gap-3"
      >
        <div className={`w-14 h-14 rounded-full flex items-center justify-center ${tone.iconBg}`}>
          <span className="material-symbols-outlined text-[30px]">{tone.icon}</span>
        </div>

        <h3 id="confirm-modal-title" className="text-headline-sm text-on-surface font-bold">
          {request.title}
        </h3>

        <p className="text-body-md text-on-surface-variant leading-relaxed">
          {request.message}
        </p>

        {request.detail && (
          <div className="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low border border-outline-variant/30 text-body-sm font-semibold text-on-surface break-words">
            {request.detail}
          </div>
        )}

        {request.inputLabel && (
          <div className="w-full text-left pt-1">
            <label className="text-label-md text-on-surface-variant block mb-1">
              {request.inputLabel}
            </label>
            <textarea
              rows={2}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder={request.inputPlaceholder}
              disabled={busy}
              className="w-full bg-surface-container-low px-3.5 py-2 rounded-lg text-body-sm border border-outline-variant/40 focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        )}

        <div className="w-full flex items-center gap-2.5 pt-2">
          <button
            type="button"
            disabled={busy}
            onClick={onClose}
            className="flex-1 px-4 py-2.5 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface text-title-sm font-semibold transition-colors disabled:opacity-50"
          >
            {request.cancelLabel ?? 'Batal'}
          </button>
          <button
            type="submit"
            disabled={busy}
            className={`flex-1 px-4 py-2.5 rounded-lg text-title-sm font-bold transition-colors disabled:opacity-50 ${tone.confirmBtn}`}
          >
            {busy ? 'Memproses...' : (request.confirmLabel ?? 'Ya, Setujui')}
          </button>
        </div>
      </form>
    </div>
  );
}
