import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { ArrowRight, RotateCcw, Grid, Clock, Sparkles } from 'lucide-react';
import { GameMode, LevelConfig, Photo } from '../types';
import { soundManager } from '../utils/audio';

interface VictoryModalProps {
  level: LevelConfig;
  photo: Photo;
  imageUrl: string;
  gameMode: GameMode;
  timeSeconds: number;
  movesCount: number;
  onNextLevel: () => void;
  onBackToLevels: () => void;
  onReplay: () => void;
}

export const VictoryModal: React.FC<VictoryModalProps> = ({
  level,
  photo,
  imageUrl,
  gameMode,
  timeSeconds,
  movesCount,
  onNextLevel,
  onBackToLevels,
  onReplay,
}) => {

  useEffect(() => {
    try {
      confetti({
        particleCount: 60,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#E03131', '#2B8A3E', '#FFE17D', '#E0A96D'],
      });
    } catch {
      // Ignore
    }
  }, []);

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 font-['Pixelify_Sans',sans-serif]">
      <div className="pixel-box max-w-md w-full p-6 relative flex flex-col items-center text-center">
        
        {/* Floating Badge */}
        <div className="w-12 h-12 pixel-btn-green flex items-center justify-center shadow-[3px_3px_0px_#000] mb-3 animate-bounce">
          <Sparkles className="w-6 h-6" />
        </div>

        <div className="font-pixel-title text-xs text-theme-title mb-1">
          LEVEL SELESAI!
        </div>

        <h2 className="font-pixel-title text-base text-theme-title mb-2">
          SELAMAT! PUZZLE COZY!
        </h2>

        <p className="text-xs text-theme-sub mb-4">
          Kamu telah menyusun "<span className="text-theme-title">{photo.name}</span>" dengan sempurna!
        </p>

        {/* Full Image Showcase */}
        <div className="w-full max-w-[220px] aspect-square pixel-box-inner shadow-[4px_4px_0px_#000] mb-4">
          <img
            src={imageUrl}
            alt={photo.name}
            className="w-full h-full object-cover"
          />
        </div>

        {/* Stats Row */}
        <div className="w-full grid grid-cols-2 gap-2 mb-5 pixel-box-inner p-2.5">
          <div className="flex flex-col items-center justify-center border-r border-theme-inner pr-2">
            <span className="text-[10px] text-theme-sub flex items-center gap-1 mb-0.5">
              <Grid className="w-3.5 h-3.5 text-theme-title" />
              GERAKAN
            </span>
            <span className="font-pixel-title text-xs text-theme-title">
              {movesCount}
            </span>
          </div>

          <div className="flex flex-col items-center justify-center pl-2">
            <span className="text-[10px] text-theme-sub flex items-center gap-1 mb-0.5">
              <Clock className="w-3.5 h-3.5 text-theme-accent" />
              WAKTU
            </span>
            <span className="font-pixel-title text-xs text-theme-title">
              {gameMode === 'challenge'
                ? `${Math.floor(timeSeconds / 60)}m ${timeSeconds % 60}s`
                : 'SANTAI'}
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="w-full flex flex-col gap-2">
          {level.id < 3 ? (
            <button
              onClick={() => {
                soundManager.playClick();
                onNextLevel();
              }}
              className="w-full pixel-btn-green py-2.5 text-xs font-bold flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>LEVEL BERIKUTNYA</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <div className="p-2 pixel-btn-green text-xs font-bold mb-1">
              SEMUA LEVEL SELESAI!
            </div>
          )}

          <div className="grid grid-cols-2 gap-2 w-full">
            <button
              onClick={() => {
                soundManager.playClick();
                onReplay();
              }}
              className="pixel-btn-dark py-2 text-xs font-bold flex items-center justify-center gap-1 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>MAIN LAGI</span>
            </button>

            <button
              onClick={() => {
                soundManager.playClick();
                onBackToLevels();
              }}
              className="pixel-btn py-2 text-xs font-bold cursor-pointer"
            >
              MENU
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};


