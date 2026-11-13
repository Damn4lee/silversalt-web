import exifr from 'exifr';
import { ColorFamily, ExifData } from '../types';

export interface ProcessedImageResult {
  webpBlob: Blob;
  webpDataUrl: string;
  base64Content: string; // without data:image/webp;base64, prefix for GitHub API
  width: number;
  height: number;
  aspectRatio: number;
  sizeKB: number;
  originalSizeKB: number;
  palette: string[];
  colorFamilies: ColorFamily[];
  exif?: ExifData;
}

function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (n: number) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
    }
    h *= 60;
  }
  return [h, s, l];
}

export function classifyHexToFamily(hex: string): ColorFamily {
  const clean = hex.replace('#', '');
  const r = parseInt(clean.substring(0, 2), 16) || 0;
  const g = parseInt(clean.substring(2, 4), 16) || 0;
  const b = parseInt(clean.substring(4, 6), 16) || 0;
  const [h, s, l] = rgbToHsl(r, g, b);

  if (s < 0.14 || l < 0.08 || l > 0.93) {
    return 'monochrome';
  }
  if (h >= 340 || h < 28) return 'red-orange';
  if (h >= 28 && h < 72) return 'amber-yellow';
  if (h >= 72 && h < 168) return 'emerald-green';
  if (h >= 168 && h < 255) return 'cyan-blue';
  return 'purple-magenta';
}

function extractPaletteFromImage(img: HTMLImageElement): { palette: string[]; colorFamilies: ColorFamily[] } {
  const sampleCanvas = document.createElement('canvas');
  const sampleSize = 64;
  sampleCanvas.width = sampleSize;
  sampleCanvas.height = sampleSize;
  const ctx = sampleCanvas.getContext('2d');
  if (!ctx) {
    return {
      palette: ['#27272a', '#52525b', '#71717a', '#a1a1aa', '#d4d4d8'],
      colorFamilies: ['monochrome'],
    };
  }

  ctx.drawImage(img, 0, 0, sampleSize, sampleSize);
  const { data } = ctx.getImageData(0, 0, sampleSize, sampleSize);

  // Quantize pixels into buckets in RGB space and sort by visual prominence
  const buckets = new Map<string, { r: number; g: number; b: number; count: number }>();

  for (let i = 0; i < data.length; i += 4) {
    const a = data[i + 3];
    if (a < 128) continue;
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];

    // Bucket by 32-step intervals
    const key = `${Math.floor(r / 32)}-${Math.floor(g / 32)}-${Math.floor(b / 32)}`;
    const existing = buckets.get(key);
    if (existing) {
      existing.r += r;
      existing.g += g;
      existing.b += b;
      existing.count += 1;
    } else {
      buckets.set(key, { r, g, b, count: 1 });
    }
  }

  const sorted = Array.from(buckets.values())
    .sort((a, b) => b.count - a.count)
    .map((b) => ({
      r: b.r / b.count,
      g: b.g / b.count,
      b: b.b / b.count,
      count: b.count,
    }));

  const selected: { r: number; g: number; b: number }[] = [];
  const minDistance = 42;

  for (const candidate of sorted) {
    if (selected.length >= 5) break;
    const tooClose = selected.some((s) => {
      const dist = Math.hypot(s.r - candidate.r, s.g - candidate.g, s.b - candidate.b);
      return dist < minDistance;
    });
    if (!tooClose) {
      selected.push(candidate);
    }
  }

  // Fill remaining slots if image is very uniform
  for (const candidate of sorted) {
    if (selected.length >= 5) break;
    if (!selected.includes(candidate)) {
      selected.push(candidate);
    }
  }

  // Sort palette by luminance from dark to light for aesthetic presentation
  selected.sort((a, b) => 0.299 * a.r + 0.587 * a.g + 0.114 * a.b - (0.299 * b.r + 0.587 * b.g + 0.114 * b.b));

  const palette = selected.map((c) => rgbToHex(c.r, c.g, c.b));
  while (palette.length < 5) {
    palette.push('#3f3f46');
  }

  const familySet = new Set<ColorFamily>();
  palette.slice(0, 3).forEach((hex) => familySet.add(classifyHexToFamily(hex)));

  return {
    palette,
    colorFamilies: Array.from(familySet),
  };
}

async function extractExif(file: File): Promise<ExifData | undefined> {
  try {
    const raw = await exifr.parse(file, {
      pick: ['Make', 'Model', 'FocalLength', 'FNumber', 'ExposureTime', 'ISO'],
    });
    if (!raw) return undefined;

    const camera = [raw.Make, raw.Model]
      .filter(Boolean)
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();

    const focalLength = raw.FocalLength ? `${Math.round(Number(raw.FocalLength))}mm` : undefined;
    const aperture = raw.FNumber ? `f/${Number(raw.FNumber).toFixed(1).replace(/\.0$/, '')}` : undefined;

    let shutter: string | undefined;
    if (raw.ExposureTime) {
      const exp = Number(raw.ExposureTime);
      shutter = exp >= 1 ? `${exp}s` : `1/${Math.round(1 / exp)}s`;
    }

    const iso = raw.ISO ? `ISO ${raw.ISO}` : undefined;

    if (!camera && !focalLength && !aperture && !shutter && !iso) {
      return undefined;
    }

    return { camera: camera || undefined, focalLength, aperture, shutter, iso };
  } catch {
    return undefined;
  }
}

export async function processImageToWebP(
  file: File,
  maxDimension = 2200,
  quality = 0.86
): Promise<ProcessedImageResult> {
  const exif = await extractExif(file);
  const originalSizeKB = Math.max(1, Math.round(file.size / 1024));

  const objectUrl = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = (err) => reject(err);
      el.src = objectUrl;
    });

    const { palette, colorFamilies } = extractPaletteFromImage(img);

    let targetWidth = img.naturalWidth || img.width;
    let targetHeight = img.naturalHeight || img.height;

    if (targetWidth > maxDimension || targetHeight > maxDimension) {
      if (targetWidth >= targetHeight) {
        targetHeight = Math.round((targetHeight * maxDimension) / targetWidth);
        targetWidth = maxDimension;
      } else {
        targetWidth = Math.round((targetWidth * maxDimension) / targetHeight);
        targetHeight = maxDimension;
      }
    }

    const canvas = document.createElement('canvas');
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('浏览器 Canvas 初始化失败');
    }

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

    const webpDataUrl = canvas.toDataURL('image/webp', quality);
    const base64Content = webpDataUrl.split(',')[1] || '';

    const webpBlob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob);
          else reject(new Error('WebP 转换失败'));
        },
        'image/webp',
        quality
      );
    });

    const sizeKB = Math.max(1, Math.round(webpBlob.size / 1024));
    const aspectRatio = Number((targetWidth / targetHeight).toFixed(3));

    return {
      webpBlob,
      webpDataUrl,
      base64Content,
      width: targetWidth,
      height: targetHeight,
      aspectRatio,
      sizeKB,
      originalSizeKB,
      palette,
      colorFamilies,
      exif,
    };
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}
