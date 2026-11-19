'use client';

import { useState } from 'react';
import { QrLabelModal } from '@/components/QrLabelModal';

export function AssetDetailActions({
  assetId,
  inventoryCode,
  name,
  roomLabel,
}: {
  assetId: string;
  inventoryCode: string;
  name: string;
  roomLabel: string | null;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full py-2.5 px-4 rounded-lg bg-surface-container hover:bg-surface-container-high text-primary text-title-sm inline-flex items-center justify-center gap-1.5 transition-colors"
      >
        <span className="material-symbols-outlined text-[18px]">print</span>
        Cetak Stiker QR Aset
      </button>
      <QrLabelModal
        open={open}
        onClose={() => setOpen(false)}
        items={[{ id: assetId, inventoryCode, name, roomLabel }]}
      />
    </>
  );
}
