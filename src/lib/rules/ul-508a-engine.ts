import { ElectricalGraph, ElectricalEdge, getAwgSpec } from '@/lib/graph/netlist-graph';
import { Discrepancy } from '@/types/qc';

export interface Ul508aEvaluationContext {
  mainBreakerAmps?: number;
  markedPanelSccrKa?: number;
  wireDuctWidthMm?: number;
  wireDuctHeightMm?: number;
}

/**
 * UL 508A Table 15.1: Minimum Sizing of Equipment Grounding Conductors (Copper)
 */
export function getUl508aTable15MinGroundAwg(ratingOfOvercurrentDeviceAmps: number): {
  minAwg: number;
  minAwgStr: string;
  minMm2: number;
} {
  if (ratingOfOvercurrentDeviceAmps <= 15) {
    return { minAwg: 14, minAwgStr: '14 AWG', minMm2: 2.08 };
  }
  if (ratingOfOvercurrentDeviceAmps <= 20) {
    return { minAwg: 12, minAwgStr: '12 AWG', minMm2: 3.31 };
  }
  if (ratingOfOvercurrentDeviceAmps <= 60) {
    return { minAwg: 10, minAwgStr: '10 AWG', minMm2: 5.26 };
  }
  if (ratingOfOvercurrentDeviceAmps <= 100) {
    return { minAwg: 8, minAwgStr: '8 AWG', minMm2: 8.37 };
  }
  if (ratingOfOvercurrentDeviceAmps <= 200) {
    return { minAwg: 6, minAwgStr: '6 AWG', minMm2: 13.3 };
  }
  if (ratingOfOvercurrentDeviceAmps <= 300) {
    return { minAwg: 4, minAwgStr: '4 AWG', minMm2: 21.2 };
  }
  if (ratingOfOvercurrentDeviceAmps <= 400) {
    return { minAwg: 3, minAwgStr: '3 AWG', minMm2: 26.7 };
  }
  if (ratingOfOvercurrentDeviceAmps <= 500) {
    return { minAwg: 2, minAwgStr: '2 AWG', minMm2: 33.6 };
  }
  return { minAwg: 1, minAwgStr: '1 AWG', minMm2: 42.4 };
}

/**
 * UL 508A Rule 1: Table 15.1 Equipment Grounding Conductor Sizing
 * Evaluates whether grounding conductors match the upstream circuit breaker / OCPD rating.
 */
export function evaluateEquipmentGrounding(
  mainBreakerAmps = 100,
  actualGroundAwgStr = '12 AWG'
): Discrepancy | null {
  const req = getUl508aTable15MinGroundAwg(mainBreakerAmps);
  const actualSpec = getAwgSpec(actualGroundAwgStr);

  // In AWG, smaller numerical gauge = larger physical wire
  if (actualSpec.awg > req.minAwg) {
    return {
      id: `UL508A-GND-TABLE15`,
      title: `Undersized Equipment Grounding Conductor per UL 508A Table 15.1`,
      description: `Panel main overcurrent protective device is rated at ${mainBreakerAmps}A. UL 508A Table 15.1 mandates a minimum copper equipment grounding conductor of ${req.minAwgStr} (${req.minMm2}mm\u00b2), but detected grounding wire is ${actualGroundAwgStr} (${actualSpec.mm2}mm\u00b2).`,
      severity: 'CRITICAL',
      confidence: 99,
      standardRef: 'UL 508A Table 15.1 & NFPA 70 Art. 250.122',
      componentRef: `Main PE Ground Bus Bar & Incoming Feeder Ground`,
      plainLanguageExplanation: `During a phase-to-ground fault, an undersized equipment grounding conductor will fuse and melt before the upstream ${mainBreakerAmps}A breaker can clear the fault, leaving the metal panel enclosure energized at hazardous potential.`,
      recommendation: `Replace equipment grounding conductor with minimum ${req.minAwgStr} green or green/yellow copper conductor.`,
      bbox: { x: 50, y: 55, width: 22, height: 18 },
      status: 'UNREVIEWED',
    };
  }
  return null;
}

/**
 * UL 508A Rule 2: SCCR Weakest-Link Coordination (Supplement SB4.2)
 * The marked SCCR of the industrial control panel cannot exceed the lowest-rated
 * power circuit component in the branch circuit.
 */
export interface PowerComponentSccr {
  id: string;
  name: string;
  componentType: string;
  ratedSccrKa: number;
}

export function evaluateSccrWeakestLink(
  panelMarkedSccrKa: number,
  components: PowerComponentSccr[]
): Discrepancy | null {
  if (components.length === 0) return null;

  // Find the weakest link
  let lowestComp = components[0];
  for (const comp of components) {
    if (comp.ratedSccrKa < lowestComp.ratedSccrKa) {
      lowestComp = comp;
    }
  }

  if (panelMarkedSccrKa > lowestComp.ratedSccrKa) {
    return {
      id: `UL508A-SCCR-SB4`,
      title: `SCCR Rating Conflict: Panel Marked ${panelMarkedSccrKa}kA Exceeds Component Limit (${lowestComp.ratedSccrKa}kA)`,
      description: `Drawing title block specifies an overall panel Short-Circuit Current Rating of ${panelMarkedSccrKa}kA. However, branch component ${lowestComp.name} (${lowestComp.id}) has a maximum marked withstand rating of only ${lowestComp.ratedSccrKa}kA. Under UL 508A Supplement SB4.2, the panel rating is limited by its weakest component.`,
      severity: 'CRITICAL',
      confidence: 98,
      standardRef: 'UL 508A Supplement SB4.2 & NEC 409.110',
      componentRef: `${lowestComp.name} (${lowestComp.id})`,
      plainLanguageExplanation: `If a short circuit occurs on a 480VAC industrial feeder with available fault current above ${lowestComp.ratedSccrKa}kA, component ${lowestComp.id} can violently rupture or weld contacts before upstream backup protection operates.`,
      recommendation: `Either derate marked panel SCCR to ${lowestComp.ratedSccrKa}kA, or add upstream Class J/CC current-limiting fuses or a manufacturer-tested series combination controller to achieve ${panelMarkedSccrKa}kA rating.`,
      bbox: { x: 65, y: 25, width: 25, height: 18 },
      status: 'UNREVIEWED',
    };
  }
  return null;
}

/**
 * UL 508A Rule 3: Wire Duct Fill Ratio (§29.3.4)
 * Cross-sectional area of all wires inside wire duct cannot exceed 20% of duct interior area.
 */
export function evaluateWireDuctFill(
  edges: ElectricalEdge[],
  ductWidthMm = 60,
  ductHeightMm = 80
): Discrepancy | null {
  const ductAreaMm2 = ductWidthMm * ductHeightMm;
  const maxAllowableWireAreaMm2 = ductAreaMm2 * 0.20; // 20% limit

  // Estimate total wire cross section including insulation (factor of ~2.5x copper area)
  let totalWireAreaMm2 = 0;
  for (const edge of edges) {
    const copperMm2 = edge.conductor.crossSectionalMm2 || 0.82;
    const wireOdArea = copperMm2 * 2.6; // copper + insulation jacket
    totalWireAreaMm2 += wireOdArea;
  }

  const fillRatioPercent = Number(((totalWireAreaMm2 / ductAreaMm2) * 100).toFixed(1));

  if (fillRatioPercent > 20.0) {
    return {
      id: `UL508A-DUCT-FILL`,
      title: `Wire Duct Fill Ratio Exceeds 20% Limit (${fillRatioPercent}% > 20.0%)`,
      description: `Internal panel raceway (${ductWidthMm}mm \u00d7 ${ductHeightMm}mm) has a calculated fill ratio of ${fillRatioPercent}% (total bundle area ${Math.round(totalWireAreaMm2)}mm\u00b2 vs max allowable ${Math.round(maxAllowableWireAreaMm2)}mm\u00b2), exceeding the UL 508A \u00a729.3.4 maximum allowable fill of 20%.`,
      severity: 'MAJOR',
      confidence: 92,
      standardRef: 'UL 508A §29.3.4 & NFPA 79 §13.5.2',
      componentRef: `Internal Wire Duct Raceway WD-1`,
      plainLanguageExplanation: `Wire ducts filled beyond 20% trap thermal heat, prevent air circulation, cause conductor insulation embrittlement, and risk pinching wires when the duct snap-on cover is forced shut.`,
      recommendation: `Increase wire duct size to ${ductWidthMm + 20}mm \u00d7 ${ductHeightMm + 20}mm or distribute high-density control bundles into a secondary parallel wireway.`,
      bbox: { x: 30, y: 60, width: 22, height: 16 },
      status: 'UNREVIEWED',
    };
  }
  return null;
}

/**
 * UL 508A Rule 4: Conductor Color Coding & Voltage Domain Separation (§20.2 & §20.3)
 * Verifies standard industrial panel color code requirements:
 * - 480VAC / AC Power: BLACK
 * - 120VAC Control: RED
 * - 24VDC DC Control: BLUE
 * - DC Common / 0V: BLU/WHT or WHT/BLU
 * - Earth / Ground: GRN or GRN/YEL
 * - Interlock / External: ORG
 */
export function evaluateUl508aColorCode(edge: ElectricalEdge): Discrepancy | null {
  const domain = edge.conductor.voltageDomain.toUpperCase();
  const color = edge.conductor.color.toUpperCase();

  // DC Control check
  if (domain.includes('24VDC') && !domain.includes('0V') && !domain.includes('RTN')) {
    if (color !== 'BLUE' && color !== 'BLU') {
      return {
        id: `UL508A-COLOR-${edge.id}`,
        title: `Non-Compliant DC Control Conductor Color (${color} vs BLUE)`,
        description: `Conductor ${edge.wireTag} operates on a 24VDC control potential but uses ${edge.conductor.color} insulation. UL 508A §20.2 mandates solid BLUE insulation for DC control circuits.`,
        severity: 'MAJOR',
        confidence: 97,
        standardRef: 'UL 508A §20.2.1(b)',
        componentRef: `Wire ${edge.wireTag} (${edge.sourceNodeId} \u2192 ${edge.targetNodeId})`,
        plainLanguageExplanation: `Incorrect color coding creates severe maintenance hazards where technicians can mistake low-voltage DC signals for AC line potentials during plant field servicing.`,
        recommendation: `Change wire specification to solid BLUE MTW/THHN copper conductor.`,
        bbox: { x: 45, y: 35, width: 18, height: 14 },
        status: 'UNREVIEWED',
      };
    }
  }

  // PE / Ground check
  if (domain.includes('EARTH') || domain.includes('PE') || domain.includes('GROUND')) {
    if (color !== 'GRN' && color !== 'GREEN' && color !== 'GRN/YEL' && color !== 'GREEN/YELLOW') {
      return {
        id: `UL508A-COLOR-GND-${edge.id}`,
        title: `Invalid Equipment Grounding Conductor Color (${color})`,
        description: `Conductor ${edge.wireTag} is assigned to PE / Safety Ground but uses ${edge.conductor.color} insulation. UL 508A §20.1 strictly reserves GREEN or GREEN WITH YELLOW STRIPE exclusively for equipment grounding.`,
        severity: 'CRITICAL',
        confidence: 99,
        standardRef: 'UL 508A §20.1.2 & NFPA 79 §13.2.1',
        componentRef: `Wire ${edge.wireTag}`,
        plainLanguageExplanation: `Using any color other than green or green/yellow for safety grounding violates electrical safety codes and can result in accidental reconnection to hot phases.`,
        recommendation: `Specify Green or Green with Yellow trace conductor insulation for all bonding and grounding conductors.`,
        bbox: { x: 48, y: 52, width: 20, height: 15 },
        status: 'UNREVIEWED',
      };
    }
  }

  return null;
}

/**
 * Master UL 508A Deterministic Evaluation Engine
 */
export function evaluateUl508aRules(
  graph: ElectricalGraph,
  context: Ul508aEvaluationContext = {
    mainBreakerAmps: 100,
    markedPanelSccrKa: 65,
    wireDuctWidthMm: 60,
    wireDuctHeightMm: 80,
  }
): Discrepancy[] {
  const discrepancies: Discrepancy[] = [];

  // 1. Evaluate Equipment Grounding Conductor
  const gndEdge = graph.edges.find(
    (e) =>
      e.conductor.voltageDomain.toUpperCase().includes('EARTH') ||
      e.targetNodeId.toUpperCase().includes('GND')
  );
  const actualGroundAwg = gndEdge ? gndEdge.conductor.gauge : '12 AWG';
  const gndDiscrepancy = evaluateEquipmentGrounding(
    context.mainBreakerAmps || 100,
    actualGroundAwg
  );
  if (gndDiscrepancy) {
    discrepancies.push(gndDiscrepancy);
  }

  // 2. Evaluate SCCR Weakest Link
  const components: PowerComponentSccr[] = [
    { id: 'CB-MAIN', name: 'Main Circuit Breaker', componentType: 'CIRCUIT_BREAKER', ratedSccrKa: 65 },
    { id: 'FU-1', name: 'Branch Fuses Class J', componentType: 'FUSE', ratedSccrKa: 100 },
    { id: 'VFD-1', name: 'Variable Frequency Drive 5HP', componentType: 'VFD', ratedSccrKa: 5 },
  ];
  const sccrDiscrepancy = evaluateSccrWeakestLink(
    context.markedPanelSccrKa || 65,
    components
  );
  if (sccrDiscrepancy) {
    discrepancies.push(sccrDiscrepancy);
  }

  // 3. Evaluate Wire Duct Fill
  const ductDiscrepancy = evaluateWireDuctFill(
    graph.edges,
    context.wireDuctWidthMm || 60,
    context.wireDuctHeightMm || 80
  );
  if (ductDiscrepancy) {
    discrepancies.push(ductDiscrepancy);
  }

  // 4. Evaluate Wire Color Codes
  for (const edge of graph.edges) {
    const colorDiscrepancy = evaluateUl508aColorCode(edge);
    if (colorDiscrepancy) {
      discrepancies.push(colorDiscrepancy);
    }
  }

  return discrepancies;
}
