/**
 * SPANQC REAL DRAWING BENCHMARK TYPES & SCHEMAS (Phase 4.5)
 * 
 * Machine-readable benchmark annotation, differential evaluation,
 * and precision/recall/F1 metrics definitions.
 */

import { NormalizedBoundingBox, Point2D } from '@/lib/graph/electrical-graph-models';

export type BenchmarkDrawingType = 'VECTOR_PDF' | 'RASTER_IMAGE' | 'MIXED';

export type BenchmarkCategory =
  | 'simple_wiring'
  | 'connector_heavy'
  | 'relay_fuse'
  | 'multipage'
  | 'crossings_no_junction'
  | 'crossings_with_junction'
  | 'touching_wire'
  | 'gap_tolerance'
  | 'duplicate_references'
  | 'ambiguous_symbols'
  | 'vector_pdf'
  | 'raster_scanned';

export type BenchmarkDocumentStatus = 'ANNOTATED' | 'NOT_TESTED' | 'INSUFFICIENT_DATA';

export interface BenchmarkDocumentManifestEntry {
  id: string;
  filename: string;
  sourceSha256: string;
  drawingType: BenchmarkDrawingType;
  pageCount: number;
  categories: BenchmarkCategory[];
  status: BenchmarkDocumentStatus;
  annotationFile?: string;
  description: string;
  notes?: string;
}

export interface BenchmarkManifest {
  version: string;
  description: string;
  updatedAt: string;
  documents: BenchmarkDocumentManifestEntry[];
}

export interface AnnotatedComponent {
  id: string;
  pageNumber: number;
  type: string;
  referenceDesignator: string;
  valueRating?: string;
  boundingBox: NormalizedBoundingBox;
}

export interface AnnotatedTerminal {
  id: string;
  componentId: string;
  terminalName: string;
  position: Point2D;
  pageNumber: number;
}

export interface AnnotatedWire {
  id: string;
  pageNumber: number;
  geometry: {
    start: Point2D;
    end: Point2D;
  };
  connectedTerminalIds: string[];
}

export interface AnnotatedJunction {
  id: string;
  pageNumber: number;
  position: Point2D;
  connectedWireIds: string[];
}

export interface AnnotatedNet {
  id: string;
  name: string;
  netType: 'POWER' | 'GROUND' | 'SIGNAL';
  memberTerminalIds: string[];
  wireIds: string[];
  pageNumbers: number[];
}

export interface AnnotatedFinding {
  ruleCode: string;
  severity: string;
  pageNumber: number;
  entityIds: string[];
  description: string;
}

export interface AnnotatedAmbiguity {
  id: string;
  type: string;
  pageNumber: number;
  description: string;
  coordinates?: Point2D;
}

export interface BenchmarkAnnotation {
  schemaVersion: string;
  document: {
    id: string;
    filename: string;
    sourceSha256: string;
    pageCount: number;
    drawingType: BenchmarkDrawingType;
  };
  expectedComponents: AnnotatedComponent[];
  expectedTerminals: AnnotatedTerminal[];
  expectedWires: AnnotatedWire[];
  expectedJunctions: AnnotatedJunction[];
  expectedNets: AnnotatedNet[];
  expectedFindings: AnnotatedFinding[];
  expectedAmbiguities: AnnotatedAmbiguity[];
}

export interface MetricScore {
  truePositives: number;
  falsePositives: number;
  falseNegatives: number;
  precision: number;
  recall: number;
  f1Score: number;
}

export interface DocumentBenchmarkResult {
  documentId: string;
  filename: string;
  sourceSha256: string;
  graphSha256: string;
  drawingType: BenchmarkDrawingType;
  status: 'EVALUATED' | 'NOT_TESTED' | 'INSUFFICIENT_DATA';
  components: MetricScore;
  terminals: MetricScore;
  wires: MetricScore;
  connectivity: MetricScore;
  nets: MetricScore;
  findings: MetricScore;
  falsePositiveRate: number;
  falseNegativeRate: number;
  notEvaluableRate: number;
  diagnosticsCount: number;
  diagnostics: string[];
}

export interface CorpusBenchmarkReport {
  generatedAt: string;
  benchmarkStatus: 'SUFFICIENT_DATA' | 'INSUFFICIENT_DATA';
  totalManifestDocuments: number;
  annotatedCount: number;
  untestedCount: number;
  evaluatedCount: number;
  overallMetrics: {
    components: MetricScore;
    terminals: MetricScore;
    wires: MetricScore;
    connectivity: MetricScore;
    nets: MetricScore;
    findings: MetricScore;
    avgFalsePositiveRate: number;
    avgFalseNegativeRate: number;
    avgNotEvaluableRate: number;
  };
  documentResults: DocumentBenchmarkResult[];
  notes: string[];
}
