import React from 'react';
import { ArrowLeft, Play, Grid, Sparkles, CheckCircle, Clock } from 'lucide-react';
import { LevelConfig, LevelProgress, Photo } from '../types';
import { getPhotoForLevel } from '../data/photos';
import { soundManager } from '../utils/audio';

interface LevelSelectProps {
  levels: LevelConfig[];
  photos: Photo[];
  progressMap: Record<number, LevelProgress>;
  onSelectLevel: (levelId: number) => void;
  onBack: () => void;
  onOpenPhotoManager: () => void;
}

export const LevelSelect: React.FC<LevelSelectProps> = ({
  levels,
  photos,
  progressMap,
  onSelectLevel,
  onBack,
  onOpenPhotoManager,
}) => {
  return (
    <div className="w-full max-w-4xl mx-auto px-3 py-6 font-['Pixelify_Sans',sans-serif]">
      
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={() => {
            soundManager.playClick();
            onBack();
          }}
          className="pixel-btn-dark px-3 py-1 text-xs font-bold flex items-center gap-1"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>KEMBALI</span>
        </button>

        <div className="text-center">
          <h1 className="font-pixel-title text-sm sm:text-lg text-[#FFE17D]">
            PILIH LEVEL PUZZLE
          </h1>
        </div>

        <button
          onClick={() => {
            soundManager.playClick();
            onOpenPhotoManager();
          }}
          className="pixel-btn px-2.5 py-1 text-xs font-bold"
        >
          GANTI FOTO
        </button>
      </div>

      {/* 3 Level Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {levels.map((level) => {
          const photo = getPhotoForLevel(level, photos);
          const progress = progressMap[level.id];
          const isCompleted = progress?.completed;

          return (
            <div
              key={level.id}
              onClick={() => {
                soundManager.playClick();
                onSelectLevel(level.id);
              }}
              className="pixel-box p-4 cursor-pointer flex flex-col justify-between group hover:border-[#FFE17D] transition-all"
            >
              {/* Photo Thumbnail */}
              <div className="w-full aspect-square bg-[#1A120B] border-2 border-[#5A3821] overflow-hidden mb-3 relative">
                <img
                  src={photo.url}
                  alt={photo.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                />
                
                {/* Completed Badge */}
                {isCompleted && (
                  <div className="absolute top-2 right-2 bg-[#8A9A5B] border border-[#233016] text-white text-[10px] font-bold px-1.5 py-0.5 flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" />
                    <span>SELESAI</span>
                  </div>
                )}

                {/* Grid Badge */}
                <div className="absolute bottom-2 left-2 bg-[#1A120B] border border-[#FFE17D] text-[#FFE17D] text-[10px] font-bold px-1.5 py-0.5 flex items-center gap-1">
                  <Grid className="w-3 h-3 text-[#FFE17D]" />
                  <span>GRID {level.gridSize}x{level.gridSize}</span>
                </div>
              </div>

              {/* Title & Info */}
              <div>
                <h3 className="font-pixel-title text-xs text-[#FFE17D] mb-1">
                  {level.title}
                </h3>
                <p className="text-xs text-[#E0A96D] mb-2">
                  {photo.name} • {level.subtitle}
                </p>

                {/* Best time / stats */}
                {progress?.bestTimeSeconds ? (
                  <div className="flex items-center gap-1 text-xs text-[#8A9A5B] font-bold mb-3">
                    <Clock className="w-3.5 h-3.5" />
                    <span>Waktu: {Math.floor(progress.bestTimeSeconds / 60)}m {progress.bestTimeSeconds % 60}s</span>
                  </div>
                ) : (
                  <div className="text-xs text-[#E0A96D]/60 italic mb-3">
                    Belum dimainkan
                  </div>
                )}
              </div>

              {/* Action Button */}
              <button className="w-full pixel-btn-green py-2 text-xs font-bold flex items-center justify-center gap-1.5">
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>MAIN</span>
              </button>
            </div>
          );
        })}
      </div>

    </div>
  );
};

