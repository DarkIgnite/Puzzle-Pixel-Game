import { useEffect, useRef, useState } from 'react';
import {
  DEFAULT_LEVELS,
  INITIAL_PHOTOS,
  getPhotoForLevel,
} from './data/photos';
import {
  GameMode,
  LevelProgress,
  Photo,
  ScreenState,
  ThemeMode,
} from './types';
import { soundManager } from './utils/audio';
import { processUploadedFile } from './utils/canvasHelper';

import { CameraModal } from './components/CameraModal';
import { ConfirmDialog } from './components/ConfirmDialog';
import { LevelSelect } from './components/LevelSelect';
import { Navbar } from './components/Navbar';
import { PhotoManagerModal } from './components/PhotoManagerModal';
import { PuzzleBoard } from './components/PuzzleBoard';
import { StartScreen } from './components/StartScreen';

const LOCAL_STORAGE_PROGRESS_KEY = 'cozy_puzzle_progress_v1';
const LOCAL_STORAGE_PHOTOS_KEY = 'cozy_puzzle_photos_v1';
const LOCAL_STORAGE_MODE_KEY = 'cozy_puzzle_mode_v1';
const LOCAL_STORAGE_THEME_KEY = 'cozy_puzzle_theme_v1';
const LOCAL_STORAGE_MUTE_KEY = 'cozy_puzzle_muted_v1';

const readStorage = (key: string): string | null => {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
};

const writeStorage = (key: string, value: string | null): boolean => {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
};

const loadJson = <T,>(key: string, fallback: T): T => {
  try {
    const saved = readStorage(key);
    return saved ? (JSON.parse(saved) as T) : fallback;
  } catch {
    return fallback;
  }
};

export default function App() {
  // Application States (langsung diisi dari data tersimpan)
  const [currentScreen, setCurrentScreen] = useState<ScreenState>('start');
  const [activeLevelId, setActiveLevelId] = useState<number>(1);
  const [gameMode, setGameMode] = useState<GameMode>(() =>
    readStorage(LOCAL_STORAGE_MODE_KEY) === 'challenge'
      ? 'challenge'
      : 'relaxed',
  );
  const [theme, setTheme] = useState<ThemeMode>(() =>
    readStorage(LOCAL_STORAGE_THEME_KEY) === 'dark' ? 'dark' : 'light',
  );
  const [isMuted, setIsMuted] = useState<boolean>(() => {
    const muted = readStorage(LOCAL_STORAGE_MUTE_KEY) === '1';
    soundManager.setMuted(muted);
    return muted;
  });
  const [showPhotoManager, setShowPhotoManager] = useState<boolean>(false);
  const [confirmAction, setConfirmAction] = useState<
    'newPlayer' | 'defaultPhotos' | null
  >(null);
  const [notice, setNotice] = useState<string | null>(null);
  // Level yang menunggu foto sebelum dimainkan
  const [cameraLevelId, setCameraLevelId] = useState<number | null>(null);

  // Photos Catalog (Initial + Saved overrides)
  const [photos, setPhotos] = useState<Photo[]>(() => {
    const saved = loadJson<Photo[]>(LOCAL_STORAGE_PHOTOS_KEY, INITIAL_PHOTOS);
    return Array.isArray(saved) ? saved : INITIAL_PHOTOS;
  });
  const photosRef = useRef(photos);

  // Level Progress
  const [progressMap, setProgressMap] = useState<Record<number, LevelProgress>>(
    () => loadJson(LOCAL_STORAGE_PROGRESS_KEY, {}),
  );

  // 1. Terapkan tema ke dokumen
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // Pesan singkat hilang otomatis
  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(null), 4000);
    return () => window.clearTimeout(timer);
  }, [notice]);

  // 2. Select & persist theme changes
  const handleSelectTheme = (newTheme: ThemeMode) => {
    setTheme(newTheme);
    writeStorage(LOCAL_STORAGE_THEME_KEY, newTheme);
  };

  // 3. Select & persist mode changes
  const handleSelectGameMode = (mode: GameMode) => {
    setGameMode(mode);
    writeStorage(LOCAL_STORAGE_MODE_KEY, mode);
  };

  // 4. Persist Mute Toggle
  const handleToggleMute = () => {
    const muted = soundManager.toggleMute();
    setIsMuted(muted);
    writeStorage(LOCAL_STORAGE_MUTE_KEY, muted ? '1' : '0');
  };

  // 5. Update Level Progress
  const handleLevelComplete = (stats: {
    timeSeconds: number;
    movesCount: number;
  }) => {
    setProgressMap((prev) => {
      const prevBest = prev[activeLevelId]?.bestTimeSeconds ?? null;

      // Mode Santai (waktu 0) tidak boleh menghapus rekor waktu
      let newBest = prevBest;
      if (stats.timeSeconds > 0) {
        newBest = prevBest
          ? Math.min(prevBest, stats.timeSeconds)
          : stats.timeSeconds;
      }

      const updatedMap = {
        ...prev,
        [activeLevelId]: {
          levelId: activeLevelId,
          completed: true,
          bestTimeSeconds: newBest,
          movesCount: stats.movesCount,
          stars: 3,
        },
      };

      writeStorage(LOCAL_STORAGE_PROGRESS_KEY, JSON.stringify(updatedMap));
      return updatedMap;
    });
  };

  // Simpan foto; beri tahu pemain kalau penyimpanan penuh
  const commitPhotos = (updated: Photo[], successMessage: string | null) => {
    photosRef.current = updated;
    setPhotos(updated);
    const saved = writeStorage(
      LOCAL_STORAGE_PHOTOS_KEY,
      JSON.stringify(updated),
    );
    setNotice(
      saved
        ? successMessage
        : 'Foto dipakai, tapi tidak bisa disimpan (memori penuh).',
    );
  };

  // 6. Reset to default procedural pixel art photos
  const resetPhotos = () => {
    photosRef.current = INITIAL_PHOTOS;
    setPhotos(INITIAL_PHOTOS);
    writeStorage(LOCAL_STORAGE_PHOTOS_KEY, null);
  };

  const handleUseDefaultPhotos = () => {
    if (photosRef.current.some((p) => p.isCustom)) {
      setConfirmAction('defaultPhotos');
    }
  };

  // Siapkan game untuk pengunjung berikutnya
  const handleNewPlayer = () => {
    resetPhotos();
    setProgressMap({});
    writeStorage(LOCAL_STORAGE_PROGRESS_KEY, null);
    handleSelectGameMode('relaxed');
    setActiveLevelId(1);
    setCurrentScreen('start');
    setNotice('Siap untuk pemain baru!');
  };

  // 7. Batch upload custom photos (1 to 3 images)
  const handleUploadCustomPhotos = async (fileList: FileList) => {
    const allFiles = Array.from(fileList);
    const files = allFiles.slice(0, 3);
    if (files.length === 0) return;

    let urls: string[];
    try {
      urls = await Promise.all(files.map((file) => processUploadedFile(file)));
    } catch {
      setNotice('Foto tidak bisa dibaca. Coba pilih file JPG atau PNG.');
      return;
    }

    const updated = photosRef.current.map((photo, idx) =>
      urls[idx]
        ? {
            ...photo,
            url: urls[idx],
            name: files[idx].name.replace(/\.[^/.]+$/, '') || photo.name,
            isCustom: true,
          }
        : photo,
    );

    const range = urls.length > 1 ? `Level 1-${urls.length}` : 'Level 1';
    commitPhotos(
      updated,
      allFiles.length > 3
        ? `Hanya 3 foto pertama yang dipakai (${range}).`
        : `Foto dipasang di ${range}.`,
    );
  };

  // 8. Upload / Replace single photo handler
  const handleUploadPhoto = (
    photoId: string,
    newUrl: string,
    name?: string,
    successMessage: string | null = 'Foto berhasil diganti.',
  ) => {
    const updated = photosRef.current.map((p) =>
      p.id === photoId
        ? { ...p, url: newUrl, name: name || p.name, isCustom: true }
        : p,
    );
    commitPhotos(updated, successMessage);
  };

  // 9. Upload single photo for a specific level
  const handleUploadPhotoForLevel = async (levelId: number, file: File) => {
    try {
      const url = await processUploadedFile(file);
      const targetLevel = DEFAULT_LEVELS.find((l) => l.id === levelId);
      const photoId = targetLevel ? targetLevel.photoId : `photo-${levelId}`;
      handleUploadPhoto(photoId, url);
    } catch {
      setNotice('Foto tidak bisa dibaca. Coba pilih file JPG atau PNG.');
    }
  };

  // 10. Mulai level: buka kamera dulu, lalu main dengan foto tersebut
  const startLevel = (levelId: number) => {
    setCameraLevelId(levelId);
  };

  const playLevel = (levelId: number) => {
    setCameraLevelId(null);
    setActiveLevelId(levelId);
    setCurrentScreen('gameplay');
  };

  const handleStartPhoto = (dataUrl: string) => {
    if (cameraLevelId === null) return;
    const level = DEFAULT_LEVELS.find((l) => l.id === cameraLevelId);
    if (level) {
      handleUploadPhoto(level.photoId, dataUrl, 'Foto Kamu', null);
    }
    playLevel(cameraLevelId);
  };

  // Active level config & photo
  const activeLevel =
    DEFAULT_LEVELS.find((l) => l.id === activeLevelId) || DEFAULT_LEVELS[0];
  const activePhoto = getPhotoForLevel(activeLevel, photos);

  return (
    <div
      data-theme={theme}
      className="min-h-screen w-full bg-theme-main text-theme-main flex flex-col font-['Pixelify_Sans',sans-serif] cozy-pixel-bg transition-colors duration-300 relative overflow-x-clip"
    >
      {/* Top Sticky Navbar (hidden during gameplay for maximum screen space on mobile) */}
      {currentScreen !== 'gameplay' && (
        <Navbar
          currentScreen={currentScreen}
          theme={theme}
          isMuted={isMuted}
          onSelectTheme={handleSelectTheme}
          onToggleMute={handleToggleMute}
          onNavigateHome={() => setCurrentScreen('start')}
        />
      )}

      {/* Main Content Area */}
      <main
        className={`flex-1 flex flex-col items-center justify-start sm:justify-center w-full ${
          currentScreen === 'gameplay'
            ? 'p-0 h-[100dvh] overflow-hidden'
            : 'p-2 sm:p-4'
        }`}
      >
        {currentScreen === 'start' && (
          <StartScreen
            gameMode={gameMode}
            levels={DEFAULT_LEVELS}
            photos={photos}
            progressMap={progressMap}
            onSelectLevel={startLevel}
            onOpenLevelSelect={() => setCurrentScreen('levelSelect')}
            onSelectGameMode={handleSelectGameMode}
            onUseDefaultPhotos={handleUseDefaultPhotos}
            onUploadCustomPhotos={handleUploadCustomPhotos}
            onUploadPhotoForLevel={handleUploadPhotoForLevel}
            onNewPlayer={() => setConfirmAction('newPlayer')}
          />
        )}

        {currentScreen === 'levelSelect' && (
          <LevelSelect
            levels={DEFAULT_LEVELS}
            photos={photos}
            progressMap={progressMap}
            onSelectLevel={startLevel}
            onBack={() => setCurrentScreen('start')}
            onOpenPhotoManager={() => setShowPhotoManager(true)}
            onUploadPhotoForLevel={handleUploadPhotoForLevel}
          />
        )}

        {currentScreen === 'gameplay' && (
          <PuzzleBoard
            key={`puzzle-${activeLevel.id}-${activePhoto.id}-${activePhoto.url.length}`}
            level={activeLevel}
            photo={activePhoto}
            gameMode={gameMode}
            bestTimeSeconds={progressMap[activeLevel.id]?.bestTimeSeconds ?? null}
            isMuted={isMuted}
            onToggleMute={handleToggleMute}
            onLevelComplete={handleLevelComplete}
            onNextLevel={() => {
              if (activeLevelId < DEFAULT_LEVELS.length) {
                startLevel(activeLevelId + 1);
              } else {
                setCurrentScreen('levelSelect');
              }
            }}
            onBackToLevels={() => setCurrentScreen('levelSelect')}
          />
        )}
      </main>

      {/* Photo Manager Modal */}
      {showPhotoManager && (
        <PhotoManagerModal
          photos={photos}
          onUploadPhoto={handleUploadPhoto}
          onError={setNotice}
          onClose={() => setShowPhotoManager(false)}
        />
      )}

      {/* Kamera sebelum mulai level */}
      {cameraLevelId !== null && (
        <CameraModal
          autoUse
          onCapturePhoto={handleStartPhoto}
          onSkip={() => playLevel(cameraLevelId)}
          onClose={() => setCameraLevelId(null)}
        />
      )}

      {confirmAction && (
        <ConfirmDialog
          title={
            confirmAction === 'newPlayer'
              ? 'MULAI PEMAIN BARU?'
              : 'PAKAI FOTO BAWAAN?'
          }
          message={
            confirmAction === 'newPlayer'
              ? 'Semua progres level dan foto buatan akan dihapus.'
              : 'Semua foto buatan akan dihapus.'
          }
          confirmLabel="YA, HAPUS"
          onCancel={() => setConfirmAction(null)}
          onConfirm={() => {
            if (confirmAction === 'newPlayer') handleNewPlayer();
            else resetPhotos();
            setConfirmAction(null);
          }}
        />
      )}

      {notice && (
        <div
          role="status"
          className="fixed bottom-3 left-1/2 -translate-x-1/2 z-[70] w-[min(92vw,26rem)] pixel-box px-4 py-3 text-center text-sm font-bold text-theme-title pointer-events-none"
        >
          {notice}
        </div>
      )}

      {/* Cozy Footer (hidden during gameplay) */}
      {currentScreen !== 'gameplay' && (
        <footer className="w-full text-center py-4 text-xs text-theme-sub opacity-80 border-t border-theme-inner">
          <p>Created by • Ryan and Fikri</p>
          <p>
            <span className="font-sans">©</span> SMK TELKOM BANJARBARU 2026
          </p>
        </footer>
      )}
    </div>
  );
}
