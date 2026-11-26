import React from 'react';
import { soundManager } from '../utils/audio';

interface ConfirmDialogProps {
  title: string;
  message: string;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}

/** Dialog konfirmasi bergaya pixel (tidak keluar dari fullscreen seperti window.confirm) */
export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  title,
  message,
  confirmLabel,
  onConfirm,
  onCancel,
}) => (
  <div
    role="dialog"
    aria-modal="true"
    aria-label={title}
    className="fixed inset-0 z-[60] bg-black/70 flex items-center justify-center p-4"
  >
    <div className="pixel-box max-w-sm w-full max-h-[95dvh] overflow-y-auto p-5 text-center">
      <h2 className="font-pixel-title text-sm text-theme-title mb-3 leading-relaxed">
        {title}
      </h2>
      <p className="text-sm text-theme-sub mb-5">{message}</p>
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => {
            soundManager.playClick();
            onCancel();
          }}
          className="pixel-btn-dark py-3 text-sm font-bold cursor-pointer"
        >
          BATAL
        </button>
        <button
          onClick={() => {
            soundManager.playClick();
            onConfirm();
          }}
          className="pixel-btn py-3 text-sm font-bold cursor-pointer"
        >
          {confirmLabel}
        </button>
      </div>
    </div>
  </div>
);
