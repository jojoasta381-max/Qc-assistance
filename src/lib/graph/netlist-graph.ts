import { BoundingBox2D } from '@/lib/ingestion/bounds-extractor';

export type ComponentNodeType =
  | 'CONNECTOR'
  | 'RELAY'
  | 'CIRCUIT_BREAKER'
  | 'TERMINAL_BLOCK'
  | 'FUSE'
  | 'GROUND_BUS'
  | 'VFD'
  | 'SPLICE'
  | 'MOTOR'
  | 'DISCONNECT_SWITCH';

export interface PinPort {
  pinId: string;
  label?: string;
  maxAmpacity?: number;
  pinType?: 'MALE' | 'FEMALE' | 'SCREW' | 'SPRING_CLAMP' | 'LUG' | 'SOLDER_CUP';
  connectedEdgeId?: string;
}

export interface ElectricalNode {
  id: string; // e.g. "J1", "P1", "CB1"
  name: string;
  type: ComponentNodeType;
  partNumber?: string;
  manufacturer?: string;
  pins: PinPort[];
  bbox: BoundingBox2D;
  pageNumber: number;
}

export interface ConductorSpec {
  gauge: string; // e.g. "18 AWG"
  gaugeAwg: number; // 18
  crossSectionalMm2: number; // 0.82
  color: string; // "RED", "BLU/WHT"
  insulationType: string; // "TXL", "THHN", "MIL-W-22759"
  voltageDomain: string; // "24VDC", "480VAC", "0V_RTN", "EARTH"
  continuousAmps: number;
  lengthMm?: number;
}

export interface ElectricalEdge {
  id: string;
  wireTag: string; // e.g. "W-101"
  sourceNodeId: string;
  sourcePinId: string;
  targetNodeId: string;
  targetPinId: string;
  conductor: ConductorSpec;
  status: 'VALID' | 'DISCREPANCY_FLAGGED';
  flagReason?: string;
}

export interface FloatingPinAlert {
  nodeId: string;
  nodeName: string;
  pinId: string;
  severity: 'WARNING' | 'CRITICAL';
  reason: string;
}

export interface GroundPathTrace {
  startNodeId: string;
  groundNodeId: string;
  pathSteps: string[];
  isContinuous: boolean;
  totalLengthMm: number;
}

/**
 * AWG to Cross-Sectional Area and Nominal IPC-620 Ampacity Helper
 */
export function getAwgSpec(gaugeStr: string): { awg: number; mm2: number; maxAmps: number } {
  const match = gaugeStr.match(/(\d+)\s*AWG/i);
  const awg = match ? parseInt(match[1], 10) : 18;

  switch (awg) {
    case 26:
      return { awg: 26, mm2: 0.13, maxAmps: 2.5 };
    case 24:
      return { awg: 24, mm2: 0.20, maxAmps: 3.5 };
    case 22:
      return { awg: 22, mm2: 0.32, maxAmps: 5.0 };
    case 20:
      return { awg: 20, mm2: 0.52, maxAmps: 7.5 };
    case 18:
      return { awg: 18, mm2: 0.82, maxAmps: 10.0 };
    case 16:
      return { awg: 16, mm2: 1.31, maxAmps: 13.0 };
    case 14:
      return { awg: 14, mm2: 2.08, maxAmps: 17.0 };
    case 12:
      return { awg: 12, mm2: 3.31, maxAmps: 23.0 };
    case 10:
      return { awg: 10, mm2: 5.26, maxAmps: 33.0 };
    case 8:
      return { awg: 8, mm2: 8.37, maxAmps: 46.0 };
    case 6:
      return { awg: 6, mm2: 13.3, maxAmps: 60.0 };
    case 4:
      return { awg: 4, mm2: 21.1, maxAmps: 80.0 };
    default:
      return { awg, mm2: 1.0, maxAmps: 10.0 };
  }
}

/**
 * Directed Electrical Topological Graph Class
 */
export class ElectricalGraph {
  nodes: Map<string, ElectricalNode> = new Map();
  edges: ElectricalEdge[] = [];
  adjacencyList: Map<string, Array<{ targetNodeId: string; edgeId: string }>> = new Map();

  addNode(node: ElectricalNode) {
    this.nodes.set(node.id, node);
    if (!this.adjacencyList.has(node.id)) {
      this.adjacencyList.set(node.id, []);
    }
  }

  addEdge(edge: ElectricalEdge) {
    this.edges.push(edge);

    // Bidirectional graph indexing for electrical continuity
    if (!this.adjacencyList.has(edge.sourceNodeId)) {
      this.adjacencyList.set(edge.sourceNodeId, []);
    }
    if (!this.adjacencyList.has(edge.targetNodeId)) {
      this.adjacencyList.set(edge.targetNodeId, []);
    }

    this.adjacencyList.get(edge.sourceNodeId)!.push({
      targetNodeId: edge.targetNodeId,
      edgeId: edge.id,
    });
    this.adjacencyList.get(edge.targetNodeId)!.push({
      targetNodeId: edge.sourceNodeId,
      edgeId: edge.id,
    });

    // Mark pins as connected
    const sourceNode = this.nodes.get(edge.sourceNodeId);
    if (sourceNode) {
      const pin = sourceNode.pins.find((p) => p.pinId === edge.sourcePinId);
      if (pin) pin.connectedEdgeId = edge.id;
    }

    const targetNode = this.nodes.get(edge.targetNodeId);
    if (targetNode) {
      const pin = targetNode.pins.find((p) => p.pinId === edge.targetPinId);
      if (pin) pin.connectedEdgeId = edge.id;
    }
  }

  /**
   * Find floating or un-terminated connector pins
   */
  findFloatingPins(): FloatingPinAlert[] {
    const alerts: FloatingPinAlert[] = [];

    this.nodes.forEach((node) => {
      // Splices and Grounds don't have unused spare pins
      if (node.type === 'SPLICE' || node.type === 'GROUND_BUS') return;

      node.pins.forEach((pin) => {
        if (!pin.connectedEdgeId) {
          // If pin is designated NC (No Connect), it's permitted
          if (pin.label?.toUpperCase() === 'NC') return;

          alerts.push({
            nodeId: node.id,
            nodeName: node.name,
            pinId: pin.pinId,
            severity: node.type === 'CIRCUIT_BREAKER' ? 'CRITICAL' : 'WARNING',
            reason: `Pin ${pin.pinId} on ${node.id} (${node.name}) has no conductor or termination assigned.`,
          });
        }
      });
    });

    return alerts;
  }

  /**
   * Trace continuity from any node to nearest Earth / PE Ground node
   */
  traceGroundContinuity(startNodeId: string): GroundPathTrace {
    const visited = new Set<string>();
    const queue: Array<{ nodeId: string; path: string[]; length: number }> = [
      { nodeId: startNodeId, path: [startNodeId], length: 0 },
    ];

    while (queue.length > 0) {
      const { nodeId, path, length } = queue.shift()!;
      visited.add(nodeId);

      const node = this.nodes.get(nodeId);
      if (node && (node.type === 'GROUND_BUS' || node.id.includes('GND') || node.id.includes('PE'))) {
        return {
          startNodeId,
          groundNodeId: nodeId,
          pathSteps: path,
          isContinuous: true,
          totalLengthMm: length,
        };
      }

      const neighbors = this.adjacencyList.get(nodeId) || [];
      for (const neighbor of neighbors) {
        if (!visited.has(neighbor.targetNodeId)) {
          const edge = this.edges.find((e) => e.id === neighbor.edgeId);
          const edgeLen = edge?.conductor.lengthMm || 200;
          queue.push({
            nodeId: neighbor.targetNodeId,
            path: [...path, `${edge?.wireTag} &rarr; ${neighbor.targetNodeId}`],
            length: length + edgeLen,
          });
        }
      }
    }

    return {
      startNodeId,
      groundNodeId: 'NONE',
      pathSteps: [startNodeId],
      isContinuous: false,
      totalLengthMm: 0,
    };
  }

  /**
   * Check for high-voltage and low-voltage domain mix without galvanic isolation
   */
  detectVoltageDomainCollisions(): Array<{ edgeId: string; wireTag: string; conflict: string }> {
    const collisions: Array<{ edgeId: string; wireTag: string; conflict: string }> = [];

    this.edges.forEach((edge) => {
      const srcNode = this.nodes.get(edge.sourceNodeId);
      const tgtNode = this.nodes.get(edge.targetNodeId);

      if (!srcNode || !tgtNode) return;

      const isHighVoltage = edge.conductor.voltageDomain.includes('480V') || edge.conductor.voltageDomain.includes('AC');
      const isLowVoltageComponent = tgtNode.name.toLowerCase().includes('sensor') || tgtNode.name.toLowerCase().includes('controller');

      if (isHighVoltage && isLowVoltageComponent) {
        collisions.push({
          edgeId: edge.id,
          wireTag: edge.wireTag,
          conflict: `Conductor ${edge.wireTag} (${edge.conductor.voltageDomain}) routes directly into low-voltage component ${tgtNode.name} without galvanic relay/opto-coupler isolation.`,
        });
      }
    });

    return collisions;
  }
}
