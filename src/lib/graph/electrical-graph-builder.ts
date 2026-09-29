/**
 * SPANQC PRODUCTION ELECTRICAL GRAPH BUILDER
 * 
 * Orchestrates the conversion of a NormalizedDocument into a validated,
 * deterministic ElectricalGraph with cryptographic SHA-256 fingerprinting.
 * 
 * Invariants:
 * - 100% Deterministic: sorted keys, sorted entities, content-derived IDs
 * - Zero Template / Filename reliance
 * - Full Diagnostic Validation before downstream QC Engine
 */

import crypto from 'crypto';
import { NormalizedDocument } from '@/lib/extraction/extraction-models';
import {
  ElectricalGraph,
  GraphPageSummary,
  GraphDiagnostic,
  GraphWire,
  Point2D,
} from './electrical-graph-models';
import { detectComponentsAndTerminals } from './component-detector';
import { extractPageWires, buildNets } from './wire-connectivity-engine';

export const GRAPH_ALGORITHM_VERSION = '1.0.0';
export const EXTRACTION_VERSION = '1.0.0';

export interface BuildGraphOptions {
  documentId: string;
  versionId: string;
  tenantId: string;
}

/**
 * Builds an auditable, deterministic ElectricalGraph from a NormalizedDocument.
 */
export function buildElectricalGraph(
  doc: NormalizedDocument,
  options: BuildGraphOptions
): ElectricalGraph {
  const { documentId, versionId, tenantId } = options;

  // 1. Detect Components, Terminals, and Connectors
  const { components, terminals, connectors } = detectComponentsAndTerminals(doc);

  // 2. Extract Wires across all pages
  const allWires: GraphWire[] = [];
  const allCrossings: Array<{ wire1Id: string; wire2Id: string; pageNumber: number }> = [];
  const allExplicitJunctions: Array<{ wire1Id: string; wire2Id: string; point: Point2D; pageNumber: number }> = [];

  for (const page of doc.pages) {
    const { wires, crossingsWithoutJunction, explicitJunctions } = extractPageWires(page, terminals, doc.sha256);
    allWires.push(...wires);
    allCrossings.push(...crossingsWithoutJunction);
    if (explicitJunctions) {
      allExplicitJunctions.push(...explicitJunctions);
    }
  }

  // Sort wires deterministically
  allWires.sort((a, b) => a.id.localeCompare(b.id));

  // 3. Construct Electrical Nets
  const nets = buildNets(components, terminals, allWires, allExplicitJunctions);
  nets.sort((a, b) => a.id.localeCompare(b.id));

  // 4. Perform Graph Validation & Diagnostics
  const diagnostics = validateGraph({
    components,
    terminals,
    wires: allWires,
    crossings: allCrossings,
  });

  if (doc.pages.some((p) => p.source === 'ocr') && allWires.length === 0) {
    diagnostics.push({
      id: `diag-wire-unavail-${doc.sha256.slice(0, 8)}`,
      code: 'WIRE_GEOMETRY_UNAVAILABLE',
      severity: 'WARNING',
      message: 'Raster or scanned drawing contains no vector path geometry. Optical wire line tracing is not supported on raster images without computer-vision models.',
      entityId: doc.sha256.slice(0, 12),
      pageNumber: 1,
    });
  }

  diagnostics.sort((a, b) => a.id.localeCompare(b.id));

  // 5. Generate Page Summaries
  const pages: GraphPageSummary[] = doc.pages.map((p) => ({
    pageNumber: p.pageNumber,
    dimensions: { width: p.width, height: p.height },
    componentCount: components.filter((c) => c.pageNumber === p.pageNumber).length,
    terminalCount: terminals.filter((t) => t.pageNumber === p.pageNumber).length,
    wireCount: allWires.filter((w) => w.pageNumber === p.pageNumber).length,
  }));
  pages.sort((a, b) => a.pageNumber - b.pageNumber);

  // 6. Compute Canonical Graph Hash for Exact Reproducibility
  const canonicalData = {
    sourceSha256: doc.sha256,
    extractionVersion: EXTRACTION_VERSION,
    graphVersion: GRAPH_ALGORITHM_VERSION,
    pages,
    components: components.map((c) => ({
      id: c.id,
      type: c.type,
      label: c.label,
      value: c.value,
      pageNumber: c.pageNumber,
      terminalIds: c.terminalIds,
    })),
    terminals: terminals.map((t) => ({
      id: t.id,
      componentId: t.componentId,
      terminalName: t.terminalName,
      position: t.position,
      pageNumber: t.pageNumber,
    })),
    wires: allWires.map((w) => ({
      id: w.id,
      pageNumber: w.pageNumber,
      label: w.label,
      geometry: w.geometry,
      connectedTerminalIds: w.connectedTerminalIds,
    })),
    nets: nets.map((n) => ({
      id: n.id,
      name: n.name,
      voltageDomain: n.voltageDomain,
      memberTerminalIds: n.memberTerminalIds,
      memberComponentIds: n.memberComponentIds,
    })),
  };

  const graphSha256 = crypto
    .createHash('sha256')
    .update(JSON.stringify(canonicalData))
    .digest('hex');

  const graphId = `eg-${documentId}-${versionId}-${graphSha256.slice(0, 12)}`;

  return {
    graphId,
    documentId,
    versionId,
    tenantId,
    sourceSha256: doc.sha256,
    extractionVersion: EXTRACTION_VERSION,
    graphVersion: GRAPH_ALGORITHM_VERSION,
    graphSha256,
    createdAt: new Date().toISOString(),
    pages,
    components,
    terminals,
    wires: allWires,
    connectors,
    nets,
    diagnostics,
  };
}

/**
 * Validates graph structure and records diagnostic findings.
 */
function validateGraph(params: {
  components: any[];
  terminals: any[];
  wires: any[];
  crossings: any[];
}): GraphDiagnostic[] {
  const { components, terminals, wires, crossings } = params;
  const diagnostics: GraphDiagnostic[] = [];

  // Check 1: Dangling wire endpoints
  for (const wire of wires) {
    if (wire.connectedTerminalIds.length === 0) {
      diagnostics.push({
        id: `diag-dang-${wire.id}`,
        code: 'DANGLING_WIRE',
        severity: 'WARNING',
        message: `Wire ${wire.label || wire.id} has both endpoints disconnected from any terminal.`,
        entityId: wire.id,
        pageNumber: wire.pageNumber,
      });
    } else if (wire.connectedTerminalIds.length === 1) {
      diagnostics.push({
        id: `diag-dang-half-${wire.id}`,
        code: 'DANGLING_WIRE',
        severity: 'WARNING',
        message: `Wire ${wire.label || wire.id} has an unconnected floating endpoint.`,
        entityId: wire.id,
        pageNumber: wire.pageNumber,
      });
    }
  }

  // Check 2: Disconnected terminals
  const connectedTerminalIdSet = new Set<string>();
  for (const wire of wires) {
    for (const tid of wire.connectedTerminalIds) {
      connectedTerminalIdSet.add(tid);
    }
  }

  for (const term of terminals) {
    if (!connectedTerminalIdSet.has(term.id)) {
      diagnostics.push({
        id: `diag-term-disc-${term.id}`,
        code: 'DISCONNECTED_TERMINAL',
        severity: 'INFO',
        message: `Terminal ${term.terminalName} on component ${term.componentId} is unconnected.`,
        entityId: term.id,
        pageNumber: term.pageNumber,
      });
    }
  }

  // Check 3: Duplicate reference designators
  const refDesMap = new Map<string, string[]>();
  for (const comp of components) {
    const key = `${comp.pageNumber}:${comp.label}`;
    if (!refDesMap.has(key)) {
      refDesMap.set(key, []);
    }
    refDesMap.get(key)!.push(comp.id);
  }

  for (const [key, compIds] of refDesMap.entries()) {
    if (compIds.length > 1) {
      const [pageNum, label] = key.split(':');
      diagnostics.push({
        id: `diag-dup-ref-${compIds.join('-')}`,
        code: 'DUPLICATE_DESIGNATOR',
        severity: 'ERROR',
        message: `Duplicate component reference designator "${label}" detected ${compIds.length} times on page ${pageNum}.`,
        entityId: compIds[0],
        pageNumber: parseInt(pageNum, 10),
      });
    }
  }

  // Check 4: Unresolved symbols
  for (const comp of components) {
    if (comp.type === 'UNKNOWN_COMPONENT') {
      diagnostics.push({
        id: `diag-unresolved-${comp.id}`,
        code: 'UNRESOLVED_SYMBOL',
        severity: 'WARNING',
        message: `Unrecognized electrical symbol "${comp.label}" on page ${comp.pageNumber}.`,
        entityId: comp.id,
        pageNumber: comp.pageNumber,
        bbox: comp.bbox,
      });
    }
  }

  // Check 5: Crossing wire ambiguity without junctions
  for (const cross of crossings) {
    diagnostics.push({
      id: `diag-cross-${cross.wire1Id}-${cross.wire2Id}`,
      code: 'CROSSING_AMBIGUITY',
      severity: 'INFO',
      message: `Wires ${cross.wire1Id} and ${cross.wire2Id} intersect perpendicular without an explicit junction dot. Treated as crossing without connection.`,
      entityId: cross.wire1Id,
      pageNumber: cross.pageNumber,
    });
  }

  return diagnostics;
}
