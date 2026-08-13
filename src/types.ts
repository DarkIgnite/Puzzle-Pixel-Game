/**
 * Core type definitions for Cozy Photo Puzzle Game
 */

export type GameMode = "relaxed" | "challenge";

export type ThemeMode = "dark" | "light";

export type ScreenState = "start" | "levelSelect" | "gameplay";

export interface Photo {
    id: string;
    name: string;
    description: string;
    url: string; // Active image URL or generated canvas Data URL
    placeholderPath: string; // Path such as 'assets/photos/photo-1.jpg'
    isCustom?: boolean;
}

export interface LevelConfig {
    id: number;
    levelNumber: number;
    title: string;
    subtitle: string;
    gridSize: number; // 3 = 3x3 (9 pieces), 4 = 4x4 (16 pieces), 5 = 5x5 (25 pieces)
    photoId: string;
    defaultPhotoPath: string;
}

export interface PuzzlePiece {
    id: number; // Index 0 to (gridSize*gridSize - 1)
    correctIndex: number;
    row: number;
    col: number;
    currentSlotIndex: number | null; // null = in piece tray, or 0..(gridSize*gridSize - 1)
    isCorrect: boolean; // Snapped into correct slot
    dataUrl?: string; // Sliced image piece data URL
}

export interface LevelProgress {
    levelId: number;
    completed: boolean;
    bestTimeSeconds: number | null;
    movesCount: number;
    stars: number;
}

export interface DraggedPieceState {
    pieceId: number;
    startX: number;
    startY: number;
    currentX: number;
    currentY: number;
    offsetX: number;
    offsetY: number;
    isDragging: boolean;
    source: "tray" | "grid";
    sourceSlotIndex: number | null;
}
