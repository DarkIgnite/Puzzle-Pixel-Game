import React, { useState, useEffect } from "react";
import {
    GameMode,
    LevelConfig,
    LevelProgress,
    Photo,
    ScreenState,
    ThemeMode,
} from "./types";
import {
    DEFAULT_LEVELS,
    INITIAL_PHOTOS,
    getPhotoForLevel,
} from "./data/photos";
import { processUploadedFile } from "./utils/canvasHelper";
import { soundManager } from "./utils/audio";

import { Navbar } from "./components/Navbar";
import { StartScreen } from "./components/StartScreen";
import { LevelSelect } from "./components/LevelSelect";
import { PuzzleBoard } from "./components/PuzzleBoard";
import { PhotoManagerModal } from "./components/PhotoManagerModal";

const LOCAL_STORAGE_PROGRESS_KEY = "cozy_puzzle_progress_v1";
const LOCAL_STORAGE_PHOTOS_KEY = "cozy_puzzle_photos_v1";
const LOCAL_STORAGE_MODE_KEY = "cozy_puzzle_mode_v1";
const LOCAL_STORAGE_THEME_KEY = "cozy_puzzle_theme_v1";

export default function App() {
    // Application States
    const [currentScreen, setCurrentScreen] = useState<ScreenState>("start");
    const [activeLevelId, setActiveLevelId] = useState<number>(1);
    const [gameMode, setGameMode] = useState<GameMode>("relaxed");
    const [theme, setTheme] = useState<ThemeMode>("light");
    const [isMuted, setIsMuted] = useState<boolean>(false);
    const [showPhotoManager, setShowPhotoManager] = useState<boolean>(false);

    // Photos Catalog (Initial + Saved overrides)
    const [photos, setPhotos] = useState<Photo[]>(INITIAL_PHOTOS);

    // Level Progress
    const [progressMap, setProgressMap] = useState<
        Record<number, LevelProgress>
    >({});

    // 1. Load initial saved data from LocalStorage
    useEffect(() => {
        try {
            // Saved theme
            const savedTheme = localStorage.getItem(LOCAL_STORAGE_THEME_KEY);
            if (savedTheme && (savedTheme === "dark" || savedTheme === "light")) {
                setTheme(savedTheme as ThemeMode);
                document.documentElement.setAttribute("data-theme", savedTheme);
            } else {
                setTheme("light");
                document.documentElement.setAttribute("data-theme", "light");
            }

            // Saved game mode
            const savedMode = localStorage.getItem(
                LOCAL_STORAGE_MODE_KEY,
            ) as GameMode | null;
            if (savedMode) setGameMode(savedMode);

            // Saved progress
            const savedProgress = localStorage.getItem(
                LOCAL_STORAGE_PROGRESS_KEY,
            );
            if (savedProgress) {
                setProgressMap(JSON.parse(savedProgress));
            }

            // Saved photos overrides
            const savedPhotos = localStorage.getItem(LOCAL_STORAGE_PHOTOS_KEY);
            if (savedPhotos) {
                setPhotos(JSON.parse(savedPhotos));
            }
        } catch {
            // Ignore localstorage errors
        }
    }, []);

    // 2. Select & persist theme changes
    const handleSelectTheme = (newTheme: ThemeMode) => {
        setTheme(newTheme);
        document.documentElement.setAttribute("data-theme", newTheme);
        try {
            localStorage.setItem(LOCAL_STORAGE_THEME_KEY, newTheme);
        } catch {
            // Ignore
        }
    };

    // 3. Select & persist mode changes
    const handleSelectGameMode = (mode: GameMode) => {
        setGameMode(mode);
        try {
            localStorage.setItem(LOCAL_STORAGE_MODE_KEY, mode);
        } catch {
            // Ignore
        }
    };

    const handleToggleGameMode = () => {
        setGameMode((prev) => {
            const next = prev === "relaxed" ? "challenge" : "relaxed";
            try {
                localStorage.setItem(LOCAL_STORAGE_MODE_KEY, next);
            } catch {
                // Ignore
            }
            return next;
        });
    };

    // 4. Persist Mute Toggle
    const handleToggleMute = () => {
        const muted = soundManager.toggleMute();
        setIsMuted(muted);
    };

    // 5. Update Level Progress
    const handleLevelComplete = (stats: {
        timeSeconds: number;
        movesCount: number;
    }) => {
        setProgressMap((prev) => {
            const existing = prev[activeLevelId];
            const prevBest = existing?.bestTimeSeconds;

            let newBest = stats.timeSeconds;
            if (prevBest && prevBest > 0) {
                newBest = Math.min(prevBest, stats.timeSeconds);
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

            try {
                localStorage.setItem(
                    LOCAL_STORAGE_PROGRESS_KEY,
                    JSON.stringify(updatedMap),
                );
            } catch {
                // Ignore
            }

            return updatedMap;
        });
    };

    // 6. Reset to default procedural pixel art photos
    const handleUseDefaultPhotos = () => {
        setPhotos(INITIAL_PHOTOS);
        try {
            localStorage.removeItem(LOCAL_STORAGE_PHOTOS_KEY);
        } catch (e) {
            // Ignore
            console.log(e);
        }
    };

    // 7. Batch upload custom photos (1 to 3 images)
    const handleUploadCustomPhotos = async (fileList: FileList) => {
        const files = Array.from(fileList).slice(0, 3);
        console.log(
            `[handleUploadCustomPhotos] Starting upload batch for ${files.length} file(s)...`,
        );
        const urls = await Promise.all(
            files.map((file) => processUploadedFile(file)),
        );

        if (urls.length === 0) return;

        setPhotos((prev) => {
            const updated = prev.map((photo, idx) => {
                if (urls[idx]) {
                    return {
                        ...photo,
                        url: urls[idx],
                        name:
                            files[idx]?.name.replace(/\.[^/.]+$/, "") ||
                            photo.name,
                        isCustom: true,
                    };
                }
                return photo;
            });

            console.log(
                "[handleUploadCustomPhotos] Updated photos state:",
                updated.map((p) => ({
                    id: p.id,
                    name: p.name,
                    isCustom: p.isCustom,
                    urlLength: p.url?.length,
                })),
            );

            try {
                localStorage.setItem(
                    LOCAL_STORAGE_PHOTOS_KEY,
                    JSON.stringify(updated),
                );
            } catch {
                // Ignore
            }

            return updated;
        });
    };

    // 8. Upload / Replace single photo handler
    const handleUploadPhoto = (photoId: string, newUrl: string) => {
        setPhotos((prev) => {
            const updated = prev.map((p) =>
                p.id === photoId ? { ...p, url: newUrl, isCustom: true } : p,
            );
            try {
                localStorage.setItem(
                    LOCAL_STORAGE_PHOTOS_KEY,
                    JSON.stringify(updated),
                );
            } catch {
                // Ignore
            }
            return updated;
        });
    };

    // 9. Add new custom photo
    const handleAddNewPhoto = (newPhoto: Photo) => {
        setPhotos((prev) => {
            const updated = [...prev];
            const targetIdx = updated.findIndex((p) => !p.isCustom);
            if (targetIdx !== -1) {
                updated[targetIdx] = {
                    ...newPhoto,
                    id: updated[targetIdx].id,
                    isCustom: true,
                };
            } else {
                updated.push(newPhoto);
            }
            try {
                localStorage.setItem(
                    LOCAL_STORAGE_PHOTOS_KEY,
                    JSON.stringify(updated),
                );
            } catch {
                // Ignore
            }
            return updated;
        });
    };

    // Active level config & photo
    const activeLevel =
        DEFAULT_LEVELS.find((l) => l.id === activeLevelId) || DEFAULT_LEVELS[0];
    const activePhoto = getPhotoForLevel(activeLevel, photos);

    return (
        <div
            data-theme={theme}
            className="min-h-screen w-full bg-theme-main text-theme-main flex flex-col font-['Pixelify_Sans',sans-serif] cozy-pixel-bg overflow-x-hidden overflow-y-auto transition-colors duration-300">
            {/* Top Navbar */}
            <Navbar
                currentScreen={currentScreen}
                gameMode={gameMode}
                theme={theme}
                isMuted={isMuted}
                onToggleGameMode={handleToggleGameMode}
                onSelectGameMode={handleSelectGameMode}
                onSelectTheme={handleSelectTheme}
                onToggleMute={handleToggleMute}
                onNavigateHome={() => setCurrentScreen("start")}
                onOpenPhotoManager={() => setShowPhotoManager(true)}
            />

            {/* Main Content Area */}
            <main className="flex-1 flex flex-col items-center justify-start sm:justify-center p-2 sm:p-4 w-full">
                {currentScreen === "start" && (
                    <StartScreen
                        gameMode={gameMode}
                        theme={theme}
                        levels={DEFAULT_LEVELS}
                        photos={photos}
                        onSelectLevel={(levelId) => {
                            setActiveLevelId(levelId);
                            setCurrentScreen("gameplay");
                        }}
                        onToggleGameMode={handleToggleGameMode}
                        onSelectGameMode={handleSelectGameMode}
                        onSelectTheme={handleSelectTheme}
                        onUseDefaultPhotos={handleUseDefaultPhotos}
                        onUploadCustomPhotos={handleUploadCustomPhotos}
                    />
                )}

                {currentScreen === "levelSelect" && (
                    <LevelSelect
                        levels={DEFAULT_LEVELS}
                        photos={photos}
                        progressMap={progressMap}
                        onSelectLevel={(levelId) => {
                            setActiveLevelId(levelId);
                            setCurrentScreen("gameplay");
                        }}
                        onBack={() => setCurrentScreen("start")}
                        onOpenPhotoManager={() => setShowPhotoManager(true)}
                    />
                )}

                {currentScreen === "gameplay" && (
                    <PuzzleBoard
                        key={`puzzle-${activeLevel.id}-${activePhoto.id}-${activePhoto.url.length}`}
                        level={activeLevel}
                        photo={activePhoto}
                        gameMode={gameMode}
                        onLevelComplete={handleLevelComplete}
                        onNextLevel={() => {
                            if (activeLevelId < DEFAULT_LEVELS.length) {
                                setActiveLevelId(activeLevelId + 1);
                            } else {
                                setCurrentScreen("levelSelect");
                            }
                        }}
                        onBackToLevels={() => setCurrentScreen("levelSelect")}
                    />
                )}
            </main>

            {/* Photo Manager Modal */}
            {showPhotoManager && (
                <PhotoManagerModal
                    photos={photos}
                    onUploadPhoto={handleUploadPhoto}
                    onAddNewPhoto={handleAddNewPhoto}
                    onClose={() => setShowPhotoManager(false)}
                />
            )}

            {/* Cozy Footer */}
            <footer className="w-full text-center py-4 text-xs text-theme-sub opacity-80 border-t border-theme-inner">
                <p>Created by • Ryan and Fikri</p>
            </footer>
        </div>
    );
}
