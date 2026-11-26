import {
  Camera,
  FolderOpen,
  Upload,
  X,
} from 'lucide-react';
import React, { useRef, useState } from 'react';
import { Photo } from '../types';
import { soundManager } from '../utils/audio';
import { processUploadedFile } from '../utils/canvasHelper';
import { CameraModal } from './CameraModal';

interface PhotoManagerModalProps {
  photos: Photo[];
  onUploadPhoto: (photoId: string, newUrl: string, name?: string) => void;
  onError: (message: string) => void;
  onClose: () => void;
}

export const PhotoManagerModal: React.FC<PhotoManagerModalProps> = ({
  photos,
  onUploadPhoto,
  onError,
  onClose,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const activeReplacingPhotoIdRef = useRef<string | null>(null);

  const [showCameraModal, setShowCameraModal] = useState<boolean>(false);
  const [cameraTargetPhotoId, setCameraTargetPhotoId] = useState<string | null>(
    null,
  );

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const dataUrl = await processUploadedFile(file);
      soundManager.playClick();
      if (activeReplacingPhotoIdRef.current) {
        onUploadPhoto(
          activeReplacingPhotoIdRef.current,
          dataUrl,
          file.name.replace(/\.[^/.]+$/, ''),
        );
      }
    } catch {
      onError('Foto tidak bisa dibaca. Coba pilih file JPG atau PNG.');
    }
    e.target.value = '';
  };

  const triggerUploadForPhoto = (photoId: string) => {
    soundManager.playClick();
    activeReplacingPhotoIdRef.current = photoId;
    fileInputRef.current?.click();
  };

  const openCameraForPhoto = (photoId: string) => {
    soundManager.playClick();
    setCameraTargetPhotoId(photoId);
    setShowCameraModal(true);
  };

  const handleCameraCapture = (dataUrl: string, fileName: string) => {
    setShowCameraModal(false);
    if (cameraTargetPhotoId) {
      onUploadPhoto(cameraTargetPhotoId, dataUrl, fileName);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 font-['Pixelify_Sans',sans-serif]">
      <div className="pixel-box max-w-2xl w-full p-6 relative flex flex-col max-h-[90vh] overflow-hidden">
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
          aria-label="Tutup"
          className="absolute top-4 right-4 pixel-btn-dark p-1 text-xs font-bold cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Title */}
        <div className="flex items-center gap-1.5 text-theme-title text-xs font-bold uppercase mb-1">
          <FolderOpen className="w-4 h-4" />
          <span>ASSETS FOTO</span>
        </div>

        <h2 className="font-pixel-title text-sm sm:text-base text-theme-title mb-2">
          KELOLA FOTO PUZZLE
        </h2>

        <p className="text-xs text-theme-sub mb-4">
          Pilih level, lalu ganti fotonya dari galeri atau langsung dari
          kamera.
        </p>

        {/* Photos Grid */}
        <div className="flex-1 overflow-y-auto pr-1 grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
          {photos.map((photo, index) => (
            <div
              key={photo.id}
              className="pixel-box-inner p-2.5 flex items-center gap-3"
            >
              <div className="w-16 h-16 shrink-0 bg-theme-wall border border-theme-inner overflow-hidden">
                <img
                  src={photo.url}
                  alt={photo.name}
                  className="w-full h-full object-cover"
                />
              </div>

              <div className="flex-1 min-w-0 text-left">
                <h4 className="font-pixel-title text-xs text-theme-title truncate mb-0.5">
                  {photo.name}
                </h4>
                <p className="text-[10px] text-theme-sub truncate mb-2">
                  Level {index + 1} • {photo.isCustom ? 'Foto kamu' : 'Foto bawaan'}
                </p>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => triggerUploadForPhoto(photo.id)}
                    className="pixel-btn px-2 py-1 text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                    title="Upload File Foto"
                  >
                    <Upload className="w-3 h-3" />
                    <span>UPLOAD</span>
                  </button>

                  <button
                    onClick={() => openCameraForPhoto(photo.id)}
                    className="pixel-btn-green px-2 py-1 text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                    title="Ambil Foto Kamera"
                  >
                    <Camera className="w-3 h-3" />
                    <span>KAMERA</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Footer Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-3 border-t-2 border-theme-inner">
          <button
            onClick={() => {
              soundManager.playClick();
              onClose();
            }}
            className="w-full sm:w-auto sm:ml-auto pixel-btn px-8 py-3 text-sm font-bold cursor-pointer"
          >
            SELESAI
          </button>
        </div>
      </div>

      {/* Camera Modal */}
      {showCameraModal && (
        <CameraModal
          onCapturePhoto={handleCameraCapture}
          onClose={() => setShowCameraModal(false)}
        />
      )}
    </div>
  );
};
