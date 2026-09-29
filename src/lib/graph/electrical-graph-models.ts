/**
 * SPANQC PRODUCTION ELECTRICAL GRAPH DATA MODEL
 * 
 * Coordinate System Standard (Phase 3 & Phase 4):
 * - Origin: Top-Left corner (0, 0)
 * - X-Axis: 0 to 1000 (left to right)
 * - Y-Axis: 0 to 1000 (top to bottom)
 * - Normalized relative to physical page dimensions
 * 
 * Every node, terminal, wire, and net maintains strict provenance
 * pointing back to raw extracted text tokens, vector paths, or OCR bounding boxes.
 */

import { NormalizedBoundingBox, ExtractionSource } from '@/lib/extraction/extraction-models';
export type { NormalizedBoundingBox, ExtractionSource };

export type ComponentClassification =
  | 'CONNECTOR'
  | 'FUSE'
  | 'RELAY'
  | 'SWITCH'
  | 'RESISTOR'
  | 'DIODE'
  | 'LED'
  | 'MOTOR'
  | 'BATTERY'
  | 'GROUND'
  | 'POWER_SOURCE'
  | 'SENSOR'
  | 'ECU_MODULE'
  | 'TERMINAL_BLOCK'
  | 'SPLICE'
  | 'UNKNOWN_COMPONENT';

export type EntityConfidenceStatus =
  | 'CONFIRMED'   // Deterministic high-confidence evidence from drawing
  | 'PROBABLE'    // Strongly implied by topological proximity
  | 'UNCERTAIN'   // Ambiguous evidence; requires human review
  | 'UNRESOLVED'; // Incomplete or conflicting evidence

export interface Point2D {
  x: number; // 0 to 1000 normalized
  y: number; // 0 to 1000 normalized
}

export interface GraphEvidenceRef {
  sourceType: ExtractionSource;
  sourceId: string;
  pageNumber: number;
  bbox: NormalizedBoundingBox;
  textSnippet?: string;
  confidence: number;
}

export interface GraphTerminal {
  id: string;               // e.g. "t-comp1-1"
  componentId: string;
  terminalName: string;     // e.g. "1", "2", "85", "86", "GND", or "UNKNOWN"
  position: Point2D;
  pageNumber: number;
  confidence: number;
  status: EntityConfidenceStatus;
  sourceEvidenceId: string;
  evidence?: GraphEvidenceRef;
}

export interface GraphComponent {
  id: string;               // Deterministic content ID
  type: ComponentClassification;
  label: string;            // Reference designator e.g. "J1", "F1", "K1"
  value?: string;           // Optional rating e.g. "15A", "12V", "10k"
  pageNumber: number;
  bbox: NormalizedBoundingBox;
  confidence: number;
  status: EntityConfidenceStatus;
  terminalIds: string[];
  sourceEvidenceId: string;
  evidence: GraphEvidenceRef[];
}

export interface GraphWireSegment {
  start: Point2D;
  end: Point2D;
  vectorCommand?: string;
}

export interface GraphWire {
  id: string;
  pageNumber: number;
  geometry: GraphWireSegment;
  label?: string;           // e.g. "W101", "GND-01"
  gauge?: string;           // e.g. "16 AWG"
  color?: string;           // e.g. "RED", "BLK"
  connectedTerminalIds: string[];
  confidence: number;
  status: EntityConfidenceStatus;
  sourceEvidenceId: string;
  evidence: GraphEvidenceRef[];
}

export interface GraphConnector {
  id: string;
  type: string;             // e.g. "AMPSEAL", "D38999", "STANDARD_CONNECTOR"
  reference: string;        // e.g. "J1", "P2"
  pinTerminalIds: string[];
  pageNumber: number;
  bbox: NormalizedBoundingBox;
  confidence: number;
  sourceEvidenceId: string;
}

export interface GraphNet {
  id: string;               // Deterministic net ID e.g. "net-PWR", "net-01"
  name: string;             // e.g. "+12V", "GND", "NET_J1_1"
  voltageDomain?: string;   // e.g. "+12V", "+24V", "GND"
  memberTerminalIds: string[];
  memberComponentIds: string[];
  memberWireIds: string[];
  pages: number[];
  connectivityConfidence: number;
  evidenceReferences: string[];
}

export interface GraphDiagnostic {
  id: string;
  code:
    | 'DANGLING_WIRE'
    | 'DISCONNECTED_TERMINAL'
    | 'DUPLICATE_DESIGNATOR'
    | 'UNRESOLVED_SYMBOL'
    | 'UNRESOLVED_TERMINAL'
    | 'AMBIGUOUS_JUNCTION'
    | 'CROSSING_AMBIGUITY'
    | 'TOPOLOGY_ERROR'
    | 'WIRE_GEOMETRY_UNAVAILABLE'
    | 'FATAL_CORRUPTION';
  severity: 'FATAL' | 'ERROR' | 'WARNING' | 'INFO';
  message: string;
  entityId: string;
  pageNumber: number;
  bbox?: NormalizedBoundingBox;
}

export interface GraphPageSummary {
  pageNumber: number;
  dimensions: { width: number; height: number };
  componentCount: number;
  terminalCount: number;
  wireCount: number;
}

export interface ElectricalGraph {
  graphId: string;
  documentId: string;
  versionId: string;
  tenantId: string;
  sourceSha256: string;
  extractionVersion: string;
  graphVersion: string;
  graphSha256: string;
  createdAt: string;
  pages: GraphPageSummary[];
  components: GraphComponent[];
  terminals: GraphTerminal[];
  wires: GraphWire[];
  connectors: GraphConnector[];
  nets: GraphNet[];
  diagnostics: GraphDiagnostic[];
}

/**
 * Coordinate Conversion Utilities
 */
export function toNormalizedCoordinate(
  point: { x: number; y: number },
  pageDimensions: { width: number; height: number }
): Point2D {
  const width = Math.max(1, pageDimensions.width);
  const height = Math.max(1, pageDimensions.height);
  return {
    x: Math.round(Math.min(1000, Math.max(0, (point.x / width) * 1000)) * 100) / 100,
    y: Math.round(Math.min(1000, Math.max(0, (point.y / height) * 1000)) * 100) / 100,
  };
}

export function toPagePoints(
  point: Point2D,
  pageDimensions: { width: number; height: number }
): { x: number; y: number } {
  return {
    x: Math.round((point.x / 1000) * pageDimensions.width * 100) / 100,
    y: Math.round((point.y / 1000) * pageDimensions.height * 100) / 100,
  };
}

export function calculateDistance(p1: Point2D, p2: Point2D): number {
  const dx = p1.x - p2.x;
  const dy = p1.y - p2.y;
  return Math.sqrt(dx * dx + dy * dy);
}

export function isPointInsideBbox(point: Point2D, bbox: NormalizedBoundingBox, tolerance = 0): boolean {
  return (
    point.x >= bbox.x - tolerance &&
    point.x <= bbox.x + bbox.width + tolerance &&
    point.y >= bbox.y - tolerance &&
    point.y <= bbox.y + bbox.height + tolerance
  );
}

export function calculateBboxCenter(bbox: NormalizedBoundingBox): Point2D {
  return {
    x: Math.round((bbox.x + bbox.width / 2) * 100) / 100,
    y: Math.round((bbox.y + bbox.height / 2) * 100) / 100,
  };
}
