import { Home, Maximize2, Minimize2, Moon, Sun, Volume2, VolumeX } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { ScreenState, ThemeMode } from '../types';
import { soundManager } from '../utils/audio';

const checkNativeFullscreen = () => {
  return !!(
    document.fullscreenElement ||
    (document as any).webkitFullscreenElement ||
    (document as any).msFullscreenElement
  );
};

interface NavbarProps {
  currentScreen: ScreenState;
  theme: ThemeMode;
  isMuted: boolean;
  onSelectTheme: (theme: ThemeMode) => void;
  onToggleMute: () => void;
  onNavigateHome: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentScreen,
  theme,
  isMuted,
  onSelectTheme,
  onToggleMute,
  onNavigateHome,
}) => {
  const [isFullscreen, setIsFullscreen] = useState<boolean>(() =>
    checkNativeFullscreen(),
  );

  useEffect(() => {
    const onFsChange = () => {
      setIsFullscreen(checkNativeFullscreen());
    };
    document.addEventListener('fullscreenchange', onFsChange);
    document.addEventListener('webkitfullscreenchange', onFsChange);
    document.addEventListener('msfullscreenchange', onFsChange);
    return () => {
      document.removeEventListener('fullscreenchange', onFsChange);
      document.removeEventListener('webkitfullscreenchange', onFsChange);
      document.removeEventListener('msfullscreenchange', onFsChange);
    };
  }, []);

  const toggleFullscreen = () => {
    soundManager.playClick();
    const doc = document as any;
    const docEl = document.documentElement as any;

    if (!checkNativeFullscreen()) {
      if (docEl.requestFullscreen) {
        docEl.requestFullscreen().catch(() => setIsFullscreen(true));
      } else if (docEl.webkitRequestFullscreen) {
        docEl.webkitRequestFullscreen();
      } else if (docEl.msRequestFullscreen) {
        docEl.msRequestFullscreen();
      } else {
        setIsFullscreen(true);
      }
    } else {
      if (doc.exitFullscreen && doc.fullscreenElement) {
        doc.exitFullscreen().catch(() => {});
      } else if (doc.webkitExitFullscreen && doc.webkitFullscreenElement) {
        doc.webkitExitFullscreen();
      } else if (doc.msExitFullscreen && doc.msFullscreenElement) {
        doc.msExitFullscreen();
      }
      setIsFullscreen(false);
    }
  };

  const buttonClass =
    'pixel-btn-dark px-1.5 sm:px-2.5 py-1 min-w-[44px] text-[10px] sm:text-xs font-bold flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-1.5 cursor-pointer';

  return (
    <header className="w-full bg-theme-main border-b-4 border-theme-box sticky sticky-nav top-0 z-50 px-2 py-1.5 sm:px-3 sm:py-2 font-['Pixelify_Sans',sans-serif] transition-colors duration-300">
      <div className="max-w-5xl mx-auto flex items-center justify-between gap-2">
        {/* Brand & Logo */}
        <button
          onClick={() => {
            soundManager.playClick();
            onNavigateHome();
          }}
          className="flex items-center gap-1.5 sm:gap-2 text-left cursor-pointer min-w-0"
        >
          <div className="w-7 h-7 sm:w-9 sm:h-9 p-0.5 flex items-center justify-center overflow-hidden shrink-0">
            <img src="/Piece.webp" alt="" className="w-full h-full object-contain" />
          </div>
          <div className="min-w-0">
            <h1 className="font-pixel-title text-[10px] sm:text-sm text-theme-title leading-snug">
              PIXEL PUZZLE
            </h1>
            <p className="text-[11px] text-theme-sub hidden sm:block">
              COZY RETRO GAME
            </p>
          </div>
        </button>

        {/* Right Action Controls */}
        <div className="flex items-stretch gap-1.5 sm:gap-2 shrink-0">
          {currentScreen !== 'start' && (
            <button
              onClick={() => {
                soundManager.playClick();
                onNavigateHome();
              }}
              className={buttonClass}
            >
              <Home className="w-4 h-4" />
              <span>MENU</span>
            </button>
          )}

          {/* Tema: sekali ketuk ganti terang / gelap */}
          <button
            onClick={() => {
              soundManager.playClick();
              onSelectTheme(theme === 'light' ? 'dark' : 'light');
            }}
            className={buttonClass}
          >
            {theme === 'light' ? (
              <Moon className="w-4 h-4" />
            ) : (
              <Sun className="w-4 h-4" />
            )}
            <span>{theme === 'light' ? 'GELAP' : 'TERANG'}</span>
          </button>

          <button onClick={toggleFullscreen} className={buttonClass}>
            {isFullscreen ? (
              <Minimize2 className="w-4 h-4" />
            ) : (
              <Maximize2 className="w-4 h-4" />
            )}
            <span>{isFullscreen ? 'KECIL' : 'PENUH'}</span>
          </button>

          <button
            onClick={onToggleMute}
            aria-pressed={!isMuted}
            className={buttonClass}
          >
            {isMuted ? (
              <VolumeX className="w-4 h-4" />
            ) : (
              <Volume2 className="w-4 h-4" />
            )}
            <span>{isMuted ? 'BISU' : 'SUARA'}</span>
          </button>
        </div>
      </div>
    </header>
  );
};
