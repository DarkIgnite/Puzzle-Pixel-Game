import React, { useState } from 'react';
import { X, Grid, Eye } from 'lucide-react';
import { Photo } from '../types';
import { soundManager } from '../utils/audio';

interface PreviewModalProps {
  photo: Photo;
  imageUrl: string;
  gridSize: number;
  onClose: () => void;
}

export const PreviewModal: React.FC<PreviewModalProps> = ({
  photo,
  imageUrl,
  gridSize,
  onClose,
}) => {
  const [showGridOverlay, setShowGridOverlay] = useState<boolean>(true);

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 font-['Pixelify_Sans',sans-serif]">
      <div className="pixel-box max-w-md w-full p-5 relative flex flex-col items-center text-center text-white">
        
        {/* Close Button */}
        <button
          onClick={() => {
            soundManager.playClick();
            onClose();
          }}
          className="absolute top-3 right-3 pixel-btn-dark p-1 text-xs font-bold"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Modal Title */}
        <div className="flex items-center gap-1.5 text-[#FFE17D] text-xs font-bold uppercase mb-1">
          <Eye className="w-4 h-4" />
          <span>FOTO UTUH</span>
        </div>

        <h3 className="font-pixel-title text-sm text-[#FFE17D] mb-3">
          {photo.name}
        </h3>

        {/* Image Container */}
        <div className="w-full aspect-square bg-[#1A120B] border-2 border-[#5A3821] overflow-hidden relative mb-4">
          <img
            src={imageUrl}
            alt={photo.name}
            className="w-full h-full object-cover"
          />

          {/* Grid Lines Overlay */}
          {showGridOverlay && (
            <div
              className="absolute inset-0 grid border border-white/40 pointer-events-none"
              style={{
                gridTemplateColumns: `repeat(${gridSize}, minmax(0, 1fr))`,
                gridTemplateRows: `repeat(${gridSize}, minmax(0, 1fr))`,
              }}
            >
              {Array.from({ length: gridSize * gridSize }).map((_, i) => (
                <div key={i} className="border border-white/50 bg-black/20 flex items-center justify-center">
                  <span className="text-[10px] text-white font-mono font-bold">
                    {i + 1}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="flex items-center justify-between w-full gap-2">
          <button
            onClick={() => {
              soundManager.playClick();
              setShowGridOverlay((prev) => !prev);
            }}
            className="pixel-btn-dark px-3 py-1.5 text-xs font-bold flex items-center gap-1"
          >
            <Grid className="w-3.5 h-3.5" />
            <span>GARIS GRID</span>
          </button>

          <button
            onClick={() => {
              soundManager.playClick();
              onClose();
            }}
            className="pixel-btn px-4 py-1.5 text-xs font-bold"
          >
            LANJUT
          </button>
        </div>

      </div>
    </div>
  );
};

