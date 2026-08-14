import {
  ArrowLeft,
  Camera,
  CheckCircle,
  Clock,
  Grid,
  Lock,
  Play,
  Upload,
} from 'lucide-react';
import React, { useRef, useState } from 'react';
import { getPhotoForLevel } from '../data/photos';
import { LevelConfig, LevelProgress, Photo } from '../types';
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
  const [uploadTargetLevelId, setUploadTargetLevelId] = useState<number | null>(
    null,
  );

  const [showCameraModal, setShowCameraModal] = useState<boolean>(false);
  const [cameraTargetLevelId, setCameraTargetLevelId] = useState<number | null>(
    null,
  );
  const [lockedFeedbackId, setLockedFeedbackId] = useState<number | null>(null);

  const safeProgressMap = progressMap || {};

  const isLevelUnlocked = (level: LevelConfig): boolean => {
    if (level.id === 1 || level.levelNumber === 1) return true;
    return !!safeProgressMap[level.id - 1]?.completed;
  };

  const hasUploadedPhoto = (level: LevelConfig): boolean => {
    if (!level.requiresUpload) return true;
    const photo = photos.find((p) => p.id === level.photoId);
    return !!photo?.isCustom;
  };

  const completedCount = levels.filter(
    (l) => !!safeProgressMap[l.id]?.completed,
  ).length;
  const unlockedCount = levels.filter((l) => isLevelUnlocked(l)).length;

  const handleLevelFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (
      e.target.files &&
      e.target.files.length > 0 &&
      uploadTargetLevelId !== null
    ) {
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
          const file = new File([blob], `${fileName}.jpg`, {
            type: 'image/jpeg',
          });
          onUploadPhotoForLevel(cameraTargetLevelId, file);
        });
    }
  };

  const handleLockedLevelClick = (levelId: number) => {
    soundManager.playBounce();
    setLockedFeedbackId(levelId);
    setTimeout(() => setLockedFeedbackId(null), 1500);
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
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => {
            soundManager.playClick();
            onBack();
          }}
          className="pixel-btn-dark px-3 py-1 text-xs font-bold flex items-center gap-1 cursor-pointer hover:scale-105 transition-transform"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>KEMBALI</span>
        </button>

        <div className="text-center">
          <h1 className="font-pixel-title text-sm sm:text-lg text-theme-title">
            PILIH LEVEL PUZZLE
          </h1>
          <p className="text-[11px] text-theme-sub">
            Selesaikan level secara berurutan untuk membuka tantangan baru
          </p>
        </div>

        <button
          onClick={() => {
            soundManager.playClick();
            onOpenPhotoManager();
          }}
          className="pixel-btn px-2.5 py-1 text-xs font-bold cursor-pointer hover:scale-105 transition-transform"
        >
          GANTI FOTO
        </button>
      </div>

      {/* Level Unlock Progress Overview Bar */}
      <div className="w-full pixel-box p-3 mb-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <div className="font-pixel-title text-[10px] text-theme-title">
            PROGRES LEVEL:
          </div>
          <span className="font-bold text-theme-accent">
            {completedCount}/{levels.length} Selesai ({unlockedCount} Terbuka)
          </span>
        </div>

        {/* Retro Progress Bar */}
        <div className="w-full sm:w-64 h-4 pixel-box-inner p-0.5 relative overflow-hidden">
          <div
            className="h-full bg-theme-accent transition-all duration-500"
            style={{ width: `${(completedCount / levels.length) * 100}%` }}
          />
        </div>
      </div>

      {/* All Level Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {levels.map((level) => {
          const photo = getPhotoForLevel(level, photos);
          const progress = safeProgressMap[level.id];
          const isCompleted = !!progress?.completed;
          const unlocked = isLevelUnlocked(level);
          const uploadedPhoto = hasUploadedPhoto(level);
          const isFeedbackActive = lockedFeedbackId === level.id;

          return (
            <div
              key={level.id}
              className={`pixel-box p-4 flex flex-col justify-between group transition-all relative ${
                unlocked
                  ? 'cursor-pointer hover:border-theme-title hover:shadow-[6px_6px_0px_var(--box-shadow)]'
                  : 'opacity-85 border-theme-inner bg-theme-wall cursor-not-allowed select-none'
              } ${isFeedbackActive ? 'ring-2 ring-red-500 animate-pulse' : ''}`}
              onClick={() => {
                if (!unlocked) {
                  handleLockedLevelClick(level.id);
                  return;
                }
                if (level.requiresUpload && !uploadedPhoto) return;
                soundManager.playClick();
                onSelectLevel(level.id);
              }}
            >
              {/* Photo Thumbnail */}
              <div className="w-full aspect-square pixel-box-inner overflow-hidden mb-3 relative bg-black/20">
                <img
                  src={photo.url}
                  alt={photo.name}
                  className={`w-full h-full object-cover transition-transform duration-200 ${
                    unlocked
                      ? 'group-hover:scale-105'
                      : 'grayscale opacity-35 brightness-75'
                  }`}
                />

                {/* Status Badges */}
                {isCompleted && (
                  <div className="absolute top-2 right-2 pixel-btn-green text-[10px] font-bold px-1.5 py-0.5 flex items-center gap-1 shadow">
                    <CheckCircle className="w-3 h-3" />
                    <span>SELESAI</span>
                  </div>
                )}

                {/* Locked Overlay with retro badge */}
                {!unlocked && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/55 p-2 text-center">
                    <div className="w-12 h-12 pixel-box-inner bg-black/80 flex items-center justify-center mb-1.5 border border-theme-title shadow-[2px_2px_0px_#000]">
                      <Lock className="w-6 h-6 text-[#FFE17D]" />
                    </div>
                    <span className="font-pixel-title text-[9px] text-[#FFE17D] bg-black/80 px-2 py-0.5 border border-[#FFE17D] rounded-none">
                      🔒 TERKUNCI
                    </span>
                  </div>
                )}

                {/* Grid Badge */}
                <div className="absolute bottom-2 left-2 bg-theme-main border border-theme-title text-theme-title text-[10px] font-bold px-1.5 py-0.5 flex items-center gap-1">
                  <Grid className="w-3 h-3 text-theme-title" />
                  <span>
                    GRID {level.gridSize}x{level.gridSize}
                  </span>
                </div>
              </div>

              {/* Title & Info */}
              <div className="flex-1">
                <div className="flex items-center justify-between gap-1 mb-1">
                  <h3
                    className={`font-pixel-title text-xs ${unlocked ? 'text-theme-title' : 'text-theme-sub'}`}
                  >
                    {level.title}
                  </h3>
                  {!unlocked && (
                    <Lock className="w-3 h-3 text-theme-sub shrink-0" />
                  )}
                </div>

                <p className="text-xs text-theme-sub mb-2">
                  {photo.name} • {level.subtitle}
                </p>

                {/* Best time or Locked hint */}
                {unlocked ? (
                  progress?.bestTimeSeconds ? (
                    <div className="flex items-center gap-1 text-xs text-theme-accent font-bold mb-3">
                      <Clock className="w-3.5 h-3.5" />
                      <span>
                        Waktu: {Math.floor(progress.bestTimeSeconds / 60)}m{' '}
                        {progress.bestTimeSeconds % 60}s
                      </span>
                    </div>
                  ) : (
                    <div className="text-xs text-theme-sub opacity-75 italic mb-3">
                      Siap dimainkan!
                    </div>
                  )
                ) : (
                  <div className="text-[11px] text-[#E07A5F] font-bold flex items-center gap-1 mb-3 bg-theme-inner px-2 py-1 border border-theme-inner">
                    <Lock className="w-3 h-3 shrink-0" />
                    <span>Selesaikan Level {level.id - 1} untuk membuka</span>
                  </div>
                )}
              </div>

              {/* Action Button */}
              {!unlocked ? (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleLockedLevelClick(level.id);
                  }}
                  className="w-full pixel-btn-dark py-2 text-xs font-bold flex items-center justify-center gap-1.5 opacity-60 cursor-not-allowed"
                >
                  <Lock className="w-3.5 h-3.5 text-[#dfc7c0]" />
                  <span>TERKUNCI (SELESAIKAN LVL {level.id - 1})</span>
                </button>
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
                    <span>KAMERA</span>
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    soundManager.playClick();
                    onSelectLevel(level.id);
                  }}
                  className="w-full pixel-btn-green py-2 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer hover:scale-[1.02] transition-transform"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>MAIN SEKARANG</span>
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
