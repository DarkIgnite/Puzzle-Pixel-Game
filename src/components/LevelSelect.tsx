import React, { useRef, useState } from 'react';
import { ArrowLeft, Play, Grid, CheckCircle, Clock, Lock, Upload, Camera } from 'lucide-react';
import { LevelConfig, LevelProgress, Photo } from '../types';
import { getPhotoForLevel } from '../data/photos';
import { soundManager } from '../utils/audio';
import { CameraModal } from './CameraModal';

interface LevelSelectProps {
  levels: LevelConfig[];
  photos: Photo[];
  progressMap?: Record<number, LevelProgress>;
  onSelectLevel: (levelId: number) => void;
  onBack: () => void;
  onOpenPhotoManager: () => void;
  onUploadPhotoForLevel: (levelId: number, file: File) => void;
}

export const LevelSelect: React.FC<LevelSelectProps> = ({
  levels,
  photos,
  progressMap = {},
  onSelectLevel,
  onBack,
  onOpenPhotoManager,
  onUploadPhotoForLevel,
}) => {
  const levelFileInputRef = useRef<HTMLInputElement>(null);
  const [uploadTargetLevelId, setUploadTargetLevelId] = useState<number | null>(null);

  const [showCameraModal, setShowCameraModal] = useState<boolean>(false);
  const [cameraTargetLevelId, setCameraTargetLevelId] = useState<number | null>(null);

  const safeProgressMap = progressMap || {};

  const isLevelUnlocked = (level: LevelConfig): boolean => {
    if (level.id <= 3) return true;
    return !!safeProgressMap[level.id - 1]?.completed;
  };

  const hasUploadedPhoto = (level: LevelConfig): boolean => {
    if (!level.requiresUpload) return true;
    const photo = photos.find((p) => p.id === level.photoId);
    return !!(photo?.isCustom);
  };

  const handleLevelFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0 && uploadTargetLevelId !== null) {
      soundManager.playSnap();
      onUploadPhotoForLevel(uploadTargetLevelId, e.target.files[0]);
      setUploadTargetLevelId(null);
      e.target.value = '';
    }
  };

  const triggerLevelUpload = (levelId: number) => {
    setUploadTargetLevelId(levelId);
    setTimeout(() => levelFileInputRef.current?.click(), 50);
  };

  const openCameraForLevel = (levelId: number) => {
    soundManager.playClick();
    setCameraTargetLevelId(levelId);
    setShowCameraModal(true);
  };

  const handleCameraCapture = (dataUrl: string, fileName: string) => {
    setShowCameraModal(false);
    if (cameraTargetLevelId) {
      fetch(dataUrl)
        .then((res) => res.blob())
        .then((blob) => {
          const file = new File([blob], `${fileName}.jpg`, { type: 'image/jpeg' });
          onUploadPhotoForLevel(cameraTargetLevelId, file);
        });
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-3 py-6 font-['Pixelify_Sans',sans-serif]">
      <input
        ref={levelFileInputRef}
        type="file"
        accept="image/*"
        onChange={handleLevelFileChange}
        className="hidden"
      />

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={() => {
            soundManager.playClick();
            onBack();
          }}
          className="pixel-btn-dark px-3 py-1 text-xs font-bold flex items-center gap-1 cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>KEMBALI</span>
        </button>

        <div className="text-center">
          <h1 className="font-pixel-title text-sm sm:text-lg text-theme-title">
            PILIH LEVEL PUZZLE
          </h1>
        </div>

        <button
          onClick={() => {
            soundManager.playClick();
            onOpenPhotoManager();
          }}
          className="pixel-btn px-2.5 py-1 text-xs font-bold cursor-pointer"
        >
          GANTI FOTO
        </button>
      </div>

      {/* All 7 Level Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {levels.map((level) => {
          const photo = getPhotoForLevel(level, photos);
          const progress = progressMap[level.id];
          const isCompleted = progress?.completed;
          const unlocked = isLevelUnlocked(level);
          const uploadedPhoto = hasUploadedPhoto(level);

          return (
            <div
              key={level.id}
              className={`pixel-box p-4 flex flex-col justify-between group transition-all ${unlocked ? 'cursor-pointer hover:border-theme-title' : 'opacity-75'}`}
              onClick={() => {
                if (!unlocked) return;
                if (level.requiresUpload && !uploadedPhoto) return;
                soundManager.playClick();
                onSelectLevel(level.id);
              }}
            >
              {/* Photo Thumbnail */}
              <div className="w-full aspect-square pixel-box-inner overflow-hidden mb-3 relative">
                <img
                  src={photo.url}
                  alt={photo.name}
                  className={`w-full h-full object-cover transition-transform duration-200 ${unlocked ? 'group-hover:scale-105' : 'grayscale opacity-50'}`}
                />

                {/* Completed Badge */}
                {isCompleted && (
                  <div className="absolute top-2 right-2 pixel-btn-green text-[10px] font-bold px-1.5 py-0.5 flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" />
                    <span>SELESAI</span>
                  </div>
                )}

                {/* Lock overlay */}
                {!unlocked && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Lock className="w-10 h-10 text-theme-title opacity-70" />
                  </div>
                )}

                {/* Grid Badge */}
                <div className="absolute bottom-2 left-2 bg-theme-main border border-theme-title text-theme-title text-[10px] font-bold px-1.5 py-0.5 flex items-center gap-1">
                  <Grid className="w-3 h-3 text-theme-title" />
                  <span>GRID {level.gridSize}x{level.gridSize}</span>
                </div>
              </div>

              {/* Title & Info */}
              <div className="flex-1">
                <h3 className="font-pixel-title text-xs text-theme-title mb-1">
                  {level.title}
                </h3>
                <p className="text-xs text-theme-sub mb-2">
                  {photo.name} • {level.subtitle}
                </p>

                {/* Best time / stats */}
                {progress?.bestTimeSeconds ? (
                  <div className="flex items-center gap-1 text-xs text-theme-accent font-bold mb-3">
                    <Clock className="w-3.5 h-3.5" />
                    <span>Waktu: {Math.floor(progress.bestTimeSeconds / 60)}m {progress.bestTimeSeconds % 60}s</span>
                  </div>
                ) : (
                  <div className="text-xs text-theme-sub opacity-70 italic mb-3">
                    {unlocked ? 'Belum dimainkan' : 'Selesaikan level sebelumnya'}
                  </div>
                )}
              </div>

              {/* Action Button */}
              {!unlocked ? (
                <div className="w-full pixel-btn-dark py-2 text-xs font-bold flex items-center justify-center gap-1.5 opacity-60">
                  <Lock className="w-3.5 h-3.5" />
                  <span>TERKUNCI</span>
                </div>
              ) : level.requiresUpload && !uploadedPhoto ? (
                <div className="grid grid-cols-2 gap-1.5 w-full">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      soundManager.playClick();
                      triggerLevelUpload(level.id);
                    }}
                    className="pixel-btn py-2 text-[11px] font-bold flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <Upload className="w-3 h-3" />
                    <span>UPLOAD</span>
                  </button>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      openCameraForLevel(level.id);
                    }}
                    className="pixel-btn-green py-2 text-[11px] font-bold flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <Camera className="w-3 h-3" />
                    <span>KAMERA 📸</span>
                  </button>
                </div>
              ) : (
                <button className="w-full pixel-btn-green py-2 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer">
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>MAIN</span>
                </button>
              )}
            </div>
          );
        })}
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
