import { toPng } from 'html-to-image';
import { GIFEncoder, quantize, applyPalette } from 'gifenc';
import { parseGIF, decompressFrames } from 'gifuct-js';

// List of animated crops with their frame counts
// These are GIF files disguised as .png files
export const ANIMATED_CROPS: Record<string, number> = {
  'all_in_aloe': 5,
  'fire': 5,
  'noctilume': 2,
  'shellfruit': 2,
  'startlevine': 2,
};

export interface CropInfo {
  cropId: string;
  cropName: string;
  count: number;
}

export interface ExportOptions {
  scale: number;
  includeWatermark: boolean;
  watermarkUrl: string;
  watermarkTitle: string;
  inputCrops: CropInfo[];
  targetCrops: CropInfo[];
  showTargets: boolean;
  // Optional: animated frames for GIF exports
  animatedFrames?: Map<string, HTMLCanvasElement[]>;
  frameIndex?: number;
}

export interface ExportResult {
  blob: Blob;
  dataUrl: string;
}

// Image cache for crop icons
const cropImageCache = new Map<string, HTMLImageElement>();

// Cache for extracted GIF frames
const gifFrameCache = new Map<string, HTMLCanvasElement[]>();

/**
 * Loads a crop image and caches it
 */
async function loadCropImage(cropId: string): Promise<HTMLImageElement | null> {
  if (cropImageCache.has(cropId)) {
    return cropImageCache.get(cropId)!;
  }
  
  const url = `/greenhouse/crops/${cropId}.png`;
  
  try {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error(`Failed to load image: ${url}`));
      img.src = url;
    });
    
    cropImageCache.set(cropId, img);
    return img;
  } catch {
    console.warn(`Failed to load crop image: ${cropId}`);
    return null;
  }
}

/**
 * Pre-loads all crop images needed for the footer (used for PNG export)
 */
async function _preloadCropImages(cropInfos: CropInfo[]): Promise<Map<string, HTMLImageElement>> {
  const imageMap = new Map<string, HTMLImageElement>();
  
  await Promise.all(
    cropInfos.map(async (info) => {
      const img = await loadCropImage(info.cropId);
      if (img) {
        imageMap.set(info.cropId, img);
      }
    })
  );
  
  return imageMap;
}

// Suppress unused warning - function is available for future use
void _preloadCropImages;

/**
 * Extracts all frames from a GIF file as canvas elements
 */
async function extractGifFrames(url: string): Promise<HTMLCanvasElement[]> {
  // Check cache first
  if (gifFrameCache.has(url)) {
    return gifFrameCache.get(url)!;
  }
  
  try {
    // Fetch the GIF file
    const response = await fetch(url);
    const arrayBuffer = await response.arrayBuffer();
    
    // Parse the GIF
    const gif = parseGIF(arrayBuffer);
    const frames = decompressFrames(gif, true);
    
    if (frames.length === 0) {
      return [];
    }
    
    // Convert each frame to a canvas
    const canvases: HTMLCanvasElement[] = [];
    
    // Create a temporary canvas for compositing frames
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = gif.lsd.width;
    tempCanvas.height = gif.lsd.height;
    const tempCtx = tempCanvas.getContext('2d')!;
    
    for (const frame of frames) {
      // Create ImageData from frame patch
      const imageData = new ImageData(
        new Uint8ClampedArray(frame.patch),
        frame.dims.width,
        frame.dims.height
      );
      
      // Handle disposal method
      if (frame.disposalType === 2) {
        // Restore to background
        tempCtx.clearRect(0, 0, tempCanvas.width, tempCanvas.height);
      }
      
      // Create a small canvas for the patch
      const patchCanvas = document.createElement('canvas');
      patchCanvas.width = frame.dims.width;
      patchCanvas.height = frame.dims.height;
      const patchCtx = patchCanvas.getContext('2d')!;
      patchCtx.putImageData(imageData, 0, 0);
      
      // Draw the patch onto the temp canvas at the correct position
      tempCtx.drawImage(patchCanvas, frame.dims.left, frame.dims.top);
      
      // Create a copy of the current state
      const frameCanvas = document.createElement('canvas');
      frameCanvas.width = gif.lsd.width;
      frameCanvas.height = gif.lsd.height;
      const frameCtx = frameCanvas.getContext('2d')!;
      frameCtx.drawImage(tempCanvas, 0, 0);
      
      canvases.push(frameCanvas);
    }
    
    // Cache the result
    gifFrameCache.set(url, canvases);
    
    return canvases;
  } catch (error) {
    console.error('Failed to extract GIF frames:', error);
    return [];
  }
}

/**
 * Renders text with shadow for better visibility
 */
function drawPixelatedText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  fontSize: number,
  color: string = '#ffffff',
  align: CanvasTextAlign = 'left'
): void {
  ctx.save();
  ctx.font = `bold ${fontSize}px "Segoe UI", system-ui, sans-serif`;
  ctx.textAlign = align;
  ctx.textBaseline = 'top';
  
  // Draw shadow for better visibility
  ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
  ctx.fillText(text, x + 1, y + 1);
  
  // Draw main text
  ctx.fillStyle = color;
  ctx.fillText(text, x, y);
  ctx.restore();
}

/**
 * Draws a rounded rectangle path
 */
function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
): void {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

/**
 * Calculates the footer height based on crop content
 * Note: targetCrops are always included in calculations and display, regardless of showTargets
 */
function calculateFooterHeight(
  inputCrops: CropInfo[],
  targetCrops: CropInfo[],
  scale: number,
  canvasWidth: number
): { height: number; itemHeight: number; itemsPerRow: number; padding: number; sectionGap: number } {
  const padding = 18 * scale;
  const sectionGap = 14 * scale;
  const itemHeight = 32 * scale;
  const itemWidth = 145 * scale;
  const sectionHeaderHeight = 22 * scale;
  
  const availableWidth = canvasWidth - (padding * 2);
  const itemsPerRow = Math.max(1, Math.floor(availableWidth / itemWidth));
  
  const inputRows = inputCrops.length > 0 ? Math.ceil(inputCrops.length / itemsPerRow) : 0;
  // Always calculate target rows for display, regardless of showTargets
  const targetRows = targetCrops.length > 0 ? Math.ceil(targetCrops.length / itemsPerRow) : 0;
  
  let height = padding;
  
  // Targets first
  if (targetRows > 0) {
    height += sectionHeaderHeight + (targetRows * itemHeight);
  }
  
  if (inputRows > 0) {
    if (targetRows > 0) height += sectionGap;
    height += sectionHeaderHeight + (inputRows * itemHeight);
  }
  
  if (inputRows > 0 || targetRows > 0) {
    height += padding;
  } else {
    height = 0;
  }
  
  return { height, itemHeight, itemsPerRow, padding, sectionGap };
}

/**
 * Adds watermark and info overlay to a canvas
 */
async function addOverlay(
  canvas: HTMLCanvasElement,
  options: ExportOptions
): Promise<HTMLCanvasElement> {
  const { watermarkUrl, watermarkTitle, inputCrops, targetCrops, scale, animatedFrames, frameIndex } = options;
  
  // Calculate dimensions
  const headerHeight = 38 * scale;
  const headerPadding = 16 * scale;
  const outerPadding = 20 * scale; // Padding around the entire image
  const gridPadding = 24 * scale; // Additional padding around just the grid
  const totalWidth = canvas.width + (gridPadding * 2);
  const { height: footerHeight, itemHeight, itemsPerRow, padding, sectionGap } = calculateFooterHeight(
    inputCrops, targetCrops, scale, totalWidth
  );
  
  // Pre-load crop images
  // Always load target crop images for the footer, even if they're hidden on the grid
  const allCrops = [...inputCrops, ...targetCrops];
  const cropImages = new Map<string, HTMLImageElement | HTMLCanvasElement>();
  
  // Load images - use animated frames if available, otherwise load static
  for (const crop of allCrops) {
    if (animatedFrames && frameIndex !== undefined) {
      const frames = animatedFrames.get(crop.cropId);
      if (frames && frames.length > 0) {
        const cropFrameCount = ANIMATED_CROPS[crop.cropId] || 1;
        const cropFrameIndex = frameIndex % cropFrameCount;
        const actualFrameIndex = Math.min(cropFrameIndex, frames.length - 1);
        cropImages.set(crop.cropId, frames[actualFrameIndex]);
        continue;
      }
    }
    const img = await loadCropImage(crop.cropId);
    if (img) {
      cropImages.set(crop.cropId, img);
    }
  }
  
  const outputCanvas = document.createElement('canvas');
  // Add outer padding to all sides
  outputCanvas.width = canvas.width + (gridPadding * 2) + (outerPadding * 2);
  outputCanvas.height = canvas.height + headerHeight + footerHeight + (gridPadding * 2) + (outerPadding * 2);
  
  const ctx = outputCanvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;
  
  // Fill background
  ctx.fillStyle = '#0F172A';
  ctx.fillRect(0, 0, outputCanvas.width, outputCanvas.height);
  
  // Draw header background with outer padding
  ctx.fillStyle = 'rgba(15, 23, 42, 1)';
  ctx.fillRect(outerPadding, outerPadding, outputCanvas.width - (outerPadding * 2), headerHeight);
  
  // Draw header text - make "Greenhouse Designer" bigger and brighter
  const headerFontSize = 24 * scale; // Increased from 14
  drawPixelatedText(ctx, watermarkTitle, outerPadding + headerPadding, outerPadding + (headerHeight - headerFontSize) / 2, headerFontSize, '#e2e8f0'); // Brighter color
  const urlFontSize = 14 * scale;
  drawPixelatedText(ctx, watermarkUrl, outputCanvas.width - outerPadding - headerPadding, outerPadding + (headerHeight - urlFontSize) / 2 + 2, urlFontSize, '#6ee7b7', 'right');
  
  // Draw the original grid with both outer and grid padding
  ctx.drawImage(canvas, outerPadding + gridPadding, outerPadding + headerHeight + gridPadding);
  
  // Draw footer with crop info
  if (footerHeight > 0) {
    const footerY = outerPadding + headerHeight + canvas.height + (gridPadding * 2);
    
    ctx.fillStyle = 'rgba(15, 23, 42, 1)';
    ctx.fillRect(outerPadding, footerY, outputCanvas.width - (outerPadding * 2), footerHeight);
    
    const iconSize = 20 * scale;
    const nameFontSize = 11 * scale;
    const countFontSize = 10 * scale;
    const sectionFontSize = 10 * scale;
    const itemGap = 8 * scale;
    const itemWidth = (outputCanvas.width - (outerPadding * 2) - padding * 2 - (itemsPerRow - 1) * itemGap) / itemsPerRow;
    
    let currentY = footerY + padding;
    
    // Helper to draw a crop item
    const drawCropItem = (
      crop: CropInfo,
      x: number,
      y: number,
      bgColor: string,
      countColor: string
    ) => {
      const itemPadding = 4 * scale;
      const boxHeight = itemHeight - 4 * scale;
      
      ctx.fillStyle = bgColor;
      roundRect(ctx, x, y, itemWidth, boxHeight, 4 * scale);
      ctx.fill();
      
      const img = cropImages.get(crop.cropId);
      if (img) {
        ctx.drawImage(img, x + itemPadding, y + (boxHeight - iconSize) / 2, iconSize, iconSize);
      } else {
        ctx.fillStyle = '#334155';
        ctx.fillRect(x + itemPadding, y + (boxHeight - iconSize) / 2, iconSize, iconSize);
      }
      
      const textX = x + itemPadding + iconSize + 4 * scale;
      const textY = y + (boxHeight - nameFontSize) / 2;
      const maxNameWidth = itemWidth - iconSize - itemPadding * 2 - 30 * scale;
      
      ctx.save();
      ctx.font = `${nameFontSize}px "Segoe UI", system-ui, sans-serif`;
      ctx.fillStyle = '#e2e8f0';
      ctx.textBaseline = 'top';
      
      let displayName = crop.cropName;
      while (ctx.measureText(displayName).width > maxNameWidth && displayName.length > 3) {
        displayName = displayName.slice(0, -1);
      }
      if (displayName !== crop.cropName) displayName += '…';
      
      ctx.fillText(displayName, textX, textY);
      ctx.restore();
      
      const countText = `x${crop.count}`;
      drawPixelatedText(ctx, countText, x + itemWidth - itemPadding, textY, countFontSize, countColor, 'right');
    };
    
    // Draw TARGETS first (reversed order)
    // Always show targets in footer for counts, even if hidden on grid
    if (targetCrops.length > 0) {
      const targetTotal = targetCrops.reduce((sum, c) => sum + c.count, 0);
      drawPixelatedText(ctx, `TARGETS (${targetTotal})`, outerPadding + padding, currentY, sectionFontSize, '#a78bfa');
      currentY += 20 * scale;
      
      targetCrops.forEach((crop, index) => {
        const row = Math.floor(index / itemsPerRow);
        const col = index % itemsPerRow;
        const x = outerPadding + padding + col * (itemWidth + itemGap);
        const y = currentY + row * itemHeight;
        drawCropItem(crop, x, y, 'rgba(167, 139, 250, 0.15)', '#a78bfa');
      });
      
      const targetRows = Math.ceil(targetCrops.length / itemsPerRow);
      currentY += targetRows * itemHeight;
    }
    
    // Draw INPUTS second
    if (inputCrops.length > 0) {
      if (targetCrops.length > 0) currentY += sectionGap;
      
      const inputTotal = inputCrops.reduce((sum, c) => sum + c.count, 0);
      drawPixelatedText(ctx, `INPUTS (${inputTotal})`, outerPadding + padding, currentY, sectionFontSize, '#22c55e');
      currentY += 20 * scale;
      
      inputCrops.forEach((crop, index) => {
        const row = Math.floor(index / itemsPerRow);
        const col = index % itemsPerRow;
        const x = outerPadding + padding + col * (itemWidth + itemGap);
        const y = currentY + row * itemHeight;
        drawCropItem(crop, x, y, 'rgba(34, 197, 94, 0.15)', '#22c55e');
      });
    }
  }
  
  return outputCanvas;
}

/**
 * Captures the grid element as a PNG image
 */
export async function captureGridAsPng(
  element: HTMLElement,
  options: ExportOptions
): Promise<ExportResult> {
  const { scale } = options;
  
  // Fixed dimensions for consistent exports across devices
  // 10x10 grid with 48px cells and 2px gap = 498px (10*48 + 9*2)
  const FIXED_GRID_SIZE = 498;
  
  // Get the actual current size of the element
  const actualWidth = element.offsetWidth;
  const actualHeight = element.offsetHeight;
  
  // Calculate scale factor to normalize to fixed size
  const scaleToFixed = FIXED_GRID_SIZE / actualWidth;
  
  const dataUrl = await toPng(element, {
    pixelRatio: scale * scaleToFixed, // Combine export scale with normalization scale
    backgroundColor: '#1e293b',
    cacheBust: true,
    skipAutoScale: true,
    includeQueryParams: true,
    skipFonts: true,
    width: actualWidth,
    height: actualHeight,
    filter: (node) => {
      if (node instanceof Element) {
        const tagName = node.tagName?.toLowerCase();
        if (tagName === 'script' || tagName === 'noscript') {
          return false;
        }
        // Exclude elements marked for GIF export exclusion
        if (node.hasAttribute('data-gif-exclude')) {
          return false;
        }
      }
      return true;
    },
  });
  
  const img = new Image();
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = reject;
    img.src = dataUrl;
  });
  
  // Create canvas at the fixed target size
  const canvas = document.createElement('canvas');
  canvas.width = FIXED_GRID_SIZE * scale;
  canvas.height = FIXED_GRID_SIZE * scale;
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  
  const outputCanvas = options.includeWatermark 
    ? await addOverlay(canvas, options)
    : canvas;
  
  const blob = await new Promise<Blob>((resolve, reject) => {
    outputCanvas.toBlob((b: Blob | null) => {
      if (b) resolve(b);
      else reject(new Error('Failed to create blob'));
    }, 'image/png');
  });
  
  return {
    blob,
    dataUrl: outputCanvas.toDataURL('image/png'),
  };
}

/**
 * Checks if any placements contain animated crops
 */
export function hasAnimatedCrops(cropIds: string[]): boolean {
  return cropIds.some(id => id in ANIMATED_CROPS);
}

/**
 * Gets the least common multiple of all frame counts for animated crops
 */
function getLcmFrameCount(cropIds: string[]): number {
  const frameCounts = cropIds
    .filter(id => id in ANIMATED_CROPS)
    .map(id => ANIMATED_CROPS[id]);
  
  if (frameCounts.length === 0) return 1;
  
  const gcd = (a: number, b: number): number => b === 0 ? a : gcd(b, a % b);
  const lcm = (a: number, b: number): number => (a * b) / gcd(a, b);
  
  return frameCounts.reduce((acc, val) => lcm(acc, val), 1);
}

/**
 * Pre-loads all animated crop frames for the given crop IDs
 */
async function preloadAnimatedFrames(cropIds: string[]): Promise<Map<string, HTMLCanvasElement[]>> {
  const animatedCropIds = cropIds.filter(id => id in ANIMATED_CROPS);
  const uniqueIds = [...new Set(animatedCropIds)];
  
  const frameMap = new Map<string, HTMLCanvasElement[]>();
  
  await Promise.all(
    uniqueIds.map(async (cropId) => {
      const url = `/greenhouse/crops/${cropId}.png`;
      const frames = await extractGifFrames(url);
      if (frames.length > 0) {
        frameMap.set(cropId, frames);
      }
    })
  );
  
  return frameMap;
}

/**
 * Generates a global palette from all frames for consistent colors
 * This is similar to ffmpeg's palettegen
 */
function generateGlobalPalette(frames: HTMLCanvasElement[]): number[][] {
  // Sample pixels from all frames
  const allPixels: number[] = [];
  const sampleRate = Math.max(1, Math.floor(frames.length / 3)); // Sample every Nth frame
  
  for (let i = 0; i < frames.length; i += sampleRate) {
    const canvas = frames[i];
    const ctx = canvas.getContext('2d')!;
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    
    // Sample every 4th pixel to reduce computation
    for (let j = 0; j < imageData.data.length; j += 16) {
      allPixels.push(
        imageData.data[j],
        imageData.data[j + 1],
        imageData.data[j + 2],
        imageData.data[j + 3]
      );
    }
  }
  
  // Quantize to 256 colors
  const palette = quantize(new Uint8Array(allPixels), 256, {
    format: 'rgba4444',
    oneBitAlpha: true,
  });
  
  return palette;
}

/**
 * Captures the grid as an animated GIF using gifenc for Discord-compatible output
 */
export async function captureGridAsGif(
  element: HTMLElement,
  options: ExportOptions,
  cropIds: string[],
  onProgress?: (progress: number) => void
): Promise<ExportResult> {
  const { scale } = options;
  
  const totalFrames = getLcmFrameCount(cropIds);
  
  onProgress?.(5);
  
  // Pre-load all animated GIF frames
  const animatedFrames = await preloadAnimatedFrames(cropIds);
  
  onProgress?.(15);
  
  // Find all animated img elements
  const animatedImgInfo: Array<{
    img: HTMLImageElement;
    cropId: string;
    originalSrc: string;
  }> = [];
  
  const imgs = Array.from(element.querySelectorAll('img'));
  for (const img of imgs) {
    const src = img.src;
    for (const cropId of Object.keys(ANIMATED_CROPS)) {
      if (src.includes(`/${cropId}.png`) && animatedFrames.has(cropId)) {
        animatedImgInfo.push({ img, cropId, originalSrc: src });
        break;
      }
    }
  }
  
  // Store original sources
  const originalSources = new Map<HTMLImageElement, string>();
  for (const info of animatedImgInfo) {
    originalSources.set(info.img, info.img.src);
  }
  
  // Fixed dimensions for consistent exports across devices
  // 10x10 grid with 48px cells and 2px gap = 498px (10*48 + 9*2)
  const FIXED_GRID_SIZE = 498;
  
  // Get the actual current size of the element
  const actualWidth = element.offsetWidth;
  const actualHeight = element.offsetHeight;
  
  // Calculate scale factor to normalize to fixed size
  const scaleToFixed = FIXED_GRID_SIZE / actualWidth;
  
  // Capture all frames first
  const frameCanvases: HTMLCanvasElement[] = [];
  
  for (let frameIndex = 0; frameIndex < totalFrames; frameIndex++) {
    const progressPercent = 15 + ((frameIndex / totalFrames) * 35);
    onProgress?.(progressPercent);
    
    // Update each animated image to the correct frame
    for (const info of animatedImgInfo) {
      const frames = animatedFrames.get(info.cropId);
      if (frames && frames.length > 0) {
        const cropFrameCount = ANIMATED_CROPS[info.cropId];
        const cropFrameIndex = frameIndex % cropFrameCount;
        const actualFrameIndex = Math.min(cropFrameIndex, frames.length - 1);
        info.img.src = frames[actualFrameIndex].toDataURL('image/png');
      }
    }
    
    // Wait for images to update
    await new Promise(resolve => setTimeout(resolve, 50));
    
    // Capture this frame
    const dataUrl = await toPng(element, {
      pixelRatio: scale * scaleToFixed, // Combine export scale with normalization scale
      backgroundColor: '#1e293b',
      cacheBust: true,
      skipAutoScale: true,
      includeQueryParams: true,
      skipFonts: true,
      width: actualWidth,
      height: actualHeight,
      filter: (node) => {
        if (node instanceof Element) {
          const tagName = node.tagName?.toLowerCase();
          if (tagName === 'script' || tagName === 'noscript') {
            return false;
          }
        }
        return true;
      },
    });
    
    const img = new Image();
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = reject;
      img.src = dataUrl;
    });
    
    // Create canvas at the fixed target size
    const canvas = document.createElement('canvas');
    canvas.width = FIXED_GRID_SIZE * scale;
    canvas.height = FIXED_GRID_SIZE * scale;
    const ctx = canvas.getContext('2d')!;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    
    // Add overlay with correct frame for animated crops in footer
    const outputCanvas = options.includeWatermark
      ? await addOverlay(canvas, { ...options, animatedFrames, frameIndex })
      : canvas;
    
    frameCanvases.push(outputCanvas);
  }
  
  // Restore original sources
  for (const info of animatedImgInfo) {
    info.img.src = info.originalSrc;
  }
  
  onProgress?.(50);
  
  if (frameCanvases.length === 0) {
    throw new Error('No frames captured');
  }
  
  // Generate global palette from all frames (like ffmpeg's palettegen)
  const palette = generateGlobalPalette(frameCanvases);
  
  onProgress?.(60);
  
  // Create GIF using gifenc
  const width = frameCanvases[0].width;
  const height = frameCanvases[0].height;
  const gif = GIFEncoder();
  
  // Encode each frame
  for (let i = 0; i < frameCanvases.length; i++) {
    const progressPercent = 60 + ((i / frameCanvases.length) * 35);
    onProgress?.(progressPercent);
    
    const canvas = frameCanvases[i];
    const ctx = canvas.getContext('2d')!;
    const imageData = ctx.getImageData(0, 0, width, height);
    
    // Apply the global palette to this frame (like ffmpeg's paletteuse with dither=none)
    const index = applyPalette(imageData.data, palette);
    
    gif.writeFrame(index, width, height, {
      palette,
      delay: 1000, // 1000ms = 1fps
      dispose: 1, // Do not dispose - keep previous frame (more compatible)
    });
  }
  
  gif.finish();
  
  onProgress?.(95);
  
  // Get the GIF bytes
  const bytes = gif.bytes();
  const blob = new Blob([bytes], { type: 'image/gif' });
  
  // Convert to data URL
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Failed to read GIF blob'));
    reader.readAsDataURL(blob);
  });
  
  onProgress?.(100);
  
  return { blob, dataUrl };
}

/**
 * Copies a blob to the clipboard
 */
export async function copyBlobToClipboard(blob: Blob): Promise<boolean> {
  try {
    if (!navigator.clipboard || !navigator.clipboard.write) {
      return false;
    }
    
    if (blob.type === 'image/png') {
      await navigator.clipboard.write([
        new ClipboardItem({
          [blob.type]: blob,
        }),
      ]);
      return true;
    }
    
    // GIF not well supported in clipboard
    return false;
  } catch {
    return false;
  }
}

/**
 * Downloads a blob as a file
 */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Aggregates crop info by counting duplicates
 */
export function aggregateCropInfo(
  placements: Array<{ cropId: string; cropName: string }>
): CropInfo[] {
  const counts = new Map<string, { cropName: string; count: number }>();
  
  for (const p of placements) {
    const existing = counts.get(p.cropId);
    if (existing) {
      existing.count++;
    } else {
      counts.set(p.cropId, { cropName: p.cropName, count: 1 });
    }
  }
  
  return Array.from(counts.entries()).map(([cropId, { cropName, count }]) => ({
    cropId,
    cropName,
    count,
  }));
}
