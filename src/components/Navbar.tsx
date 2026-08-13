import React from 'react';
import { Volume2, VolumeX, Clock, Coffee, Home } from 'lucide-react';
import { GameMode, ScreenState } from '../types';
import { soundManager } from '../utils/audio';

interface NavbarProps {
  currentScreen: ScreenState;
  gameMode: GameMode;
  isMuted: boolean;
  onToggleGameMode: () => void;
  onToggleMute: () => void;
  onNavigateHome: () => void;
  onOpenPhotoManager: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentScreen,
  gameMode,
  isMuted,
  onToggleGameMode,
  onToggleMute,
  onNavigateHome,
}) => {
  return (
    <header className="w-full bg-[#111822] border-b-4 border-[#3D2817] sticky top-0 z-30 px-3 py-2 font-['Pixelify_Sans',sans-serif]">
      <div className="max-w-5xl mx-auto flex items-center justify-between">
        
        {/* Brand & Logo */}
        <button
          onClick={() => {
            soundManager.playClick();
            onNavigateHome();
          }}
          className="flex items-center gap-2 text-left group focus:outline-none"
        >
          <div className="w-9 h-9 bg-[#D9865A] border-2 border-[#3D2817] flex items-center justify-center text-white shadow-[2px_2px_0px_#000]">
            <Coffee className="w-5 h-5 text-[#111822]" />
          </div>
          <div>
            <h1 className="font-pixel-title text-xs sm:text-sm text-[#FFE17D] flex items-center gap-1.5">
              PIXEL PUZZLE
            </h1>
            <p className="text-[10px] text-[#E0A96D] hidden sm:block">COZY RETRO GAME</p>
          </div>
        </button>

        {/* Right Action Controls */}
        <div className="flex items-center gap-2">
          
          {/* Home Button if inside game */}
          {currentScreen !== 'start' && (
            <button
              onClick={() => {
                soundManager.playClick();
                onNavigateHome();
              }}
              title="Kembali ke Beranda"
              className="pixel-btn-dark px-2.5 py-1 text-xs font-bold flex items-center gap-1"
            >
              <Home className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">MENU</span>
            </button>
          )}

          {/* Mode Toggle Switch */}
          <button
            onClick={() => {
              soundManager.playClick();
              onToggleGameMode();
            }}
            title="Ganti Mode Game"
            className="pixel-btn px-2.5 py-1 text-xs font-bold flex items-center gap-1"
          >
            <Clock className="w-3.5 h-3.5" />
            <span className="whitespace-nowrap">
              {gameMode === 'relaxed' ? 'SANTAI' : 'TANTANGAN'}
            </span>
          </button>

          {/* Sound Mute Toggle */}
          <button
            onClick={onToggleMute}
            title={isMuted ? 'Nyalakan Suara' : 'Matikan Suara'}
            className="pixel-btn-dark p-1 text-xs font-bold"
          >
            {isMuted ? (
              <VolumeX className="w-4 h-4 text-[#C86D51]" />
            ) : (
              <Volume2 className="w-4 h-4 text-[#8A9A5B]" />
            )}
          </button>

        </div>

      </div>
    </header>
  );
};

