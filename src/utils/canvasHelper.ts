/**
 * Canvas Image Processing & Procedural Pixel Art Generator
 * Handles 1:1 auto-cropping, slicing images into NxN grid tiles,
 * image compression, and generating retro pixel art illustrations.
 */

/**
 * Reads an uploaded image file, auto-resizes it to max 800x800,
 * and converts it to a lightweight JPEG Data URL (approx 80KB-150KB).
 * Prevents memory bloat, localStorage QuotaExceeded errors, and canvas slicing crashes.
 */
export async function processUploadedFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      if (!dataUrl) {
        reject(new Error('Could not read file'));
        return;
      }

      const img = new Image();
      img.onload = () => {
        try {
          const origW = img.naturalWidth || img.width;
          const origH = img.naturalHeight || img.height;

          if (origW <= 0 || origH <= 0) {
            resolve(dataUrl);
            return;
          }

          // Auto center-crop 1:1 square from portrait or landscape photos
          const sourceSize = Math.min(origW, origH);
          const sourceX = (origW - sourceSize) / 2;
          const sourceY = (origH - sourceSize) / 2;

          // Target compressed resolution (max 800x800)
          const targetSize = Math.min(800, sourceSize);

          const canvas = document.createElement('canvas');
          canvas.width = targetSize;
          canvas.height = targetSize;
          const ctx = canvas.getContext('2d');

          if (!ctx) {
            resolve(dataUrl);
            return;
          }

          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';

          // Render center-cropped square image
          ctx.drawImage(
            img,
            sourceX, sourceY, sourceSize, sourceSize,
            0, 0, targetSize, targetSize
          );

          // Convert to efficient JPEG Data URL
          const resizedUrl = canvas.toDataURL('image/jpeg', 0.88);
          resolve(resizedUrl);
        } catch {
          resolve(dataUrl);
        }
      };

      img.onerror = () => resolve(dataUrl);
      img.src = dataUrl;
    };

    reader.onerror = () => reject(new Error('FileReader error'));
    reader.readAsDataURL(file);
  });
}

/**
 * Slice an image from URL or DataURL into NxN grid piece Data URLs
 */
export async function sliceImageIntoGrid(
  imageUrl: string,
  gridSize: number
): Promise<string[]> {
  return new Promise((resolve, reject) => {
    if (!imageUrl) {
      reject(new Error('Empty image URL provided'));
      return;
    }

    const img = new Image();

    // Only set crossOrigin for external http/https URLs.
    if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
      img.crossOrigin = 'anonymous';
    }

    img.onload = () => {
      try {
        const piecesDataUrls: string[] = [];

        // Determine 1:1 square crop area
        const sourceSize = Math.min(img.width, img.height);
        if (sourceSize <= 0) {
          reject(new Error('Invalid image size'));
          return;
        }

        const sourceX = (img.width - sourceSize) / 2;
        const sourceY = (img.height - sourceSize) / 2;

        // Tile size in pixels
        const pieceResolution = 200;
        const totalResolution = pieceResolution * gridSize;

        // Render full cropped image to high-res canvas
        const fullCanvas = document.createElement('canvas');
        fullCanvas.width = totalResolution;
        fullCanvas.height = totalResolution;
        const ctx = fullCanvas.getContext('2d');

        if (!ctx) {
          reject(new Error('Canvas context not available'));
          return;
        }

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        // Draw cropped centered 1:1 image
        ctx.drawImage(
          img,
          sourceX, sourceY, sourceSize, sourceSize,
          0, 0, totalResolution, totalResolution
        );

        // Slice into NxN pieces
        const tileCanvas = document.createElement('canvas');
        tileCanvas.width = pieceResolution;
        tileCanvas.height = pieceResolution;
        const tileCtx = tileCanvas.getContext('2d');

        if (!tileCtx) {
          reject(new Error('Tile canvas context not available'));
          return;
        }

        tileCtx.imageSmoothingEnabled = true;

        for (let row = 0; row < gridSize; row++) {
          for (let col = 0; col < gridSize; col++) {
            tileCtx.clearRect(0, 0, pieceResolution, pieceResolution);
            tileCtx.drawImage(
              fullCanvas,
              col * pieceResolution,
              row * pieceResolution,
              pieceResolution,
              pieceResolution,
              0,
              0,
              pieceResolution,
              pieceResolution
            );
            piecesDataUrls.push(tileCanvas.toDataURL('image/png'));
          }
        }

        resolve(piecesDataUrls);
      } catch (err) {
        reject(err);
      }
    };

    img.onerror = () => {
      reject(new Error('Failed to load image for slicing'));
    };

    img.src = imageUrl;
  });
}

/**
 * Generates cozy pixel art illustrations on a low-res pixel grid (64x64) and scales up
 */
export function createProceduralCozyImage(styleIndex: number = 0): string {
  // Generate on a 64x64 pixel grid canvas
  const pxCanvas = document.createElement('canvas');
  const pxSize = 64;
  pxCanvas.width = pxSize;
  pxCanvas.height = pxSize;
  const pctx = pxCanvas.getContext('2d');
  if (!pctx) return '';

  pctx.imageSmoothingEnabled = false;

  const idx = Math.abs(styleIndex) % 6;

  if (idx === 0) {
    // Scene 0: "Kopi & Kamar Pixel" (Cozy Pixel Coffee Room)
    // Dark Navy Wall
    pctx.fillStyle = '#1A233A';
    pctx.fillRect(0, 0, 64, 64);

    // Pixel Window
    pctx.fillStyle = '#111728';
    pctx.fillRect(6, 6, 26, 24);
    pctx.fillStyle = '#3E4A68';
    pctx.fillRect(8, 8, 22, 20);
    // Yellow Pixel Moon & Stars
    pctx.fillStyle = '#FFE17D';
    pctx.fillRect(22, 10, 4, 4);
    pctx.fillRect(12, 14, 2, 2);
    pctx.fillRect(24, 20, 2, 2);
    // Window Frame
    pctx.fillStyle = '#4A3322';
    pctx.fillRect(5, 5, 28, 2);
    pctx.fillRect(5, 29, 28, 2);
    pctx.fillRect(5, 5, 2, 26);
    pctx.fillRect(31, 5, 2, 26);
    pctx.fillRect(18, 5, 2, 26);
    pctx.fillRect(5, 17, 28, 2);

    // Wooden Table & Floor
    pctx.fillStyle = '#321E12';
    pctx.fillRect(0, 36, 64, 28);
    pctx.fillStyle = '#4A2E1B';
    pctx.fillRect(0, 36, 64, 6);
    pctx.fillStyle = '#5A3821';
    for (let x = 0; x < 64; x += 16) {
      pctx.fillRect(x, 42, 14, 22);
      pctx.fillStyle = (x / 16) % 2 === 0 ? '#4A2E1B' : '#5A3821';
    }

    // Cozy Pixel Mug
    pctx.fillStyle = '#D9865A';
    pctx.fillRect(40, 30, 10, 10);
    pctx.fillStyle = '#FAF2E8';
    pctx.fillRect(42, 28, 6, 2); // Cream foam
    pctx.fillStyle = '#321E12';
    pctx.fillRect(42, 30, 6, 2); // Coffee
    pctx.fillStyle = '#D9865A';
    pctx.fillRect(50, 32, 3, 6); // Handle

    // Pixel Steam
    pctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    pctx.fillRect(42, 24, 2, 3);
    pctx.fillRect(46, 22, 2, 4);

    // Pixel Books Stack
    pctx.fillStyle = '#8A9A5B';
    pctx.fillRect(10, 32, 16, 4);
    pctx.fillStyle = '#C86D51';
    pctx.fillRect(12, 28, 14, 4);
    pctx.fillStyle = '#E0A96D';
    pctx.fillRect(11, 24, 12, 4);

  } else if (idx === 1) {
    // Scene 1: "Tanaman & Rak Pixel" (Pixel Botanical Shelf)
    // Warm Terracotta Wall
    pctx.fillStyle = '#2B1A17';
    pctx.fillRect(0, 0, 64, 64);

    // Brick Pattern
    pctx.fillStyle = '#3A221E';
    for (let y = 0; y < 64; y += 8) {
      const shift = (y / 8) % 2 === 0 ? 0 : 8;
      for (let x = shift; x < 64; x += 16) {
        pctx.fillRect(x, y, 14, 6);
      }
    }

    // Wooden Wall Shelf
    pctx.fillStyle = '#5C3821';
    pctx.fillRect(8, 30, 48, 5);
    pctx.fillStyle = '#3D2414';
    pctx.fillRect(12, 35, 4, 6);
    pctx.fillRect(48, 35, 4, 6);

    // Potted Cactus 1
    pctx.fillStyle = '#D9865A'; // Pot
    pctx.fillRect(14, 22, 8, 8);
    pctx.fillStyle = '#8A9A5B'; // Cactus
    pctx.fillRect(16, 12, 4, 10);
    pctx.fillRect(14, 16, 8, 2);

    // Glowing Candle
    pctx.fillStyle = '#FAF2E8';
    pctx.fillRect(28, 22, 6, 8);
    pctx.fillStyle = '#FFC107'; // Flame
    pctx.fillRect(30, 18, 2, 4);

    // Potted Hanging Plant 2
    pctx.fillStyle = '#8C6747';
    pctx.fillRect(40, 24, 8, 6);
    pctx.fillStyle = '#526E48';
    pctx.fillRect(38, 30, 4, 12);
    pctx.fillRect(44, 30, 4, 16);
    pctx.fillRect(42, 20, 4, 4);

  } else if (idx === 2) {
    // Scene 2: "Kafe Hujan Pixel" (Rainy Pixel Cafe)
    // Dark Rainy Background Outside
    pctx.fillStyle = '#17222B';
    pctx.fillRect(0, 0, 64, 64);

    // Rain Streaks
    pctx.fillStyle = '#4A6B82';
    pctx.fillRect(8, 10, 2, 8);
    pctx.fillRect(24, 6, 2, 10);
    pctx.fillRect(44, 14, 2, 12);
    pctx.fillRect(52, 4, 2, 8);

    // Warm Interior Window Frame
    pctx.fillStyle = '#2C1D11';
    pctx.fillRect(0, 40, 64, 24);
    pctx.fillStyle = '#4A3322';
    pctx.fillRect(0, 40, 64, 4);

    // Warm Window Glass Reflection
    pctx.fillStyle = 'rgba(230, 180, 120, 0.25)';
    pctx.fillRect(10, 0, 44, 40);

    // Coffee Cup & Open Book on Sill
    pctx.fillStyle = '#FAF2E8'; // Book pages
    pctx.fillRect(8, 36, 18, 4);
    pctx.fillStyle = '#D9865A'; // Book cover
    pctx.fillRect(6, 38, 22, 2);

    // Yellow Pixel Lamp Glow
    pctx.fillStyle = '#FFE17D';
    pctx.fillRect(42, 26, 12, 12);
    pctx.fillStyle = '#E0A96D';
    pctx.fillRect(44, 38, 8, 2);

  } else if (idx === 3) {
    // Scene 3: "Kucing & Perapian" (Cozy Fireplace & Sleeping Cat)
    // Dark stone brick wall
    pctx.fillStyle = '#1C1618';
    pctx.fillRect(0, 0, 64, 64);
    
    // Fireplace Mantle & Hearth
    pctx.fillStyle = '#4E3120';
    pctx.fillRect(10, 14, 44, 6);
    pctx.fillStyle = '#311E13';
    pctx.fillRect(14, 20, 36, 30);
    pctx.fillStyle = '#150A06';
    pctx.fillRect(20, 26, 24, 24);

    // Glowing Fire Embers & Flame
    pctx.fillStyle = '#D9480F';
    pctx.fillRect(26, 38, 12, 10);
    pctx.fillStyle = '#FF922B';
    pctx.fillRect(28, 36, 8, 8);
    pctx.fillStyle = '#FFE066';
    pctx.fillRect(30, 34, 4, 6);

    // Wood Logs
    pctx.fillStyle = '#5C3821';
    pctx.fillRect(24, 44, 16, 4);

    // Cozy Round Rug
    pctx.fillStyle = '#8C6747';
    pctx.fillRect(12, 50, 40, 12);
    pctx.fillStyle = '#C68B59';
    pctx.fillRect(16, 52, 32, 8);

    // Sleeping Orange Cat
    pctx.fillStyle = '#E07A5F';
    pctx.fillRect(26, 52, 12, 6); // body
    pctx.fillStyle = '#D9865A';
    pctx.fillRect(36, 50, 6, 6); // head
    pctx.fillStyle = '#FAF2E8';
    pctx.fillRect(24, 54, 4, 3); // curled tail
    pctx.fillStyle = '#3D2817';
    pctx.fillRect(39, 52, 2, 1); // closed eye

  } else if (idx === 4) {
    // Scene 4: "Teras Senja Pixel" (Sunset Balcony View)
    // Sunset Gradient Sky
    pctx.fillStyle = '#2B1E3A';
    pctx.fillRect(0, 0, 64, 16);
    pctx.fillStyle = '#5C2D4E';
    pctx.fillRect(0, 16, 64, 14);
    pctx.fillStyle = '#9C4146';
    pctx.fillRect(0, 30, 64, 12);
    pctx.fillStyle = '#D96B43';
    pctx.fillRect(0, 42, 64, 10);
    pctx.fillStyle = '#F4A261';
    pctx.fillRect(0, 52, 64, 12);

    // Soft Pastel Sun
    pctx.fillStyle = '#FFE8D6';
    pctx.fillRect(24, 22, 16, 16);

    // Distant Mountain Silhouette
    pctx.fillStyle = '#3D1C34';
    pctx.fillRect(0, 40, 18, 12);
    pctx.fillRect(14, 34, 22, 18);
    pctx.fillRect(32, 38, 20, 14);
    pctx.fillRect(48, 36, 16, 16);

    // Balcony Railing
    pctx.fillStyle = '#1D130C';
    pctx.fillRect(0, 50, 64, 3);
    for (let x = 4; x < 64; x += 8) {
      pctx.fillRect(x, 50, 2, 14);
    }
    pctx.fillRect(0, 61, 64, 3);

    // Small Lantern on Railing
    pctx.fillStyle = '#FFE17D';
    pctx.fillRect(46, 44, 6, 6);
    pctx.fillStyle = '#3D2414';
    pctx.fillRect(45, 43, 8, 2);
    pctx.fillRect(45, 49, 8, 2);

  } else {
    // Scene 5: "Perpustakaan Mini" (Cozy Library Bookshelf)
    // Dark Wooden Bookshelf
    pctx.fillStyle = '#22150C';
    pctx.fillRect(0, 0, 64, 64);

    // Shelves
    pctx.fillStyle = '#4A2E1B';
    pctx.fillRect(4, 18, 56, 4);
    pctx.fillRect(4, 38, 56, 4);
    pctx.fillRect(4, 58, 56, 4);

    // Top Shelf Books
    const topColors = ['#8A9A5B', '#C86D51', '#E0A96D', '#4A6B82', '#9C4146', '#D9865A'];
    topColors.forEach((color, i) => {
      pctx.fillStyle = color;
      pctx.fillRect(8 + i * 8, 6, 6, 12);
      pctx.fillStyle = '#FAF2E8';
      pctx.fillRect(9 + i * 8, 8, 4, 1);
    });

    // Middle Shelf Books & Plant
    const midColors = ['#D9865A', '#8A9A5B', '#E07A5F', '#526E48'];
    midColors.forEach((color, i) => {
      pctx.fillStyle = color;
      pctx.fillRect(8 + i * 7, 24, 5, 14);
    });
    // Mini Succulent
    pctx.fillStyle = '#8C6747';
    pctx.fillRect(42, 30, 8, 8);
    pctx.fillStyle = '#788B4B';
    pctx.fillRect(44, 24, 4, 6);
    pctx.fillRect(42, 26, 8, 2);

    // Bottom Shelf Reading Lamp & Stack
    pctx.fillStyle = '#FFE17D';
    pctx.fillRect(10, 44, 10, 10);
    pctx.fillStyle = '#C68B59';
    pctx.fillRect(13, 54, 4, 4);

    pctx.fillStyle = '#8A9A5B';
    pctx.fillRect(28, 52, 18, 3);
    pctx.fillStyle = '#C86D51';
    pctx.fillRect(30, 49, 14, 3);
    pctx.fillStyle = '#E0A96D';
    pctx.fillRect(32, 46, 10, 3);
  }

  // Scale up low-res 64x64 canvas to high-res 512x512 canvas with crisp pixel art
  const outCanvas = document.createElement('canvas');
  outCanvas.width = 512;
  outCanvas.height = 512;
  const octx = outCanvas.getContext('2d');
  if (!octx) return pxCanvas.toDataURL('image/png');

  octx.imageSmoothingEnabled = false;
  octx.drawImage(pxCanvas, 0, 0, 64, 64, 0, 0, 512, 512);

  return outCanvas.toDataURL('image/png');
}

