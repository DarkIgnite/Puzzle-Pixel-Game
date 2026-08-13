import React, { useRef } from 'react';
import { X, Upload, Image as ImageIcon, FolderOpen } from 'lucide-react';
import { Photo } from '../types';
import { processUploadedFile } from '../utils/canvasHelper';
import { soundManager } from '../utils/audio';

interface PhotoManagerModalProps {
  photos: Photo[];
  onUploadPhoto: (photoId: string, newUrl: string) => void;
  onAddNewPhoto: (newPhoto: Photo) => void;
  onClose: () => void;
}

export const PhotoManagerModal: React.FC<PhotoManagerModalProps> = ({
  photos,
  onUploadPhoto,
  onAddNewPhoto,
  onClose,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const activeReplacingPhotoIdRef = useRef<string | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const dataUrl = await processUploadedFile(file);
      soundManager.playClick();
      if (activeReplacingPhotoIdRef.current) {
        onUploadPhoto(activeReplacingPhotoIdRef.current, dataUrl);
      } else {
        const newPhoto: Photo = {
          id: `custom-photo-${Date.now()}`,
          name: file.name.replace(/\.[^/.]+$/, ''),
          description: 'Foto buatan sendiri',
          url: dataUrl,
          placeholderPath: `assets/photos/custom-${Date.now()}.jpg`,
          isCustom: true,
        };
        onAddNewPhoto(newPhoto);
      }
    } catch (err) {
      console.error('Upload error:', err);
    }
    e.target.value = '';
  };

  const triggerUploadForPhoto = (photoId: string) => {
    soundManager.playClick();
    activeReplacingPhotoIdRef.current = photoId;
    fileInputRef.current?.click();
  };

  const triggerUploadNew = () => {
    soundManager.playClick();
    activeReplacingPhotoIdRef.current = null;
    fileInputRef.current?.click();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 font-['Pixelify_Sans',sans-serif]">
      <div className="pixel-box max-w-2xl w-full p-6 relative flex flex-col max-h-[90vh] overflow-hidden text-white">
        
        {/* Hidden File Input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="hidden"
        />

        {/* Close Button */}
        <button
          onClick={() => {
            soundManager.playClick();
            onClose();
          }}
          className="absolute top-4 right-4 pixel-btn-dark p-1 text-xs font-bold"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Title */}
        <div className="flex items-center gap-1.5 text-[#FFE17D] text-xs font-bold uppercase mb-1">
          <FolderOpen className="w-4 h-4" />
          <span>ASSETS FOTO</span>
        </div>

        <h2 className="font-pixel-title text-sm sm:text-base text-[#FFE17D] mb-2">
          KELOLA FOTO PUZZLE
        </h2>

        <p className="text-xs text-[#E0A96D] mb-4">
          Ganti foto default dengan foto dari perangkat milikmu sendiri.
        </p>

        {/* Photos Grid */}
        <div className="flex-1 overflow-y-auto pr-1 grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
          {photos.map((photo) => (
            <div
              key={photo.id}
              className="bg-[#1A120B] p-2.5 border-2 border-[#5A3821] flex items-center gap-3"
            >
              <div className="w-16 h-16 shrink-0 bg-[#22160C] border border-[#5A3821] overflow-hidden">
                <img
                  src={photo.url}
                  alt={photo.name}
                  className="w-full h-full object-cover"
                />
              </div>

              <div className="flex-1 min-w-0 text-left">
                <h4 className="font-pixel-title text-xs text-[#FFE17D] truncate mb-0.5">
                  {photo.name}
                </h4>
                <p className="text-[10px] text-[#E0A96D] truncate mb-2">
                  {photo.isCustom ? 'Custom Image' : photo.placeholderPath}
                </p>

                <button
                  onClick={() => triggerUploadForPhoto(photo.id)}
                  className="pixel-btn px-2 py-1 text-[10px] font-bold flex items-center gap-1"
                >
                  <Upload className="w-3 h-3" />
                  <span>GANTI</span>
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Footer Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-3 border-t-2 border-[#5A3821]">
          <button
            onClick={triggerUploadNew}
            className="w-full sm:w-auto pixel-btn-green px-4 py-2 text-xs font-bold flex items-center justify-center gap-1.5"
          >
            <ImageIcon className="w-4 h-4" />
            <span>TAMBAH FOTO BARU</span>
          </button>

          <button
            onClick={() => {
              soundManager.playClick();
              onClose();
            }}
            className="w-full sm:w-auto pixel-btn px-5 py-2 text-xs font-bold"
          >
            SELESAI & SIMPAN
          </button>
        </div>

      </div>
    </div>
  );
};

