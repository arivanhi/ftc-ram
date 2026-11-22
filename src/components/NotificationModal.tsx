'use client';

import { useEffect } from 'react';

export type NotificationModalState = {
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  detail?: string;
  actionLabel?: string;
  onAction?: () => void;
};

const STYLE_BY_TYPE = {
  success: {
    icon: 'check_circle',
    iconBg: 'bg-[#ecfdf5] text-[#059669]',
    btn: 'bg-[#059669] hover:bg-[#047857] text-white',
  },
  error: {
    icon: 'error',
    iconBg: 'bg-error-container text-error',
    btn: 'bg-error hover:bg-error/90 text-white',
  },
  warning: {
    icon: 'warning',
    iconBg: 'bg-secondary-fixed text-secondary',
    btn: 'bg-secondary hover:bg-secondary/90 text-white',
  },
  info: {
    icon: 'info',
    iconBg: 'bg-primary/10 text-primary',
    btn: 'bg-primary hover:bg-primary-container text-on-primary',
  },
} as const;

export function NotificationModal({
  notification,
  onClose,
}: {
  notification: NotificationModalState | null;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!notification) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [notification, onClose]);

  if (!notification) return null;

  const meta = STYLE_BY_TYPE[notification.type];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="notification-modal-title"
      onClick={onClose}
      className="fixed inset-0 z-[60] bg-on-surface/50 backdrop-blur-sm flex items-center justify-center p-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-outline-variant/25 flex flex-col items-center text-center gap-3"
      >
        <div className={`w-14 h-14 rounded-full flex items-center justify-center ${meta.iconBg}`}>
          <span className="material-symbols-outlined text-[32px]">{meta.icon}</span>
        </div>

        <h3 id="notification-modal-title" className="text-headline-sm text-on-surface font-bold">
          {notification.title}
        </h3>

        <p className="text-body-md text-on-surface-variant leading-relaxed">
          {notification.message}
        </p>

        {notification.detail && (
          <div className="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low border border-outline-variant/30 text-mono-data text-primary font-bold break-all">
            {notification.detail}
          </div>
        )}

        <div className="w-full flex flex-wrap items-center justify-center gap-2 pt-2">
          {notification.actionLabel && notification.onAction && (
            <button
              type="button"
              onClick={() => {
                notification.onAction?.();
                onClose();
              }}
              className="flex-1 min-w-[140px] px-4 py-2.5 rounded-lg bg-primary hover:bg-primary-container text-on-primary text-title-sm font-bold transition-colors"
            >
              {notification.actionLabel}
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className={`flex-1 min-w-[110px] px-4 py-2.5 rounded-lg text-title-sm font-bold transition-colors ${
              notification.actionLabel
                ? 'bg-surface-container hover:bg-surface-container-high text-on-surface'
                : meta.btn
            }`}
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}
