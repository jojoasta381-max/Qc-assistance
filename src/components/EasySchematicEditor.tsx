'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Layers,
  Plus,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Play,
  RotateCcw,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Table,
  Sliders,
  Sparkles,
  Download,
  Info,
  Check,
  Wrench,
  HelpCircle,
  FileCode2,
  Shield,
  RefreshCw,
  LayoutGrid,
  X,
  ShieldCheck,
  Cpu,
} from 'lucide-react';
import { Discrepancy } from '@/types/qc';
import {
  convertCadToElectricalGraph,
  CAD_DIAGRAM_TEMPLATES,
} from '@/lib/cad/cad-graph-bridge';
import { SpatialDiscrepancyOverlay } from '@/components/cad/SpatialDiscrepancyOverlay';
import { evaluateIpc620Rules } from '@/lib/rules/ipc-620-engine';
import { evaluateUl508aRules } from '@/lib/rules/ul-508a-engine';

export interface EditorNode {
  id: string;
  name: string;
  designator: string;
  type: 'CONNECTOR' | 'RELAY' | 'BREAKER' | 'POWER' | 'GROUND' | 'SENSOR';
  x: number;
  y: number;
  width: number;
  height: number;
  ports: { id: string; name: string; type: 'IN' | 'OUT' | 'IO'; signal?: string }[];
}

export interface EditorWire {
  id: string;
  fromNodeId: string;
  fromPortId: string;
  toNodeId: string;
  toPortId: string;
  awg: string; // e.g. "16 AWG", "20 AWG", "UNDEFINED"
  color: string;
  signalName: string;
}

export const EasySchematicEditor: React.FC = () => {
  const canvasRef = useRef<HTMLDivElement>(null);

  const [activeTemplate, setActiveTemplate] = useState<string>('WH-402');
  const [nodes, setNodes] = useState<EditorNode[]>(CAD_DIAGRAM_TEMPLATES['WH-402'].nodes);
  const [wires, setWires] = useState<EditorWire[]>(CAD_DIAGRAM_TEMPLATES['WH-402'].wires);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedWireId, setSelectedWireId] = useState<string | null>('w-103');
  const [connectingPin, setConnectingPin] = useState<{ nodeId: string; portId: string; name: string } | null>(null);
  const [zoom, setZoom] = useState<number>(1);
  const [showSchedule, setShowSchedule] = useState<boolean>(false);

  // DRC / Discrepancy state
  const [discrepancies, setDiscrepancies] = useState<Discrepancy[]>([]);
  const [selectedDiscrepancyId, setSelectedDiscrepancyId] = useState<string | null>(null);
  const [isDrcRunning, setIsDrcRunning] = useState<boolean>(false);

  // Dragging Node state
  const [draggingNode, setDraggingNode] = useState<{
    id: string;
    offsetX: number;
    offsetY: number;
  } | null>(null);

  // Load Template Handler
  const handleLoadTemplate = (templateKey: string) => {
    const tmpl = CAD_DIAGRAM_TEMPLATES[templateKey];
    if (!tmpl) return;
    setActiveTemplate(templateKey);
    setNodes(JSON.parse(JSON.stringify(tmpl.nodes)));
    setWires(JSON.parse(JSON.stringify(tmpl.wires)));
    setSelectedNodeId(null);
    setSelectedWireId(tmpl.wires[0]?.id || null);
    setSelectedDiscrepancyId(null);
    setConnectingPin(null);
  };

  // Run Real-time Deterministic DRC Check on edited schematic
  const runDrcEvaluation = () => {
    setIsDrcRunning(true);
    const graph = convertCadToElectricalGraph(nodes, wires);

    const issues: Discrepancy[] = [];

    // Run IPC-620 rules
    const ipcIssues = evaluateIpc620Rules(graph, {
      acceptanceClass: 'CLASS_3',
      ambientTempC: 35,
      bundleWireCount: 4,
    });
    issues.push(...ipcIssues);

    // Run UL-508A rules if panel components or high-voltage circuits exist
    const hasPanelComp = nodes.some((n) => n.type === 'BREAKER' || n.type === 'POWER');
    if (hasPanelComp || activeTemplate === 'MCC-VFD-01') {
      const ulIssues = evaluateUl508aRules(graph, {
        mainBreakerAmps: 100,
        markedPanelSccrKa: 65,
      });
      issues.push(...ulIssues);
    }

    // Check for unassigned / missing wire gauges
    wires.forEach((w) => {
      if (w.awg === 'UNDEFINED' || !w.awg) {
        issues.push({
          id: `DRC-AWG-${w.id}`,
          title: `Unspecified Conductor Wire Gauge on Net ${w.id}`,
          description: `Wire ${w.signalName} (${w.id}) has no assigned wire gauge (AWG). IPC/WHMA-A-620 §4.2 mandates documented cross-sectional sizing on all harness conductors.`,
          severity: 'CRITICAL',
          confidence: 99,
          standardRef: 'IPC/WHMA-A-620 §4.2',
          componentRef: `Wire ${w.id} (${w.signalName})`,
          plainLanguageExplanation: `Without explicit wire gauge specification, manufacturing cannot size crimp terminal tooling or ensure ampacity safety.`,
          recommendation: `Assign standard gauge (e.g. 18 AWG or 16 AWG) based on downstream continuous current load.`,
          bbox: { x: 40, y: 35, width: 20, height: 15 },
          status: 'UNREVIEWED',
        });
      }
    });

    setDiscrepancies(issues);
    setIsDrcRunning(false);
  };

  // Initial DRC run on mount or template change
  useEffect(() => {
    runDrcEvaluation();
  }, [nodes, wires, activeTemplate]);

  // Window-level Mouse Move and Mouse Up Listeners for butter-smooth dragging
  useEffect(() => {
    if (!draggingNode) return;

    const handleWindowMouseMove = (e: MouseEvent) => {
      if (!canvasRef.current) return;
      const rect = canvasRef.current.getBoundingClientRect();
      const rawX = (e.clientX - rect.left) / zoom - draggingNode.offsetX;
      const rawY = (e.clientY - rect.top) / zoom - draggingNode.offsetY;

      // Snap to 10px grid and clamp within canvas boundary
      const clampedX = Math.max(10, Math.min(1050, Math.round(rawX / 10) * 10));
      const clampedY = Math.max(10, Math.min(500, Math.round(rawY / 10) * 10));

      setNodes((prev) =>
        prev.map((n) => (n.id === draggingNode.id ? { ...n, x: clampedX, y: clampedY } : n))
      );
    };

    const handleWindowMouseUp = () => {
      setDraggingNode(null);
    };

    window.addEventListener('mousemove', handleWindowMouseMove);
    window.addEventListener('mouseup', handleWindowMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleWindowMouseMove);
      window.removeEventListener('mouseup', handleWindowMouseUp);
    };
  }, [draggingNode, zoom]);

  // Delete Node and its attached wires
  const handleDeleteNode = (nodeId: string) => {
    setNodes((prev) => prev.filter((n) => n.id !== nodeId));
    setWires((prev) => prev.filter((w) => w.fromNodeId !== nodeId && w.toNodeId !== nodeId));
    if (selectedNodeId === nodeId) setSelectedNodeId(null);
  };

  // Delete Wire
  const handleDeleteWire = (wireId: string) => {
    setWires((prev) => prev.filter((w) => w.id !== wireId));
    if (selectedWireId === wireId) setSelectedWireId(null);
  };

  // Global Keyboard shortcuts: Delete selected wire/node, Escape to cancel
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'SELECT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }

      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedWireId) {
          handleDeleteWire(selectedWireId);
        } else if (selectedNodeId) {
          handleDeleteNode(selectedNodeId);
        }
      } else if (e.key === 'Escape') {
        setConnectingPin(null);
        setSelectedNodeId(null);
        setSelectedWireId(null);
        setSelectedDiscrepancyId(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedNodeId, selectedWireId]);

  // 1-Click Auto-Fix Single Discrepancy
  const handleAutoFixSingle = (d: Discrepancy) => {
    const lowerRef = d.componentRef.toLowerCase();
    const lowerDesc = d.description.toLowerCase();

    // 1. If it's a wire gauge / ampacity issue
    setWires((prev) =>
      prev.map((w) => {
        if (
          lowerRef.includes(w.id.toLowerCase()) ||
          lowerDesc.includes(w.id.toLowerCase()) ||
          (w.signalName && lowerRef.includes(w.signalName.toLowerCase())) ||
          (w.signalName && lowerDesc.includes(w.signalName.toLowerCase()))
        ) {
          if (w.id === 'w-103' || lowerDesc.includes('14a') || lowerDesc.includes('high-current')) {
            return { ...w, awg: '12 AWG' };
          }
          if (w.id === 'w-pe-undersized' || lowerDesc.includes('ground')) {
            return { ...w, awg: '8 AWG' };
          }
          if (w.awg === '20 AWG' || w.awg === 'UNDEFINED') {
            return { ...w, awg: '16 AWG' };
          }
        }
        return w;
      })
    );

    // 2. If it's an unsealed connector cavity / floating pin issue
    if (d.id.startsWith('IPC-PIN-FLOAT-') || lowerDesc.includes('cavity') || lowerDesc.includes('unsealed')) {
      setNodes((prevNodes) =>
        prevNodes.map((node) => {
          if (
            lowerRef.includes(node.designator.toLowerCase()) ||
            lowerDesc.includes(node.designator.toLowerCase()) ||
            lowerRef.includes(node.id.toLowerCase())
          ) {
            const updatedPorts = node.ports.map((port) => {
              const isWireConnected = wires.some(
                (w) =>
                  (w.fromNodeId === node.id && w.fromPortId === port.id) ||
                  (w.toNodeId === node.id && w.toPortId === port.id)
              );
              if (!isWireConnected && !port.signal?.includes('SEALED')) {
                return {
                  ...port,
                  name: port.name.includes('(Sealed)') ? port.name : `${port.name} (Sealed)`,
                  signal: 'SEALED-PLUG',
                };
              }
              return port;
            });
            return { ...node, ports: updatedPorts };
          }
          return node;
        })
      );
    }

    setSelectedDiscrepancyId(null);
  };

  // 1-Click Auto-Remediate All Discrepancies (Wires + Connector Sealing)
  const handleAutoRemediateAll = () => {
    // 1. Upgrade all undersized or undefined wire gauges (w-103 needs 12 AWG for derated 14A load)
    setWires((prev) =>
      prev.map((w) => {
        if (w.id === 'w-103' || w.signalName?.includes('14A') || w.signalName?.includes('High-Current')) {
          return { ...w, awg: '12 AWG' };
        }
        if (w.id === 'w-pe-undersized' || (w.awg === '12 AWG' && w.signalName?.includes('PE'))) {
          return { ...w, awg: '8 AWG' };
        }
        if (w.awg === '20 AWG') return { ...w, awg: '16 AWG' };
        if (w.awg === 'UNDEFINED') return { ...w, awg: '18 AWG' };
        return w;
      })
    );

    // 2. Seal all unassigned connector cavities on all connectors
    setNodes((prevNodes) =>
      prevNodes.map((node) => {
        if (node.type === 'CONNECTOR') {
          const updatedPorts = node.ports.map((port) => {
            const isWireConnected = wires.some(
              (w) =>
                (w.fromNodeId === node.id && w.fromPortId === port.id) ||
                (w.toNodeId === node.id && w.toPortId === port.id)
            );
            if (!isWireConnected && !port.signal?.includes('SEALED')) {
              return {
                ...port,
                name: port.name.includes('(Sealed)') ? port.name : `${port.name} (Sealed)`,
                signal: 'SEALED-PLUG',
              };
            }
            return port;
          });
          return { ...node, ports: updatedPorts };
        }
        return node;
      })
    );

    setSelectedDiscrepancyId(null);
  };

  // Seal cavities for a specific node
  const handleSealNodeCavities = (nodeId: string) => {
    setNodes((prevNodes) =>
      prevNodes.map((node) => {
        if (node.id === nodeId) {
          const updatedPorts = node.ports.map((port) => {
            const isWireConnected = wires.some(
              (w) =>
                (w.fromNodeId === node.id && w.fromPortId === port.id) ||
                (w.toNodeId === node.id && w.toPortId === port.id)
            );
            if (!isWireConnected && !port.signal?.includes('SEALED')) {
              return {
                ...port,
                name: port.name.includes('(Sealed)') ? port.name : `${port.name} (Sealed)`,
                signal: 'SEALED-PLUG',
              };
            }
            return port;
          });
          return { ...node, ports: updatedPorts };
        }
        return node;
      })
    );
  };

  // Update specific wire AWG
  const handleUpdateWireAwg = (wireId: string, newAwg: string) => {
    const updated = wires.map((w) => (w.id === wireId ? { ...w, awg: newAwg } : w));
    setWires(updated);
  };

  // Start Node Dragging
  const handleMouseDownNode = (e: React.MouseEvent, nodeId: string) => {
    e.stopPropagation();
    const node = nodes.find((n) => n.id === nodeId);
    if (!node || !canvasRef.current) return;
    setSelectedNodeId(nodeId);
    setSelectedWireId(null);

    const rect = canvasRef.current.getBoundingClientRect();
    setDraggingNode({
      id: nodeId,
      offsetX: (e.clientX - rect.left) / zoom - node.x,
      offsetY: (e.clientY - rect.top) / zoom - node.y,
    });
  };

  // Pin Connection (Click-to-Route)
  const handlePortClick = (e: React.MouseEvent, nodeId: string, portId: string, portName: string) => {
    e.stopPropagation();
    if (!connectingPin) {
      setConnectingPin({ nodeId, portId, name: portName });
    } else {
      if (connectingPin.nodeId === nodeId && connectingPin.portId === portId) {
        setConnectingPin(null);
        return;
      }
      const newWire: EditorWire = {
        id: `w-${wires.length + 101}`,
        fromNodeId: connectingPin.nodeId,
        fromPortId: connectingPin.portId,
        toNodeId: nodeId,
        toPortId: portId,
        awg: '18 AWG',
        color: '#0284C7',
        signalName: `W-${wires.length + 101} (${connectingPin.portId}\u2192${portId})`,
      };
      setWires([...wires, newWire]);
      setSelectedWireId(newWire.id);
      setSelectedNodeId(null);
      setConnectingPin(null);
    }
  };

  // Find non-overlapping open slot for newly added component
  const findOpenSlot = (type: 'RELAY' | 'CONNECTOR' | 'GROUND') => {
    const candidateSlots: { x: number; y: number }[] = [];
    if (type === 'RELAY') {
      for (const r of [80, 260, 430]) {
        for (const c of [520, 340, 700]) {
          candidateSlots.push({ x: c, y: r });
        }
      }
    } else if (type === 'CONNECTOR') {
      for (const r of [80, 290, 480]) {
        for (const c of [740, 60, 520]) {
          candidateSlots.push({ x: c, y: r });
        }
      }
    } else {
      for (const c of [320, 520, 120]) {
        for (const r of [430, 260, 80]) {
          candidateSlots.push({ x: c, y: r });
        }
      }
    }

    for (const slot of candidateSlots) {
      const isOccupied = nodes.some(
        (n) => Math.abs(n.x - slot.x) < 150 && Math.abs(n.y - slot.y) < 140
      );
      if (!isOccupied) return slot;
    }

    const count = nodes.length;
    return {
      x: 100 + ((count * 60) % 600),
      y: 100 + ((count * 50) % 300),
    };
  };

  // Add new component to canvas without collision
  const handleAddComponent = (type: 'RELAY' | 'CONNECTOR' | 'GROUND') => {
    const count = nodes.length + 1;
    const slot = findOpenSlot(type);
    let newNode: EditorNode;

    if (type === 'RELAY') {
      newNode = {
        id: `n-rly-${count}`,
        name: `Automotive Power Relay (${count})`,
        designator: `K-${count}`,
        type: 'RELAY',
        x: slot.x,
        y: slot.y,
        width: 170,
        height: 160,
        ports: [
          { id: '85', name: 'Pin 85: Coil (-)', type: 'IN', signal: 'GND' },
          { id: '86', name: 'Pin 86: Coil (+)', type: 'IN', signal: '24VDC_CTRL' },
          { id: '30', name: 'Pin 30: Common Feed', type: 'IN', signal: 'PWR_24V' },
          { id: '87', name: 'Pin 87: NO Contact', type: 'OUT', signal: 'LOAD' },
        ],
      };
    } else if (type === 'GROUND') {
      newNode = {
        id: `n-gnd-${count}`,
        name: `PE Ground Bus Lug (${count})`,
        designator: `GND-0${count}`,
        type: 'GROUND',
        x: slot.x,
        y: slot.y,
        width: 170,
        height: 110,
        ports: [
          { id: 'STUD', name: 'Ground Stud M8', type: 'IO', signal: 'EARTH' },
        ],
      };
    } else {
      newNode = {
        id: `n-conn-${count}`,
        name: `Auxiliary Connector (${count})`,
        designator: `J-${count}`,
        type: 'CONNECTOR',
        x: slot.x,
        y: slot.y,
        width: 170,
        height: 160,
        ports: [
          { id: '1', name: 'Pin 1: Signal High', type: 'OUT', signal: 'SIG_HI' },
          { id: '2', name: 'Pin 2: Signal Low', type: 'OUT', signal: 'SIG_LO' },
          { id: '3', name: 'Pin 3: Drain Shield', type: 'IO', signal: 'SHIELD' },
        ],
      };
    }

    setNodes([...nodes, newNode]);
    setSelectedNodeId(newNode.id);
    setSelectedWireId(null);
  };

  // 1-Click Auto-Arrange / Tidy Canvas
  const handleAutoArrange = () => {
    const inputConnectors = nodes.filter(
      (n) => n.type === 'CONNECTOR' && (n.designator.startsWith('J') || n.id.includes('j'))
    );
    const outputConnectors = nodes.filter(
      (n) => n.type === 'CONNECTOR' && !inputConnectors.includes(n)
    );
    const breakersAndPower = nodes.filter((n) => n.type === 'BREAKER' || n.type === 'POWER');
    const relays = nodes.filter((n) => n.type === 'RELAY');
    const grounds = nodes.filter((n) => n.type === 'GROUND');
    const other = nodes.filter(
      (n) =>
        !inputConnectors.includes(n) &&
        !outputConnectors.includes(n) &&
        !breakersAndPower.includes(n) &&
        !relays.includes(n) &&
        !grounds.includes(n)
    );

    let newNodes = [...nodes];

    // Inputs on left: x = 60
    inputConnectors.forEach((n, idx) => {
      newNodes = newNodes.map((node) =>
        node.id === n.id ? { ...node, x: 60, y: 70 + idx * 230 } : node
      );
    });

    // Breakers / Power in center-left: x = 320
    breakersAndPower.forEach((n, idx) => {
      newNodes = newNodes.map((node) =>
        node.id === n.id ? { ...node, x: 320 + idx * 220, y: 70 } : node
      );
    });

    // Relays in center columns: x = 340, 530
    relays.forEach((n, idx) => {
      const col = idx % 2;
      const row = Math.floor(idx / 2);
      newNodes = newNodes.map((node) =>
        node.id === n.id ? { ...node, x: 340 + col * 190, y: 70 + row * 180 } : node
      );
    });

    // Grounds at bottom center: x = 320, y = 430
    grounds.forEach((n, idx) => {
      newNodes = newNodes.map((node) =>
        node.id === n.id ? { ...node, x: 320 + idx * 200, y: 430 } : node
      );
    });

    // Output connectors on right: x = 740
    outputConnectors.forEach((n, idx) => {
      newNodes = newNodes.map((node) =>
        node.id === n.id ? { ...node, x: 740, y: 70 + idx * 210 } : node
      );
    });

    // Any remaining nodes
    other.forEach((n, idx) => {
      newNodes = newNodes.map((node) =>
        node.id === n.id ? { ...node, x: 530, y: 260 + idx * 160 } : node
      );
    });

    setNodes(newNodes);
  };

  // Export Cable Schedule to CSV
  const handleExportCableScheduleCSV = () => {
    let csv = 'Wire Net ID,From Device,From Pin,To Device,To Pin,Wire Gauge (AWG),Wire Color,Signal Name,Compliance Status\n';
    wires.forEach((w) => {
      const fromNode = nodes.find((n) => n.id === w.fromNodeId)?.designator || w.fromNodeId;
      const toNode = nodes.find((n) => n.id === w.toNodeId)?.designator || w.toNodeId;
      const isErr = discrepancies.some(
        (d) =>
          d.componentRef.toLowerCase().includes(w.id.toLowerCase()) ||
          d.description.toLowerCase().includes(w.id.toLowerCase()) ||
          (w.signalName && d.description.toLowerCase().includes(w.signalName.toLowerCase()))
      );
      const status = isErr ? 'NON-COMPLIANT' : 'COMPLIANT';
      csv += `"${w.id}","${fromNode}","${w.fromPortId}","${toNode}","${w.toPortId}","${w.awg}","${w.color}","${w.signalName}","${status}"\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Cable_Schedule_${activeTemplate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Calculate orthogonal SVG paths for wires between ports
  const getPortCoordinates = (nodeId: string, portId: string) => {
    const node = nodes.find((n) => n.id === nodeId);
    if (!node) return { x: 0, y: 0 };
    const portIndex = node.ports.findIndex((p) => p.id === portId);
    const port = node.ports[portIndex];

    const y = node.y + 42 + Math.max(0, portIndex) * 26;
    const x = port?.type === 'IN' ? node.x : node.x + node.width;
    return { x, y };
  };

  const selectedWire = wires.find((w) => w.id === selectedWireId);
  const selectedNode = nodes.find((n) => n.id === selectedNodeId);
  const criticalCount = discrepancies.filter((d) => d.severity === 'CRITICAL').length;
  const majorCount = discrepancies.filter((d) => d.severity === 'MAJOR').length;
  const isDrcClean = discrepancies.length === 0;

  return (
    <div className="bg-[#0A1120] border border-white/10 rounded-2xl overflow-hidden shadow-2xl flex flex-col text-slate-100 font-sans">
      {/* Top Editor Toolbar (Executive Engineering Dark Palette) */}
      <div className="bg-[#0E172C] px-6 py-4 flex flex-wrap items-center justify-between gap-4 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center font-mono font-bold text-sky-400 text-xs">
            CAD
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-white">
                Interactive Schematic CAD Engine
              </h3>
              <span className="text-[10px] px-2 py-0.5 rounded bg-sky-500/10 text-sky-400 font-mono font-bold border border-sky-500/20">
                Phase 8 DRC Active
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Drag components, route orthogonal wires, and verify real-time IPC-620/UL-508A compliance.
            </p>
          </div>
        </div>

        {/* Toolbar Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Template Switcher */}
          <div className="flex items-center gap-1.5 bg-black/40 px-2.5 py-1.5 rounded-xl border border-white/10 text-xs font-mono">
            <span className="text-slate-400 text-[11px]">Template:</span>
            <select
              value={activeTemplate}
              onChange={(e) => handleLoadTemplate(e.target.value)}
              className="bg-transparent text-white font-bold outline-none cursor-pointer text-xs"
            >
              <option value="WH-402" className="bg-[#0A1120] text-slate-100">
                WH-402 (IPC-620 Harness)
              </option>
              <option value="MCC-VFD-01" className="bg-[#0A1120] text-slate-100">
                MCC-VFD-01 (UL-508A Panel)
              </option>
            </select>
          </div>

          {/* Quick Component Addition */}
          <div className="flex items-center gap-1 mr-1">
            <button
              onClick={() => handleAddComponent('CONNECTOR')}
              className="px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white text-[11px] font-mono border border-white/10 transition flex items-center gap-1"
              title="Add Connector block"
            >
              <Plus className="w-3 h-3 text-sky-400" /> +Connector
            </button>
            <button
              onClick={() => handleAddComponent('RELAY')}
              className="px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white text-[11px] font-mono border border-white/10 transition flex items-center gap-1"
              title="Add Relay block"
            >
              <Plus className="w-3 h-3 text-amber-400" /> +Relay
            </button>
            <button
              onClick={() => handleAddComponent('GROUND')}
              className="px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white text-[11px] font-mono border border-white/10 transition flex items-center gap-1"
              title="Add Ground Lug block"
            >
              <Plus className="w-3 h-3 text-emerald-400" /> +Ground
            </button>
          </div>

          {/* Auto-Arrange Button */}
          <button
            onClick={handleAutoArrange}
            className="px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white text-xs font-mono border border-white/10 transition flex items-center gap-1.5"
            title="Auto-Arrange canvas components neatly into schematic layout"
          >
            <LayoutGrid className="w-3.5 h-3.5 text-sky-400" />
            Auto-Arrange
          </button>

          {/* Cable Schedule Button */}
          <button
            onClick={() => setShowSchedule(!showSchedule)}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono flex items-center gap-1.5 transition border ${
              showSchedule
                ? 'bg-[#0284C7] text-white border-sky-400 font-bold shadow-md'
                : 'bg-white/5 hover:bg-white/10 text-slate-300 border-white/10'
            }`}
          >
            <Table className="w-3.5 h-3.5 text-sky-400" />
            Cable Schedule
          </button>

          {/* Auto-Fix All Violations Button */}
          {!isDrcClean && (
            <button
              onClick={handleAutoRemediateAll}
              className="px-3 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-xs font-mono font-bold flex items-center gap-1.5 transition"
              title="1-Click Auto-Fix Wire Gauges &amp; Seal Cavities"
            >
              <Wrench className="w-3.5 h-3.5 text-emerald-400" />
              Auto-Fix All
            </button>
          )}

          {/* Run Live DRC */}
          <button
            onClick={runDrcEvaluation}
            disabled={isDrcRunning}
            className="btn-primary px-4 py-1.5 text-xs font-mono font-bold flex items-center gap-1.5 shadow-lg"
          >
            <Play className={`w-3.5 h-3.5 ${isDrcRunning ? 'animate-spin' : 'fill-current'}`} />
            Run Live DRC
          </button>
        </div>
      </div>

      {/* Pin Connection Active Notification */}
      {connectingPin && (
        <div className="bg-[#0284C7] text-white px-6 py-2 text-xs font-mono font-bold flex items-center justify-between animate-in fade-in">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-white animate-ping" />
            <span>Routing wire from {connectingPin.name}. Click destination pin to complete connection...</span>
          </div>
          <button
            onClick={() => setConnectingPin(null)}
            className="text-[11px] underline text-sky-100 hover:text-white"
          >
            Cancel (Esc)
          </button>
        </div>
      )}

      {/* Real-time Diagnostics Bar (Pass/Fail) */}
      <div
        className={`px-6 py-2.5 flex flex-wrap items-center justify-between gap-4 border-b text-xs font-mono transition ${
          isDrcClean
            ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300'
            : 'bg-rose-950/40 border-rose-500/30 text-rose-300'
        }`}
      >
        <div className="flex items-center gap-3">
          <div
            className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-xs ${
              isDrcClean ? 'bg-emerald-500 text-slate-950' : 'bg-rose-500 text-white'
            }`}
          >
            {isDrcClean ? '✓' : '!'}
          </div>
          <div>
            <span className="font-bold">
              {isDrcClean
                ? 'ALL DRC CHECKS PASSED: 100% Standards Compliant'
                : `DRC VIOLATIONS FLAGGED: ${criticalCount} Critical \u2022 ${majorCount} Major`}
            </span>
            <div className="text-[11px] text-slate-400 font-sans mt-0.5">
              {isDrcClean
                ? 'All conductor ampacities, grounding sizes, and pin terminations satisfy IPC-620 & UL 508A.'
                : `${discrepancies.length} discrepancy markers highlighted on schematic canvas. Click any marker or Auto-Remediate for 1-click fix.`}
            </div>
          </div>
        </div>

        {!isDrcClean && (
          <button
            onClick={handleAutoRemediateAll}
            className="px-3.5 py-1.5 rounded-lg bg-rose-500 text-white font-mono font-bold text-[10px] uppercase hover:bg-rose-400 transition shadow-lg flex items-center gap-1.5"
          >
            <Wrench className="w-3.5 h-3.5" />
            Auto-Remediate {discrepancies.length} Violations
          </button>
        )}
      </div>

      {/* Editor Main Canvas Stage */}
      <div
        ref={canvasRef}
        className="relative h-[620px] bg-[#060B14] overflow-hidden select-none cursor-default"
        onClick={() => {
          if (connectingPin) setConnectingPin(null);
        }}
      >
        {/* Engineering Grid Lines */}
        <div
          className="absolute inset-0 pointer-events-none opacity-20"
          style={{
            backgroundImage: `linear-gradient(to right, rgba(255, 255, 255, 0.15) 1px, transparent 1px), linear-gradient(to bottom, rgba(255, 255, 255, 0.15) 1px, transparent 1px)`,
            backgroundSize: '24px 24px',
          }}
        />

        {/* Scaled Canvas Container */}
        <div
          style={{
            transform: `scale(${zoom})`,
            transformOrigin: 'top left',
            width: `${100 / zoom}%`,
            height: `${100 / zoom}%`,
          }}
          className="relative w-full h-full"
        >
          {/* SVG Wiring & Spatial Overlay Layer */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none z-10">
            <defs>
              <filter id="glow-wire" x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx="0" dy="0" stdDeviation="3" floodColor="#0284C7" floodOpacity="0.8" />
              </filter>
            </defs>

            {/* Wires */}
            {wires.map((w) => {
              const from = getPortCoordinates(w.fromNodeId, w.fromPortId);
              const to = getPortCoordinates(w.toNodeId, w.toPortId);
              const isSelected = selectedWireId === w.id;
              const midX = (from.x + to.x) / 2;

              // Orthogonal 90-degree step path
              const pathData = `M ${from.x} ${from.y} L ${midX} ${from.y} L ${midX} ${to.y} L ${to.x} ${to.y}`;

              const isWireFlagged = discrepancies.some(
                (d) =>
                  d.componentRef.toLowerCase().includes(w.id.toLowerCase()) ||
                  d.description.toLowerCase().includes(w.id.toLowerCase()) ||
                  (w.signalName && d.description.toLowerCase().includes(w.signalName.toLowerCase()))
              );

              return (
                <g
                  key={w.id}
                  className="pointer-events-auto cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedWireId(w.id);
                    setSelectedNodeId(null);
                  }}
                >
                  {/* Glow outline on selection or error */}
                  {(isSelected || isWireFlagged) && (
                    <path
                      d={pathData}
                      fill="none"
                      stroke={isWireFlagged ? '#F43F5E' : '#0284C7'}
                      strokeWidth="7"
                      strokeOpacity={isWireFlagged ? '0.4' : '0.5'}
                    />
                  )}

                  {/* Wire Line */}
                  <path
                    d={pathData}
                    fill="none"
                    stroke={isWireFlagged ? '#F43F5E' : w.color}
                    strokeWidth={w.awg === '8 AWG' || w.awg === '10 AWG' ? 4 : w.awg === '12 AWG' || w.awg === '14 AWG' || w.awg === '16 AWG' ? 3 : 2}
                    strokeDasharray={isWireFlagged ? '8,4' : 'none'}
                  />

                  {/* Wire Label Badge */}
                  <g transform={`translate(${midX}, ${(from.y + to.y) / 2 - 8})`}>
                    <rect
                      x="-45"
                      y="-10"
                      width="90"
                      height="20"
                      rx="5"
                      fill="#0A1120"
                      stroke={isWireFlagged ? '#F43F5E' : '#334155'}
                      strokeWidth="1.5"
                    />
                    <text
                      x="0"
                      y="4"
                      fill={isWireFlagged ? '#FB7185' : '#F1F5F9'}
                      fontSize="9"
                      fontWeight="bold"
                      textAnchor="middle"
                      fontFamily="monospace"
                    >
                      {w.awg}
                    </text>
                  </g>
                </g>
              );
            })}

            {/* PHASE 8: SPATIAL DISCREPANCY OVERLAY */}
            <SpatialDiscrepancyOverlay
              discrepancies={discrepancies}
              nodes={nodes}
              wires={wires}
              selectedDiscrepancyId={selectedDiscrepancyId}
              onSelectDiscrepancy={(d) => setSelectedDiscrepancyId(d ? d.id : null)}
              onAutoFix={handleAutoFixSingle}
            />
          </svg>

          {/* Draggable Component Nodes */}
          {nodes.map((node) => {
            const isSelected = selectedNodeId === node.id;
            const hasUnassignedPorts =
              node.type === 'CONNECTOR' &&
              node.ports.some(
                (p) =>
                  !p.signal?.includes('SEALED') &&
                  !wires.some(
                    (w) =>
                      (w.fromNodeId === node.id && w.fromPortId === p.id) ||
                      (w.toNodeId === node.id && w.toPortId === p.id)
                  )
              );

            return (
              <div
                key={node.id}
                style={{
                  left: `${node.x}px`,
                  top: `${node.y}px`,
                  width: `${node.width}px`,
                }}
                onMouseDown={(e) => handleMouseDownNode(e, node.id)}
                className={`absolute z-20 rounded-xl bg-[#0E172C] border transition-shadow cursor-grab active:cursor-grabbing shadow-2xl ${
                  isSelected
                    ? 'border-sky-400 ring-2 ring-sky-500/40 shadow-sky-500/20'
                    : 'border-white/10 hover:border-white/20'
                }`}
              >
                {/* Component Header with Trash / Actions */}
                <div className="bg-white/[0.04] px-3 py-2 rounded-t-xl border-b border-white/5 flex items-center justify-between gap-1">
                  <div className="min-w-0">
                    <span className="text-[10px] font-mono font-bold text-sky-400 block leading-tight">
                      {node.designator}
                    </span>
                    <div className="text-xs font-bold text-white truncate max-w-[105px]" title={node.name}>
                      {node.name}
                    </div>
                  </div>

                  <div className="flex items-center gap-1 flex-shrink-0">
                    <span className="text-[8.5px] px-1.5 py-0.5 rounded bg-white/10 text-slate-300 font-mono font-bold">
                      {node.type}
                    </span>
                    {/* Delete Component Button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteNode(node.id);
                      }}
                      className="p-1 rounded text-slate-400 hover:text-rose-400 hover:bg-rose-500/20 transition"
                      title="Delete Component"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>

                {/* Component Port List */}
                <div className="p-2 space-y-1">
                  {node.ports.map((port) => {
                    const isConnectingSource =
                      connectingPin?.nodeId === node.id && connectingPin?.portId === port.id;
                    const isSealed = Boolean(
                      port.signal?.toUpperCase().includes('SEALED') ||
                      port.name?.toUpperCase().includes('SEALED')
                    );
                    const isConnected = wires.some(
                      (w) =>
                        (w.fromNodeId === node.id && w.fromPortId === port.id) ||
                        (w.toNodeId === node.id && w.toPortId === port.id)
                    );

                    return (
                      <div
                        key={port.id}
                        onClick={(e) =>
                          handlePortClick(e, node.id, port.id, `${node.designator}:${port.id}`)
                        }
                        className={`flex items-center justify-between text-[11px] p-1.5 rounded-lg cursor-pointer transition ${
                          isConnectingSource
                            ? 'bg-[#0284C7] text-white ring-2 ring-sky-300'
                            : connectingPin && !isConnectingSource
                            ? 'hover:bg-sky-500/20 text-sky-200 border border-sky-500/30'
                            : 'hover:bg-white/5 text-slate-300'
                        }`}
                        title={
                          isSealed
                            ? 'Sealed Cavity (MS27488)'
                            : isConnected
                            ? 'Connected Pin'
                            : 'Click to route wire'
                        }
                      >
                        <div className="flex items-center gap-1.5 truncate">
                          <span
                            className={`w-2 h-2 rounded-full border transition flex-shrink-0 ${
                              isSealed
                                ? 'bg-slate-500 border-slate-400'
                                : port.type === 'IN'
                                ? 'bg-sky-400 border-sky-300'
                                : port.type === 'OUT'
                                ? 'bg-amber-400 border-amber-300'
                                : 'bg-emerald-400 border-emerald-300'
                            }`}
                          />
                          <span className="font-mono text-[10.5px] truncate">{port.name}</span>
                        </div>
                        <span className="font-mono text-[9px] text-slate-400 flex-shrink-0 ml-1">
                          {isSealed ? 'SEALED' : port.signal || port.type}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* Quick Seal Helper if Connector has unsealed pins */}
                {hasUnassignedPorts && (
                  <div className="px-2 pb-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSealNodeCavities(node.id);
                      }}
                      className="w-full py-1 px-2 rounded-lg bg-sky-500/10 hover:bg-sky-500/20 text-sky-300 border border-sky-500/30 text-[9.5px] font-mono font-bold flex items-center justify-center gap-1 transition"
                      title="Seal unused connector cavities with MS27488 plugs"
                    >
                      <ShieldCheck className="w-3 h-3 text-sky-400" />
                      Seal Cavities (MS27488)
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Selected Wire Inspector Floating Panel */}
        {selectedWire && (
          <div className="absolute top-4 left-4 w-72 bg-[#0A1120]/95 backdrop-blur-xl border border-white/10 rounded-xl p-4 shadow-2xl z-30 space-y-3 font-mono">
            <div className="flex items-center justify-between border-b border-white/10 pb-2">
              <span className="text-[11px] font-bold text-sky-400 flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5" /> Conductor: {selectedWire.id}
              </span>
              <button
                onClick={() => setSelectedWireId(null)}
                className="text-xs text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div>
              <label className="text-[10px] text-slate-400 block mb-1">Signal Callout</label>
              <div className="text-xs font-bold text-white bg-black/40 p-2 rounded-lg border border-white/5 truncate">
                {selectedWire.signalName}
              </div>
            </div>

            <div>
              <label className="text-[10px] text-slate-400 block mb-1">
                Conductor Gauge (AWG)
              </label>
              <select
                value={selectedWire.awg}
                onChange={(e) => handleUpdateWireAwg(selectedWire.id, e.target.value)}
                className="w-full bg-black/60 border border-white/10 text-white font-mono text-xs rounded-lg p-2 outline-none focus:border-sky-500"
              >
                <option value="UNDEFINED">UNDEFINED (Flagged IPC Error)</option>
                <option value="8 AWG">8 AWG (UL 508A Table 15.1 - 100A Ground)</option>
                <option value="10 AWG">10 AWG (Up to 60A / Heavy Ground)</option>
                <option value="12 AWG">12 AWG (Up to 30A Feeder / 14A Derated)</option>
                <option value="14 AWG">14 AWG (17A Nominal)</option>
                <option value="16 AWG">16 AWG (Recommended 13A Load)</option>
                <option value="18 AWG">18 AWG (Standard Signal 10A)</option>
                <option value="20 AWG">20 AWG (Signal Lead 7.5A)</option>
              </select>
            </div>

            <div className="pt-1 flex items-center justify-between gap-2 border-t border-white/10">
              <span className="text-[10px] text-slate-400">Net Actions:</span>
              <button
                onClick={() => handleDeleteWire(selectedWire.id)}
                className="px-2.5 py-1 rounded bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 text-[10px] font-bold flex items-center gap-1 transition"
              >
                <Trash2 className="w-3 h-3" /> Delete Net
              </button>
            </div>
          </div>
        )}

        {/* Selected Node Inspector Floating Panel */}
        {selectedNode && !selectedWire && (
          <div className="absolute top-4 left-4 w-72 bg-[#0A1120]/95 backdrop-blur-xl border border-white/10 rounded-xl p-4 shadow-2xl z-30 space-y-3 font-mono">
            <div className="flex items-center justify-between border-b border-white/10 pb-2">
              <span className="text-[11px] font-bold text-sky-400 flex items-center gap-1.5 truncate">
                <Cpu className="w-3.5 h-3.5 text-sky-400" /> {selectedNode.designator}
              </span>
              <button
                onClick={() => setSelectedNodeId(null)}
                className="text-xs text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div>
              <label className="text-[10px] text-slate-400 block mb-1">Component Name</label>
              <div className="text-xs font-bold text-white bg-black/40 p-2 rounded-lg border border-white/5 truncate">
                {selectedNode.name}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-[10px]">
              <div className="bg-black/40 p-2 rounded-lg border border-white/5">
                <span className="text-slate-400 block">Type</span>
                <span className="font-bold text-slate-200">{selectedNode.type}</span>
              </div>
              <div className="bg-black/40 p-2 rounded-lg border border-white/5">
                <span className="text-slate-400 block">Ports</span>
                <span className="font-bold text-slate-200">{selectedNode.ports.length} Cavities</span>
              </div>
            </div>

            {selectedNode.type === 'CONNECTOR' && (
              <button
                onClick={() => handleSealNodeCavities(selectedNode.id)}
                className="w-full py-1.5 px-2 rounded-lg bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 border border-sky-500/40 text-[10px] font-bold flex items-center justify-center gap-1.5 transition"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-sky-400" />
                Seal All Unused Cavities
              </button>
            )}

            <div className="pt-1 flex items-center justify-between gap-2 border-t border-white/10">
              <span className="text-[10px] text-slate-400">Actions:</span>
              <button
                onClick={() => handleDeleteNode(selectedNode.id)}
                className="px-2.5 py-1 rounded bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 text-[10px] font-bold flex items-center gap-1 transition"
              >
                <Trash2 className="w-3 h-3" /> Delete Node
              </button>
            </div>
          </div>
        )}

        {/* Floating Zoom & Pan Controls in Bottom Right */}
        <div className="absolute bottom-4 right-4 z-30 flex items-center gap-1.5 bg-[#0A1120]/90 backdrop-blur border border-white/10 px-2 py-1 rounded-xl text-xs font-mono text-slate-300 shadow-xl">
          <button
            onClick={() => setZoom((z) => Math.max(0.7, +(z - 0.1).toFixed(1)))}
            className="p-1 hover:text-white rounded hover:bg-white/10 transition"
            title="Zoom Out (-)"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <span className="w-12 text-center text-[11px] font-bold text-slate-200">
            {Math.round(zoom * 100)}%
          </span>
          <button
            onClick={() => setZoom((z) => Math.min(1.5, +(z + 0.1).toFixed(1)))}
            className="p-1 hover:text-white rounded hover:bg-white/10 transition"
            title="Zoom In (+)"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setZoom(1)}
            className="p-1 hover:text-white rounded hover:bg-white/10 transition"
            title="Reset Zoom (100%)"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Cable Schedule Drawer */}
      {showSchedule && (
        <div className="bg-[#0E172C] border-t border-white/10 p-6 space-y-4 animate-in fade-in">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <Table className="w-4 h-4 text-sky-400" />
                Live Cable Schedule &amp; Wiring Netlist BOM
              </h4>
              <p className="text-xs text-slate-400">
                Bidirectionally synchronized pin-to-pin schedule derived from current CAD canvas state.
              </p>
            </div>

            <button
              onClick={handleExportCableScheduleCSV}
              className="btn-primary px-3.5 py-1.5 text-xs font-mono font-bold flex items-center gap-1.5 shadow-md"
            >
              <Download className="w-3.5 h-3.5" /> Export Schedule (CSV)
            </button>
          </div>

          <div className="overflow-x-auto rounded-xl border border-white/10">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-black/40 text-slate-400 uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="py-2.5 px-4">Net Tag</th>
                  <th className="py-2.5 px-4">From Pin</th>
                  <th className="py-2.5 px-4">To Pin</th>
                  <th className="py-2.5 px-4">Gauge</th>
                  <th className="py-2.5 px-4">Color</th>
                  <th className="py-2.5 px-4">Signal Description</th>
                  <th className="py-2.5 px-4 text-right">DRC Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-slate-200">
                {wires.map((w) => {
                  const fromNode = nodes.find((n) => n.id === w.fromNodeId)?.designator || w.fromNodeId;
                  const toNode = nodes.find((n) => n.id === w.toNodeId)?.designator || w.toNodeId;
                  const isErr = discrepancies.some(
                    (d) =>
                      d.componentRef.toLowerCase().includes(w.id.toLowerCase()) ||
                      d.description.toLowerCase().includes(w.id.toLowerCase()) ||
                      (w.signalName && d.description.toLowerCase().includes(w.signalName.toLowerCase()))
                  );

                  return (
                    <tr
                      key={w.id}
                      onClick={() => {
                        setSelectedWireId(w.id);
                        setSelectedNodeId(null);
                      }}
                      className="hover:bg-white/5 cursor-pointer transition"
                    >
                      <td className="py-2.5 px-4 font-bold text-sky-400">{w.id}</td>
                      <td className="py-2.5 px-4">{fromNode}:{w.fromPortId}</td>
                      <td className="py-2.5 px-4">{toNode}:{w.toPortId}</td>
                      <td className="py-2.5 px-4 font-bold text-white">{w.awg}</td>
                      <td className="py-2.5 px-4">
                        <span
                          className="inline-block w-2.5 h-2.5 rounded-full mr-1.5 align-middle"
                          style={{ backgroundColor: w.color }}
                        />
                        {w.color}
                      </td>
                      <td className="py-2.5 px-4 text-slate-400">{w.signalName}</td>
                      <td className="py-2.5 px-4 text-right">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            isErr
                              ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                              : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          }`}
                        >
                          {isErr ? 'VIOLATION' : 'PASS'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
