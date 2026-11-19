'use client';

type QrItem = {
  id: string;
  inventoryCode: string;
  name: string;
  roomLabel?: string | null;
};

export function QrLabelModal({
  open,
  items,
  onClose,
}: {
  open: boolean;
  items: QrItem[];
  onClose: () => void;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-on-surface/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-surface-container-lowest rounded-2xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-outline-variant/30 flex items-center justify-between no-print">
          <div>
            <h2 className="text-headline-sm text-primary font-bold">Label Stiker QR Aset Penelitian FTC</h2>
            <p className="text-body-sm text-on-surface-variant">
              Tempelkan pada fisik produk agar PIC Pameran cukup memindai untuk melihat cara pakai, kondisi, dan narahubung.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => window.print()}
              className="px-4 py-2 rounded-lg bg-primary text-on-primary text-title-sm inline-flex items-center gap-1.5 hover:bg-tertiary"
            >
              <span className="material-symbols-outlined text-[18px]">print</span>
              Cetak Label
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface"
            >
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>
          </div>
        </div>

        <div className="p-6 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {items.map((item) => (
            <div
              key={item.id}
              className="border border-outline-variant/60 rounded-xl p-4 flex flex-col items-center text-center bg-white break-inside-avoid"
            >
              <div className="flex items-center gap-1.5 mb-2">
                <img src="/images/logo-dinus.png" alt="UDINUS" className="h-5 w-auto" />
                <span className="text-label-sm text-primary uppercase">FTC UDINUS</span>
              </div>
              <img
                src={`/api/assets/${item.id}/qr`}
                alt={`QR ${item.inventoryCode}`}
                className="w-36 h-36 object-contain"
              />
              <span className="mt-2 px-2 py-0.5 rounded bg-surface-container text-primary text-mono-data font-bold tabular-nums-code">
                {item.inventoryCode}
              </span>
              <p className="mt-1 text-title-sm text-on-surface line-clamp-2">{item.name}</p>
              {item.roomLabel && (
                <p className="text-body-sm text-on-surface-variant mt-0.5">{item.roomLabel}</p>
              )}
              <a
                href={`/api/assets/${item.id}/qr`}
                download={`qr-${item.inventoryCode}.png`}
                className="mt-2 text-label-sm text-primary hover:underline no-print"
              >
                Unduh PNG
              </a>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
