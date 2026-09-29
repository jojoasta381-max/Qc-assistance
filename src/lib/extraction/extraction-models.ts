/**
 * SPANQC DOCUMENT EXTRACTION DATA MODEL
 * 
 * Coordinate System Standard:
 * - Normalized bounding box: { x, y, width, height }
 * - Unit: 0 to 1000 relative to page width and height
 * - Origin: (0, 0) is TOP-LEFT of the page
 * - x: distance from left border (0 to 1000)
 * - y: distance from top border (0 to 1000)
 * - width: horizontal span (0 to 1000)
 * - height: vertical span (0 to 1000)
 * 
 * Every extracted token, text block, or geometric element originates directly from
 * parsed document bytes or authentic OCR analysis.
 */

export interface NormalizedBoundingBox {
  x: number;      // 0 - 1000 normalized
  y: number;      // 0 - 1000 normalized
  width: number;  // 0 - 1000 normalized
  height: number; // 0 - 1000 normalized
}

export type ExtractionSource = 'pdf-text' | 'pdf-vector' | 'ocr' | 'svg';

export interface ExtractedWord {
  id: string;
  text: string;
  bbox: NormalizedBoundingBox;
  confidence: number; // 0.0 - 1.0
  source: ExtractionSource;
}

export interface ExtractedLine {
  id: string;
  text: string;
  words: ExtractedWord[];
  bbox: NormalizedBoundingBox;
  confidence: number;
  source: ExtractionSource;
}

export interface ExtractedTextBlock {
  id: string;
  text: string;
  lines: ExtractedLine[];
  bbox: NormalizedBoundingBox;
  confidence: number;
  source: ExtractionSource;
}

export interface ExtractedVectorPath {
  id: string;
  command: string; // SVG path data or operator
  bbox: NormalizedBoundingBox;
  strokeWidth?: number;
  source: ExtractionSource;
}

export interface ExtractedImageMetadata {
  id: string;
  width: number;
  height: number;
  bbox: NormalizedBoundingBox;
  format: string;
  source: ExtractionSource;
}

export interface NormalizedPage {
  pageNumber: number;
  width: number;  // Physical points or pixels
  height: number;
  dpi: number;
  textBlocks: ExtractedTextBlock[];
  words: ExtractedWord[];
  lines: ExtractedLine[];
  vectorPaths: ExtractedVectorPath[];
  images: ExtractedImageMetadata[];
  confidence: number;
  source: ExtractionSource;
}

export interface NormalizedDocument {
  documentId: string;
  versionId: string;
  mimeType: string;
  sha256: string;
  pageCount: number;
  pages: NormalizedPage[];
  extractedAt: Date;
  rawTextLength: number;
  ocrApplied: boolean;
  ocrAvailable: boolean;
}
