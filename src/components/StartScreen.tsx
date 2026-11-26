import {
  ArrowRight,
  Camera,
  Check,
  Clock,
  Coffee,
  Grid,
  Lock,
  Play,
  RefreshCw,
  Upload,
  UserPlus,
} from 'lucide-react';
import React, { useRef, useState } from 'react';
import { getPhotoForLevel } from '../data/photos';
import {
  GameMode,
  LevelConfig,
  LevelProgress,
  Photo,
} from '../types';
import { soundManager } from '../utils/audio';
import { CameraModal } from './CameraModal';

interface StartScreenProps {
  gameMode: GameMode;
  levels: LevelConfig[];
  photos: Photo[];
  progressMap?: Record<number, LevelProgress>;
  onSelectLevel: (levelId: number) => void;
  onOpenLevelSelect: () => void;
  onSelectGameMode: (mode: GameMode) => void;
  onUseDefaultPhotos: () => void;
  onUploadCustomPhotos: (fileList: FileList) => void;
  onUploadPhotoForLevel: (levelId: number, file: File) => void;
  onNewPlayer: () => void;
}

export const StartScreen: React.FC<StartScreenProps> = ({
  gameMode,
  levels,
  photos,
  progressMap = {},
  onSelectLevel,
  onOpenLevelSelect,
  onSelectGameMode,
  onUseDefaultPhotos,
  onUploadCustomPhotos,
  onUploadPhotoForLevel,
  onNewPlayer,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const levelFileInputRef = useRef<HTMLInputElement>(null);
  const [uploadTargetLevelId, setUploadTargetLevelId] = useState<number | null>(
    null,
  );

  const [showCameraModal, setShowCameraModal] = useState<boolean>(false);
  const [cameraTargetLevelId, setCameraTargetLevelId] = useState<number | null>(
    null,
  );

  const isUsingCustom = photos.some(
    (p) => p.isCustom && ['photo-1', 'photo-2', 'photo-3'].includes(p.id),
  );

  const safeProgressMap = progressMap || {};

  // Determine which 3 levels to show based on progress
  const completedIds = (
    Object.entries(safeProgressMap) as [string, LevelProgress][]
  )
    .filter(([, p]) => p?.completed)
    .map(([id]) => Number(id));
  const maxCompleted = completedIds.length > 0 ? Math.max(...completedIds) : 0;

  let startIdx = Math.max(0, maxCompleted - 1);
  if (startIdx + 3 > levels.length) startIdx = Math.max(0, levels.length - 3);
  const visibleLevels: LevelConfig[] = levels.slice(startIdx, startIdx + 3);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      soundManager.playSnap();
      onUploadCustomPhotos(e.target.files);
      // Reset supaya file yang sama bisa dipilih lagi
      e.target.value = '';
    }
  };

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

  const openCameraForLevel = (levelId?: number) => {
    soundManager.playClick();
    setCameraTargetLevelId(levelId || null);
    setShowCameraModal(true);
  };

  const handleCameraCapture = (dataUrl: string, fileName: string) => {
    setShowCameraModal(false);
    if (cameraTargetLevelId) {
      // Create file object to pass to handler
      fetch(dataUrl)
        .then((res) => res.blob())
        .then((blob) => {
          const file = new File([blob], `${fileName}.jpg`, {
            type: 'image/jpeg',
          });
          onUploadPhotoForLevel(cameraTargetLevelId, file);
        });
    } else {
      // General camera upload for level 1-3
      fetch(dataUrl)
        .then((res) => res.blob())
        .then((blob) => {
          const file = new File([blob], `${fileName}.jpg`, {
            type: 'image/jpeg',
          });
          const dt = new DataTransfer();
          dt.items.add(file);
          onUploadCustomPhotos(dt.files);
        });
    }
  };

  const isLevelUnlocked = (level: LevelConfig): boolean => {
    if (level.id === 1 || level.levelNumber === 1) return true;
    return !!safeProgressMap[level.id - 1]?.completed;
  };

  const hasUploadedPhoto = (level: LevelConfig): boolean => {
    if (!level.requiresUpload) return true;
    const photo = photos.find((p) => p.id === level.photoId);
    return !!photo?.isCustom;
  };

  const hasProgress = completedIds.length > 0;
  const hasCustomPhoto = photos.some((p) => p.isCustom);

  // Level yang langsung dimainkan dari tombol utama
  const nextLevel =
    levels.find((l) => !safeProgressMap[l.id]?.completed) ?? levels[0];

  const modeOptions = [
    { value: 'relaxed' as GameMode, label: 'SANTAI', Icon: Coffee },
    { value: 'challenge' as GameMode, label: 'TANTANGAN', Icon: Clock },
  ];

  const allDone = levels.every((l) => !!safeProgressMap[l.id]?.completed);
  const startLabel = allDone
    ? 'MAIN DARI LEVEL 1'
    : hasProgress
      ? `LANJUT LEVEL ${nextLevel.id}`
      : 'MULAI MAIN';

  return (
    <div className="w-full max-w-4xl mx-auto px-3 py-6 flex flex-col items-center justify-center font-['Pixelify_Sans',sans-serif]">
      {/* Hidden File Input for bulk upload (levels 1-3) */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleFileChange}
        className="hidden"
      />
      {/* Hidden File Input for single-level upload (levels 4-7) */}
      <input
        ref={levelFileInputRef}
        type="file"
        accept="image/*"
        onChange={handleLevelFileChange}
        className="hidden"
      />

      {/* Main Pixel Hero Container */}
      <div className="w-full pixel-box p-5 sm:p-8 text-center flex flex-col items-center relative overflow-hidden mb-6">
        <h1 className="font-pixel-title text-xl sm:text-3xl text-theme-title mb-3 leading-tight">
          COZY PIXEL PUZZLE
        </h1>

        <p className="text-sm sm:text-base text-theme-sub max-w-lg mb-4 leading-relaxed">
          Susun potongan gambar sampai utuh. Bisa pakai sentuhan jari atau
          mouse.
        </p>

        {/* Tombol utama: sekali ketuk langsung main */}
        <button
          onClick={() => {
            soundManager.playClick();
            onSelectLevel(nextLevel.id);
          }}
          className="w-full max-w-md pixel-btn-green py-4 text-lg font-bold flex items-center justify-center gap-2 cursor-pointer mb-4"
        >
          <Play className="w-5 h-5 fill-current" />
          <span>{startLabel}</span>
        </button>

        {/* Cara Main */}
        <ol className="w-full max-w-md grid grid-cols-3 gap-2 mb-4">
          {['Ambil fotomu lewat kamera', 'Ketuk atau tarik potongan ke kotak', 'Ada centang berarti benar'].map(
            (text, i) => (
              <li
                key={text}
                className="pixel-box-inner p-2 flex flex-col items-center gap-1 text-xs text-theme-sub leading-snug"
              >
                <span className="font-pixel-title text-sm text-theme-title">
                  {i + 1}
                </span>
                {text}
              </li>
            ),
          )}
        </ol>

        {/* Mode Selector */}
        <div className="w-full max-w-md pixel-box-inner p-3 mb-4 text-left">
          <div className="font-pixel-title text-[10px] text-theme-title mb-2">
            MODE MAIN:
          </div>
          <div className="grid grid-cols-2 gap-2">
            {modeOptions.map(({ value, label, Icon }) => (
              <button
                key={value}
                aria-pressed={gameMode === value}
                onClick={() => {
                  soundManager.playClick();
                  onSelectGameMode(value);
                }}
                className={`p-2.5 border-2 text-sm font-bold flex items-center justify-center gap-1.5 cursor-pointer ${
                  gameMode === value
                    ? 'pixel-btn-green'
                    : 'border-theme-inner bg-theme-wall text-theme-sub'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{label}</span>
                {gameMode === value && <Check className="w-4 h-4" />}
              </button>
            ))}
          </div>
          <p className="text-xs text-theme-sub mt-2">
            {gameMode === 'relaxed'
              ? 'Tanpa waktu, ada gambar bayangan sebagai panduan.'
              : 'Dihitung waktunya, tanpa gambar bayangan.'}
          </p>
        </div>

        {/* Photo Source for levels 1-3 */}
        <div className="w-full max-w-md pixel-box-inner p-3 mb-2 text-left">
          <div className="font-pixel-title text-[10px] text-theme-title mb-2">
            FOTO PUZZLE (OPSIONAL):
          </div>

          <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
            <button
              onClick={() => {
                soundManager.playClick();
                onUseDefaultPhotos();
              }}
              className={`p-2.5 border-2 text-xs font-bold flex items-center justify-center gap-1 transition-all cursor-pointer ${
                !isUsingCustom
                  ? 'border-theme-title bg-theme-main text-theme-title'
                  : 'border-theme-inner bg-theme-wall text-theme-sub hover:bg-theme-main'
              }`}
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>BAWAAN</span>
            </button>

            <button
              onClick={() => {
                soundManager.playClick();
                fileInputRef.current?.click();
              }}
              className={`p-2.5 border-2 text-xs font-bold flex items-center justify-center gap-1 transition-all cursor-pointer ${
                isUsingCustom
                  ? 'border-theme-title bg-theme-main text-theme-title'
                  : 'border-theme-inner bg-theme-wall text-theme-sub hover:bg-theme-main'
              }`}
            >
              <Upload className="w-3.5 h-3.5" />
              <span>GALERI</span>
            </button>

            <button
              onClick={() => openCameraForLevel()}
              className="p-2 border-2 border-theme-inner bg-theme-wall text-theme-title hover:bg-theme-main text-xs font-bold flex items-center justify-center gap-1 transition-all cursor-pointer"
            >
              <Camera className="w-3.5 h-3.5" />
              <span>KAMERA</span>
            </button>
          </div>

          <p className="mt-2 text-xs text-theme-sub">
            {isUsingCustom
              ? 'Foto buatanmu sedang dipakai.'
              : 'Galeri: maks. 3 foto (Level 1-3). Kamera: Level 1.'}
          </p>
        </div>

        {(hasProgress || hasCustomPhoto) && (
          <button
            onClick={() => {
              soundManager.playClick();
              onNewPlayer();
            }}
            className="mt-3 pixel-btn-dark px-4 py-2.5 text-sm font-bold flex items-center gap-2 cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>PEMAIN BARU</span>
          </button>
        )}
      </div>

      {/* 3 Level Cards Section */}
      <div className="w-full">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2 mb-3">
          <div className="font-pixel-title text-xs text-theme-title text-center sm:text-left">
            LEVEL:
          </div>

          <button
            onClick={() => {
              soundManager.playClick();
              onOpenLevelSelect();
            }}
            className="pixel-btn px-3 py-1.5 text-xs font-bold flex items-center gap-1.5 cursor-pointer hover:scale-105 transition-transform"
            title="Buka Halaman Pilih Semua Level"
          >
            <Grid className="w-3.5 h-3.5" />
            <span>SEMUA LEVEL</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {visibleLevels.map((level) => {
            const photo = getPhotoForLevel(level, photos);
            const unlocked = isLevelUnlocked(level);
            const uploadedPhoto = hasUploadedPhoto(level);
            const completed = !!progressMap[level.id]?.completed;

            return (
              <div
                key={level.id}
                className="pixel-box p-3.5 flex flex-col items-center text-center group hover:border-theme-title transition-all"
              >
                {/* Level Image Preview */}
                <div className="w-full aspect-square pixel-box-inner overflow-hidden mb-3 relative">
                  <img
                    src={photo.url}
                    alt={level.title}
                    className={`w-full h-full object-cover group-hover:scale-105 transition-transform duration-200 ${!unlocked ? 'opacity-40 grayscale' : ''}`}
                  />
                  <div className="absolute top-1 left-1 bg-theme-main border border-theme-title px-1.5 py-0.5 text-[10px] font-bold text-theme-title">
                    {level.gridSize}x{level.gridSize} GRID
                  </div>
                  {completed && (
                    <div className="absolute top-1 right-1 pixel-btn-green text-[10px] font-bold px-1.5 py-0.5 flex items-center gap-1">
                      <Check className="w-3 h-3" />
                      <span>SELESAI</span>
                    </div>
                  )}
                  {!unlocked && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                      <Lock className="w-8 h-8 text-[#FFE17D] drop-shadow-[2px_2px_0px_#000]" />
                    </div>
                  )}
                </div>

                <div className="font-pixel-title text-xs text-theme-title mb-1">
                  {level.title}
                </div>
                <div className="text-xs text-theme-sub mb-3 flex-1">
                  {level.subtitle}
                </div>

                {/* Action button always at bottom */}
                <div className="w-full mt-auto">
                  {!unlocked ? (
                    <div className="w-full pixel-btn-dark py-2 text-xs font-bold flex items-center justify-center gap-1.5 opacity-60 cursor-not-allowed">
                      <Lock className="w-3.5 h-3.5 text-[#dfc7c0]" />
                      <span>TERKUNCI</span>
                    </div>
                  ) : level.requiresUpload && !uploadedPhoto ? (
                    <div className="grid grid-cols-2 gap-1.5 w-full">
                      <button
                        onClick={() => {
                          soundManager.playClick();
                          triggerLevelUpload(level.id);
                        }}
                        className="pixel-btn py-2 text-[11px] font-bold flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <Upload className="w-3 h-3" />
                        <span>UPLOAD</span>
                      </button>

                      <button
                        onClick={() => openCameraForLevel(level.id)}
                        className="pixel-btn-green py-2 text-[11px] font-bold flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <Camera className="w-3 h-3" />
                        <span>KAMERA</span>
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => {
                        soundManager.playClick();
                        onSelectLevel(level.id);
                      }}
                      className="w-full pixel-btn-green py-2 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Play className="w-4 h-4 fill-current" />
                      <span>MAIN SEKARANG</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
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
