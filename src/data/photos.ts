/**
 * Cozy Pixel Photo Catalog & Default Level Configurations
 */

import { LevelConfig, Photo } from '../types';
import { createProceduralCozyImage } from '../utils/canvasHelper';

/**
 * Default catalog of cozy pixel art photos.
 */
export const INITIAL_PHOTOS: Photo[] = [
  {
    id: 'photo-1',
    name: 'Kopi & Kamar Pixel',
    description: 'Suasana malam hangat di sudut meja kayu dengan cangkir kopi pixel.',
    url: createProceduralCozyImage(0),
    placeholderPath: 'assets/photos/photo-1.jpg',
  },
  {
    id: 'photo-2',
    name: 'Tanaman & Rak Pixel',
    description: 'Rak dinding kayu berhias sukulen hijau dan lilin hangat.',
    url: createProceduralCozyImage(1),
    placeholderPath: 'assets/photos/photo-2.jpg',
  },
  {
    id: 'photo-3',
    name: 'Kafe Hujan Pixel',
    description: 'Sudut jendela kafe berselimut hujan gerimis di balik kaca.',
    url: createProceduralCozyImage(2),
    placeholderPath: 'assets/photos/photo-3.jpg',
  },
  {
    id: 'photo-4',
    name: 'Kucing & Perapian',
    description: 'Kucing oranye tidur nyenyak di dekat perapian hangat berbatu.',
    url: createProceduralCozyImage(3),
    placeholderPath: 'assets/photos/photo-4.jpg',
  },
  {
    id: 'photo-5',
    name: 'Teras Senja Pixel',
    description: 'Pemandangan senja pastel yang tenang dari balkon berlantai kayu.',
    url: createProceduralCozyImage(4),
    placeholderPath: 'assets/photos/photo-5.jpg',
  },
  {
    id: 'photo-6',
    name: 'Perpustakaan Mini',
    description: 'Sudut baca buku hangat bertabur rak kayu dan lentera malam.',
    url: createProceduralCozyImage(5),
    placeholderPath: 'assets/photos/photo-6.jpg',
  },
];

/**
 * Default level configurations:
 * Level 1: 3x3 Grid (9 pieces) - Unlocked initially
 * Level 2: 3x3 Grid (9 pieces) - Unlocked after completing Level 1
 * Level 3: 4x4 Grid (16 pieces) - Unlocked after completing Level 2
 * Level 4: 4x4 Grid (16 pieces) - Unlocked after completing Level 3
 * Level 5: 5x5 Grid (25 pieces) - Unlocked after completing Level 4
 * Level 6: 5x5 Grid (25 pieces) - Unlocked after completing Level 5
 */
export const DEFAULT_LEVELS: LevelConfig[] = [
  {
    id: 1,
    levelNumber: 1,
    title: 'Level 1: Santai Dulu',
    subtitle: 'Grid 3x3 • 9 Potongan',
    gridSize: 3,
    photoId: 'photo-1',
    defaultPhotoPath: 'assets/photos/photo-1.jpg',
  },
  {
    id: 2,
    levelNumber: 2,
    title: 'Level 2: Suasana Hangat',
    subtitle: 'Grid 3x3 • 9 Potongan',
    gridSize: 3,
    photoId: 'photo-2',
    defaultPhotoPath: 'assets/photos/photo-2.jpg',
  },
  {
    id: 3,
    levelNumber: 3,
    title: 'Level 3: Kafe Hujan',
    subtitle: 'Grid 4x4 • 16 Potongan',
    gridSize: 4,
    photoId: 'photo-3',
    defaultPhotoPath: 'assets/photos/photo-3.jpg',
  },
  {
    id: 4,
    levelNumber: 4,
    title: 'Level 4: Kucing & Api',
    subtitle: 'Grid 4x4 • 16 Potongan',
    gridSize: 4,
    photoId: 'photo-4',
    defaultPhotoPath: 'assets/photos/photo-4.jpg',
  },
  {
    id: 5,
    levelNumber: 5,
    title: 'Level 5: Teras Senja',
    subtitle: 'Grid 5x5 • 25 Potongan',
    gridSize: 5,
    photoId: 'photo-5',
    defaultPhotoPath: 'assets/photos/photo-5.jpg',
  },
  {
    id: 6,
    levelNumber: 6,
    title: 'Level 6: Perpustakaan Mini',
    subtitle: 'Grid 5x5 • 25 Potongan',
    gridSize: 5,
    photoId: 'photo-6',
    defaultPhotoPath: 'assets/photos/photo-6.jpg',
  },
];

/**
 * Get active photo object for a given level.
 * Single Source of Truth for photo selection across StartScreen, LevelSelect, and App.tsx.
 */
export function getPhotoForLevel(level: LevelConfig, photos: Photo[] = []): Photo {
  // 1. First search by exact photoId match (e.g. 'photo-1', 'photo-2', 'photo-3')
  const foundById = photos.find((p) => p.id === level.photoId);
  if (foundById) {
    console.log(`[getPhotoForLevel] Matched Level ${level.id} by photoId (${level.photoId}) -> Photo ID: ${foundById.id}, Name: "${foundById.name}", isCustom: ${!!foundById.isCustom}, URL len: ${foundById.url?.length}`);
    return foundById;
  }

  // 2. Fallback to index mapping (Level 1 -> index 0, Level 2 -> index 1, Level 3 -> index 2)
  const idx = level.id - 1;
  if (photos[idx]) {
    console.log(`[getPhotoForLevel] Matched Level ${level.id} by index (${idx}) -> Photo ID: ${photos[idx].id}, Name: "${photos[idx].name}", isCustom: ${!!photos[idx].isCustom}, URL len: ${photos[idx].url?.length}`);
    return photos[idx];
  }

  // 3. Fallback to default INITIAL_PHOTOS
  const initial = INITIAL_PHOTOS.find((p) => p.id === level.photoId) || INITIAL_PHOTOS[idx] || INITIAL_PHOTOS[0];
  console.log(`[getPhotoForLevel] Fallback Level ${level.id} -> Photo ID: ${initial.id}, Name: "${initial.name}", URL len: ${initial.url?.length}`);
  return initial;
}

/**
 * Get active photo object.
 */
export function getPhotoById(photoId: string, customPhotos: Photo[] = []): Photo {
  const found = customPhotos.find((p) => p.id === photoId);
  if (found) return found;

  const initial = INITIAL_PHOTOS.find((p) => p.id === photoId);
  if (initial) return initial;

  const idx = parseInt(photoId.replace(/\D/g, '') || '1') - 1;
  return {
    id: photoId,
    name: 'Pixel Photo',
    description: 'Gambar pixel art cozy',
    url: createProceduralCozyImage(idx),
    placeholderPath: `assets/photos/${photoId}.jpg`,
  };
}

