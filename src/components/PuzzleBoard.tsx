import React, { useState, useEffect, useRef, useCallback } from "react";
import {
    Eye,
    RotateCcw,
    Lightbulb,
    ArrowLeft,
    Check,
    Clock,
    Sparkles,
    Maximize2,
    Minimize2,
    Volume2,
    VolumeX,
} from "lucide-react";
import { GameMode, LevelConfig, Photo, PuzzlePiece } from "../types";
import {
    sliceImageIntoGrid,
    createProceduralCozyImage,
} from "../utils/canvasHelper";
import { soundManager } from "../utils/audio";
import { ConfirmDialog } from "./ConfirmDialog";
import { PreviewModal } from "./PreviewModal";
import { VictoryModal } from "./VictoryModal";

interface PuzzleBoardProps {
    level: LevelConfig;
    photo: Photo;
    gameMode: GameMode;
    bestTimeSeconds: number | null;
    isMuted?: boolean;
    onToggleMute?: () => void;
    onLevelComplete: (stats: {
        timeSeconds: number;
        movesCount: number;
    }) => void;
    onNextLevel: () => void;
    onBackToLevels: () => void;
}

interface DragState {
    pieceId: number;
    pointerId: number;
    startX: number;
    startY: number;
    x: number;
    y: number;
    /** Di layar sentuh, bayangan potongan dinaikkan agar tidak tertutup jari */
    lift: number;
    size: number;
    moved: boolean;
}

type Feedback = "correct" | "wrong" | "locked" | null;

/** Jarak gerak minimum (px) agar dianggap menarik, bukan mengetuk */
const DRAG_THRESHOLD = 10;

const getMaxHintsForLevel = (levelNumber: number, mode: GameMode): number => {
    if (mode === "relaxed") {
        return levelNumber * 2 + 1;
    } else {
        return levelNumber;
    }
};

const checkNativeFullscreen = () => {
    return !!(
        document.fullscreenElement ||
        (document as any).webkitFullscreenElement ||
        (document as any).msFullscreenElement
    );
};

const shuffle = <T,>(items: T[]): T[] => {
    const result = [...items];
    for (let i = result.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
};

const isInside = (el: Element | null, x: number, y: number) => {
    if (!el) return false;
    const r = el.getBoundingClientRect();
    return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
};

const formatTime = (seconds: number) =>
    `${Math.floor(seconds / 60).toString().padStart(2, "0")}:${(seconds % 60)
        .toString()
        .padStart(2, "0")}`;

export const PuzzleBoard: React.FC<PuzzleBoardProps> = ({
    level,
    photo,
    gameMode,
    bestTimeSeconds,
    isMuted,
    onToggleMute,
    onLevelComplete,
    onNextLevel,
    onBackToLevels,
}) => {
    const gridSize = level.gridSize;
    const totalPieces = gridSize * gridSize;
    const levelNumber = level.levelNumber || level.id || 1;

    // Game States
    const [pieces, setPieces] = useState<PuzzlePiece[]>([]);
    const [pieceImages, setPieceImages] = useState<string[]>([]);
    const [fullImageUrl, setFullImageUrl] = useState<string>(photo.url);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [movesCount, setMovesCount] = useState<number>(0);
    const [timeSeconds, setTimeSeconds] = useState<number>(0);
    const [hintsRemaining, setHintsRemaining] = useState<number>(
        getMaxHintsForLevel(levelNumber, gameMode),
    );
    const [isCompleted, setIsCompleted] = useState<boolean>(false);
    const [showVictory, setShowVictory] = useState<boolean>(false);
    const [previousBest, setPreviousBest] = useState<number | null>(null);
    const [showPreviewModal, setShowPreviewModal] = useState<boolean>(false);
    const [confirmAction, setConfirmAction] = useState<"back" | "reset" | null>(
        null,
    );
    const [drag, setDrag] = useState<DragState | null>(null);
    const [selectedPieceId, setSelectedPieceId] = useState<number | null>(null);
    const [hoveredSlotIndex, setHoveredSlotIndex] = useState<number | null>(
        null,
    );
    const [feedback, setFeedback] = useState<Feedback>(null);
    const [isFullscreen, setIsFullscreen] = useState<boolean>(() =>
        checkNativeFullscreen(),
    );

    // Refs for DOM elements to calculate touch positions
    const slotsRef = useRef<(HTMLDivElement | null)[]>([]);
    const trayRef = useRef<HTMLDivElement>(null);
    const dragRef = useRef<DragState | null>(null);
    const feedbackTimerRef = useRef<number | null>(null);

    // Track native fullscreen changes & sync on mount
    useEffect(() => {
        const onFsChange = () => {
            setIsFullscreen(checkNativeFullscreen());
        };

        // Immediate sync on mount (e.g. when changing levels or remounting component)
        setIsFullscreen(checkNativeFullscreen());

        document.addEventListener("fullscreenchange", onFsChange);
        document.addEventListener("webkitfullscreenchange", onFsChange);
        document.addEventListener("msfullscreenchange", onFsChange);
        return () => {
            document.removeEventListener("fullscreenchange", onFsChange);
            document.removeEventListener("webkitfullscreenchange", onFsChange);
            document.removeEventListener("msfullscreenchange", onFsChange);
        };
    }, []);

    const toggleFullscreen = () => {
        soundManager.playClick();
        const doc = document as any;
        const docEl = document.documentElement as any;

        if (!checkNativeFullscreen() && !isFullscreen) {
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

    // 1. Initialize Image & Slice into NxN pieces
    const initPuzzle = useCallback(async () => {
        setIsLoading(true);
        // Kosongkan potongan lama agar tidak terbaca "menang" lagi
        setPieces([]);
        setIsCompleted(false);
        setShowVictory(false);
        setMovesCount(0);
        setTimeSeconds(0);
        setSelectedPieceId(null);
        setFeedback(null);
        dragRef.current = null;
        setDrag(null);
        setHintsRemaining(getMaxHintsForLevel(levelNumber, gameMode));

        let imageUrl = photo.url;
        let sliced: string[];

        try {
            sliced = await sliceImageIntoGrid(imageUrl, gridSize);
        } catch {
            imageUrl = createProceduralCozyImage(level.id - 1);
            sliced = await sliceImageIntoGrid(imageUrl, gridSize);
        }
        setPieceImages(sliced);
        setFullImageUrl(imageUrl);

        const initialPieces: PuzzlePiece[] = Array.from(
            { length: totalPieces },
            (_, i) => ({
                id: i,
                correctIndex: i,
                row: Math.floor(i / gridSize),
                col: i % gridSize,
                currentSlotIndex: null,
                isCorrect: false,
            }),
        );

        setPieces(shuffle(initialPieces));
        setIsLoading(false);
    }, [photo, gridSize, level.id, levelNumber, gameMode, totalPieces]);

    useEffect(() => {
        initPuzzle();
    }, [initPuzzle]);

    // 2. Timer Logic (Challenge mode), berhenti saat dialog konfirmasi terbuka
    const isPaused = confirmAction !== null;
    useEffect(() => {
        if (gameMode !== "challenge" || isCompleted || isLoading || isPaused) {
            return;
        }
        const timer = window.setInterval(() => {
            setTimeSeconds((prev) => prev + 1);
        }, 1000);
        return () => window.clearInterval(timer);
    }, [gameMode, isCompleted, isLoading, isPaused]);

    const showFeedback = (value: Feedback) => {
        if (feedbackTimerRef.current) {
            window.clearTimeout(feedbackTimerRef.current);
        }
        setFeedback(value);
        feedbackTimerRef.current = window.setTimeout(
            () => setFeedback(null),
            1600,
        );
    };

    useEffect(
        () => () => {
            if (feedbackTimerRef.current) {
                window.clearTimeout(feedbackTimerRef.current);
            }
        },
        [],
    );

    // 3. Memindahkan potongan (dipakai oleh ketuk maupun tarik)
    const movePiece = (pieceId: number, targetSlot: number | null) => {
        const piece = pieces.find((p) => p.id === pieceId);
        if (!piece || piece.isCorrect || isCompleted) return;
        if (piece.currentSlotIndex === targetSlot) {
            setSelectedPieceId(null);
            return;
        }

        const occupant =
            targetSlot === null
                ? undefined
                : pieces.find((p) => p.currentSlotIndex === targetSlot);

        // Potongan yang sudah benar terkunci
        if (occupant?.isCorrect) {
            soundManager.playBounce();
            showFeedback("locked");
            return;
        }

        const sourceSlot = piece.currentSlotIndex;
        setPieces((prev) =>
            prev.map((p) => {
                if (p.id === pieceId) {
                    return {
                        ...p,
                        currentSlotIndex: targetSlot,
                        isCorrect: targetSlot === p.correctIndex,
                    };
                }
                if (occupant && p.id === occupant.id) {
                    return {
                        ...p,
                        currentSlotIndex: sourceSlot,
                        isCorrect: sourceSlot === p.correctIndex,
                    };
                }
                return p;
            }),
        );
        setMovesCount((m) => m + 1);
        setSelectedPieceId(null);

        if (targetSlot === null) {
            soundManager.playClick();
            setFeedback(null);
        } else if (targetSlot === piece.correctIndex) {
            soundManager.playSnap();
            showFeedback("correct");
        } else {
            soundManager.playBounce();
            showFeedback("wrong");
        }
    };

    const handleTap = (pieceId: number) => {
        const tapped = pieces.find((p) => p.id === pieceId);
        const selected = pieces.find((p) => p.id === selectedPieceId);

        // Ada potongan terpilih lalu mengetuk potongan di papan: taruh di sana
        if (
            selected &&
            selected.id !== pieceId &&
            tapped &&
            tapped.currentSlotIndex !== null
        ) {
            movePiece(selected.id, tapped.currentSlotIndex);
            return;
        }
        soundManager.playClick();
        setSelectedPieceId((prev) => (prev === pieceId ? null : pieceId));
    };

    // 4. Pointer Events for Touchscreen & Mouse
    const handlePointerDown = (
        e: React.PointerEvent<HTMLElement>,
        piece: PuzzlePiece,
    ) => {
        // Hanya jari/kursor pertama yang dipakai
        if (isCompleted || piece.isCorrect || !e.isPrimary) return;
        if (e.button !== 0) return;

        const size =
            slotsRef.current[0]?.getBoundingClientRect().width ??
            e.currentTarget.getBoundingClientRect().width;

        dragRef.current = {
            pieceId: piece.id,
            pointerId: e.pointerId,
            startX: e.clientX,
            startY: e.clientY,
            x: e.clientX,
            y: e.clientY,
            lift: e.pointerType === "touch" ? size * 0.6 : 0,
            size,
            moved: false,
        };
    };

    const findSlot = (x: number, y: number): number | null => {
        for (let i = 0; i < totalPieces; i++) {
            if (isInside(slotsRef.current[i], x, y)) return i;
        }
        return null;
    };

    // Handler selalu versi terbaru, listener window cukup dipasang sekali
    const pointerHandlers = useRef({
        move: (_e: PointerEvent) => {},
        up: (_e: PointerEvent) => {},
        cancel: (_e: PointerEvent) => {},
    });

    pointerHandlers.current = {
        move: (e) => {
            const current = dragRef.current;
            if (!current || current.pointerId !== e.pointerId) return;
            const moved =
                current.moved ||
                Math.hypot(
                    e.clientX - current.startX,
                    e.clientY - current.startY,
                ) > DRAG_THRESHOLD;
            const next = { ...current, x: e.clientX, y: e.clientY, moved };
            dragRef.current = next;
            if (moved) {
                setSelectedPieceId(null);
                setDrag(next);
                setHoveredSlotIndex(findSlot(next.x, next.y - next.lift));
            }
        },
        up: (e) => {
            const current = dragRef.current;
            if (!current || current.pointerId !== e.pointerId) return;
            dragRef.current = null;
            setDrag(null);
            setHoveredSlotIndex(null);

            if (!current.moved) {
                handleTap(current.pieceId);
                return;
            }

            const slot = findSlot(e.clientX, e.clientY - current.lift);
            if (slot !== null) {
                movePiece(current.pieceId, slot);
            } else if (isInside(trayRef.current, e.clientX, e.clientY)) {
                movePiece(current.pieceId, null);
            }
            // Dilepas di luar papan & tray: potongan tetap di tempat semula
        },
        cancel: (e) => {
            if (dragRef.current?.pointerId !== e.pointerId) return;
            dragRef.current = null;
            setDrag(null);
            setHoveredSlotIndex(null);
        },
    };

    useEffect(() => {
        const move = (e: PointerEvent) => pointerHandlers.current.move(e);
        const up = (e: PointerEvent) => pointerHandlers.current.up(e);
        const cancel = (e: PointerEvent) => pointerHandlers.current.cancel(e);
        window.addEventListener("pointermove", move);
        window.addEventListener("pointerup", up);
        window.addEventListener("pointercancel", cancel);
        return () => {
            window.removeEventListener("pointermove", move);
            window.removeEventListener("pointerup", up);
            window.removeEventListener("pointercancel", cancel);
        };
    }, []);

    // 5. Check Victory Condition
    useEffect(() => {
        if (pieces.length === 0 || isCompleted) return;
        const allCorrect = pieces.every(
            (p) => p.currentSlotIndex === p.correctIndex,
        );
        if (allCorrect) {
            setIsCompleted(true);
            setPreviousBest(bestTimeSeconds);
            soundManager.playVictory();
            onLevelComplete({ timeSeconds, movesCount });
        }
    }, [
        pieces,
        isCompleted,
        timeSeconds,
        movesCount,
        bestTimeSeconds,
        onLevelComplete,
    ]);

    // Beri jeda sebentar supaya gambar utuh sempat terlihat
    useEffect(() => {
        if (!isCompleted) return;
        const timer = window.setTimeout(() => setShowVictory(true), 1200);
        return () => window.clearTimeout(timer);
    }, [isCompleted]);

    // 6. Hint Helper
    const handleUseHint = () => {
        if (hintsRemaining <= 0 || isCompleted) return;
        const wrongPieces = pieces.filter((p) => !p.isCorrect);
        if (wrongPieces.length === 0) return;

        // Utamakan potongan yang sedang dipilih
        const target =
            wrongPieces.find((p) => p.id === selectedPieceId) ??
            wrongPieces[Math.floor(Math.random() * wrongPieces.length)];

        setHintsRemaining((prev) => prev - 1);
        setSelectedPieceId(null);
        soundManager.playSnap();
        showFeedback("correct");

        setPieces((prev) =>
            prev.map((p) => {
                if (p.id === target.id) {
                    return {
                        ...p,
                        currentSlotIndex: p.correctIndex,
                        isCorrect: true,
                    };
                }
                if (p.currentSlotIndex === target.correctIndex) {
                    return { ...p, currentSlotIndex: null, isCorrect: false };
                }
                return p;
            }),
        );
    };

    const requestLeave = (action: "back" | "reset") => {
        soundManager.playClick();
        const hasProgress = movesCount > 0 || pieces.some((p) => p.isCorrect);
        if (hasProgress && !isCompleted) {
            setConfirmAction(action);
        } else if (action === "back") {
            onBackToLevels();
        } else {
            initPuzzle();
        }
    };

    const trayPieces = pieces.filter((p) => p.currentSlotIndex === null);
    const correctCount = pieces.filter((p) => p.isCorrect).length;
    const selectedPiece = pieces.find((p) => p.id === selectedPieceId);
    const canReturnToTray =
        !!selectedPiece && selectedPiece.currentSlotIndex !== null;

    const instruction = isCompleted
        ? "Puzzle selesai, hebat!"
        : feedback === "correct"
          ? "Tepat! Potongan terkunci."
          : feedback === "wrong"
            ? "Belum tepat, coba kotak lain."
            : feedback === "locked"
              ? "Kotak itu sudah benar, pilih kotak lain."
              : canReturnToTray
                ? "Ketuk kotak lain, atau ketuk tray untuk mengembalikan."
                : selectedPiece
                  ? "Sekarang ketuk kotak tujuannya."
                  : "Ketuk potongan lalu ketuk kotaknya, atau tarik langsung.";

    const actionClass =
        "px-0.5 sm:px-2.5 py-1.5 text-[10px] sm:text-xs whitespace-nowrap font-bold flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-1 cursor-pointer disabled:opacity-50";

    return (
        // Outer: fills available viewport height, compact no-scroll layout for mobile and desktop
        <div
            className={`w-full flex flex-col gap-1.5 select-none font-['Pixelify_Sans',sans-serif] puzzle-bg p-1.5 sm:p-2.5 overflow-hidden ${
                isFullscreen ? "fixed inset-0 z-50" : ""
            }`}
            style={{ height: "100dvh" }}
            // Tekan lama di layar sentuh tidak memunculkan menu gambar
            onContextMenu={(e) => e.preventDefault()}
        >
            {/* ── Top Controls Bar ── */}
            <div className="w-full pixel-box px-2 py-1.5 sm:px-3 sm:py-2 flex flex-wrap md:flex-nowrap items-center justify-between gap-x-2 gap-y-1.5 shrink-0">
                {/* Left: Back & Level Title */}
                <div className="flex items-center gap-2 min-w-0 flex-1">
                    <button
                        onClick={() => requestLeave("back")}
                        className="pixel-btn px-2 py-1.5 flex items-center gap-1 text-xs font-bold cursor-pointer shrink-0"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        <span>LEVEL</span>
                    </button>

                    <div className="min-w-0">
                        <h2 className="font-pixel-title text-[10px] sm:text-xs text-theme-title leading-snug whitespace-nowrap">
                            {/* Layar sempit: cukup nomor level agar header tetap ringkas */}
                            <span className="lg:hidden">Level {levelNumber}</span>
                            <span className="hidden lg:inline">{level.title}</span>
                        </h2>
                        <p className="text-xs text-theme-sub font-bold whitespace-nowrap">
                            Benar: {correctCount}/{totalPieces}
                        </p>
                    </div>
                </div>

                {/* Timer / Mode */}
                <div className="flex items-center gap-1 pixel-box-inner px-2 py-1 text-xs font-bold text-theme-sub shrink-0">
                    {gameMode === "challenge" ? (
                        <>
                            <Clock className="w-3.5 h-3.5 text-theme-title" />
                            <span>{formatTime(timeSeconds)}</span>
                        </>
                    ) : (
                        <>
                            <Sparkles className="w-3.5 h-3.5 text-theme-accent" />
                            <span>SANTAI</span>
                        </>
                    )}
                </div>

                {/* Tools & Action Controls (selalu berlabel) */}
                <div className="w-full md:w-auto grid grid-cols-5 md:flex items-stretch gap-1.5 shrink-0">
                    <button
                        onClick={handleUseHint}
                        disabled={isCompleted || isLoading || hintsRemaining <= 0}
                        className={`pixel-btn-green ${actionClass}`}
                    >
                        <Lightbulb className="w-4 h-4 text-yellow-200" />
                        <span>BANTU ({hintsRemaining})</span>
                    </button>

                    <button
                        onClick={() => {
                            soundManager.playClick();
                            setShowPreviewModal(true);
                        }}
                        disabled={isLoading}
                        className={`pixel-btn ${actionClass}`}
                    >
                        <Eye className="w-4 h-4" />
                        <span>CONTOH</span>
                    </button>

                    <button
                        onClick={() => requestLeave("reset")}
                        disabled={isLoading}
                        className={`pixel-btn-dark ${actionClass}`}
                    >
                        <RotateCcw className="w-4 h-4" />
                        <span>ULANGI</span>
                    </button>

                    {onToggleMute && (
                        <button
                            onClick={onToggleMute}
                            aria-pressed={!isMuted}
                            className={`pixel-btn-dark ${actionClass}`}
                        >
                            {isMuted ? (
                                <VolumeX className="w-4 h-4" />
                            ) : (
                                <Volume2 className="w-4 h-4" />
                            )}
                            <span>{isMuted ? "BISU" : "SUARA"}</span>
                        </button>
                    )}

                    <button
                        onClick={toggleFullscreen}
                        className={`pixel-btn-dark ${actionClass}`}
                    >
                        {isFullscreen ? (
                            <Minimize2 className="w-4 h-4" />
                        ) : (
                            <Maximize2 className="w-4 h-4" />
                        )}
                        <span>{isFullscreen ? "KECIL" : "PENUH"}</span>
                    </button>
                </div>
            </div>

            {/* ── Instruksi & umpan balik ── */}
            <p
                aria-live="polite"
                className={`shrink-0 pixel-box-inner px-2 py-1 text-center text-xs sm:text-sm font-bold ${
                    feedback === "correct" || isCompleted
                        ? "text-theme-accent"
                        : "text-theme-title"
                }`}
            >
                {instruction}
            </p>

            {/* ── Main Gameplay Area ── */}
            {isLoading ? (
                <div className="flex-1 flex items-center justify-center">
                    <div className="pixel-box p-8 flex flex-col items-center justify-center text-center">
                        <div className="w-10 h-10 border-4 border-theme-title border-t-transparent animate-spin mb-3" />
                        <p className="font-pixel-title text-xs text-theme-title">
                            Memotong Pixel Art...
                        </p>
                        <p className="text-xs text-theme-sub mt-1">
                            Grid {gridSize}x{gridSize}
                        </p>
                    </div>
                </div>
            ) : (
                // Responsive layout: column on mobile portrait, row on landscape/desktop
                <div className="flex-1 min-h-0 flex flex-col landscape:flex-row gap-1.5 sm:gap-2 overflow-hidden">
                    {/* ── Puzzle Grid: ukuran mengikuti ruang yang tersedia ── */}
                    <div
                        className="flex-1 min-w-0 min-h-0 flex items-center justify-center overflow-hidden"
                        style={{ containerType: "size" }}
                    >
                        <div
                            data-board
                            className="pixel-box p-1.5 sm:p-2 relative shrink-0"
                            style={{
                                width: "calc(min(100cqw, 100cqh) - 6px)",
                                aspectRatio: "1 / 1",
                            }}
                        >
                            {/* Gambar bayangan sebagai panduan (mode Santai) */}
                            {gameMode === "relaxed" && (
                                <div className="absolute inset-1.5 sm:inset-2 opacity-25 pointer-events-none">
                                    <img
                                        src={fullImageUrl}
                                        alt=""
                                        className="w-full h-full object-cover"
                                    />
                                </div>
                            )}

                            {/* Grid Cells */}
                            <div
                                className="w-full h-full grid gap-0.5 relative z-10"
                                style={{
                                    gridTemplateColumns: `repeat(${gridSize}, minmax(0, 1fr))`,
                                    gridTemplateRows: `repeat(${gridSize}, minmax(0, 1fr))`,
                                }}
                            >
                                {Array.from({ length: totalPieces }).map(
                                    (_, slotIdx) => {
                                        const pieceInSlot = pieces.find(
                                            (p) => p.currentSlotIndex === slotIdx,
                                        );
                                        const isHovered =
                                            hoveredSlotIndex === slotIdx;

                                        return (
                                            <div
                                                key={slotIdx}
                                                data-slot={slotIdx}
                                                ref={(el) => {
                                                    slotsRef.current[slotIdx] = el;
                                                }}
                                                onClick={() => {
                                                    if (
                                                        selectedPieceId !== null &&
                                                        (!pieceInSlot ||
                                                            pieceInSlot.isCorrect)
                                                    ) {
                                                        movePiece(
                                                            selectedPieceId,
                                                            slotIdx,
                                                        );
                                                    }
                                                }}
                                                className={`relative border-2 flex items-center justify-center overflow-hidden ${
                                                    isHovered
                                                        ? "border-theme-title bg-theme-accent/40"
                                                        : selectedPiece && !pieceInSlot
                                                          ? "border-dashed border-theme-title cursor-pointer"
                                                          : "border-theme-inner"
                                                } ${
                                                    gameMode === "challenge" && !isHovered
                                                        ? "bg-theme-wall"
                                                        : ""
                                                }`}
                                            >
                                                {pieceInSlot && (
                                                    <div
                                                        data-piece={pieceInSlot.id}
                                                        onPointerDown={(e) =>
                                                            handlePointerDown(
                                                                e,
                                                                pieceInSlot,
                                                            )
                                                        }
                                                        className={`w-full h-full relative touch-none ${
                                                            pieceInSlot.isCorrect
                                                                ? ""
                                                                : "cursor-grab active:cursor-grabbing"
                                                        } ${
                                                            drag?.pieceId === pieceInSlot.id
                                                                ? "opacity-30"
                                                                : ""
                                                        }`}
                                                    >
                                                        <img
                                                            src={pieceImages[pieceInSlot.id]}
                                                            alt="Potongan di papan"
                                                            draggable={false}
                                                            className="w-full h-full object-cover pointer-events-none select-none"
                                                        />
                                                        {!isCompleted && pieceInSlot.isCorrect && (
                                                            <>
                                                                <span className="absolute inset-0 border-2 border-green-400 pointer-events-none" />
                                                                <span className="absolute top-0.5 right-0.5 bg-green-700 text-white p-0.5 pointer-events-none">
                                                                    <Check className="w-3 h-3" />
                                                                </span>
                                                            </>
                                                        )}
                                                        {selectedPieceId === pieceInSlot.id && (
                                                            <span className="absolute inset-0 border-4 border-yellow-300 animate-pulse pointer-events-none" />
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    },
                                )}
                            </div>
                        </div>
                    </div>

                    {/* ── Piece Tray: geser ke samping (portrait) / ke bawah (landscape) ── */}
                    <div
                        ref={trayRef}
                        data-tray
                        onClick={(e) => {
                            if ((e.target as HTMLElement).closest("[data-piece]")) {
                                return;
                            }
                            if (canReturnToTray) {
                                movePiece(selectedPiece.id, null);
                            }
                        }}
                        className={`pixel-box p-1.5 sm:p-2.5 shrink-0 flex flex-col min-h-0 min-w-0 landscape:w-[26%] landscape:min-w-[180px] landscape:max-w-[300px] ${
                            canReturnToTray ? "cursor-pointer" : ""
                        }`}
                    >
                        <div className="flex items-center justify-between gap-2 mb-1.5 px-1 shrink-0 border-b border-theme-inner pb-1">
                            <span className="font-pixel-title text-[10px] sm:text-xs text-theme-title">
                                POTONGAN
                            </span>
                            <span className="text-xs text-theme-sub font-bold text-right">
                                {trayPieces.length} sisa
                                {trayPieces.length > 6 && (
                                    <span className="landscape:hidden"> • geser ↔</span>
                                )}
                            </span>
                        </div>

                        {trayPieces.length === 0 ? (
                            <div className="min-h-[76px] landscape:flex-1 flex flex-col items-center justify-center text-center text-sm text-theme-title font-bold gap-1 p-2 pixel-box-inner">
                                <span>
                                    {isCompleted
                                        ? "SELESAI!"
                                        : "Tukar potongan yang belum bertanda centang."}
                                </span>
                            </div>
                        ) : (
                            <div
                                data-tray-scroll
                                className="landscape:flex-1 min-h-0 overflow-auto custom-scrollbar"
                            >
                                <div className="grid gap-2 p-1 portrait:grid-flow-col portrait:grid-rows-2 portrait:[@media(max-height:700px)]:grid-rows-1 portrait:auto-cols-[68px] portrait:sm:auto-cols-[96px] portrait:w-max landscape:grid-cols-2 lg:landscape:grid-cols-3">
                                    {trayPieces.map((piece) => (
                                        <button
                                            type="button"
                                            key={piece.id}
                                            data-piece={piece.id}
                                            aria-label="Potongan puzzle"
                                            aria-pressed={selectedPieceId === piece.id}
                                            onPointerDown={(e) =>
                                                handlePointerDown(e, piece)
                                            }
                                            onClick={(e) => {
                                                // Klik dari keyboard (Enter/Spasi)
                                                if (e.detail === 0) handleTap(piece.id);
                                            }}
                                            className={`aspect-square pixel-box-inner p-1 cursor-grab active:cursor-grabbing portrait:touch-pan-x landscape:touch-pan-y ${
                                                selectedPieceId === piece.id
                                                    ? "!border-yellow-400 ring-4 ring-yellow-300"
                                                    : "hover:border-theme-title"
                                            } ${drag?.pieceId === piece.id ? "opacity-30" : ""}`}
                                        >
                                            <img
                                                src={pieceImages[piece.id]}
                                                alt=""
                                                draggable={false}
                                                className="w-full h-full object-cover pointer-events-none select-none"
                                            />
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Floating Dragged Piece Preview */}
            {drag && (
                <div
                    className="fixed pointer-events-none z-50 overflow-hidden border-2 border-theme-title shadow-[4px_4px_0px_#000] -translate-x-1/2 -translate-y-1/2 opacity-90"
                    style={{
                        left: drag.x,
                        top: drag.y - drag.lift,
                        width: drag.size,
                        height: drag.size,
                    }}
                >
                    <img
                        src={pieceImages[drag.pieceId]}
                        alt=""
                        className="w-full h-full object-cover"
                    />
                </div>
            )}

            {/* Preview Modal */}
            {showPreviewModal && (
                <PreviewModal
                    photo={photo}
                    imageUrl={fullImageUrl}
                    gridSize={gridSize}
                    onClose={() => setShowPreviewModal(false)}
                />
            )}

            {confirmAction && (
                <ConfirmDialog
                    title={
                        confirmAction === "back"
                            ? "KELUAR DARI LEVEL?"
                            : "ULANGI LEVEL?"
                    }
                    message="Susunan puzzle yang sekarang akan hilang."
                    confirmLabel={confirmAction === "back" ? "KELUAR" : "ULANGI"}
                    onCancel={() => setConfirmAction(null)}
                    onConfirm={() => {
                        setConfirmAction(null);
                        if (confirmAction === "back") onBackToLevels();
                        else initPuzzle();
                    }}
                />
            )}

            {/* Victory Modal */}
            {showVictory && (
                <VictoryModal
                    level={level}
                    photo={photo}
                    imageUrl={fullImageUrl}
                    gameMode={gameMode}
                    timeSeconds={timeSeconds}
                    previousBest={previousBest}
                    movesCount={movesCount}
                    onNextLevel={onNextLevel}
                    onBackToLevels={onBackToLevels}
                    onReplay={initPuzzle}
                />
            )}
        </div>
    );
};
