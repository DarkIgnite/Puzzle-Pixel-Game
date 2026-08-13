import React, { useState, useRef, useEffect } from "react";
import {
    Volume2,
    VolumeX,
    Clock,
    Coffee,
    Puzzle,
    Home,
    Palette,
    Moon,
    Sun,
    Heart,
    Check,
} from "lucide-react";
import { GameMode, ScreenState, ThemeMode } from "../types";
import { soundManager } from "../utils/audio";

interface NavbarProps {
    currentScreen: ScreenState;
    gameMode: GameMode;
    theme: ThemeMode;
    isMuted: boolean;
    onToggleGameMode: () => void;
    onSelectGameMode: (mode: GameMode) => void;
    onSelectTheme: (theme: ThemeMode) => void;
    onToggleMute: () => void;
    onNavigateHome: () => void;
    onOpenPhotoManager: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
    currentScreen,
    gameMode,
    theme,
    isMuted,
    onSelectGameMode,
    onSelectTheme,
    onToggleMute,
    onNavigateHome,
}) => {
    const [showThemeMenu, setShowThemeMenu] = useState(false);
    const [showModeMenu, setShowModeMenu] = useState(false);

    const themeMenuRef = useRef<HTMLDivElement>(null);
    const modeMenuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (
                themeMenuRef.current &&
                !themeMenuRef.current.contains(e.target as Node)
            ) {
                setShowThemeMenu(false);
            }
            if (
                modeMenuRef.current &&
                !modeMenuRef.current.contains(e.target as Node)
            ) {
                setShowModeMenu(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () =>
            document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const themeLabels: Record<
        ThemeMode,
        { label: string; icon: React.ReactNode; desc: string }
    > = {
        dark: {
            label: "DARK",
            icon: <Moon className="w-3.5 h-3.5 text-[#FFE17D]" />,
            desc: "Cozy Night (Malam)",
        },
        light: {
            label: "LIGHT",
            icon: <Sun className="w-3.5 h-3.5 text-[#E07A5F]" />,
            desc: "Cozy Day (Siang)",
        },
        "red-white": {
            label: "TELKOM",
            icon: <Heart className="w-3.5 h-3.5 text-[#ED1E28]" />,
            desc: "Merah-Putih Telkom Schools",
        },
    };

    const modeLabels: Record<
        GameMode,
        { label: string; icon: React.ReactNode; desc: string }
    > = {
        relaxed: {
            label: "SANTAI",
            icon: <Coffee className="w-3.5 h-3.5 text-theme-title" />,
            desc: "Tanpa timer, main santai",
        },
        challenge: {
            label: "TANTANGAN",
            icon: <Clock className="w-3.5 h-3.5 text-theme-title" />,
            desc: "Timer menghitung waktu ",
        },
    };

    return (
        <header className="w-full bg-theme-main border-b-4 border-theme-box sticky top-0 z-30 px-3 py-2 font-['Pixelify_Sans',sans-serif] transition-colors duration-300">
            <div className="max-w-5xl mx-auto flex items-center justify-between">
                {/* Brand & Logo */}
                <button
                    onClick={() => {
                        soundManager.playClick();
                        onNavigateHome();
                    }}
                    className="flex items-center gap-2 text-left group focus:outline-none cursor-pointer">
                    <div className="w-9 h-9 pixel-btn p-0 flex items-center justify-center">
                        <Puzzle className="w-5 h-5" />
                    </div>
                    <div>
                        <h1 className="font-pixel-title text-xs sm:text-sm text-theme-title flex items-center gap-1.5">
                            PIXEL PUZZLE
                        </h1>
                        <p className="text-[10px] text-theme-sub hidden sm:block">
                            COZY RETRO GAME
                        </p>
                    </div>
                </button>

                {/* Right Action Controls */}
                <div className="flex items-center gap-2 relative">
                    {/* Home Button if inside game */}
                    {currentScreen !== "start" && (
                        <button
                            onClick={() => {
                                soundManager.playClick();
                                onNavigateHome();
                            }}
                            title="Kembali ke Beranda"
                            className="pixel-btn-dark px-2.5 py-1 text-xs font-bold flex items-center gap-1 cursor-pointer">
                            <Home className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">MENU</span>
                        </button>
                    )}

                    {/* Mode Dropdown Button */}
                    <div className="relative" ref={modeMenuRef}>
                        <button
                            onClick={() => {
                                soundManager.playClick();
                                setShowModeMenu((prev) => !prev);
                                setShowThemeMenu(false);
                            }}
                            title="Pilih Mode Game (Santai, Tantangan)"
                            className="pixel-btn px-2.5 py-1 text-xs font-bold flex items-center gap-1.5 cursor-pointer">
                            {modeLabels[gameMode]?.icon}
                            <span className="hidden sm:inline">
                                MODE: {modeLabels[gameMode]?.label}
                            </span>
                            <span className="sm:hidden">
                                {modeLabels[gameMode]?.label}
                            </span>
                        </button>

                        {/* Mode Dropdown Menu */}
                        {showModeMenu && (
                            <div className="absolute right-0 mt-2 w-52 pixel-box p-2 z-50 shadow-xl animate-in fade-in zoom-in-95 duration-100">
                                <div className="font-pixel-title text-[10px] text-theme-title px-2 py-1 border-b border-theme-inner mb-1.5 flex items-center gap-1">
                                    <Clock className="w-3 h-3" />
                                    PILIH MODE GAME:
                                </div>

                                <div className="flex flex-col gap-1">
                                    {(
                                        ["relaxed", "challenge"] as GameMode[]
                                    ).map((mKey) => {
                                        const item = modeLabels[mKey];
                                        const isActive = gameMode === mKey;
                                        return (
                                            <button
                                                key={mKey}
                                                onClick={() => {
                                                    soundManager.playClick();
                                                    onSelectGameMode(mKey);
                                                    setShowModeMenu(false);
                                                }}
                                                className={`w-full p-2 text-left text-xs font-bold flex items-center justify-between border transition-all cursor-pointer ${
                                                    isActive
                                                        ? "pixel-box-inner border-theme-title text-theme-title"
                                                        : "border-transparent hover:bg-theme-inner text-theme-sub"
                                                }`}>
                                                <div className="flex items-center gap-2">
                                                    {item.icon}
                                                    <div>
                                                        <div className="leading-tight">
                                                            {item.label}
                                                        </div>
                                                        <div className="text-[10px] font-normal opacity-80">
                                                            {item.desc}
                                                        </div>
                                                    </div>
                                                </div>
                                                {isActive && (
                                                    <Check className="w-3.5 h-3.5 text-theme-title shrink-0" />
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Theme Switcher Button */}
                    <div className="relative" ref={themeMenuRef}>
                        <button
                            onClick={() => {
                                soundManager.playClick();
                                setShowThemeMenu((prev) => !prev);
                                setShowModeMenu(false);
                            }}
                            title="Pilih Tema (Dark, Light, Merah Putih)"
                            className="pixel-btn-dark px-2.5 py-1 text-xs font-bold flex items-center gap-1.5 cursor-pointer">
                            <Palette className="w-3.5 h-3.5 text-theme-title" />
                            <span className="hidden sm:inline">
                                TEMA: {themeLabels[theme]?.label || "DARK"}
                            </span>
                            <span className="sm:hidden">TEMA</span>
                        </button>

                        {/* Theme Dropdown Menu */}
                        {showThemeMenu && (
                            <div className="absolute right-0 mt-2 w-52 pixel-box p-2 z-50 shadow-xl animate-in fade-in zoom-in-95 duration-100">
                                <div className="font-pixel-title text-[10px] text-theme-title px-2 py-1 border-b border-theme-inner mb-1.5 flex items-center gap-1">
                                    <Palette className="w-3 h-3" />
                                    PILIH TEMA COZY:
                                </div>

                                <div className="flex flex-col gap-1">
                                    {(
                                        [
                                            "dark",
                                            "light",
                                            "red-white",
                                        ] as ThemeMode[]
                                    ).map((tKey) => {
                                        const item = themeLabels[tKey];
                                        const isActive = theme === tKey;
                                        return (
                                            <button
                                                key={tKey}
                                                onClick={() => {
                                                    soundManager.playClick();
                                                    onSelectTheme(tKey);
                                                    setShowThemeMenu(false);
                                                }}
                                                className={`w-full p-2 text-left text-xs font-bold flex items-center justify-between border transition-all cursor-pointer ${
                                                    isActive
                                                        ? "pixel-box-inner border-theme-title text-theme-title"
                                                        : "border-transparent hover:bg-theme-inner text-theme-sub"
                                                }`}>
                                                <div className="flex items-center gap-2">
                                                    {item.icon}
                                                    <div>
                                                        <div className="leading-tight">
                                                            {item.label}
                                                        </div>
                                                        <div className="text-[10px] font-normal opacity-80">
                                                            {item.desc}
                                                        </div>
                                                    </div>
                                                </div>
                                                {isActive && (
                                                    <Check className="w-3.5 h-3.5 text-theme-title shrink-0" />
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Sound Mute Toggle */}
                    <button
                        onClick={onToggleMute}
                        title={isMuted ? "Nyalakan Suara" : "Matikan Suara"}
                        className="pixel-btn-dark p-1 text-xs font-bold cursor-pointer">
                        {isMuted ? (
                            <VolumeX className="w-4 h-4 text-[#dfc7c0]" />
                        ) : (
                            <Volume2 className="w-4 h-4 text-theme-accent" />
                        )}
                    </button>
                </div>
            </div>
        </header>
    );
};
