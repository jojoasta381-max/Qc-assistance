import '@/lib/dom-polyfill';
import crypto from 'crypto';
import sharp from 'sharp';
import { PDFParse } from 'pdf-parse';

export interface PreflightPageInfo {
  pageNumber: number;
  width: number;
  height: number;
  hasText: boolean;
  hasVector: boolean;
  hasRaster: boolean;
}

export interface RealPreflightResult {
  isValid: boolean;
  fileType: 'PDF' | 'PNG' | 'JPEG' | 'SVG' | 'TIFF' | 'UNKNOWN';
  mimeType: string;
  sha256Hash: string;
  fileSizeBytes: number;
  pageCount: number;
  dimensions: {
    width: number;
    height: number;
    dpi: number;
  };
  pages: PreflightPageInfo[];
  isEncrypted: boolean;
  hasText: boolean;
  hasVector: boolean;
  hasRaster: boolean;
  complexityScore: number;
  sanitizedSvg?: string;
  warnings: string[];
  error?: string;
}

const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024; // 50MB

/**
 * Strict magic-byte detection
 */
export function detectMagicBytes(buffer: Buffer): { type: RealPreflightResult['fileType']; mime: string } {
  if (buffer.length >= 4 && buffer.slice(0, 4).toString() === '%PDF') {
    return { type: 'PDF', mime: 'application/pdf' };
  }
  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47
  ) {
    return { type: 'PNG', mime: 'image/png' };
  }
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return { type: 'JPEG', mime: 'image/jpeg' };
  }
  if (
    buffer.length >= 4 &&
    ((buffer[0] === 0x49 && buffer[1] === 0x49 && buffer[2] === 0x2a && buffer[3] === 0x00) ||
      (buffer[0] === 0x4d && buffer[1] === 0x4d && buffer[2] === 0x00 && buffer[3] === 0x2a))
  ) {
    return { type: 'TIFF', mime: 'image/tiff' };
  }

  // Check SVG: XML or SVG tag
  const head = buffer.slice(0, 2048).toString('utf8').trim().toLowerCase();
  if (head.includes('<svg') || (head.includes('<?xml') && head.includes('<svg'))) {
    return { type: 'SVG', mime: 'image/svg+xml' };
  }

  return { type: 'UNKNOWN', mime: 'application/octet-stream' };
}

/**
 * Strict SVG sanitizer
 */
export function sanitizeSvgContent(rawSvg: string): string {
  let clean = rawSvg;
  clean = clean.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  clean = clean.replace(/\son\w+\s*=\s*(?:'[^']*'|"[^"]*"|[^\s>]+)/gi, '');
  clean = clean.replace(/<foreignObject\b[^<]*(?:(?!<\/foreignObject>)<[^<]*)*<\/foreignObject>/gi, '');
  clean = clean.replace(/(?:href|xlink:href)\s*=\s*['"]\s*javascript:[^'"]*['"]/gi, '');
  clean = clean.replace(/(?:href|xlink:href)\s*=\s*['"]\s*data:(?:text\/html|application\/xhtml\+xml)[^'"]*['"]/gi, '');
  return clean;
}

/**
 * Execute real byte-level preflight analysis on an uploaded engineering document.
 * NEVER uses filename heuristics or static hardcoded dimensions.
 */
export async function performRealPreflight(
  fileBuffer: Buffer,
  _filenameContext?: string
): Promise<RealPreflightResult> {
  const warnings: string[] = [];
  const fileSizeBytes = fileBuffer.length;

  // 1. Enforce size boundary
  if (fileSizeBytes > MAX_FILE_SIZE_BYTES) {
    return {
      isValid: false,
      fileType: 'UNKNOWN',
      mimeType: 'application/octet-stream',
      sha256Hash: '',
      fileSizeBytes,
      pageCount: 0,
      dimensions: { width: 0, height: 0, dpi: 0 },
      pages: [],
      isEncrypted: false,
      hasText: false,
      hasVector: false,
      hasRaster: false,
      complexityScore: 0,
      warnings,
      error: `File size (${(fileSizeBytes / (1024 * 1024)).toFixed(1)} MB) exceeds 50MB enterprise limit.`,
    };
  }

  // 2. Compute authoritative SHA-256 fingerprint
  const sha256Hash = crypto.createHash('sha256').update(fileBuffer).digest('hex');

  // 3. Inspect magic bytes
  const { type: detectedType, mime: detectedMime } = detectMagicBytes(fileBuffer);

  if (detectedType === 'UNKNOWN') {
    return {
      isValid: false,
      fileType: 'UNKNOWN',
      mimeType: detectedMime,
      sha256Hash,
      fileSizeBytes,
      pageCount: 0,
      dimensions: { width: 0, height: 0, dpi: 0 },
      pages: [],
      isEncrypted: false,
      hasText: false,
      hasVector: false,
      hasRaster: false,
      complexityScore: 0,
      warnings,
      error: 'Unrecognized file format. Must be a valid PDF, SVG, PNG, JPEG, or TIFF engineering drawing.',
    };
  }

  if (fileSizeBytes < 128) {
    return {
      isValid: false,
      fileType: detectedType,
      mimeType: detectedMime,
      sha256Hash,
      fileSizeBytes,
      pageCount: 0,
      dimensions: { width: 0, height: 0, dpi: 0 },
      pages: [],
      isEncrypted: false,
      hasText: false,
      hasVector: false,
      hasRaster: false,
      complexityScore: 0,
      warnings,
      error: 'File payload is truncated or empty.',
    };
  }

  // 4. Type-specific inspection
  try {
    if (detectedType === 'PDF') {
      return await inspectPdfBytes(fileBuffer, sha256Hash, detectedMime, warnings);
    } else if (detectedType === 'PNG' || detectedType === 'JPEG' || detectedType === 'TIFF') {
      return await inspectRasterImageBytes(fileBuffer, detectedType, detectedMime, sha256Hash, warnings);
    } else if (detectedType === 'SVG') {
      return await inspectSvgBytes(fileBuffer, sha256Hash, warnings);
    }
  } catch (err: any) {
    return {
      isValid: false,
      fileType: detectedType,
      mimeType: detectedMime,
      sha256Hash,
      fileSizeBytes,
      pageCount: 0,
      dimensions: { width: 0, height: 0, dpi: 0 },
      pages: [],
      isEncrypted: false,
      hasText: false,
      hasVector: false,
      hasRaster: false,
      complexityScore: 0,
      warnings,
      error: `Document inspection failed: ${err.message}`,
    };
  }

  return {
    isValid: false,
    fileType: 'UNKNOWN',
    mimeType: 'application/octet-stream',
    sha256Hash,
    fileSizeBytes,
    pageCount: 0,
    dimensions: { width: 0, height: 0, dpi: 0 },
    pages: [],
    isEncrypted: false,
    hasText: false,
    hasVector: false,
    hasRaster: false,
    complexityScore: 0,
    warnings,
    error: 'Unsupported file processing type.',
  };
}

/**
 * Real PDF inspection extracting genuine page count, MediaBoxes, text streams, and vector/raster presence
 */
async function inspectPdfBytes(
  buffer: Buffer,
  sha256Hash: string,
  mimeType: string,
  warnings: string[]
): Promise<RealPreflightResult> {
  const binaryString = buffer.toString('binary');

  // Encryption check
  const isEncrypted = binaryString.includes('/Encrypt');
  if (isEncrypted) {
    return {
      isValid: false,
      fileType: 'PDF',
      mimeType,
      sha256Hash,
      fileSizeBytes: buffer.length,
      pageCount: 0,
      dimensions: { width: 0, height: 0, dpi: 72 },
      pages: [],
      isEncrypted: true,
      hasText: false,
      hasVector: false,
      hasRaster: false,
      complexityScore: 0,
      warnings,
      error: 'PDF is password-protected or encrypted. Please upload an unlocked engineering drawing.',
    };
  }

  // Parse PDF structure
  let pageCount = 1;
  let rawText = '';
  let parser: any = null;
  try {
    parser = new PDFParse({ data: buffer });
    const textData = await parser.getText();
    const info = await parser.getInfo();
    pageCount = Math.max(1, textData?.total || info?.total || 1);
    rawText = textData?.text || '';
  } catch (err: any) {
    return {
      isValid: false,
      fileType: 'PDF',
      mimeType,
      sha256Hash,
      fileSizeBytes: buffer.length,
      pageCount: 0,
      dimensions: { width: 0, height: 0, dpi: 72 },
      pages: [],
      isEncrypted: false,
      hasText: false,
      hasVector: false,
      hasRaster: false,
      complexityScore: 0,
      warnings,
      error: `Malformed or corrupt PDF structure: ${err.message}`,
    };
  } finally {
    if (parser) {
      try {
        await parser.destroy();
      } catch {}
    }
  }

  const hasText = rawText.trim().length > 0;

  // Extract page dimensions from MediaBoxes
  const mediaBoxRegex = /\/MediaBox\s*\[\s*([\d.-]+)\s+([\d.-]+)\s+([\d.-]+)\s+([\d.-]+)\s*\]/g;
  const detectedDimensions: Array<{ width: number; height: number }> = [];
  let m: RegExpExecArray | null;
  while ((m = mediaBoxRegex.exec(binaryString)) !== null) {
    const w = Math.round(Math.abs(parseFloat(m[3]) - parseFloat(m[1])));
    const h = Math.round(Math.abs(parseFloat(m[4]) - parseFloat(m[2])));
    if (w > 0 && h > 0) {
      detectedDimensions.push({ width: w, height: h });
    }
  }

  const primaryWidth = detectedDimensions.length > 0 ? detectedDimensions[0].width : 595; // Default A4 72pt if none specified
  const primaryHeight = detectedDimensions.length > 0 ? detectedDimensions[0].height : 842;

  // Content analysis
  const hasRaster = binaryString.includes('/Subtype/Image') || binaryString.includes('/Subtype /Image') || binaryString.includes('/Image');
  const hasVector = binaryString.includes('/Font') || binaryString.includes('ET') || binaryString.includes('re') || binaryString.includes('lineto');

  // Complexity score based on object and stream count
  const objectCount = (binaryString.match(/\bobj\b/g) || []).length;
  const streamCount = (binaryString.match(/\bstream\b/g) || []).length;
  const complexityScore = objectCount + streamCount * 2;

  const pages: PreflightPageInfo[] = [];
  for (let i = 1; i <= pageCount; i++) {
    const pageDim = detectedDimensions[i - 1] || { width: primaryWidth, height: primaryHeight };
    pages.push({
      pageNumber: i,
      width: pageDim.width,
      height: pageDim.height,
      hasText: hasText,
      hasVector: hasVector,
      hasRaster: hasRaster,
    });
  }

  if (!hasText && hasRaster) {
    warnings.push('Document appears to contain scanned raster drawing. Optical Character Recognition (OCR) will be utilized.');
  }

  return {
    isValid: true,
    fileType: 'PDF',
    mimeType,
    sha256Hash,
    fileSizeBytes: buffer.length,
    pageCount,
    dimensions: {
      width: primaryWidth,
      height: primaryHeight,
      dpi: 72,
    },
    pages,
    isEncrypted: false,
    hasText,
    hasVector,
    hasRaster,
    complexityScore,
    warnings,
  };
}

/**
 * Real raster image inspection using sharp
 */
async function inspectRasterImageBytes(
  buffer: Buffer,
  fileType: 'PNG' | 'JPEG' | 'TIFF',
  mimeType: string,
  sha256Hash: string,
  warnings: string[]
): Promise<RealPreflightResult> {
  let meta: any;
  try {
    meta = await sharp(buffer).metadata();
  } catch (err: any) {
    return {
      isValid: false,
      fileType,
      mimeType,
      sha256Hash,
      fileSizeBytes: buffer.length,
      pageCount: 0,
      dimensions: { width: 0, height: 0, dpi: 0 },
      pages: [],
      isEncrypted: false,
      hasText: false,
      hasVector: false,
      hasRaster: true,
      complexityScore: 0,
      warnings,
      error: `Corrupt or unreadable image stream: ${err.message}`,
    };
  }

  if (!meta.width || !meta.height) {
    return {
      isValid: false,
      fileType,
      mimeType,
      sha256Hash,
      fileSizeBytes: buffer.length,
      pageCount: 0,
      dimensions: { width: 0, height: 0, dpi: 0 },
      pages: [],
      isEncrypted: false,
      hasText: false,
      hasVector: false,
      hasRaster: true,
      complexityScore: 0,
      warnings,
      error: 'Failed to extract dimensions from image.',
    };
  }

  const width = meta.width;
  const height = meta.height;
  const dpi = meta.density || 300;

  if (width < 300 || height < 300) {
    warnings.push('Image resolution is very low (< 300px). Text and wire identification accuracy may be reduced.');
  }

  const pages: PreflightPageInfo[] = [
    {
      pageNumber: 1,
      width,
      height,
      hasText: false,
      hasVector: false,
      hasRaster: true,
    },
  ];

  return {
    isValid: true,
    fileType,
    mimeType,
    sha256Hash,
    fileSizeBytes: buffer.length,
    pageCount: 1,
    dimensions: {
      width,
      height,
      dpi,
    },
    pages,
    isEncrypted: false,
    hasText: false,
    hasVector: false,
    hasRaster: true,
    complexityScore: Math.round((width * height) / 10000),
    warnings,
  };
}

/**
 * Real SVG inspection parsing exact viewBox, elements, and vector graphics
 */
async function inspectSvgBytes(
  buffer: Buffer,
  sha256Hash: string,
  warnings: string[]
): Promise<RealPreflightResult> {
  const rawSvg = buffer.toString('utf8');
  const sanitizedSvg = sanitizeSvgContent(rawSvg);

  let width = 1920;
  let height = 1080;

  // ViewBox extraction
  const viewBoxMatch = rawSvg.match(/viewBox\s*=\s*["']\s*([\d.-]+)\s+([\d.-]+)\s+([\d.-]+)\s+([\d.-]+)\s*["']/i);
  if (viewBoxMatch) {
    width = Math.round(parseFloat(viewBoxMatch[3]));
    height = Math.round(parseFloat(viewBoxMatch[4]));
  } else {
    const widthMatch = rawSvg.match(/width\s*=\s*["']\s*([\d.-]+)/i);
    const heightMatch = rawSvg.match(/height\s*=\s*["']\s*([\d.-]+)/i);
    if (widthMatch) width = Math.round(parseFloat(widthMatch[1]));
    if (heightMatch) height = Math.round(parseFloat(heightMatch[1]));
  }

  const hasText = rawSvg.includes('<text') || rawSvg.includes('<tspan');
  const hasVector = rawSvg.includes('<path') || rawSvg.includes('<line') || rawSvg.includes('<rect') || rawSvg.includes('<polyline');
  const hasRaster = rawSvg.includes('<image');

  const elementCount = (rawSvg.match(/<[a-zA-Z]+/g) || []).length;

  const pages: PreflightPageInfo[] = [
    {
      pageNumber: 1,
      width,
      height,
      hasText,
      hasVector,
      hasRaster,
    },
  ];

  return {
    isValid: true,
    fileType: 'SVG',
    mimeType: 'image/svg+xml',
    sha256Hash,
    fileSizeBytes: buffer.length,
    pageCount: 1,
    dimensions: {
      width,
      height,
      dpi: 96,
    },
    pages,
    isEncrypted: false,
    hasText,
    hasVector,
    hasRaster,
    complexityScore: elementCount,
    sanitizedSvg,
    warnings,
  };
}
