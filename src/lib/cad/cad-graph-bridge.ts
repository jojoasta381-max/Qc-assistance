import {
  ElectricalGraph,
  PinPort,
  ComponentNodeType,
  getAwgSpec,
} from '@/lib/graph/netlist-graph';
import { EditorNode, EditorWire } from '@/components/EasySchematicEditor';

/**
 * Convert EasySchematic CAD visual elements into a topological ElectricalGraph
 */
export function convertCadToElectricalGraph(
  nodes: EditorNode[],
  wires: EditorWire[]
): ElectricalGraph {
  const graph = new ElectricalGraph();

  // 1. Create ElectricalNodes
  for (const node of nodes) {
    let nodeType: ComponentNodeType = 'CONNECTOR';
    if (node.type === 'RELAY') nodeType = 'RELAY';
    else if (node.type === 'BREAKER') nodeType = 'CIRCUIT_BREAKER';
    else if (node.type === 'GROUND') nodeType = 'GROUND_BUS';
    else if (node.type === 'POWER') nodeType = 'DISCONNECT_SWITCH';
    else if (node.type === 'SENSOR') nodeType = 'MOTOR';

    const pins: PinPort[] = node.ports.map((p) => {
      // Find connecting wire if any
      const wire = wires.find(
        (w) =>
          (w.fromNodeId === node.id && w.fromPortId === p.id) ||
          (w.toNodeId === node.id && w.toPortId === p.id)
      );
      const isSealed = Boolean(
        p.signal?.toUpperCase().includes('SEALED') ||
        p.signal?.toUpperCase().includes('PLUG') ||
        p.name?.toUpperCase().includes('SEALED') ||
        p.name?.toUpperCase().includes('PLUG')
      );
      return {
        pinId: p.id,
        label: isSealed ? `${p.name} (SEALED)` : p.name,
        connectedEdgeId: wire ? wire.id : isSealed ? 'SEALED-PLUG' : undefined,
      };
    });

    graph.addNode({
      id: node.designator || node.id,
      name: node.name,
      type: nodeType,
      pins,
      bbox: {
        x: node.x,
        y: node.y,
        width: node.width,
        height: node.height,
      },
      pageNumber: 1,
    });
  }

  // 2. Create ElectricalEdges
  for (const wire of wires) {
    const fromNode = nodes.find((n) => n.id === wire.fromNodeId);
    const toNode = nodes.find((n) => n.id === wire.toNodeId);

    const sourceDesignator = fromNode?.designator || wire.fromNodeId;
    const targetDesignator = toNode?.designator || wire.toNodeId;

    const awgStr = wire.awg && wire.awg !== 'UNDEFINED' ? wire.awg : '20 AWG';
    const spec = getAwgSpec(awgStr);

    let voltageDomain = '24VDC';
    if (wire.signalName.toUpperCase().includes('GND') || wire.signalName.toUpperCase().includes('EARTH')) {
      voltageDomain = 'EARTH';
    } else if (wire.signalName.toUpperCase().includes('480V') || wire.signalName.toUpperCase().includes('L1')) {
      voltageDomain = '480VAC';
    } else if (wire.signalName.toUpperCase().includes('12V')) {
      voltageDomain = '12VDC';
    }

    // Default continuous load current heuristic
    let continuousAmps = 4.5;
    if (wire.signalName.toUpperCase().includes('ACT_PWR') || wire.signalName.toUpperCase().includes('HIGH-CURRENT')) {
      continuousAmps = 14.0;
    } else if (wire.signalName.toUpperCase().includes('MTR_FEED')) {
      continuousAmps = 28.0;
    }

    graph.addEdge({
      id: wire.id,
      wireTag: wire.signalName.startsWith('W-') ? wire.signalName : `W-${wire.id.replace('w-', '')}`,
      sourceNodeId: sourceDesignator,
      sourcePinId: wire.fromPortId,
      targetNodeId: targetDesignator,
      targetPinId: wire.toPortId,
      conductor: {
        gauge: awgStr,
        gaugeAwg: spec.awg,
        crossSectionalMm2: spec.mm2,
        color: wire.color || 'RED',
        insulationType: 'TXL Cross-Linked Polyethylene',
        voltageDomain,
        continuousAmps,
        lengthMm: 450,
      },
      status: 'VALID',
    });
  }

  return graph;
}

/**
 * Preloaded CAD Diagram Templates for 1-Click Loading
 */
export const CAD_DIAGRAM_TEMPLATES: Record<
  string,
  { name: string; standard: string; nodes: EditorNode[]; wires: EditorWire[] }
> = {
  'WH-402': {
    name: 'WH-402 Chassis Harness Assembly',
    standard: 'IPC-WHMA-A-620',
    nodes: [
      {
        id: 'n-j1',
        name: 'J1 (Ampseal 23-Pin Header)',
        designator: 'J1',
        type: 'CONNECTOR',
        x: 80,
        y: 100,
        width: 180,
        height: 220,
        ports: [
          { id: '1', name: 'Pin 1: +24VDC Main Feed', type: 'OUT', signal: 'PWR_24V' },
          { id: '2', name: 'Pin 2: Return Bus 0V', type: 'OUT', signal: '0V_RTN' },
          { id: '3', name: 'Pin 3: Relay Control Coil', type: 'OUT', signal: '24VDC_CTRL' },
          { id: '4', name: 'Pin 4: Chassis Ground Tie', type: 'OUT', signal: 'EARTH' },
          { id: '5', name: 'Pin 5: Unassigned Cavity', type: 'IO', signal: 'NC' },
          { id: '6', name: 'Pin 6: Unassigned Cavity', type: 'IO', signal: 'NC' },
        ],
      },
      {
        id: 'n-p1',
        name: 'P1 (Deutsch DT06-4S Mating Plug)',
        designator: 'P1',
        type: 'CONNECTOR',
        x: 680,
        y: 100,
        width: 180,
        height: 190,
        ports: [
          { id: '1', name: 'Pin 1: +24VDC Feed In', type: 'IN', signal: 'PWR_24V' },
          { id: '2', name: 'Pin 2: Return 0V', type: 'IN', signal: '0V_RTN' },
          { id: '3', name: 'Pin 3: Spare Cavity', type: 'IO', signal: 'NC' },
          { id: '4', name: 'Pin 4: Spare Cavity', type: 'IO', signal: 'NC' },
        ],
      },
      {
        id: 'n-rl1',
        name: 'Relay RL1 (Bosch 30A SPDT)',
        designator: 'RL1',
        type: 'RELAY',
        x: 380,
        y: 80,
        width: 170,
        height: 180,
        ports: [
          { id: '86', name: 'Pin 86: Coil VCC (+)', type: 'IN', signal: '24VDC_CTRL' },
          { id: '85', name: 'Pin 85: Coil GND (-)', type: 'IN', signal: 'GND' },
          { id: '30', name: 'Pin 30: Common Arm', type: 'IN', signal: 'PWR_24V' },
          { id: '87', name: 'Pin 87: NO Load Out', type: 'OUT', signal: 'LOAD' },
        ],
      },
      {
        id: 'n-gnd',
        name: 'Chassis Earth Ground Stud',
        designator: 'CHASSIS_GND_1',
        type: 'GROUND',
        x: 380,
        y: 330,
        width: 170,
        height: 120,
        ports: [
          { id: 'STUD', name: 'Main Ground Stud M8', type: 'IO', signal: 'EARTH' },
          { id: 'LUG1', name: 'Secondary Shield Lug', type: 'IO', signal: 'SHIELD' },
        ],
      },
    ],
    wires: [
      {
        id: 'w-101',
        fromNodeId: 'n-j1',
        fromPortId: '1',
        toNodeId: 'n-p1',
        toPortId: '1',
        awg: '18 AWG',
        color: '#EF4444',
        signalName: 'W-101 (+24VDC Power)',
      },
      {
        id: 'w-102',
        fromNodeId: 'n-j1',
        fromPortId: '2',
        toNodeId: 'n-p1',
        toPortId: '2',
        awg: '18 AWG',
        color: '#64748B',
        signalName: 'W-102 (0V Return)',
      },
      {
        id: 'w-103',
        fromNodeId: 'n-j1',
        fromPortId: '3',
        toNodeId: 'n-rl1',
        toPortId: '86',
        awg: '20 AWG', // Violates IPC-620 Table 4-2: 14A load exceeds 7.5A nominal
        color: '#0284C7',
        signalName: 'W-103 (High-Current Coil 14A)',
      },
      {
        id: 'w-104',
        fromNodeId: 'n-j1',
        fromPortId: '4',
        toNodeId: 'n-gnd',
        toPortId: 'STUD',
        awg: '16 AWG',
        color: '#10B981',
        signalName: 'W-104 (Chassis Safety Ground)',
      },
    ],
  },

  'MCC-VFD-01': {
    name: 'MCC-VFD-01 480VAC Industrial Panel',
    standard: 'UL-508A',
    nodes: [
      {
        id: 'n-cb-main',
        name: 'Main Circuit Breaker (100A OCPD)',
        designator: 'CB-MAIN',
        type: 'BREAKER',
        x: 80,
        y: 100,
        width: 190,
        height: 200,
        ports: [
          { id: 'L1', name: 'L1: 480VAC Line', type: 'IN', signal: '480VAC_L1' },
          { id: 'T1', name: 'T1: Protected Feed', type: 'OUT', signal: 'FEED_T1' },
          { id: 'PE', name: 'PE: Enclosure Ground', type: 'IO', signal: 'EARTH' },
        ],
      },
      {
        id: 'n-vfd',
        name: 'PowerFlex 525 VFD (5kA SCCR)',
        designator: 'VFD-1',
        type: 'POWER',
        x: 400,
        y: 90,
        width: 180,
        height: 210,
        ports: [
          { id: 'R', name: 'Terminal R/L1', type: 'IN', signal: 'FEED_T1' },
          { id: 'U', name: 'Motor Output U', type: 'OUT', signal: 'MTR_U' },
          { id: 'G', name: 'Ground Stud', type: 'IO', signal: 'EARTH' },
        ],
      },
      {
        id: 'n-pe-bus',
        name: 'Panel PE Copper Ground Bus Bar',
        designator: 'PE-BUS',
        type: 'GROUND',
        x: 250,
        y: 350,
        width: 220,
        height: 120,
        ports: [
          { id: 'STUD-1', name: 'Main Bonding Terminal', type: 'IO', signal: 'EARTH' },
          { id: 'STUD-2', name: 'Branch Ground Terminal', type: 'IO', signal: 'EARTH' },
        ],
      },
    ],
    wires: [
      {
        id: 'w-feed',
        fromNodeId: 'n-cb-main',
        fromPortId: 'T1',
        toNodeId: 'n-vfd',
        toPortId: 'R',
        awg: '4 AWG',
        color: '#000000',
        signalName: 'FEED_480V (Black Power Wire)',
      },
      {
        id: 'w-pe-undersized',
        fromNodeId: 'n-cb-main',
        fromPortId: 'PE',
        toNodeId: 'n-pe-bus',
        toPortId: 'STUD-1',
        awg: '12 AWG', // Undersized per UL 508A Table 15.1: 100A breaker requires min 8 AWG!
        color: '#10B981',
        signalName: 'PE_GROUND (Undersized for 100A Breaker)',
      },
    ],
  },
};
