import crypto from 'crypto';
import { performRealPreflight } from './real-preflight';

export interface PreflightResult {
  isValid: boolean;
  fileType: 'PDF' | 'SVG' | 'PNG' | 'JPEG' | 'TIFF' | 'UNKNOWN';
  mimeType: string;
  sha256Hash: string;
  fileSizeBytes: number;
  sanitizedSvg?: string;
  pageCount: number;
  dimensions: {
    width: number;
    height: number;
    dpi: number;
  };
  warnings: string[];
  error?: string;
}

/**
 * Inspect magic bytes from Buffer to determine true file type
 */
export function detectMagicBytes(buffer: Buffer): { type: PreflightResult['fileType']; mime: string } {
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
  
  // Check for SVG (text starting with <svg or <?xml)
  const headerStr = buffer.slice(0, 1024).toString('utf8').trim().toLowerCase();
  if (headerStr.includes('<svg') || (headerStr.includes('<?xml') && headerStr.includes('<svg'))) {
    return { type: 'SVG', mime: 'image/svg+xml' };
  }

  return { type: 'UNKNOWN', mime: 'application/octet-stream' };
}

/**
 * Strict SVG XML sanitizer to prevent Stored XSS and malicious scripts
 */
export function sanitizeSvgContent(rawSvg: string): string {
  let clean = rawSvg;
  // Remove script tags and contents
  clean = clean.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  // Remove dangerous on* event attributes (onclick, onload, onerror, etc.)
  clean = clean.replace(/\son\w+\s*=\s*(?:'[^']*'|"[^"]*"|[^\s>]+)/gi, '');
  // Remove foreignObject which can embed arbitrary HTML
  clean = clean.replace(/<foreignObject\b[^<]*(?:(?!<\/foreignObject>)<[^<]*)*<\/foreignObject>/gi, '');
  // Remove javascript: and data: URIs in href and xlink:href
  clean = clean.replace(/(?:href|xlink:href)\s*=\s*['"]\s*javascript:[^'"]*['"]/gi, '');
  clean = clean.replace(/(?:href|xlink:href)\s*=\s*['"]\s*data:(?:text\/html|application\/xhtml\+xml)[^'"]*['"]/gi, '');
  return clean;
}

/**
 * Pre-flight validation of incoming engineering drawing files
 */
export async function validateAndPreflightFile(
  fileBuffer: Buffer,
  declaredFileName: string
): Promise<PreflightResult> {
  const warnings: string[] = [];
  const fileSizeBytes = fileBuffer.length;

  // 1. Max size check: 50MB
  const MAX_SIZE = 50 * 1024 * 1024;
  if (fileSizeBytes > MAX_SIZE) {
    return {
      isValid: false,
      fileType: 'UNKNOWN',
      mimeType: 'application/octet-stream',
      sha256Hash: '',
      fileSizeBytes,
      pageCount: 0,
      dimensions: { width: 0, height: 0, dpi: 0 },
      warnings,
      error: `File size (${(fileSizeBytes / (1024 * 1024)).toFixed(1)} MB) exceeds 50MB enterprise limit.`,
    };
  }

  // 2. Compute SHA-256 fingerprint for tamper-proof audit
  const sha256Hash = crypto.createHash('sha256').update(fileBuffer).digest('hex');

  // 3. Detect file type via magic bytes
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
      warnings,
      error: 'Unrecognized file format. Please upload standard Vector PDF, SVG, PNG, or JPEG drawings.',
    };
  }

  return performRealPreflight(fileBuffer, declaredFileName);
}
