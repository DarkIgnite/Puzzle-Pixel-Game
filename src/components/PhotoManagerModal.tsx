import React, { useRef, useState } from 'react';
import { X, Upload, Image as ImageIcon, FolderOpen, Camera } from 'lucide-react';
import { Photo } from '../types';
import { processUploadedFile } from '../utils/canvasHelper';
import { soundManager } from '../utils/audio';
import { CameraModal } from './CameraModal';

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

  const [showCameraModal, setShowCameraModal] = useState<boolean>(false);
  const [cameraTargetPhotoId, setCameraTargetPhotoId] = useState<string | null>(null);

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

  const openCameraForPhoto = (photoId: string) => {
    soundManager.playClick();
    setCameraTargetPhotoId(photoId);
    setShowCameraModal(true);
  };

  const openCameraNew = () => {
    soundManager.playClick();
    setCameraTargetPhotoId(null);
    setShowCameraModal(true);
  };

  const handleCameraCapture = (dataUrl: string, fileName: string) => {
    setShowCameraModal(false);
    if (cameraTargetPhotoId) {
      onUploadPhoto(cameraTargetPhotoId, dataUrl);
    } else {
      const newPhoto: Photo = {
        id: `custom-photo-${Date.now()}`,
        name: fileName,
        description: 'Foto kamera',
        url: dataUrl,
        placeholderPath: `assets/photos/custom-${Date.now()}.jpg`,
        isCustom: true,
      };
      onAddNewPhoto(newPhoto);
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
          Ganti foto default dengan foto dari galeri atau langsung foto menggunakan kamera HP/Laptop!
        </p>

        {/* Photos Grid */}
        <div className="flex-1 overflow-y-auto pr-1 grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
          {photos.map((photo) => (
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
                  {photo.isCustom ? 'Custom Image' : photo.placeholderPath}
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
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={triggerUploadNew}
              className="flex-1 sm:flex-none pixel-btn-green px-3 py-2 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <ImageIcon className="w-4 h-4" />
              <span>UPLOAD BARU</span>
            </button>

            <button
              onClick={openCameraNew}
              className="flex-1 sm:flex-none pixel-btn-dark px-3 py-2 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Camera className="w-4 h-4" />
              <span>FOTO KAMERA 📸</span>
            </button>
          </div>

          <button
            onClick={() => {
              soundManager.playClick();
              onClose();
            }}
            className="w-full sm:w-auto pixel-btn px-5 py-2 text-xs font-bold cursor-pointer"
          >
            SELESAI & SIMPAN
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


