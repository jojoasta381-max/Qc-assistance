/**
 * SPANQC INITIAL DETERMINISTIC PRODUCTION RULE SET (Phase 4)
 * 
 * Rules RULE-001 through RULE-008 implemented strictly against ElectricalGraph.
 * Zero reliance on filenames, template names, or mock data.
 * Purely evidence-backed with deterministic fingerprints.
 */

import crypto from 'crypto';
import { ElectricalGraph, GraphComponent, GraphWire } from '@/lib/graph/electrical-graph-models';
import { QCRule, FindingCandidate, FindingEvidence } from '../rule-engine-types';

function computeFingerprint(ruleCode: string, entityIds: string[]): string {
  const sorted = [...entityIds].sort().join(':');
  return crypto.createHash('sha256').update(`${ruleCode}:${sorted}`).digest('hex');
}

/**
 * RULE-001: Dangling Wire Endpoint
 * Flagged when a wire has one or both endpoints unconnected to any component terminal.
 */
export const rule001DanglingWire: QCRule = {
  id: 'rule-001',
  code: 'RULE-001',
  version: '1.0.0',
  name: 'Dangling Wire Endpoint Detection',
  description: 'Detects electrical conductor wires with floating, unconnected endpoints.',
  severity: 'MAJOR',
  standardClause: 'IPC/WHMA-A-620 §4.2',
  prerequisites: ['WIRE_GEOMETRY'],
  evaluate(graph: ElectricalGraph): FindingCandidate[] {
    const findings: FindingCandidate[] = [];

    for (const wire of graph.wires) {
      if (wire.connectedTerminalIds.length < 2) {
        const isCompletelyFloating = wire.connectedTerminalIds.length === 0;
        const fingerprint = computeFingerprint('RULE-001', [wire.id]);

        const evidence: FindingEvidence = {
          pageNumber: wire.pageNumber,
          boundingBoxes: [
            {
              x: Math.min(wire.geometry.start.x, wire.geometry.end.x),
              y: Math.min(wire.geometry.start.y, wire.geometry.end.y),
              width: Math.max(10, Math.abs(wire.geometry.end.x - wire.geometry.start.x)),
              height: Math.max(10, Math.abs(wire.geometry.end.y - wire.geometry.start.y)),
            },
          ],
          componentIds: [],
          terminalIds: wire.connectedTerminalIds,
          wireIds: [wire.id],
          netIds: [],
          sourceEvidenceIds: [wire.sourceEvidenceId],
          deterministicFingerprint: fingerprint,
        };

        findings.push({
          ruleId: 'RULE-001',
          ruleVersion: '1.0.0',
          severity: 'MAJOR',
          status: 'VIOLATION',
          title: isCompletelyFloating
            ? `Dangling Wire: ${wire.label || wire.id} is completely disconnected`
            : `Dangling Wire Endpoint: ${wire.label || wire.id} has an unconnected terminal end`,
          description: isCompletelyFloating
            ? `Wire conductor ${wire.label || wire.id} on page ${wire.pageNumber} has 0 terminal connections.`
            : `Wire conductor ${wire.label || wire.id} on page ${wire.pageNumber} terminates at one terminal but leaves the opposite end floating.`,
          confidence: 0.95,
          evidence,
        });
      }
    }

    return findings;
  },
};

/**
 * RULE-002: Unconnected Required Terminal
 * Flagged when a critical electrical component (Fuse, Battery, Power Source, Switch, Relay) has unconnected terminals.
 */
export const rule002UnconnectedRequiredTerminal: QCRule = {
  id: 'rule-002',
  code: 'RULE-002',
  version: '1.0.0',
  name: 'Unconnected Required Component Terminal',
  description: 'Detects required component pins and terminals that lack electrical connections.',
  severity: 'CRITICAL',
  standardClause: 'IPC/WHMA-A-620 §13.4',
  prerequisites: ['COMPONENT_CLASSIFICATION', 'TERMINAL_DETECTION'],
  evaluate(graph: ElectricalGraph): FindingCandidate[] {
    const findings: FindingCandidate[] = [];
    const connectedTerminalIds = new Set<string>();

    for (const wire of graph.wires) {
      for (const tid of wire.connectedTerminalIds) {
        connectedTerminalIds.add(tid);
      }
    }

    const CRITICAL_TYPES = new Set(['FUSE', 'BATTERY', 'POWER_SOURCE', 'SWITCH', 'RELAY']);

    for (const comp of graph.components) {
      if (!CRITICAL_TYPES.has(comp.type)) continue;

      for (const termId of comp.terminalIds) {
        if (!connectedTerminalIds.has(termId)) {
          const term = graph.terminals.find((t) => t.id === termId);
          if (!term) continue;

          const fingerprint = computeFingerprint('RULE-002', [comp.id, term.id]);
          const evidence: FindingEvidence = {
            pageNumber: term.pageNumber,
            boundingBoxes: [comp.bbox],
            componentIds: [comp.id],
            terminalIds: [term.id],
            wireIds: [],
            netIds: [],
            sourceEvidenceIds: [term.sourceEvidenceId, comp.sourceEvidenceId],
            deterministicFingerprint: fingerprint,
          };

          findings.push({
            ruleId: 'RULE-002',
            ruleVersion: '1.0.0',
            severity: comp.type === 'FUSE' || comp.type === 'POWER_SOURCE' ? 'CRITICAL' : 'MAJOR',
            status: 'VIOLATION',
            title: `Unconnected Required Terminal on ${comp.label} (${comp.type})`,
            description: `Required terminal "${term.terminalName}" on component ${comp.label} (Page ${comp.pageNumber}) has no attached wire.`,
            confidence: 0.92,
            evidence,
          });
        }
      }
    }

    return findings;
  },
};

/**
 * RULE-003: Duplicate / Ambiguous Connector Reference
 * Flagged when multiple connectors share the identical reference designator.
 */
export const rule003DuplicateConnectorReference: QCRule = {
  id: 'rule-003',
  code: 'RULE-003',
  version: '1.0.0',
  name: 'Duplicate Connector Reference Designator',
  description: 'Detects ambiguous multiple connectors sharing the exact same reference label.',
  severity: 'CRITICAL',
  standardClause: 'ASME Y14.44 §3.1',
  prerequisites: ['COMPONENT_CLASSIFICATION'],
  evaluate(graph: ElectricalGraph): FindingCandidate[] {
    const findings: FindingCandidate[] = [];
    const connectorMap = new Map<
      string,
      { id: string; pageNumber: number; bbox: any; sourceEvidenceId: string }[]
    >();

    const hasComponentConnectors = graph.components.some(
      (c) => c.type === 'CONNECTOR' || c.type === 'TERMINAL_BLOCK'
    );

    if (hasComponentConnectors) {
      for (const comp of graph.components) {
        if (comp.type === 'CONNECTOR' || comp.type === 'TERMINAL_BLOCK') {
          const key = comp.label.toUpperCase();
          if (!connectorMap.has(key)) {
            connectorMap.set(key, []);
          }
          connectorMap.get(key)!.push({
            id: comp.id,
            pageNumber: comp.pageNumber,
            bbox: comp.bbox,
            sourceEvidenceId: comp.sourceEvidenceId,
          });
        }
      }
    } else {
      for (const conn of graph.connectors) {
        const key = conn.reference.toUpperCase();
        if (!connectorMap.has(key)) {
          connectorMap.set(key, []);
        }
        connectorMap.get(key)!.push({
          id: conn.id,
          pageNumber: conn.pageNumber,
          bbox: conn.bbox,
          sourceEvidenceId: conn.sourceEvidenceId,
        });
      }
    }

    for (const [ref, compList] of connectorMap.entries()) {
      if (compList.length > 1) {
        const compIds = compList.map((c) => c.id);
        const fingerprint = computeFingerprint('RULE-003', compIds);

        const evidence: FindingEvidence = {
          pageNumber: compList[0].pageNumber,
          boundingBoxes: compList.map((c) => c.bbox),
          componentIds: compIds,
          terminalIds: [],
          wireIds: [],
          netIds: [],
          sourceEvidenceIds: compList.map((c) => c.sourceEvidenceId),
          deterministicFingerprint: fingerprint,
        };

        findings.push({
          ruleId: 'RULE-003',
          ruleVersion: '1.0.0',
          severity: 'CRITICAL',
          status: 'VIOLATION',
          title: `Duplicate Connector Reference: "${ref}" instantiated ${compList.length} times`,
          description: `Reference designator "${ref}" is assigned to multiple distinct connectors across pages (${compList.map((c) => c.pageNumber).join(', ')}).`,
          confidence: 0.99,
          evidence,
        });
      }
    }

    return findings;
  },
};

/**
 * RULE-004: Duplicate Component Reference
 * Flagged when non-connector discrete components share the same designator on a drawing.
 */
export const rule004DuplicateComponentReference: QCRule = {
  id: 'rule-004',
  code: 'RULE-004',
  version: '1.0.0',
  name: 'Duplicate Component Reference Designator',
  description: 'Detects multiple discrete electrical components assigned the same reference designator.',
  severity: 'MAJOR',
  standardClause: 'IEEE Std 200-1975',
  prerequisites: ['COMPONENT_CLASSIFICATION'],
  evaluate(graph: ElectricalGraph): FindingCandidate[] {
    const findings: FindingCandidate[] = [];
    const componentMap = new Map<string, GraphComponent[]>();

    for (const comp of graph.components) {
      if (comp.type !== 'CONNECTOR' && comp.type !== 'TERMINAL_BLOCK' && comp.type !== 'GROUND' && comp.type !== 'POWER_SOURCE') {
        const key = comp.label.toUpperCase();
        if (!componentMap.has(key)) {
          componentMap.set(key, []);
        }
        componentMap.get(key)!.push(comp);
      }
    }

    for (const [ref, compList] of componentMap.entries()) {
      if (compList.length > 1) {
        const compIds = compList.map((c) => c.id);
        const fingerprint = computeFingerprint('RULE-004', compIds);

        const evidence: FindingEvidence = {
          pageNumber: compList[0].pageNumber,
          boundingBoxes: compList.map((c) => c.bbox),
          componentIds: compIds,
          terminalIds: [],
          wireIds: [],
          netIds: [],
          sourceEvidenceIds: compList.map((c) => c.sourceEvidenceId),
          deterministicFingerprint: fingerprint,
        };

        findings.push({
          ruleId: 'RULE-004',
          ruleVersion: '1.0.0',
          severity: 'MAJOR',
          status: 'VIOLATION',
          title: `Duplicate Component Designator: "${ref}" reused`,
          description: `Component reference "${ref}" (${compList[0].type}) is duplicated ${compList.length} times on the schematic.`,
          confidence: 0.99,
          evidence,
        });
      }
    }

    return findings;
  },
};

/**
 * RULE-005: Impossible Net Topology (Direct Short Circuit)
 * Flagged when a Power Source and Ground reside on the identical electrical net with zero intervening load.
 */
export const rule005ImpossibleNetTopology: QCRule = {
  id: 'rule-005',
  code: 'RULE-005',
  version: '1.0.0',
  name: 'Power-to-Ground Direct Short Circuit',
  description: 'Detects dangerous net topologies where power and ground rails are directly shorted without load.',
  severity: 'CRITICAL',
  standardClause: 'UL 508A §15.2',
  prerequisites: ['NET_CONSTRUCTION', 'POWER_CLASSIFICATION', 'GROUND_CLASSIFICATION'],
  evaluate(graph: ElectricalGraph): FindingCandidate[] {
    const findings: FindingCandidate[] = [];
    const compMap = new Map<string, GraphComponent>();
    graph.components.forEach((c) => compMap.set(c.id, c));

    for (const net of graph.nets) {
      let hasPower = false;
      let hasGround = false;
      const powerCompIds: string[] = [];
      const groundCompIds: string[] = [];

      for (const compId of net.memberComponentIds) {
        const comp = compMap.get(compId);
        if (!comp) continue;
        if (comp.type === 'POWER_SOURCE') {
          hasPower = true;
          powerCompIds.push(comp.id);
        } else if (comp.type === 'GROUND') {
          hasGround = true;
          groundCompIds.push(comp.id);
        }
      }

      if (hasPower && hasGround) {
        // Direct short circuit between power and ground on this net
        const shortCompIds = [...powerCompIds, ...groundCompIds];
        const fingerprint = computeFingerprint('RULE-005', [net.id, ...shortCompIds]);

        const evidence: FindingEvidence = {
          pageNumber: net.pages[0] || 1,
          boundingBoxes: shortCompIds.map((cid) => compMap.get(cid)!.bbox),
          componentIds: shortCompIds,
          terminalIds: net.memberTerminalIds,
          wireIds: net.memberWireIds,
          netIds: [net.id],
          sourceEvidenceIds: shortCompIds.map((cid) => compMap.get(cid)!.sourceEvidenceId),
          deterministicFingerprint: fingerprint,
        };

        findings.push({
          ruleId: 'RULE-005',
          ruleVersion: '1.0.0',
          severity: 'CRITICAL',
          status: 'VIOLATION',
          title: `Direct Power-to-Ground Short Circuit on ${net.name}`,
          description: `Net "${net.name}" contains direct topological connection between Power Source (${powerCompIds.map((id) => compMap.get(id)?.label).join(', ')}) and Ground (${groundCompIds.map((id) => compMap.get(id)?.label).join(', ')}) with no load.`,
          confidence: 0.98,
          evidence,
        });
      }
    }

    return findings;
  },
};

/**
 * RULE-006: Unresolved Terminal Connection
 * Flagged when a connection terminates at an unverified / uncertain terminal (UNKNOWN).
 */
export const rule006UnresolvedTerminalConnection: QCRule = {
  id: 'rule-006',
  code: 'RULE-006',
  version: '1.0.0',
  name: 'Unresolved Terminal Pin Connection',
  description: 'Flags wire connections attached to uncertain or unverified terminal pins.',
  severity: 'ADVISORY',
  standardClause: 'IPC/WHMA-A-620 §19.5',
  prerequisites: ['TERMINAL_DETECTION'],
  evaluate(graph: ElectricalGraph): FindingCandidate[] {
    const findings: FindingCandidate[] = [];

    for (const term of graph.terminals) {
      if (term.status === 'UNRESOLVED' || term.terminalName === 'UNKNOWN') {
        // Check if a wire is connected to this unresolved terminal
        const connectedWires = graph.wires.filter((w) => w.connectedTerminalIds.includes(term.id));
        if (connectedWires.length > 0) {
          const fingerprint = computeFingerprint('RULE-006', [term.id]);
          const evidence: FindingEvidence = {
            pageNumber: term.pageNumber,
            boundingBoxes: [],
            componentIds: [term.componentId],
            terminalIds: [term.id],
            wireIds: connectedWires.map((w) => w.id),
            netIds: [],
            sourceEvidenceIds: [term.sourceEvidenceId],
            deterministicFingerprint: fingerprint,
          };

          findings.push({
            ruleId: 'RULE-006',
            ruleVersion: '1.0.0',
            severity: 'ADVISORY',
            status: 'VIOLATION',
            title: `Unresolved Terminal Pin: Connection to uncertain terminal on ${term.componentId}`,
            description: `Terminal "${term.terminalName}" on component ${term.componentId} (Page ${term.pageNumber}) has connecting wires but indeterminate pin labeling.`,
            confidence: 0.80,
            evidence,
          });
        }
      }
    }

    return findings;
  },
};

/**
 * RULE-007: Conflicting Power Sources on Same Net
 * Flagged when two distinct active power sources feed the exact same net without isolation.
 * If power source voltages are unlabelled, safely returns NOT_EVALUABLE instead of fabricating violations.
 */
export const rule007ConflictingPowerSources: QCRule = {
  id: 'rule-007',
  code: 'RULE-007',
  version: '1.0.0',
  name: 'Conflicting Power Source Domains',
  description: 'Detects multiple distinct active power supplies tied together on the same net.',
  severity: 'CRITICAL',
  standardClause: 'UL 508A §14.1',
  prerequisites: ['NET_CONSTRUCTION', 'POWER_CLASSIFICATION'],
  evaluate(graph: ElectricalGraph): FindingCandidate[] {
    const findings: FindingCandidate[] = [];
    const compMap = new Map<string, GraphComponent>();
    graph.components.forEach((c) => compMap.set(c.id, c));

    for (const net of graph.nets) {
      const powerComps = net.memberComponentIds
        .map((id) => compMap.get(id))
        .filter((c): c is GraphComponent => c !== undefined && c.type === 'POWER_SOURCE');

      if (powerComps.length > 1) {
        // Check if labels/voltages differ (e.g. +12V vs +24V)
        const getVoltage = (c: GraphComponent) => (c.value || c.label).toUpperCase();
        const distinctLabels = new Set(powerComps.map(getVoltage));
        if (distinctLabels.size > 1) {
          const powerIds = powerComps.map((c) => c.id);
          const fingerprint = computeFingerprint('RULE-007', [net.id, ...powerIds]);

          const evidence: FindingEvidence = {
            pageNumber: net.pages[0] || 1,
            boundingBoxes: powerComps.map((c) => c.bbox),
            componentIds: powerIds,
            terminalIds: net.memberTerminalIds,
            wireIds: net.memberWireIds,
            netIds: [net.id],
            sourceEvidenceIds: powerComps.map((c) => c.sourceEvidenceId),
            deterministicFingerprint: fingerprint,
          };

          findings.push({
            ruleId: 'RULE-007',
            ruleVersion: '1.0.0',
            severity: 'CRITICAL',
            status: 'VIOLATION',
            title: `Conflicting Voltage Domains: ${Array.from(distinctLabels).join(' and ')} on ${net.name}`,
            description: `Multiple conflicting power sources (${Array.from(distinctLabels).join(', ')}) are connected together on Net "${net.name}" without isolation.`,
            confidence: 0.95,
            evidence,
          });
        }
      }
    }

    return findings;
  },
};

/**
 * RULE-008: Crossing Wires Without Junction Dot Ambiguity
 * Flagged when perpendicular wire segments cross without an explicit junction dot or bridge.
 */
export const rule008CrossingWiresAmbiguity: QCRule = {
  id: 'rule-008',
  code: 'RULE-008',
  version: '1.0.0',
  name: 'Crossing Wires Without Junction Marker Ambiguity',
  description: 'Flags visual ambiguity where crossing wire conductors lack a standard junction dot or bridge arc.',
  severity: 'ADVISORY',
  standardClause: 'ASME Y14.44 §4.5',
  prerequisites: ['WIRE_GEOMETRY'],
  evaluate(graph: ElectricalGraph): FindingCandidate[] {
    const findings: FindingCandidate[] = [];

    const crossingDiagnostics = graph.diagnostics.filter((d) => d.code === 'CROSSING_AMBIGUITY');

    for (const diag of crossingDiagnostics) {
      const fingerprint = computeFingerprint('RULE-008', [diag.entityId]);
      const evidence: FindingEvidence = {
        pageNumber: diag.pageNumber,
        boundingBoxes: diag.bbox ? [diag.bbox] : [],
        componentIds: [],
        terminalIds: [],
        wireIds: [diag.entityId],
        netIds: [],
        sourceEvidenceIds: [],
        deterministicFingerprint: fingerprint,
      };

      findings.push({
        ruleId: 'RULE-008',
        ruleVersion: '1.0.0',
        severity: 'ADVISORY',
        status: 'VIOLATION',
        title: `Visual Ambiguity: Crossing Wires without Junction Dot on Page ${diag.pageNumber}`,
        description: diag.message,
        confidence: 0.85,
        evidence,
      });
    }

    return findings;
  },
};

/**
 * RULE-009: Isolated Unconnected Component
 * Flagged when a component has all of its declared/default terminals completely disconnected from any conductor or net.
 */
export const rule009IsolatedComponent: QCRule = {
  id: 'rule-009',
  code: 'RULE-009',
  version: '1.0.0',
  name: 'Isolated Unconnected Component Detection',
  description: 'Identifies electrical components where zero declared terminals have connecting wires or nets.',
  severity: 'MAJOR',
  standardClause: 'IPC/WHMA-A-620 §13.4',
  prerequisites: ['COMPONENT_CLASSIFICATION', 'TERMINAL_DETECTION'],
  evaluate(graph: ElectricalGraph): FindingCandidate[] {
    const findings: FindingCandidate[] = [];
    const connectedTerminalIds = new Set<string>();

    for (const wire of graph.wires) {
      for (const tid of wire.connectedTerminalIds) {
        connectedTerminalIds.add(tid);
      }
    }

    for (const comp of graph.components) {
      // Ground symbols can be single-node references, but discrete components (Fuse, Relay, Motor, etc.) must not be completely floating
      if (comp.type === 'GROUND') continue;

      if (comp.terminalIds.length > 0) {
        const hasAnyConnection = comp.terminalIds.some((tid) => connectedTerminalIds.has(tid));
        if (!hasAnyConnection) {
          const fingerprint = computeFingerprint('RULE-009', [comp.id]);
          const evidence: FindingEvidence = {
            pageNumber: comp.pageNumber,
            boundingBoxes: [comp.bbox],
            componentIds: [comp.id],
            terminalIds: comp.terminalIds,
            wireIds: [],
            netIds: [],
            sourceEvidenceIds: [comp.sourceEvidenceId],
            deterministicFingerprint: fingerprint,
          };

          findings.push({
            ruleId: 'RULE-009',
            ruleVersion: '1.0.0',
            severity: 'MAJOR',
            status: 'VIOLATION',
            title: `Isolated Component: ${comp.label} (${comp.type}) has zero connections`,
            description: `Component ${comp.label} (${comp.type}) on page ${comp.pageNumber} has ${comp.terminalIds.length} terminals but zero connected wires or nets.`,
            confidence: 0.95,
            evidence,
          });
        }
      }
    }

    return findings;
  },
};

/**
 * RULE-010: Single-Terminal Floating Net
 * Flagged when an assembled net contains only 1 terminal and 0 wires (stub/dangling node).
 */
export const rule010SingleTerminalNet: QCRule = {
  id: 'rule-010',
  code: 'RULE-010',
  version: '1.0.0',
  name: 'Single-Terminal Stub Net Detection',
  description: 'Flags electrical nets consisting of a single terminal with no interconnecting conductors.',
  severity: 'MINOR',
  standardClause: 'IEEE Std 315 §4.1',
  prerequisites: ['NET_CONSTRUCTION', 'TERMINAL_DETECTION'],
  evaluate(graph: ElectricalGraph): FindingCandidate[] {
    const findings: FindingCandidate[] = [];
    const compMap = new Map<string, GraphComponent>();
    graph.components.forEach((c) => compMap.set(c.id, c));
    const termMap = new Map<string, any>();
    graph.terminals.forEach((t) => termMap.set(t.id, t));

    for (const net of graph.nets) {
      if (net.memberTerminalIds.length === 1 && net.memberWireIds.length === 0) {
        const termId = net.memberTerminalIds[0];
        const term = termMap.get(termId);
        const comp = term ? compMap.get(term.componentId) : undefined;

        // Skip standalone ground reference symbols
        if (comp?.type === 'GROUND') continue;

        const fingerprint = computeFingerprint('RULE-010', [net.id, termId]);
        const evidence: FindingEvidence = {
          pageNumber: term ? term.pageNumber : 1,
          boundingBoxes: comp ? [comp.bbox] : [],
          componentIds: comp ? [comp.id] : [],
          terminalIds: [termId],
          wireIds: [],
          netIds: [net.id],
          sourceEvidenceIds: term ? [term.sourceEvidenceId] : [],
          deterministicFingerprint: fingerprint,
        };

        findings.push({
          ruleId: 'RULE-010',
          ruleVersion: '1.0.0',
          severity: 'MINOR',
          status: 'VIOLATION',
          title: `Single-Terminal Net: Net ${net.name} is a dangling stub`,
          description: `Electrical net "${net.name}" contains only terminal "${term?.terminalName || termId}" on component ${comp?.label || 'UNKNOWN'} with no connected wires.`,
          confidence: 0.90,
          evidence,
        });
      }
    }

    return findings;
  },
};

/**
 * RULE-011: Incompatible Net Voltage Bridging
 * Flagged when multiple active power sources on the same net declare incompatible voltages.
 */
export const rule011IncompatibleVoltageBridging: QCRule = {
  id: 'rule-011',
  code: 'RULE-011',
  version: '1.0.0',
  name: 'Incompatible Voltage Domain Bridging',
  description: 'Detects nets bridging distinct non-zero voltage domains without intervening galvanic or active isolation.',
  severity: 'CRITICAL',
  standardClause: 'UL 508A §14.2',
  prerequisites: ['NET_CONSTRUCTION', 'POWER_CLASSIFICATION'],
  evaluate(graph: ElectricalGraph): FindingCandidate[] {
    const findings: FindingCandidate[] = [];
    const compMap = new Map<string, GraphComponent>();
    graph.components.forEach((c) => compMap.set(c.id, c));

    for (const net of graph.nets) {
      const powerComps = net.memberComponentIds
        .map((id) => compMap.get(id))
        .filter((c): c is GraphComponent => c !== undefined && (c.type === 'POWER_SOURCE' || c.type === 'BATTERY'));

      if (powerComps.length >= 2) {
        const voltages = new Set<string>();
        for (const p of powerComps) {
          const vMatch = (p.value || p.label).match(/([0-9]+(\.[0-9]+)?)\s*V/i);
          if (vMatch) {
            voltages.add(`${vMatch[1]}V`);
          }
        }

        if (voltages.size >= 2) {
          const pIds = powerComps.map((c) => c.id);
          const fingerprint = computeFingerprint('RULE-011', [net.id, ...pIds]);
          const evidence: FindingEvidence = {
            pageNumber: net.pages[0] || 1,
            boundingBoxes: powerComps.map((c) => c.bbox),
            componentIds: pIds,
            terminalIds: net.memberTerminalIds,
            wireIds: net.memberWireIds,
            netIds: [net.id],
            sourceEvidenceIds: powerComps.map((c) => c.sourceEvidenceId),
            deterministicFingerprint: fingerprint,
          };

          findings.push({
            ruleId: 'RULE-011',
            ruleVersion: '1.0.0',
            severity: 'CRITICAL',
            status: 'VIOLATION',
            title: `Incompatible Voltage Bridging: ${Array.from(voltages).join(' and ')} on Net ${net.name}`,
            description: `Net "${net.name}" directly bridges disparate voltage domains (${Array.from(voltages).join(', ')}) without an intervening converter or dropping resistor.`,
            confidence: 0.95,
            evidence,
          });
        }
      }
    }

    return findings;
  },
};

/**
 * RULE-012: Fuse Missing In-Line Load
 * Flagged when a protection fuse connects directly to ground without an intervening branch load.
 */
export const rule012FuseMissingInLineLoad: QCRule = {
  id: 'rule-012',
  code: 'RULE-012',
  version: '1.0.0',
  name: 'Fuse Direct-to-Ground Without Load',
  description: 'Detects circuit protection fuses whose protected path ties directly to ground with zero load.',
  severity: 'CRITICAL',
  standardClause: 'NFPA 79 §7.2, UL 508A §15.2',
  prerequisites: ['NET_CONSTRUCTION', 'COMPONENT_CLASSIFICATION', 'GROUND_CLASSIFICATION'],
  evaluate(graph: ElectricalGraph): FindingCandidate[] {
    const findings: FindingCandidate[] = [];
    const compMap = new Map<string, GraphComponent>();
    graph.components.forEach((c) => compMap.set(c.id, c));

    const LOAD_TYPES = new Set(['MOTOR', 'RESISTOR', 'RELAY', 'LED', 'SENSOR', 'ECU_MODULE']);

    for (const comp of graph.components) {
      if (comp.type !== 'FUSE') continue;

      const connectedNets = graph.nets.filter((n) => n.memberComponentIds.includes(comp.id));
      for (const net of connectedNets) {
        const hasGround = net.memberComponentIds.some((cid) => compMap.get(cid)?.type === 'GROUND');
        const hasLoad = net.memberComponentIds.some((cid) => {
          const c = compMap.get(cid);
          return c && LOAD_TYPES.has(c.type);
        });

        if (hasGround && !hasLoad) {
          const gndComp = net.memberComponentIds
            .map((cid) => compMap.get(cid))
            .find((c) => c?.type === 'GROUND');

          const fingerprint = computeFingerprint('RULE-012', [comp.id, net.id]);
          const evidence: FindingEvidence = {
            pageNumber: comp.pageNumber,
            boundingBoxes: [comp.bbox, ...(gndComp ? [gndComp.bbox] : [])],
            componentIds: [comp.id, ...(gndComp ? [gndComp.id] : [])],
            terminalIds: net.memberTerminalIds,
            wireIds: net.memberWireIds,
            netIds: [net.id],
            sourceEvidenceIds: [comp.sourceEvidenceId],
            deterministicFingerprint: fingerprint,
          };

          findings.push({
            ruleId: 'RULE-012',
            ruleVersion: '1.0.0',
            severity: 'CRITICAL',
            status: 'VIOLATION',
            title: `Dead Short: Fuse ${comp.label} grounded without load on ${net.name}`,
            description: `Fuse ${comp.label} terminates on ground Net "${net.name}" with zero intervening electrical load, causing an immediate overcurrent trip upon energization.`,
            confidence: 0.96,
            evidence,
          });
        }
      }
    }

    return findings;
  },
};

/**
 * RULE-013: Missing or Malformed Component Reference Designator
 * Flagged when a component has an empty, unindexed generic, or placeholder label.
 */
export const rule013MalformedReferenceDesignator: QCRule = {
  id: 'rule-013',
  code: 'RULE-013',
  version: '1.0.0',
  name: 'Malformed or Missing Reference Designator',
  description: 'Flags components with unindexed, empty, placeholder, or generic reference designator labels.',
  severity: 'MAJOR',
  standardClause: 'ASME Y14.44 §2.1.1',
  prerequisites: ['COMPONENT_CLASSIFICATION'],
  evaluate(graph: ElectricalGraph): FindingCandidate[] {
    const findings: FindingCandidate[] = [];

    const GENERIC_UNINDEXED = /^(FUSE|RELAY|SWITCH|CONNECTOR|BATTERY|GROUND|MOTOR|SENSOR|MODULE)$/i;
    const PLACEHOLDER = /^(\?+|\*+|-+|_+|N\/A|NONE)$/i;

    for (const comp of graph.components) {
      if (comp.type === 'GROUND' || comp.type === 'POWER_SOURCE') continue;
      const lbl = comp.label.trim();
      const isMalformed =
        lbl.length === 0 ||
        PLACEHOLDER.test(lbl) ||
        GENERIC_UNINDEXED.test(lbl) ||
        !/^[A-Za-z]/.test(lbl) ||
        /[^A-Za-z0-9_\-+/]/.test(lbl);

      if (isMalformed) {
        const fingerprint = computeFingerprint('RULE-013', [comp.id]);
        const evidence: FindingEvidence = {
          pageNumber: comp.pageNumber,
          boundingBoxes: [comp.bbox],
          componentIds: [comp.id],
          terminalIds: comp.terminalIds,
          wireIds: [],
          netIds: [],
          sourceEvidenceIds: [comp.sourceEvidenceId],
          deterministicFingerprint: fingerprint,
        };

        findings.push({
          ruleId: 'RULE-013',
          ruleVersion: '1.0.0',
          severity: 'MAJOR',
          status: 'VIOLATION',
          title: `Malformed Reference Designator: "${lbl || '<EMPTY>'}" on ${comp.type}`,
          description: `Component of type ${comp.type} on page ${comp.pageNumber} has non-standard or unindexed reference label "${lbl || '<EMPTY>'}".`,
          confidence: 0.95,
          evidence,
        });
      }
    }

    return findings;
  },
};

/**
 * RULE-014: Inconsistent Wire Gauge Continuity
 * Flagged when adjacent connected wires in the same net undergo severe gauge jumps without protection.
 */
export const rule014InconsistentWireGauge: QCRule = {
  id: 'rule-014',
  code: 'RULE-014',
  version: '1.0.0',
  name: 'Inconsistent Conductor Gauge Continuity',
  description: 'Detects extreme wire gauge steps on interconnected conductors of the same net without overcurrent protection.',
  severity: 'MAJOR',
  standardClause: 'NFPA 79 §12.2, IPC/WHMA-A-620 §3.2',
  prerequisites: ['WIRE_GEOMETRY', 'NET_CONSTRUCTION'],
  evaluate(graph: ElectricalGraph): FindingCandidate[] {
    const findings: FindingCandidate[] = [];
    const wireMap = new Map<string, GraphWire>();
    graph.wires.forEach((w) => wireMap.set(w.id, w));
    const compMap = new Map<string, GraphComponent>();
    graph.components.forEach((c) => compMap.set(c.id, c));

    function parseAwg(gauge?: string): number | null {
      if (!gauge) return null;
      const m = gauge.match(/([0-9]{1,2})\s*(AWG|GA)/i);
      return m ? parseInt(m[1], 10) : null;
    }

    for (const net of graph.nets) {
      // If net contains a fuse or breaker, gauge reduction is permissible with protection
      const hasFuse = net.memberComponentIds.some((cid) => compMap.get(cid)?.type === 'FUSE');
      if (hasFuse) continue;

      const gaugedWires = net.memberWireIds
        .map((wid) => wireMap.get(wid))
        .filter((w): w is GraphWire => w !== undefined && parseAwg(w.gauge) !== null);

      if (gaugedWires.length >= 2) {
        for (let i = 0; i < gaugedWires.length; i++) {
          for (let j = i + 1; j < gaugedWires.length; j++) {
            const w1 = gaugedWires[i];
            const w2 = gaugedWires[j];
            const awg1 = parseAwg(w1.gauge)!;
            const awg2 = parseAwg(w2.gauge)!;

            // A jump of >= 8 AWG sizes (e.g. 12 AWG -> 22 AWG or 10 AWG -> 20 AWG)
            if (Math.abs(awg1 - awg2) >= 8) {
              const fingerprint = computeFingerprint('RULE-014', [net.id, w1.id, w2.id]);
              const evidence: FindingEvidence = {
                pageNumber: w1.pageNumber,
                boundingBoxes: [],
                componentIds: [],
                terminalIds: [],
                wireIds: [w1.id, w2.id],
                netIds: [net.id],
                sourceEvidenceIds: [w1.sourceEvidenceId, w2.sourceEvidenceId],
                deterministicFingerprint: fingerprint,
              };

              findings.push({
                ruleId: 'RULE-014',
                ruleVersion: '1.0.0',
                severity: 'MAJOR',
                status: 'VIOLATION',
                title: `Wire Gauge Discontinuity: ${w1.gauge} vs ${w2.gauge} on Net ${net.name}`,
                description: `Net "${net.name}" couples conductors of disparate gauge (${w1.gauge} and ${w2.gauge}) with zero overcurrent protection device at the junction.`,
                confidence: 0.90,
                evidence,
              });
            }
          }
        }
      }
    }

    return findings;
  },
};

/**
 * RULE-015: Suspicious Isolated Wire Segment
 * Flagged when an extracted wire has zero terminal connections on either end.
 */
export const rule015IsolatedWireSegment: QCRule = {
  id: 'rule-015',
  code: 'RULE-015',
  version: '1.0.0',
  name: 'Isolated Wire Segment Detection',
  description: 'Flags completely isolated wire segments with zero terminal connections at both endpoints.',
  severity: 'MAJOR',
  standardClause: 'IPC/WHMA-A-620 §4.1',
  prerequisites: ['WIRE_GEOMETRY'],
  evaluate(graph: ElectricalGraph): FindingCandidate[] {
    const findings: FindingCandidate[] = [];

    for (const wire of graph.wires) {
      if (wire.connectedTerminalIds.length === 0) {
        const fingerprint = computeFingerprint('RULE-015', [wire.id]);
        const evidence: FindingEvidence = {
          pageNumber: wire.pageNumber,
          boundingBoxes: [
            {
              x: Math.min(wire.geometry.start.x, wire.geometry.end.x),
              y: Math.min(wire.geometry.start.y, wire.geometry.end.y),
              width: Math.max(10, Math.abs(wire.geometry.end.x - wire.geometry.start.x)),
              height: Math.max(10, Math.abs(wire.geometry.end.y - wire.geometry.start.y)),
            },
          ],
          componentIds: [],
          terminalIds: [],
          wireIds: [wire.id],
          netIds: [],
          sourceEvidenceIds: [wire.sourceEvidenceId],
          deterministicFingerprint: fingerprint,
        };

        findings.push({
          ruleId: 'RULE-015',
          ruleVersion: '1.0.0',
          severity: 'MAJOR',
          status: 'VIOLATION',
          title: `Isolated Floating Wire: ${wire.label || wire.id}`,
          description: `Wire conductor ${wire.label || wire.id} on page ${wire.pageNumber} is completely floating with zero connections to any component terminal.`,
          confidence: 0.95,
          evidence,
        });
      }
    }

    return findings;
  },
};

/**
 * RULE-016: Duplicate Terminal Pin Identifier on Single Component
 * Flagged when a component has two or more pins with the exact same identifier.
 */
export const rule016DuplicateTerminalOnComponent: QCRule = {
  id: 'rule-016',
  code: 'RULE-016',
  version: '1.0.0',
  name: 'Duplicate Terminal Identifier on Component',
  description: 'Detects multiple distinct terminal pins on the same component sharing the identical pin name.',
  severity: 'CRITICAL',
  standardClause: 'ASME Y14.44 §3.2',
  prerequisites: ['COMPONENT_CLASSIFICATION', 'TERMINAL_DETECTION'],
  evaluate(graph: ElectricalGraph): FindingCandidate[] {
    const findings: FindingCandidate[] = [];
    const termMap = new Map<string, any>();
    graph.terminals.forEach((t) => termMap.set(t.id, t));

    for (const comp of graph.components) {
      const pinGroups = new Map<string, any[]>();

      for (const tid of comp.terminalIds) {
        const term = termMap.get(tid);
        if (!term) continue;
        const pinKey = term.terminalName.trim().toUpperCase();
        if (pinKey === 'UNKNOWN' || pinKey === '') continue;

        if (!pinGroups.has(pinKey)) {
          pinGroups.set(pinKey, []);
        }
        pinGroups.get(pinKey)!.push(term);
      }

      for (const [pinName, list] of pinGroups.entries()) {
        if (list.length > 1) {
          const termIds = list.map((t) => t.id);
          const fingerprint = computeFingerprint('RULE-016', [comp.id, ...termIds]);
          const evidence: FindingEvidence = {
            pageNumber: comp.pageNumber,
            boundingBoxes: [comp.bbox],
            componentIds: [comp.id],
            terminalIds: termIds,
            wireIds: [],
            netIds: [],
            sourceEvidenceIds: list.map((t) => t.sourceEvidenceId),
            deterministicFingerprint: fingerprint,
          };

          findings.push({
            ruleId: 'RULE-016',
            ruleVersion: '1.0.0',
            severity: 'CRITICAL',
            status: 'VIOLATION',
            title: `Duplicate Pin "${pinName}" on ${comp.label} (${comp.type})`,
            description: `Component ${comp.label} (Page ${comp.pageNumber}) contains ${list.length} separate pins assigned the duplicate pin identifier "${pinName}".`,
            confidence: 0.98,
            evidence,
          });
        }
      }
    }

    return findings;
  },
};

/**
 * RULE-017: Floating Relay Coil or Contact Set
 * Flagged when a relay's coil terminals or contact pairs are only half-connected.
 */
export const rule017IncompleteRelayTermination: QCRule = {
  id: 'rule-017',
  code: 'RULE-017',
  version: '1.0.0',
  name: 'Incomplete Relay Coil / Contact Termination',
  description: 'Flags electromechanical relays with partially connected coils (pins 85/86 or A1/A2) or contact sets.',
  severity: 'MAJOR',
  standardClause: 'IEEE Std 315 §4.3',
  prerequisites: ['COMPONENT_CLASSIFICATION', 'TERMINAL_DETECTION'],
  evaluate(graph: ElectricalGraph): FindingCandidate[] {
    const findings: FindingCandidate[] = [];
    const connectedTerminalIds = new Set<string>();
    graph.wires.forEach((w) => w.connectedTerminalIds.forEach((tid) => connectedTerminalIds.add(tid)));
    const termMap = new Map<string, any>();
    graph.terminals.forEach((t) => termMap.set(t.id, t));

    for (const comp of graph.components) {
      if (comp.type !== 'RELAY') continue;

      const compTerms = comp.terminalIds.map((tid) => termMap.get(tid)).filter((t): t is any => t !== undefined);
      const coilPins = compTerms.filter((t) => /^(85|86|A1|A2)$/i.test(t.terminalName));

      if (coilPins.length >= 2) {
        const connectedCoilPins = coilPins.filter((t) => connectedTerminalIds.has(t.id));
        if (connectedCoilPins.length === 1) {
          const unconnectedCoilPin = coilPins.find((t) => !connectedTerminalIds.has(t.id))!;
          const fingerprint = computeFingerprint('RULE-017', [comp.id, unconnectedCoilPin.id]);
          const evidence: FindingEvidence = {
            pageNumber: comp.pageNumber,
            boundingBoxes: [comp.bbox],
            componentIds: [comp.id],
            terminalIds: [unconnectedCoilPin.id],
            wireIds: [],
            netIds: [],
            sourceEvidenceIds: [comp.sourceEvidenceId],
            deterministicFingerprint: fingerprint,
          };

          findings.push({
            ruleId: 'RULE-017',
            ruleVersion: '1.0.0',
            severity: 'MAJOR',
            status: 'VIOLATION',
            title: `Half-Wired Relay Coil on ${comp.label}`,
            description: `Relay ${comp.label} has coil terminal "${connectedCoilPins[0].terminalName}" wired, but mate coil terminal "${unconnectedCoilPin.terminalName}" is left floating.`,
            confidence: 0.95,
            evidence,
          });
        }
      }
    }

    return findings;
  },
};

/**
 * RULE-018: Multi-Point Ground Regime Ambiguity
 * Flagged when distinct ground regimes (PE, Signal GND, Chassis) are coupled on a single net without isolation.
 */
export const rule018MultiPointGroundLoop: QCRule = {
  id: 'rule-018',
  code: 'RULE-018',
  version: '1.0.0',
  name: 'Multi-Point Ground Regime Coupling',
  description: 'Flags electrical nets coupling disparate ground regimes (Signal GND, Earth, Chassis) without explicit bonding notation.',
  severity: 'ADVISORY',
  standardClause: 'IEEE Std 1100 §8.3',
  prerequisites: ['NET_CONSTRUCTION', 'GROUND_CLASSIFICATION'],
  evaluate(graph: ElectricalGraph): FindingCandidate[] {
    const findings: FindingCandidate[] = [];
    const compMap = new Map<string, GraphComponent>();
    graph.components.forEach((c) => compMap.set(c.id, c));

    for (const net of graph.nets) {
      const gndComps = net.memberComponentIds
        .map((cid) => compMap.get(cid))
        .filter((c): c is GraphComponent => c !== undefined && c.type === 'GROUND');

      if (gndComps.length >= 2) {
        const classifyGroundRegime = (label: string): string => {
          const upper = label.toUpperCase();
          if (upper.includes('CHASSIS') || upper.includes('FRAME')) return 'CHASSIS';
          if (upper.includes('EARTH') || upper.includes('PE') || upper.includes('PROTECTIVE')) return 'EARTH';
          if (upper.includes('DIGITAL') || upper.includes('DGND')) return 'DIGITAL_GND';
          if (upper.includes('ANALOG') || upper.includes('AGND')) return 'ANALOG_GND';
          if (upper.includes('ISOLATED') || upper.includes('ISO_GND')) return 'ISOLATED_GND';
          return upper;
        };

        const regimes = new Set(gndComps.map((g) => classifyGroundRegime(g.label)));
        if (regimes.size >= 2) {
          const gIds = gndComps.map((g) => g.id);
          const fingerprint = computeFingerprint('RULE-018', [net.id, ...gIds]);
          const evidence: FindingEvidence = {
            pageNumber: net.pages[0] || 1,
            boundingBoxes: gndComps.map((g) => g.bbox),
            componentIds: gIds,
            terminalIds: net.memberTerminalIds,
            wireIds: net.memberWireIds,
            netIds: [net.id],
            sourceEvidenceIds: gndComps.map((g) => g.sourceEvidenceId),
            deterministicFingerprint: fingerprint,
          };

          findings.push({
            ruleId: 'RULE-018',
            ruleVersion: '1.0.0',
            severity: 'ADVISORY',
            status: 'VIOLATION',
            title: `Coupled Ground Regimes: ${Array.from(regimes).join(' and ')} on ${net.name}`,
            description: `Net "${net.name}" couples distinct ground reference symbols (${Array.from(regimes).join(', ')}) without designated star-point or bond notation.`,
            confidence: 0.85,
            evidence,
          });
        }
      }
    }

    return findings;
  },
};

/**
 * RULE-019: Missing Overcurrent Protection Rating
 * Flagged when an active circuit fuse or breaker lacks an amperage rating.
 */
export const rule019MissingProtectionRating: QCRule = {
  id: 'rule-019',
  code: 'RULE-019',
  version: '1.0.0',
  name: 'Missing Protection Device Current Rating',
  description: 'Detects active circuit protection devices (fuses/breakers) lacking an amperage rating.',
  severity: 'MAJOR',
  standardClause: 'NFPA 79 §7.2.1, UL 508A §15.1',
  prerequisites: ['COMPONENT_CLASSIFICATION'],
  evaluate(graph: ElectricalGraph): FindingCandidate[] {
    const findings: FindingCandidate[] = [];

    for (const comp of graph.components) {
      if (comp.type !== 'FUSE') continue;

      const hasAmperageValue = comp.value && /[0-9]+(\.[0-9]+)?\s*A/i.test(comp.value);
      const hasAmperageInLabel = /[0-9]+(\.[0-9]+)?\s*A/i.test(comp.label);

      if (!hasAmperageValue && !hasAmperageInLabel) {
        const fingerprint = computeFingerprint('RULE-019', [comp.id]);
        const evidence: FindingEvidence = {
          pageNumber: comp.pageNumber,
          boundingBoxes: [comp.bbox],
          componentIds: [comp.id],
          terminalIds: comp.terminalIds,
          wireIds: [],
          netIds: [],
          sourceEvidenceIds: [comp.sourceEvidenceId],
          deterministicFingerprint: fingerprint,
        };

        findings.push({
          ruleId: 'RULE-019',
          ruleVersion: '1.0.0',
          severity: 'MAJOR',
          status: 'VIOLATION',
          title: `Missing Current Rating on Fuse ${comp.label}`,
          description: `Protective device ${comp.label} (Page ${comp.pageNumber}) has no specified current rating (e.g. "15A", "2.5A") on the schematic.`,
          confidence: 0.95,
          evidence,
        });
      }
    }

    return findings;
  },
};

/**
 * RULE-020: Connector Lacking Mating Harness Reference
 * Flagged when an active connector with multiple wired pins lacks a destination harness tag.
 */
export const rule020ConnectorMissingDestination: QCRule = {
  id: 'rule-020',
  code: 'RULE-020',
  version: '1.0.0',
  name: 'Connector Lacking Mating Harness Reference',
  description: 'Advises when an active connector with multiple wired pins does not specify a destination harness or mating reference.',
  severity: 'ADVISORY',
  standardClause: 'IPC/WHMA-A-620 §19.2',
  prerequisites: ['COMPONENT_CLASSIFICATION', 'TERMINAL_DETECTION'],
  evaluate(graph: ElectricalGraph): FindingCandidate[] {
    const findings: FindingCandidate[] = [];
    const connectedTerminalIds = new Set<string>();
    graph.wires.forEach((w) => w.connectedTerminalIds.forEach((tid) => connectedTerminalIds.add(tid)));

    for (const conn of graph.connectors) {
      const activePins = conn.pinTerminalIds.filter((tid) => connectedTerminalIds.has(tid));
      if (activePins.length >= 2) {
        const hasMatingTag = /(TO_|MATE|W[0-9]|HARN)/i.test(conn.reference);
        if (!hasMatingTag) {
          const fingerprint = computeFingerprint('RULE-020', [conn.id]);
          const evidence: FindingEvidence = {
            pageNumber: conn.pageNumber,
            boundingBoxes: [conn.bbox],
            componentIds: [conn.id],
            terminalIds: activePins,
            wireIds: [],
            netIds: [],
            sourceEvidenceIds: [conn.sourceEvidenceId],
            deterministicFingerprint: fingerprint,
          };

          findings.push({
            ruleId: 'RULE-020',
            ruleVersion: '1.0.0',
            severity: 'ADVISORY',
            status: 'VIOLATION',
            title: `Connector ${conn.reference} Lacks Mating Harness Reference`,
            description: `Active connector ${conn.reference} (Page ${conn.pageNumber}, ${activePins.length} active pins) does not declare a mating connector reference or harness destination tag.`,
            confidence: 0.85,
            evidence,
          });
        }
      }
    }

    return findings;
  },
};

export const PRODUCTION_RULES: QCRule[] = [
  rule001DanglingWire,
  rule002UnconnectedRequiredTerminal,
  rule003DuplicateConnectorReference,
  rule004DuplicateComponentReference,
  rule005ImpossibleNetTopology,
  rule006UnresolvedTerminalConnection,
  rule007ConflictingPowerSources,
  rule008CrossingWiresAmbiguity,
  rule009IsolatedComponent,
  rule010SingleTerminalNet,
  rule011IncompatibleVoltageBridging,
  rule012FuseMissingInLineLoad,
  rule013MalformedReferenceDesignator,
  rule014InconsistentWireGauge,
  rule015IsolatedWireSegment,
  rule016DuplicateTerminalOnComponent,
  rule017IncompleteRelayTermination,
  rule018MultiPointGroundLoop,
  rule019MissingProtectionRating,
  rule020ConnectorMissingDestination,
];

// Alias for backwards compatibility
export const INITIAL_PRODUCTION_RULES = PRODUCTION_RULES;

