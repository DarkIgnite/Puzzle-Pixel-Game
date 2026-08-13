import React, { useState, useEffect, useRef, useCallback } from "react";
import {
    Eye,
    RotateCcw,
    Lightbulb,
    ArrowLeft,
    Clock,
    Check,
    Sparkles,
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

    // Game States
    const [pieces, setPieces] = useState<PuzzlePiece[]>([]);
    const [pieceImages, setPieceImages] = useState<string[]>([]);
    const [fullImageUrl, setFullImageUrl] = useState<string>(photo.url);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [movesCount, setMovesCount] = useState<number>(0);
    const [timeSeconds, setTimeSeconds] = useState<number>(0);
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

    // Refs for Board DOM elements to calculate touch positions
    const boardRef = useRef<HTMLDivElement>(null);
    const slotsRef = useRef<(HTMLDivElement | null)[]>([]);
    const timerRef = useRef<NodeJS.Timeout | null>(null);

    // 1. Initialize Image & Slice into NxN pieces
    const initPuzzle = useCallback(async () => {
        setIsLoading(true);
        setIsCompleted(false);
        setMovesCount(0);
        setTimeSeconds(0);
        setDraggedState(null);

        let activeUrl = photo.url;

        try {
            // Test loading image
            const sliced = await sliceImageIntoGrid(activeUrl, gridSize);
            setPieceImages(sliced);
            setFullImageUrl(activeUrl);
        } catch {
            // Fallback to procedural image if photo fails
            const fallbackUrl = createProceduralCozyImage(level.id);
            const sliced = await sliceImageIntoGrid(fallbackUrl, gridSize);
            setPieceImages(sliced);
            setFullImageUrl(fallbackUrl);
        }

        // Build piece objects
        const initialPieces: PuzzlePiece[] = [];
        for (let i = 0; i < totalPieces; i++) {
            initialPieces.push({
                id: i,
                correctIndex: i,
                row: Math.floor(i / gridSize),
                col: i % gridSize,
                currentSlotIndex: null, // Start in tray
                isCorrect: false,
            });
        }

        // Shuffle tray order randomly
        const shuffledTray = [...initialPieces].sort(() => Math.random() - 0.5);
        setPieces(shuffledTray);
        setIsLoading(false);
    }, [photo, gridSize, level.id, totalPieces]);

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
        if (isCompleted) return; // Game already won
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

            // Check hover target slot
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

            // Find nearest slot within drop tolerance
            slotsRef.current.forEach((slotEl, idx) => {
                if (slotEl) {
                    const rect = slotEl.getBoundingClientRect();
                    const centerX = rect.left + rect.width / 2;
                    const centerY = rect.top + rect.height / 2;
                    const dist = Math.hypot(
                        e.clientX - centerX,
                        e.clientY - centerY,
                    );

                    // Within tolerance (e.g. max 75px or cell width/2)
                    if (dist < Math.max(rect.width * 0.8, 60)) {
                        targetSlot = idx;
                    }
                }
            });

            setMovesCount((m) => m + 1);

            // Evaluate drop action
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
                                // Move dragged piece to targetSlot
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
                                // Swap target slot's occupant to dragged piece's source slot (or tray if came from tray)
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
                // Dropped outside board or in tray area -> Return piece to tray
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

    // 4. Check Victory Condition: ONLY when ALL slots are filled AND all pieces in correct slots
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

    // 5. Hint Helper: Auto place 1 misplaced/tray piece into its correct slot
    const handleUseHint = () => {
        soundManager.playClick();
        const wrongPieces = pieces.filter(
            (p) => p.currentSlotIndex !== p.correctIndex,
        );
        if (wrongPieces.length === 0) return;

        const randomPiece =
            wrongPieces[Math.floor(Math.random() * wrongPieces.length)];
        soundManager.playSnap();
        setJustSnappedPieceId(randomPiece.id);
        setTimeout(() => setJustSnappedPieceId(null), 400);

        setPieces((prev) => {
            // Find if another piece is currently occupying randomPiece.correctIndex slot
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
                    // Send occupying piece back to tray
                    return { ...p, currentSlotIndex: null, isCorrect: false };
                }
                return p;
            });
        });
    };

    // Unplaced pieces in tray
    const trayPieces = pieces.filter((p) => p.currentSlotIndex === null);
    const correctCount = pieces.filter(
        (p) => p.currentSlotIndex === p.correctIndex,
    ).length;

    return (
        <div className="w-full max-w-4xl mx-auto px-3 py-3 flex flex-col items-center select-none font-['Pixelify_Sans',sans-serif]">
            {/* Top Controls Bar */}
            <div className="w-full pixel-box p-3 sm:p-4 mb-4 flex flex-wrap items-center justify-between gap-3 text-white">
                {/* Left: Back & Level Title */}
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => {
                            soundManager.playClick();
                            onBackToLevels();
                        }}
                        className="pixel-btn px-3 py-1.5 flex items-center gap-1.5 text-xs font-bold cursor-pointer">
                        <ArrowLeft className="w-4 h-4" />
                        <span className="hidden sm:inline">MENU</span>
                    </button>

                    <div>
                        <h2 className="font-pixel-title text-xs sm:text-sm text-theme-title leading-tight">
                            {level.title}
                        </h2>
                        <p className="text-xs text-theme-sub mt-0.5">
                            Cocok: {correctCount}/{totalPieces} | Pasang di mana
                            saja
                        </p>
                    </div>
                </div>

                {/* Center: Timer / Mode Indicator */}
                <div className="flex items-center gap-2 pixel-box-inner px-3 py-1.5 text-xs font-bold text-theme-sub">
                    {gameMode === "challenge" ? (
                        <>
                            <Clock className="w-4 h-4 text-theme-title animate-pulse" />
                            <span>
                                {Math.floor(timeSeconds / 60)
                                    .toString()
                                    .padStart(2, "0")}
                                :
                                {(timeSeconds % 60).toString().padStart(2, "0")}
                            </span>
                        </>
                    ) : (
                        <>
                            <Sparkles className="w-4 h-4 text-theme-accent" />
                            <span>SANTAI</span>
                        </>
                    )}
                </div>

                {/* Right Action Tools: Preview, Hint, Reset */}
                <div className="flex items-center gap-2">
                    {/* Hint */}
                    <button
                        onClick={handleUseHint}
                        disabled={correctCount === totalPieces || isLoading}
                        title="Bantuan: Pasang 1 Potongan"
                        className="pixel-btn-green px-2.5 py-1.5 text-xs font-bold flex items-center gap-1 disabled:opacity-50 cursor-pointer">
                        <Lightbulb className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">HINT ( 0 )</span>
                    </button>

                    {/* Preview Full Image */}
                    <button
                        onClick={() => {
                            soundManager.playClick();
                            setShowPreviewModal(true);
                        }}
                        title="Lihat Foto Utuh"
                        className="pixel-btn px-2.5 py-1.5 text-xs font-bold flex items-center gap-1 cursor-pointer">
                        <Eye className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">FOTO</span>
                    </button>

                    {/* Restart / Reset */}
                    <button
                        onClick={() => {
                            soundManager.playClick();
                            initPuzzle();
                        }}
                        title="Ulangi Level Ini"
                        className="pixel-btn-dark p-1.5 text-xs font-bold cursor-pointer">
                        <RotateCcw className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Main Gameplay Layout */}
            {isLoading ? (
                <div className="w-full max-w-md aspect-square pixel-box p-8 flex flex-col items-center justify-center text-center">
                    <div className="w-12 h-12 border-4 border-theme-title border-t-transparent animate-spin mb-4" />
                    <p className="font-pixel-title text-xs text-theme-title">
                        Memotong Pixel Art...
                    </p>
                    <p className="text-xs text-theme-sub mt-2">
                        Grid {gridSize}x{gridSize}
                    </p>
                </div>
            ) : (
                <div className="w-full flex flex-col items-center gap-4">
                    {/* Puzzle Board Grid (Fixed 1:1 Aspect Ratio) */}
                    <div
                        ref={boardRef}
                        className="w-full max-w-[420px] sm:max-w-[460px] aspect-square pixel-box p-2.5 sm:p-3 relative">
                        {/* Watermark Background */}
                        <div className="absolute inset-2.5 sm:inset-3 overflow-hidden opacity-10 pointer-events-none">
                            <img
                                src={fullImageUrl}
                                alt="Watermark"
                                className="w-full h-full object-cover"
                            />
                        </div>

                        {/* Grid Cells Container */}
                        <div
                            className="w-full h-full grid gap-1 relative z-10"
                            style={{
                                gridTemplateColumns: `repeat(${gridSize}, minmax(0, 1fr))`,
                                gridTemplateRows: `repeat(${gridSize}, minmax(0, 1fr))`,
                            }}>
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
                                            className={`relative aspect-square border-2 transition-all flex items-center justify-center overflow-hidden ${
                                                isHovered
                                                    ? "border-theme-title bg-theme-accent/30"
                                                    : "border-theme-inner bg-theme-wall"
                                            }`}>
                                            {/* Empty Slot Number */}
                                            {!pieceInSlot && (
                                                <span className="text-xs font-mono text-theme-sub opacity-50 font-bold pointer-events-none">
                                                    {slotIdx + 1}
                                                </span>
                                            )}

                                            {/* Piece in Slot */}
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
                                                            ? "ring-2 ring-theme-title"
                                                            : ""
                                                    }`}>
                                                    <img
                                                        src={
                                                            pieceImages[
                                                                pieceInSlot.id
                                                            ]
                                                        }
                                                        alt={`Piece ${pieceInSlot.id}`}
                                                        className="w-full h-full object-cover pointer-events-none select-none"
                                                    />

                                                    {/* Pixel indicator badge when placed in correct slot */}
                                                    {pieceInSlot.currentSlotIndex ===
                                                        pieceInSlot.correctIndex && (
                                                        <div className="absolute top-0.5 right-0.5 pixel-btn-green p-0.5 shadow-xs">
                                                            <Check className="w-2.5 h-2.5" />
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    );
                                },
                            )}
                        </div>
                    </div>

                    {/* Piece Tray */}
                    <div className="w-full max-w-xl pixel-box p-3 sm:p-4">
                        <div className="flex items-center justify-between mb-2 px-1">
                            <span className="font-pixel-title text-[10px] sm:text-xs text-theme-title flex items-center gap-1.5">
                                <span>TRAY POTONGAN ({trayPieces.length})</span>
                            </span>
                            <span className="text-xs text-theme-sub">
                                Tarik potongan ke slot manapun
                            </span>
                        </div>

                        {trayPieces.length === 0 ? (
                            <div className="py-4 text-center text-xs text-theme-accent font-bold flex items-center justify-center gap-2">
                                <Sparkles className="w-4 h-4" />
                                <span>
                                    Semua slot terisi! Cek apakah posisinya
                                    sudah benar...
                                </span>
                            </div>
                        ) : (
                            <div className="flex items-center gap-2.5 overflow-x-auto pb-2 pt-1 px-1 touch-pan-x">
                                {trayPieces.map((piece) => (
                                    <div
                                        key={piece.id}
                                        onPointerDown={(e) =>
                                            handlePointerDown(e, piece, "tray")
                                        }
                                        className="w-18 h-18 sm:w-22 sm:h-22 shrink-0 pixel-box-inner p-1 hover:border-theme-title cursor-grab active:cursor-grabbing hover:scale-105 active:scale-95 touch-none relative">
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
                        )}
                    </div>
                </div>
            )}

            {/* Floating Dragged Piece Preview */}
            {draggedState?.isDragging && (
                <div
                    className="fixed pointer-events-none z-50 w-20 h-20 sm:w-24 sm:h-24 overflow-hidden border-2 border-theme-title shadow-[4px_4px_0px_#000] scale-110 -translate-x-1/2 -translate-y-1/2"
                    style={{
                        left: `${draggedState.currentX}px`,
                        top: `${draggedState.currentY}px`,
                    }}>
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
