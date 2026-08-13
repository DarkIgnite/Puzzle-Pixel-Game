import React, { useRef } from 'react';
import { Play, Coffee, Sparkles, Clock, Upload, RefreshCw, Check } from 'lucide-react';
import { GameMode, LevelConfig, Photo } from '../types';
import { getPhotoForLevel } from '../data/photos';
import { soundManager } from '../utils/audio';

interface StartScreenProps {
  gameMode: GameMode;
  levels: LevelConfig[];
  photos: Photo[];
  onSelectLevel: (levelId: number) => void;
  onToggleGameMode: () => void;
  onUseDefaultPhotos: () => void;
  onUploadCustomPhotos: (fileList: FileList) => void;
}

export const StartScreen: React.FC<StartScreenProps> = ({
  gameMode,
  levels,
  photos,
  onSelectLevel,
  onToggleGameMode,
  onUseDefaultPhotos,
  onUploadCustomPhotos,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isUsingCustom = photos.some((p) => p.isCustom);

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
        
        {/* Floating Pixel Badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#1A120B] border-2 border-[#FFE17D] text-[#FFE17D] text-xs font-bold mb-4 animate-pixel-float">
          <Sparkles className="w-3.5 h-3.5" />
          <span>COZY PIXEL ART PUZZLE</span>
        </div>

        {/* Title */}
        <h1 className="font-pixel-title text-xl sm:text-3xl text-[#FFE17D] mb-3 leading-tight">
          COZY PIXEL PUZZLE
        </h1>

        <p className="text-xs sm:text-sm text-[#E0A96D] max-w-lg mb-6 leading-relaxed">
          Geser dan susun potongan pixel art cozy di lantai kayu hangat. Bebas dimainkan dengan sentuhan jari layar HP/Tablet atau mouse.
        </p>

        {/* Mode Selector */}
        <div className="w-full max-w-md bg-[#1A120B] p-3 border-2 border-[#5A3821] mb-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-left">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-[#3D2817] border border-[#5A3821] text-[#FFE17D]">
              {gameMode === 'relaxed' ? <Coffee className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
            </div>
            <div>
              <div className="font-bold text-xs text-[#FFE17D]">
                MODE: {gameMode === 'relaxed' ? 'SANTAI ☕' : 'TANTANGAN ⏱️'}
              </div>
              <div className="text-[11px] text-[#E0A96D]">
                {gameMode === 'relaxed' ? 'Tanpa timer, main santai.' : 'Timer menghitung waktu terbaik.'}
              </div>
            </div>
          </div>

          <button
            onClick={() => {
              soundManager.playClick();
              onToggleGameMode();
            }}
            className="pixel-btn-dark px-3 py-1.5 text-xs font-bold w-full sm:w-auto"
          >
            GANTI MODE
          </button>
        </div>

        {/* Photo Source Selector Options */}
        <div className="w-full max-w-md bg-[#1A120B] p-3 border-2 border-[#5A3821] mb-6 text-left">
          <div className="font-pixel-title text-[10px] text-[#FFE17D] mb-2">
            SUMBER FOTO PUZZLE:
          </div>
          
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => {
                soundManager.playClick();
                onUseDefaultPhotos();
              }}
              className={`p-2 border-2 text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                !isUsingCustom
                  ? 'border-[#FFE17D] bg-[#3D2817] text-[#FFE17D]'
                  : 'border-[#5A3821] bg-[#22160C] text-[#E0A96D] hover:bg-[#3D2817]'
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
              className={`p-2 border-2 text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                isUsingCustom
                  ? 'border-[#FFE17D] bg-[#3D2817] text-[#FFE17D]'
                  : 'border-[#5A3821] bg-[#22160C] text-[#E0A96D] hover:bg-[#3D2817]'
              }`}
            >
              <Upload className="w-3.5 h-3.5" />
              <span>UPLOAD FOTO</span>
            </button>
          </div>

          {isUsingCustom && (
            <div className="mt-2 text-[11px] text-[#8A9A5B] flex items-center gap-1">
              <Check className="w-3.5 h-3.5" />
              <span>Menggunakan foto buatanmu sendiri!</span>
            </div>
          )}
        </div>

      </div>

      {/* 1-Tap Level Start Cards */}
      <div className="w-full">
        <div className="font-pixel-title text-xs text-[#FFE17D] mb-3 text-center sm:text-left">
          PILIH LEVEL (1-TAP PLAY):
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {levels.map((level) => {
            const photo = getPhotoForLevel(level, photos);
            return (
              <div
                key={level.id}
                className="pixel-box p-3.5 flex flex-col items-center text-center group hover:border-[#FFE17D] transition-all"
              >
                {/* Level Image Preview */}
                <div className="w-full aspect-square bg-[#1A120B] border-2 border-[#5A3821] overflow-hidden mb-3 relative">
                  <img
                    src={photo.url}
                    alt={level.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                  />
                  <div className="absolute top-1 left-1 bg-[#1A120B] border border-[#FFE17D] px-1.5 py-0.5 text-[10px] font-bold text-[#FFE17D]">
                    {level.gridSize}x{level.gridSize} GRID
                  </div>
                </div>

                <div className="font-pixel-title text-xs text-[#FFE17D] mb-1">
                  {level.title}
                </div>
                <div className="text-xs text-[#E0A96D] mb-3">
                  {level.subtitle}
                </div>

                <button
                  onClick={() => {
                    soundManager.playClick();
                    onSelectLevel(level.id);
                  }}
                  className="w-full pixel-btn-green py-2 text-xs font-bold flex items-center justify-center gap-1.5"
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

