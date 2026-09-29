export type StandardPreset = 
  | 'IPC-WHMA-A-620' 
  | 'IPC-A-610' 
  | 'UL-508A' 
  | 'ISO-1219' 
  | 'CUSTOMER-SOP';

export type SeverityLevel = 'CRITICAL' | 'MAJOR' | 'MINOR';

export type DiscrepancyStatus =
  | 'UNREVIEWED'
  | 'CONFIRMED'
  | 'REJECTED'
  | 'FALSE_POSITIVE'
  | 'WAIVED'
  | 'NEEDS_MORE_EVIDENCE';

export interface BoundingBox {
  x: number;      // percentage (0 - 100)
  y: number;      // percentage (0 - 100)
  width: number;  // percentage (0 - 100)
  height: number; // percentage (0 - 100)
}

export interface Discrepancy {
  id: string; // e.g. "D-001"
  title: string;
  description: string;
  severity: SeverityLevel;
  confidence: number; // e.g. 95
  standardRef: string; // e.g. "IPC/WHMA-A-620 §4.2.1"
  componentRef: string; // e.g. "J1 Pin 4 / W-103"
  plainLanguageExplanation: string;
  recommendation: string;
  bbox: BoundingBox;
  status: DiscrepancyStatus;
  feedbackNote?: string;
  feedbackCategory?: string;
}

export interface QCSummary {
  executed: number;
  passed: number;
  failed: number;
  na: number;
  critical: number;
  major: number;
  minor: number;
}

export interface QCReport {
  id: string;
  diagramName: string;
  diagramCategory: string;
  standard: StandardPreset;
  timestamp: string;
  overallResult: 'PASS' | 'FAIL';
  qualityScore: number; // 0 - 100
  summary: QCSummary;
  discrepancies: Discrepancy[];
  inspectedBy: string;
  modelUsed: string;
  executionTimeMs: number;
  diagramSvgKey?: string;
  customImageDataUri?: string;
}

export interface SampleDiagram {
  id: string;
  name: string;
  code: string;
  category: string;
  standard: StandardPreset;
  description: string;
  svgKey: string;
  sampleReport: QCReport;
}

export interface LLMConfig {
  provider: 'ollama' | 'huggingface' | 'builtin';
  endpoint: string;
  modelName: string;
  temperature: number;
  customPrompt: string;
}

export interface AuditRecord {
  id: string;
  diagramName: string;
  standard: StandardPreset;
  timestamp: string;
  overallResult: 'PASS' | 'FAIL';
  qualityScore: number;
  totalChecks: number;
  discrepanciesCount: number;
  operator: string;
  reviewedCount: number;
}
