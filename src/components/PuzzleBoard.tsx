import React, { useState, useEffect, useRef, useCallback } from "react";
import {
    Eye,
    RotateCcw,
    Lightbulb,
    ArrowLeft,
    Clock,
    Sparkles,
    Maximize2,
    Minimize2,
} from "lucide-react";
import {
    GameMode,
    LevelConfig,
    Photo,
    PuzzlePiece,
    DraggedPieceState,
} from "../types";
import {
    sliceImageIntoGrid,
    createProceduralCozyImage,
} from "../utils/canvasHelper";
import { soundManager } from "../utils/audio";
import { PreviewModal } from "./PreviewModal";
import { VictoryModal } from "./VictoryModal";

interface PuzzleBoardProps {
    level: LevelConfig;
    photo: Photo;
    gameMode: GameMode;
    onLevelComplete: (stats: {
        timeSeconds: number;
        movesCount: number;
    }) => void;
    onNextLevel: () => void;
    onBackToLevels: () => void;
}

const getMaxHintsForLevel = (levelNumber: number, mode: GameMode): number => {
    if (mode === "relaxed") {
        return levelNumber * 2 + 1;
    } else {
        return levelNumber;
    }
};

export const PuzzleBoard: React.FC<PuzzleBoardProps> = ({
    level,
    photo,
    gameMode,
    onLevelComplete,
    onNextLevel,
    onBackToLevels,
}) => {
    const gridSize = level.gridSize;
    const totalPieces = gridSize * gridSize;

    const maxHints = getMaxHintsForLevel(
        level.levelNumber || level.id || 1,
        gameMode,
    );

    // Game States
    const [pieces, setPieces] = useState<PuzzlePiece[]>([]);
    const [pieceImages, setPieceImages] = useState<string[]>([]);
    const [fullImageUrl, setFullImageUrl] = useState<string>(photo.url);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [movesCount, setMovesCount] = useState<number>(0);
    const [timeSeconds, setTimeSeconds] = useState<number>(0);
    const [hintsRemaining, setHintsRemaining] = useState<number>(maxHints);
    const [isCompleted, setIsCompleted] = useState<boolean>(false);
    const [showPreviewModal, setShowPreviewModal] = useState<boolean>(false);
    const [draggedState, setDraggedState] = useState<DraggedPieceState | null>(
        null,
    );
    const [hoveredSlotIndex, setHoveredSlotIndex] = useState<number | null>(
        null,
    );
    const [justSnappedPieceId, setJustSnappedPieceId] = useState<number | null>(
        null,
    );
    const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

    // Refs for Board DOM elements to calculate touch positions
    const boardRef = useRef<HTMLDivElement>(null);
    const slotsRef = useRef<(HTMLDivElement | null)[]>([]);
    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    // Track native fullscreen changes
    useEffect(() => {
        const onFsChange = () => {
            const isFsNative = !!(
                document.fullscreenElement ||
                (document as any).webkitFullscreenElement ||
                (document as any).msFullscreenElement
            );
            setIsFullscreen(isFsNative);
        };
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

        const isFsNative = !!(
            doc.fullscreenElement ||
            doc.webkitFullscreenElement ||
            doc.msFullscreenElement
        );

        if (!isFsNative && !isFullscreen) {
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
        setIsCompleted(false);
        setMovesCount(0);
        setTimeSeconds(0);
        setDraggedState(null);
        setHintsRemaining(
            getMaxHintsForLevel(level.levelNumber || level.id || 1, gameMode),
        );

        let activeUrl = photo.url;

        try {
            const sliced = await sliceImageIntoGrid(activeUrl, gridSize);
            setPieceImages(sliced);
            setFullImageUrl(activeUrl);
        } catch {
            const fallbackUrl = createProceduralCozyImage(level.id);
            const sliced = await sliceImageIntoGrid(fallbackUrl, gridSize);
            setPieceImages(sliced);
            setFullImageUrl(fallbackUrl);
        }

        const initialPieces: PuzzlePiece[] = [];
        for (let i = 0; i < totalPieces; i++) {
            initialPieces.push({
                id: i,
                correctIndex: i,
                row: Math.floor(i / gridSize),
                col: i % gridSize,
                currentSlotIndex: null,
                isCorrect: false,
            });
        }

        const shuffledTray = [...initialPieces].sort(() => Math.random() - 0.5);
        setPieces(shuffledTray);
        setIsLoading(false);
    }, [photo, gridSize, level.id, level.levelNumber, gameMode, totalPieces]);

    useEffect(() => {
        initPuzzle();
    }, [initPuzzle]);

    // 2. Timer Logic (Challenge mode)
    useEffect(() => {
        if (gameMode === "challenge" && !isCompleted && !isLoading) {
            timerRef.current = setInterval(() => {
                setTimeSeconds((prev) => prev + 1);
            }, 1000);
        } else if (timerRef.current) {
            clearInterval(timerRef.current);
        }
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [gameMode, isCompleted, isLoading]);

    // 3. Pointer Events for Touchscreen & Mouse Drag & Drop
    const handlePointerDown = (
        e: React.PointerEvent<HTMLDivElement>,
        piece: PuzzlePiece,
        source: "tray" | "grid",
    ) => {
        if (isCompleted) return;
        soundManager.playClick();

        try {
            e.currentTarget.setPointerCapture(e.pointerId);
        } catch {
            // Ignore
        }

        const rect = e.currentTarget.getBoundingClientRect();
        const offsetX = e.clientX - rect.left;
        const offsetY = e.clientY - rect.top;

        setDraggedState({
            pieceId: piece.id,
            startX: e.clientX,
            startY: e.clientY,
            currentX: e.clientX,
            currentY: e.clientY,
            offsetX,
            offsetY,
            isDragging: true,
            source,
            sourceSlotIndex: piece.currentSlotIndex,
        });
    };

    useEffect(() => {
        if (!draggedState?.isDragging) return;

        const handlePointerMove = (e: PointerEvent) => {
            setDraggedState((prev) =>
                prev
                    ? {
                          ...prev,
                          currentX: e.clientX,
                          currentY: e.clientY,
                      }
                    : null,
            );

            let matchedSlot: number | null = null;
            slotsRef.current.forEach((slotEl, idx) => {
                if (slotEl) {
                    const rect = slotEl.getBoundingClientRect();
                    if (
                        e.clientX >= rect.left &&
                        e.clientX <= rect.right &&
                        e.clientY >= rect.top &&
                        e.clientY <= rect.bottom
                    ) {
                        matchedSlot = idx;
                    }
                }
            });
            setHoveredSlotIndex(matchedSlot);
        };

        const handlePointerUp = (e: PointerEvent) => {
            if (!draggedState) return;

            const pieceId = draggedState.pieceId;
            let targetSlot: number | null = null;

            slotsRef.current.forEach((slotEl, idx) => {
                if (slotEl) {
                    const rect = slotEl.getBoundingClientRect();
                    const centerX = rect.left + rect.width / 2;
                    const centerY = rect.top + rect.height / 2;
                    const dist = Math.hypot(
                        e.clientX - centerX,
                        e.clientY - centerY,
                    );

                    if (dist < Math.max(rect.width * 0.8, 60)) {
                        targetSlot = idx;
                    }
                }
            });

            setMovesCount((m) => m + 1);

            if (targetSlot !== null) {
                const draggedPiece = pieces.find((p) => p.id === pieceId);
                if (draggedPiece) {
                    const pieceInTargetSlot = pieces.find(
                        (p) =>
                            p.currentSlotIndex === targetSlot &&
                            p.id !== pieceId,
                    );

                    soundManager.playSnap();
                    setJustSnappedPieceId(pieceId);
                    setTimeout(() => setJustSnappedPieceId(null), 400);

                    setPieces((prevPieces) =>
                        prevPieces.map((p) => {
                            if (p.id === pieceId) {
                                const isCorrect = targetSlot === p.correctIndex;
                                return {
                                    ...p,
                                    currentSlotIndex: targetSlot,
                                    isCorrect,
                                };
                            }
                            if (
                                pieceInTargetSlot &&
                                p.id === pieceInTargetSlot.id
                            ) {
                                const newSlot = draggedState.sourceSlotIndex;
                                const isCorrect =
                                    newSlot !== null &&
                                    newSlot === p.correctIndex;
                                return {
                                    ...p,
                                    currentSlotIndex: newSlot,
                                    isCorrect,
                                };
                            }
                            return p;
                        }),
                    );
                }
            } else {
                soundManager.playBounce();
                setPieces((prevPieces) =>
                    prevPieces.map((p) =>
                        p.id === pieceId
                            ? { ...p, currentSlotIndex: null, isCorrect: false }
                            : p,
                    ),
                );
            }

            setDraggedState(null);
            setHoveredSlotIndex(null);
        };

        window.addEventListener("pointermove", handlePointerMove);
        window.addEventListener("pointerup", handlePointerUp);
        window.addEventListener("pointercancel", handlePointerUp);

        return () => {
            window.removeEventListener("pointermove", handlePointerMove);
            window.removeEventListener("pointerup", handlePointerUp);
            window.removeEventListener("pointercancel", handlePointerUp);
        };
    }, [draggedState, pieces]);

    // 4. Check Victory Condition
    useEffect(() => {
        if (pieces.length > 0 && !isCompleted) {
            const allFilled = pieces.every((p) => p.currentSlotIndex !== null);
            const allCorrect =
                allFilled &&
                pieces.every((p) => p.currentSlotIndex === p.correctIndex);

            if (allCorrect) {
                setIsCompleted(true);
                soundManager.playVictory();
                onLevelComplete({
                    timeSeconds,
                    movesCount,
                });
            }
        }
    }, [pieces, isCompleted, timeSeconds, movesCount, onLevelComplete]);

    // 5. Hint Helper
    const handleUseHint = () => {
        if (hintsRemaining <= 0) return;
        soundManager.playClick();
        const wrongPieces = pieces.filter(
            (p) => p.currentSlotIndex !== p.correctIndex,
        );
        if (wrongPieces.length === 0) return;

        setHintsRemaining((prev) => prev - 1);

        const randomPiece =
            wrongPieces[Math.floor(Math.random() * wrongPieces.length)];
        soundManager.playSnap();
        setJustSnappedPieceId(randomPiece.id);
        setTimeout(() => setJustSnappedPieceId(null), 400);

        setPieces((prev) => {
            const existingOccupant = prev.find(
                (p) => p.currentSlotIndex === randomPiece.correctIndex,
            );
            return prev.map((p) => {
                if (p.id === randomPiece.id) {
                    return {
                        ...p,
                        currentSlotIndex: randomPiece.correctIndex,
                        isCorrect: true,
                    };
                }
                if (existingOccupant && p.id === existingOccupant.id) {
                    return { ...p, currentSlotIndex: null, isCorrect: false };
                }
                return p;
            });
        });
    };

    const trayPieces = pieces.filter((p) => p.currentSlotIndex === null);
    const correctCount = pieces.filter(
        (p) => p.currentSlotIndex === p.correctIndex,
    ).length;

    return (
        // Outer: fills available viewport height (below navbar), no scroll
        <div
            ref={containerRef}
            className={`w-full flex flex-col select-none font-['Pixelify_Sans',sans-serif] transition-all duration-200 ${
                isFullscreen
                    ? "fixed inset-0 z-50 bg-theme-main p-2 sm:p-4 overflow-hidden"
                    : ""
            }`}
            style={{
                height: isFullscreen
                    ? "100vh"
                    : "calc(100dvh - var(--navbar-h, 56px))",
            }}
        >
            {/* ── Top Controls Bar ── */}
            <div className="w-full pixel-box px-3 py-2 flex flex-wrap items-center justify-between gap-2 shrink-0">
                {/* Left: Back & Level Title */}
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => {
                            soundManager.playClick();
                            onBackToLevels();
                        }}
                        className="pixel-btn px-2.5 py-1.5 flex items-center gap-1 text-xs font-bold cursor-pointer"
                    >
                        <ArrowLeft className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">MENU</span>
                    </button>

                    <div>
                        <h2 className="font-pixel-title text-[10px] sm:text-xs text-theme-title leading-tight">
                            {level.title}
                        </h2>
                        <p className="text-[10px] text-theme-sub mt-0.5">
                            Cocok: {correctCount}/{totalPieces}
                        </p>
                    </div>
                </div>

                {/* Center: Timer */}
                <div className="flex items-center gap-2 pixel-box-inner px-2.5 py-1 text-xs font-bold text-theme-sub">
                    {gameMode === "challenge" ? (
                        <>
                            <Clock className="w-3.5 h-3.5 text-theme-title animate-pulse" />
                            <span>
                                {Math.floor(timeSeconds / 60)
                                    .toString()
                                    .padStart(2, "0")}
                                :
                                {(timeSeconds % 60)
                                    .toString()
                                    .padStart(2, "0")}
                            </span>
                        </>
                    ) : (
                        <>
                            <Sparkles className="w-3.5 h-3.5 text-theme-accent" />
                            <span>SANTAI</span>
                        </>
                    )}
                </div>

                {/* Right: Tools */}
                <div className="flex items-center gap-1.5">
                    <button
                        onClick={handleUseHint}
                        disabled={
                            correctCount === totalPieces ||
                            isLoading ||
                            hintsRemaining <= 0
                        }
                        title={
                            hintsRemaining > 0
                                ? `Bantuan (Sisa: ${hintsRemaining})`
                                : "Bantuan Habis!"
                        }
                        className="pixel-btn-green px-2 py-1.5 text-xs font-bold flex items-center gap-1 disabled:opacity-50 cursor-pointer"
                    >
                        <Lightbulb className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">HINT ({hintsRemaining})</span>
                        <span className="sm:hidden">({hintsRemaining})</span>
                    </button>

                    <button
                        onClick={() => {
                            soundManager.playClick();
                            setShowPreviewModal(true);
                        }}
                        title="Lihat Foto Utuh"
                        className="pixel-btn px-2 py-1.5 text-xs font-bold flex items-center gap-1 cursor-pointer"
                    >
                        <Eye className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">FOTO</span>
                    </button>

                    <button
                        onClick={() => {
                            soundManager.playClick();
                            initPuzzle();
                        }}
                        title="Ulangi Level"
                        className="pixel-btn-dark p-1.5 text-xs font-bold cursor-pointer"
                    >
                        <RotateCcw className="w-3.5 h-3.5" />
                    </button>

                    {/* Fullscreen Toggle */}
                    <button
                        onClick={toggleFullscreen}
                        title={isFullscreen ? "Keluar Fullscreen" : "Fullscreen"}
                        className="pixel-btn-dark p-1.5 text-xs font-bold cursor-pointer"
                    >
                        {isFullscreen ? (
                            <Minimize2 className="w-3.5 h-3.5" />
                        ) : (
                            <Maximize2 className="w-3.5 h-3.5" />
                        )}
                    </button>
                </div>
            </div>

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
                // Responsive layout: column on mobile, row on landscape/desktop
                <div className="flex-1 min-h-0 flex flex-col landscape:flex-row gap-2 p-2">

                    {/* ── Puzzle Grid ── */}
                    <div className="flex-1 min-h-0 flex items-center justify-center">
                        <div
                            ref={boardRef}
                            className="pixel-box p-2 relative shrink-0 transition-all duration-200"
                            style={{
                                width: isFullscreen
                                    ? "min(95vw, calc(100vh - 120px))"
                                    : "min(100%, calc(100dvh - var(--navbar-h, 56px) - 130px))",
                                maxHeight: isFullscreen
                                    ? "calc(100vh - 120px)"
                                    : "calc(100dvh - var(--navbar-h, 56px) - 130px)",
                                aspectRatio: "1 / 1",
                            }}
                        >
                            {/* Watermark */}
                            <div className="absolute inset-2 overflow-hidden opacity-10 pointer-events-none">
                                <img
                                    src={fullImageUrl}
                                    alt="Watermark"
                                    className="w-full h-full object-cover"
                                />
                            </div>

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
                                                ref={(el) => {
                                                    slotsRef.current[slotIdx] = el;
                                                }}
                                                className={`relative border transition-all flex items-center justify-center overflow-hidden ${
                                                    isHovered
                                                        ? "border-theme-title bg-theme-accent/30"
                                                        : "border-theme-inner bg-theme-wall"
                                                }`}
                                            >
                                                {!pieceInSlot && (
                                                    <span className="text-[8px] font-mono text-theme-sub opacity-40 font-bold pointer-events-none">
                                                        {slotIdx + 1}
                                                    </span>
                                                )}

                                                {pieceInSlot && (
                                                    <div
                                                        onPointerDown={(e) =>
                                                            handlePointerDown(
                                                                e,
                                                                pieceInSlot,
                                                                "grid",
                                                            )
                                                        }
                                                        className={`w-full h-full overflow-hidden cursor-grab active:cursor-grabbing relative touch-none ${
                                                            justSnappedPieceId ===
                                                            pieceInSlot.id
                                                                ? "ring-1 ring-theme-title"
                                                                : ""
                                                        }`}
                                                    >
                                                        <img
                                                            src={
                                                                pieceImages[
                                                                    pieceInSlot.id
                                                                ]
                                                            }
                                                            alt={`Piece ${pieceInSlot.id}`}
                                                            className="w-full h-full object-cover pointer-events-none select-none"
                                                        />
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    },
                                )}
                            </div>
                        </div>
                    </div>

                    {/* ── Piece Tray ── */}
                    <div className="pixel-box p-2 landscape:w-[22%] landscape:min-w-[120px] landscape:max-w-[200px] shrink-0 flex flex-col min-h-0">
                        <div className="flex items-center justify-between mb-1 px-0.5 shrink-0">
                            <span className="font-pixel-title text-[9px] text-theme-title">
                                TRAY ({trayPieces.length})
                            </span>
                            <span className="text-[9px] text-theme-sub">
                                Tarik ke slot
                            </span>
                        </div>

                        {trayPieces.length === 0 ? (
                            <div className="flex-1 flex items-center justify-center text-center text-[10px] text-theme-accent font-bold gap-1 p-2">
                                <Sparkles className="w-3.5 h-3.5 shrink-0" />
                                <span>Semua terisi! Cek posisinya...</span>
                            </div>
                        ) : (
                            // Portrait: horizontal scroll row; Landscape: vertical scroll grid
                            <div className="flex-1 min-h-0 overflow-auto">
                                <div className="flex landscape:flex-col landscape:items-center gap-1.5 pb-1 pt-0.5 px-0.5 touch-pan-x landscape:touch-pan-y">
                                    {trayPieces.map((piece) => (
                                        <div
                                            key={piece.id}
                                            onPointerDown={(e) =>
                                                handlePointerDown(e, piece, "tray")
                                            }
                                            className="shrink-0 pixel-box-inner p-0.5 hover:border-theme-title cursor-grab active:cursor-grabbing hover:scale-105 active:scale-95 touch-none"
                                            style={{ width: 56, height: 56 }}
                                        >
                                            <div className="w-full h-full overflow-hidden bg-theme-wall">
                                                <img
                                                    src={pieceImages[piece.id]}
                                                    alt={`Tray piece ${piece.id}`}
                                                    className="w-full h-full object-cover pointer-events-none select-none"
                                                />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Floating Dragged Piece Preview */}
            {draggedState?.isDragging && (
                <div
                    className="fixed pointer-events-none z-50 w-16 h-16 sm:w-20 sm:h-20 overflow-hidden border-2 border-theme-title shadow-[4px_4px_0px_#000] scale-110 -translate-x-1/2 -translate-y-1/2"
                    style={{
                        left: `${draggedState.currentX}px`,
                        top: `${draggedState.currentY}px`,
                    }}
                >
                    <img
                        src={pieceImages[draggedState.pieceId]}
                        alt="Dragging"
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

            {/* Victory Modal */}
            {isCompleted && (
                <VictoryModal
                    level={level}
                    photo={photo}
                    imageUrl={fullImageUrl}
                    gameMode={gameMode}
                    timeSeconds={timeSeconds}
                    movesCount={movesCount}
                    onNextLevel={onNextLevel}
                    onBackToLevels={onBackToLevels}
                    onReplay={() => {
                        setIsCompleted(false);
                        initPuzzle();
                    }}
                />
            )}
        </div>
    );
};
