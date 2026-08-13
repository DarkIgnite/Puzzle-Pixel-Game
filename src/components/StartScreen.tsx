import { Check, Clock, Coffee, Play, RefreshCw, Upload } from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import { getPhotoForLevel } from '../data/photos';
import { GameMode, LevelConfig, Photo, ThemeMode } from '../types';
import { soundManager } from '../utils/audio';

interface StartScreenProps {
  gameMode: GameMode;
  theme: ThemeMode;
  levels: LevelConfig[];
  photos: Photo[];
  onSelectLevel: (levelId: number) => void;
  onToggleGameMode: () => void;
  onSelectGameMode: (mode: GameMode) => void;
  onSelectTheme: (theme: ThemeMode) => void;
  onUseDefaultPhotos: () => void;
  onUploadCustomPhotos: (fileList: FileList) => void;
}

export const StartScreen: React.FC<StartScreenProps> = ({
  gameMode,
  theme,
  levels,
  photos,
  onSelectLevel,
  onSelectGameMode,
  onUseDefaultPhotos,
  onUploadCustomPhotos,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showModeMenu, setShowModeMenu] = useState(false);
  const modeMenuRef = useRef<HTMLDivElement>(null);

  const isUsingCustom = photos.some((p) => p.isCustom);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        modeMenuRef.current &&
        !modeMenuRef.current.contains(e.target as Node)
      ) {
        setShowModeMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      soundManager.playSnap();
      onUploadCustomPhotos(e.target.files);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-3 py-6 flex flex-col items-center justify-center font-['Pixelify_Sans',sans-serif]">
      {/* Hidden File Input for Custom Upload */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Main Pixel Hero Container */}
      <div className="w-full pixel-box p-5 sm:p-8 text-center flex flex-col items-center relative overflow-hidden mb-6">
        {/* Floating Pixel Badge
                <div className="inline-flex items-center gap-2 px-3 py-1 pixel-box-inner text-theme-title text-xs font-bold mb-4 animate-pixel-float">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>COZY PIXEL ART PUZZLE</span>
                </div> */}

        {/* Title */}
        <h1 className="font-pixel-title text-xl sm:text-3xl text-theme-title mb-3 leading-tight">
          COZY PIXEL PUZZLE
        </h1>

        <p className="text-xs sm:text-sm text-theme-sub max-w-lg mb-6 leading-relaxed">
          Geser dan susun potongan pixel art cozy di lantai kayu hangat. Bebas
          dimainkan dengan sentuhan jari layar HP/Tablet atau mouse.
        </p>

        {/* Mode Selector Dropdown Container */}
        <div
          ref={modeMenuRef}
          className="w-full max-w-md pixel-box-inner p-3 mb-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-left relative"
        >
          <div className="flex items-center gap-2.5">
            <div className="p-2 pixel-btn-dark text-theme-title">
              {gameMode === 'relaxed' ? (
                <Coffee className="w-4 h-4" />
              ) : (
                <Clock className="w-4 h-4" />
              )}
            </div>
            <div>
              <div className="font-bold text-xs text-theme-title">
                MODE: {gameMode === 'relaxed' ? 'SANTAI' : 'TANTANGAN'}
              </div>
              <div className="text-[11px] text-theme-sub">
                {gameMode === 'relaxed'
                  ? 'Tanpa timer, main santai.'
                  : 'Timer menghitung waktu terbaik.'}
              </div>
            </div>
          </div>

          <div className="relative w-full sm:w-auto">
            <button
              onClick={() => {
                soundManager.playClick();
                setShowModeMenu((prev) => !prev);
              }}
              className="pixel-btn-dark px-3 py-1.5 text-xs font-bold w-full sm:w-auto flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <span>PILIH MODE</span>
              <Clock className="w-3.5 h-3.5" />
            </button>

            {/* Mode Dropdown Menu */}
            {showModeMenu && (
              <div className="absolute right-0 mt-2 w-56 pixel-box p-2 z-50 shadow-xl animate-in fade-in zoom-in-95 duration-100">
                <div className="font-pixel-title text-[10px] text-theme-title px-2 py-1 border-b border-theme-inner mb-1.5 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  PILIH MODE GAME:
                </div>

                <div className="flex flex-col gap-1">
                  <button
                    onClick={() => {
                      soundManager.playClick();
                      onSelectGameMode('relaxed');
                      setShowModeMenu(false);
                    }}
                    className={`w-full p-2 text-left text-xs font-bold flex items-center justify-between border transition-all cursor-pointer ${
                      gameMode === 'relaxed'
                        ? 'pixel-box-inner border-theme-title text-theme-title'
                        : 'border-transparent hover:bg-theme-inner text-theme-sub'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Coffee className="w-3.5 h-3.5 text-theme-title" />
                      <div>
                        <div className="leading-tight">MODE SANTAI</div>
                        <div className="text-[10px] font-normal opacity-80">
                          Tanpa timer
                        </div>
                      </div>
                    </div>
                    {gameMode === 'relaxed' && (
                      <Check className="w-3.5 h-3.5 text-theme-title shrink-0" />
                    )}
                  </button>

                  <button
                    onClick={() => {
                      soundManager.playClick();
                      onSelectGameMode('challenge');
                      setShowModeMenu(false);
                    }}
                    className={`w-full p-2 text-left text-xs font-bold flex items-center justify-between border transition-all cursor-pointer ${
                      gameMode === 'challenge'
                        ? 'pixel-box-inner border-theme-title text-theme-title'
                        : 'border-transparent hover:bg-theme-inner text-theme-sub'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Clock className="w-3.5 h-3.5 text-theme-title" />
                      <div>
                        <div className="leading-tight">MODE TANTANGAN</div>
                        <div className="text-[10px] font-normal opacity-80">
                          Timer aktif
                        </div>
                      </div>
                    </div>
                    {gameMode === 'challenge' && (
                      <Check className="w-3.5 h-3.5 text-theme-title shrink-0" />
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Photo Source Selector Options */}
        <div className="w-full max-w-md pixel-box-inner p-3 mb-2 text-left">
          <div className="font-pixel-title text-[10px] text-theme-title mb-2">
            SUMBER FOTO PUZZLE:
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => {
                soundManager.playClick();
                onUseDefaultPhotos();
              }}
              className={`p-2 border-2 text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                !isUsingCustom
                  ? 'border-theme-title bg-theme-main text-theme-title'
                  : 'border-theme-inner bg-theme-wall text-theme-sub hover:bg-theme-main'
              }`}
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>FOTO PIXEL</span>
            </button>

            <button
              onClick={() => {
                soundManager.playClick();
                fileInputRef.current?.click();
              }}
              className={`p-2 border-2 text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                isUsingCustom
                  ? 'border-theme-title bg-theme-main text-theme-title'
                  : 'border-theme-inner bg-theme-wall text-theme-sub hover:bg-theme-main'
              }`}
            >
              <Upload className="w-3.5 h-3.5" />
              <span>UPLOAD FOTO</span>
            </button>
          </div>

          {isUsingCustom && (
            <div className="mt-2 text-[11px] flex items-center gap-1">
              <Check className="w-3.5 h-3.5" />
              <span>Menggunakan foto buatanmu sendiri!</span>
            </div>
          )}
        </div>
      </div>

      {/* 1-Tap Level Start Cards */}
      <div className="w-full">
        <div className="font-pixel-title text-xs text-theme-title mb-3 text-center sm:text-left">
          PILIH LEVEL (1-TAP PLAY):
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {levels.map((level) => {
            const photo = getPhotoForLevel(level, photos);
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
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                  />
                  <div className="absolute top-1 left-1 bg-theme-main border border-theme-title px-1.5 py-0.5 text-[10px] font-bold text-theme-title">
                    {level.gridSize}x{level.gridSize} GRID
                  </div>
                </div>

                <div className="font-pixel-title text-xs text-theme-title mb-1">
                  {level.title}
                </div>
                <div className="text-xs text-theme-sub mb-3">
                  {level.subtitle}
                </div>

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
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
