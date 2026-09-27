import { ElectricalGraph, ElectricalEdge, ElectricalNode, getAwgSpec } from '@/lib/graph/netlist-graph';
import { Discrepancy } from '@/types/qc';

export type IpcAcceptanceClass = 'CLASS_1' | 'CLASS_2' | 'CLASS_3';

export interface IpcEvaluationContext {
  acceptanceClass: IpcAcceptanceClass;
  ambientTempC?: number;
  bundleWireCount?: number;
  wireDuctInsideAreaMm2?: number;
  cableDiameterMm?: number;
}

/**
 * IPC/WHMA-A-620 Table 4-2 & Table 4-3 Continuous Ampacity Derating Factors
 * Bundle Derating:
 * 1-3 wires: 1.0
 * 4-6 wires: 0.8
 * 7-9 wires: 0.7
 * 10-24 wires: 0.5
 * 25+ wires: 0.4
 */
export function getBundleDeratingFactor(bundleSize: number): number {
  if (bundleSize <= 3) return 1.0;
  if (bundleSize <= 6) return 0.8;
  if (bundleSize <= 9) return 0.7;
  if (bundleSize <= 24) return 0.5;
  return 0.4;
}

/**
 * Temperature Derating Factor (relative to 30°C base)
 */
export function getThermalDeratingFactor(tempC: number): number {
  if (tempC <= 30) return 1.0;
  if (tempC <= 40) return 0.91;
  if (tempC <= 50) return 0.82;
  if (tempC <= 60) return 0.71;
  return 0.58;
}

/**
 * IPC/WHMA-A-620 Rule 1: Continuous Ampacity vs Conductor Gauge
 * Evaluates whether any conductor carries current exceeding its derated thermal capacity.
 */
export function evaluateIpcAmpacity(
  edge: ElectricalEdge,
  bundleCount = 4,
  ambientTempC = 35
): Discrepancy | null {
  const spec = getAwgSpec(edge.conductor.gauge);
  const bundleFactor = getBundleDeratingFactor(bundleCount);
  const thermalFactor = getThermalDeratingFactor(ambientTempC);
  const safeAmps = Number((spec.maxAmps * bundleFactor * thermalFactor).toFixed(1));

  if (edge.conductor.continuousAmps > safeAmps) {
    return {
      id: `IPC-AMP-${edge.id}`,
      title: `Excessive Continuous Ampacity on ${edge.conductor.gauge} Conductor`,
      description: `Conductor ${edge.wireTag} carries ${edge.conductor.continuousAmps}A continuous load, exceeding the derated thermal capacity of ${safeAmps}A (Nominal ${spec.maxAmps}A derated by bundle factor ${bundleFactor} & thermal factor ${thermalFactor}).`,
      severity: 'CRITICAL',
      confidence: 99,
      standardRef: 'IPC/WHMA-A-620 §4.2.1 & Table 4-2',
      componentRef: `Wire ${edge.wireTag} (${edge.sourceNodeId}:${edge.sourcePinId} \u2192 ${edge.targetNodeId}:${edge.targetPinId})`,
      plainLanguageExplanation: `The wire is carrying more electric current than its physical copper gauge can safely dissipate without exceeding thermal breakdown limits of ${edge.conductor.insulationType} insulation.`,
      recommendation: `Upsize conductor gauge from ${edge.conductor.gauge} to minimum ${spec.awg <= 18 ? '14 AWG' : '16 AWG'} or split the load across parallel conductors.`,
      bbox: { x: 38, y: 32, width: 24, height: 16 },
      status: 'UNREVIEWED',
    };
  }
  return null;
}

/**
 * IPC/WHMA-A-620 Rule 2: Splice Stagger Distance (§13.4)
 * For multi-conductor harnesses, adjacent splices must be staggered by at least 50mm (Class 2/3)
 * or 30mm (Class 1) to prevent harness bundle bulge, localized heating, and mechanical stiffness.
 */
export interface SpliceLocation {
  spliceId: string;
  wireTag: string;
  axialPositionMm: number;
}

export function evaluateSpliceStagger(
  splices: SpliceLocation[],
  acceptanceClass: IpcAcceptanceClass = 'CLASS_3'
): Discrepancy[] {
  const minStaggerMm = acceptanceClass === 'CLASS_1' ? 30 : 50;
  const discrepancies: Discrepancy[] = [];

  for (let i = 0; i < splices.length; i++) {
    for (let j = i + 1; j < splices.length; j++) {
      const s1 = splices[i];
      const s2 = splices[j];
      const delta = Math.abs(s1.axialPositionMm - s2.axialPositionMm);

      if (delta < minStaggerMm) {
        discrepancies.push({
          id: `IPC-SPLICE-${s1.spliceId}-${s2.spliceId}`,
          title: `Insufficient Splice Stagger Distance (${delta}mm < ${minStaggerMm}mm)`,
          description: `Splices ${s1.spliceId} (${s1.wireTag}) and ${s2.spliceId} (${s2.wireTag}) have an axial separation of ${delta}mm. Minimum required stagger distance for ${acceptanceClass} is ${minStaggerMm}mm.`,
          severity: acceptanceClass === 'CLASS_3' ? 'CRITICAL' : 'MAJOR',
          confidence: 96,
          standardRef: 'IPC/WHMA-A-620 §13.4.1',
          componentRef: `Splices ${s1.spliceId} / ${s2.spliceId}`,
          plainLanguageExplanation: `Splices located too close together along the harness axis create localized bulges, concentrate mechanical flex stress, and create thermal hotspots.`,
          recommendation: `Increase axial offset between splices to at least ${minStaggerMm}mm by altering wire lead lengths prior to ultrasonic or crimp splicing.`,
          bbox: { x: 42, y: 48, width: 20, height: 15 },
          status: 'UNREVIEWED',
        });
      }
    }
  }

  return discrepancies;
}

/**
 * IPC/WHMA-A-620 Rule 3: Crimp Conductor Brush Protrusion (§5.1.3)
 * Conductor strands must extend beyond the crimp barrel face:
 * - Class 1: Flush to 1.5mm
 * - Class 2 & 3: Minimum 0.5mm to Maximum 1.0mm
 */
export function evaluateCrimpConductorBrush(
  pinId: string,
  connectorId: string,
  brushLengthMm: number,
  acceptanceClass: IpcAcceptanceClass = 'CLASS_3'
): Discrepancy | null {
  const minMm = acceptanceClass === 'CLASS_1' ? 0.0 : 0.5;
  const maxMm = acceptanceClass === 'CLASS_1' ? 1.5 : 1.0;

  if (brushLengthMm < minMm || brushLengthMm > maxMm) {
    const isUnder = brushLengthMm < minMm;
    return {
      id: `IPC-CRIMP-BRUSH-${connectorId}-${pinId}`,
      title: `Crimp Conductor Brush Out-of-Tolerance (${brushLengthMm}mm)`,
      description: `Terminal contact on ${connectorId} Pin ${pinId} has a conductor brush protrusion of ${brushLengthMm}mm, violating the acceptable range [${minMm}mm – ${maxMm}mm] for ${acceptanceClass}.`,
      severity: isUnder ? 'CRITICAL' : 'MAJOR',
      confidence: 95,
      standardRef: 'IPC/WHMA-A-620 §5.1.3 & Table 5-2',
      componentRef: `${connectorId} Pin ${pinId}`,
      plainLanguageExplanation: isUnder
        ? `Conductor strands do not fully seat through the crimp barrel, causing reduced tensile pull-force resistance and intermittent high-resistance connections.`
        : `Conductor strands protrude excessively past the crimp barrel, interfering with contact mating and lock-tab seating inside the connector housing.`,
      recommendation: `Recalibrate wire stripping length to ensure exposed conductor strand length produces 0.5mm – 1.0mm brush past the barrel face.`,
      bbox: { x: 18, y: 26, width: 18, height: 14 },
      status: 'UNREVIEWED',
    };
  }
  return null;
}

/**
 * IPC/WHMA-A-620 Rule 4: Shield Braid Termination Pigtail Length (§15.2.2)
 * Maximum allowable unshielded pigtail length for braid shield termination is 25mm (1.0 inch).
 */
export function evaluateShieldPigtail(
  cableId: string,
  pigtailLengthMm: number
): Discrepancy | null {
  const MAX_PIGTAIL_MM = 25;
  if (pigtailLengthMm > MAX_PIGTAIL_MM) {
    return {
      id: `IPC-SHIELD-PIGTAIL-${cableId}`,
      title: `Excessive Unshielded Shield Pigtail Length (${pigtailLengthMm}mm > ${MAX_PIGTAIL_MM}mm)`,
      description: `Shield drain wire pigtail on cable ${cableId} is ${pigtailLengthMm}mm long. IPC-620 stipulates a maximum unshielded transition length of ${MAX_PIGTAIL_MM}mm to maintain high-frequency EMI attenuation.`,
      severity: 'MAJOR',
      confidence: 93,
      standardRef: 'IPC/WHMA-A-620 §15.2.2',
      componentRef: `Cable ${cableId} Shield Drain`,
      plainLanguageExplanation: `Long unshielded braid pigtails act as resonant dipole antennas, radiating electromagnetic interference (EMI) and reducing harness shielding effectiveness.`,
      recommendation: `Shorten pigtail length to \u2264 25mm or implement 360\u00b0 circular backshell grounding band termination per AS85049.`,
      bbox: { x: 55, y: 40, width: 22, height: 16 },
      status: 'UNREVIEWED',
    };
  }
  return null;
}

/**
 * IPC/WHMA-A-620 Rule 5: Harness Minimum Bend Radius (§17.1)
 * Harness bend radius must not be less than:
 * - 6x outside diameter for unshielded bundles
 * - 10x outside diameter for shielded cables / coaxial leads
 */
export function evaluateBendRadius(
  bundleId: string,
  actualRadiusMm: number,
  outerDiameterMm: number,
  isShielded = false
): Discrepancy | null {
  const multiplier = isShielded ? 10 : 6;
  const minRequiredRadiusMm = outerDiameterMm * multiplier;

  if (actualRadiusMm < minRequiredRadiusMm) {
    return {
      id: `IPC-BEND-RADIUS-${bundleId}`,
      title: `Harness Bend Radius Below Minimum Limit (${actualRadiusMm}mm < ${minRequiredRadiusMm}mm)`,
      description: `Bend radius of ${actualRadiusMm}mm on bundle ${bundleId} (OD ${outerDiameterMm}mm, ${isShielded ? 'Shielded' : 'Unshielded'}) violates the minimum required radius of ${minRequiredRadiusMm}mm (${multiplier}\u00d7 OD).`,
      severity: 'MAJOR',
      confidence: 91,
      standardRef: 'IPC/WHMA-A-620 §17.1.1',
      componentRef: `Bundle ${bundleId}`,
      plainLanguageExplanation: `Excessive tight bending compresses conductor insulation, causes strand fatigue fracturing, and degrades shield attenuation coverage.`,
      recommendation: `Reroute harness routing path or install 90\u00b0 angled connector backshell adapter to maintain \u2265 ${minRequiredRadiusMm}mm bend radius.`,
      bbox: { x: 62, y: 58, width: 20, height: 15 },
      status: 'UNREVIEWED',
    };
  }
  return null;
}

/**
 * IPC/WHMA-A-620 Rule 6: Floating / Unconnected Pins (§8.2)
 * For Class 3 (Mission-Critical / Aerospace), unpopulated pins in sealed connectors
 * must have sealing plugs or documented terminations.
 */
export function evaluateIpcFloatingPins(
  nodes: ElectricalNode[],
  acceptanceClass: IpcAcceptanceClass = 'CLASS_3'
): Discrepancy[] {
  if (acceptanceClass !== 'CLASS_3') return [];
  const discrepancies: Discrepancy[] = [];

  for (const node of nodes) {
    if (node.type === 'CONNECTOR') {
      const unassignedPins = node.pins.filter((p) => !p.connectedEdgeId);
      if (unassignedPins.length > 0) {
        discrepancies.push({
          id: `IPC-PIN-FLOAT-${node.id}`,
          title: `Unsealed / Floating Connector Cavities on ${node.id} (${unassignedPins.length} pins)`,
          description: `Connector ${node.name} has ${unassignedPins.length} unassigned pin cavities (Pins: ${unassignedPins.map((p) => p.pinId).join(', ')}). Class 3 high-reliability assemblies require sealing cavity plugs (MS27488) on all unused positions.`,
          severity: 'MAJOR',
          confidence: 94,
          standardRef: 'IPC/WHMA-A-620 §8.2.3 & SAE AS50881',
          componentRef: `${node.id} (Unused Cavities: ${unassignedPins.map((p) => p.pinId).join(', ')})`,
          plainLanguageExplanation: `Unsealed connector cavities allow moisture ingress, chemical contamination, and premature pin corrosion in harsh aerospace and automotive operating environments.`,
          recommendation: `Specify Teflon or silicone sealing cavity plugs (e.g. MS27488-20) for all unpopulated contact cavities in the assembly parts list.`,
          bbox: { x: node.bbox.x / 10, y: node.bbox.y / 10, width: 18, height: 14 },
          status: 'UNREVIEWED',
        });
      }
    }
  }

  return discrepancies;
}

/**
 * Master IPC/WHMA-A-620 Deterministic Evaluation Engine
 */
export function evaluateIpc620Rules(
  graph: ElectricalGraph,
  context: IpcEvaluationContext = { acceptanceClass: 'CLASS_3', ambientTempC: 35, bundleWireCount: 4 }
): Discrepancy[] {
  const discrepancies: Discrepancy[] = [];

  // 1. Evaluate Conductor Ampacities
  for (const edge of graph.edges) {
    const ampResult = evaluateIpcAmpacity(edge, context.bundleWireCount || 4, context.ambientTempC || 35);
    if (ampResult) {
      discrepancies.push(ampResult);
    }
  }

  // 2. Evaluate Floating Pins for Class 3
  const nodeList = Array.from(graph.nodes.values());
  const floatingResult = evaluateIpcFloatingPins(nodeList, context.acceptanceClass);
  discrepancies.push(...floatingResult);

  // 3. Evaluate Splice Stagger (Deterministic mock checks for splice nodes in graph)
  const spliceNodes = nodeList.filter((n) => n.type === 'SPLICE');
  if (spliceNodes.length >= 2) {
    const splices: SpliceLocation[] = spliceNodes.map((s, idx) => ({
      spliceId: s.id,
      wireTag: `W-SP${idx + 1}`,
      axialPositionMm: s.bbox.x, // using coordinate as axial proxy
    }));
    discrepancies.push(...evaluateSpliceStagger(splices, context.acceptanceClass));
  }

  return discrepancies;
}
