'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Discrepancy } from '@/types/qc';
import { ZoomIn, ZoomOut, RotateCcw, Maximize2, Layers } from 'lucide-react';

interface SchematicViewerProps {
  svgKey?: string;
  customImageDataUri?: string;
  discrepancies: Discrepancy[];
  selectedDiscrepancyId: string | null;
  onSelectDiscrepancy: (id: string) => void;
  showOverlays: boolean;
  onToggleOverlays: () => void;
}

export const SchematicViewer: React.FC<SchematicViewerProps> = ({
  svgKey = 'wh-402',
  customImageDataUri,
  discrepancies,
  selectedDiscrepancyId,
  onSelectDiscrepancy,
  showOverlays,
  onToggleOverlays,
}) => {
  const [zoom, setZoom] = useState<number>(1);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [hoveredDiscrepancyId, setHoveredDiscrepancyId] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Reset zoom & pan when diagram changes
  useEffect(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, [svgKey, customImageDataUri]);

  // Handle zoom controls
  const handleZoomIn = () => setZoom((prev) => Math.min(prev + 0.25, 3.5));
  const handleZoomOut = () => setZoom((prev) => Math.max(prev - 0.25, 0.5));
  const handleResetZoom = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  // Dragging logic
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return; // Only left mouse button
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPan({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => setIsDragging(false);

  // Wheel zoom
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
    setZoom((prev) => Math.min(Math.max(prev * zoomFactor, 0.4), 4));
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'CRITICAL':
        return '#EF4444'; // Red
      case 'MAJOR':
        return '#F59E0B'; // Amber
      case 'MINOR':
        return '#38BDF8'; // Sky blue
      default:
        return '#06B6D4';
    }
  };

  // Render vector schematic according to svgKey
  const renderSvgContent = () => {
    if (customImageDataUri) {
      return (
        <image
          href={customImageDataUri}
          x="0"
          y="0"
          width="1000"
          height="650"
          preserveAspectRatio="xMidYMid meet"
        />
      );
    }

    if (svgKey === 'mcc-vfd-01') {
      return renderMCCVFDVector();
    } else if (svgKey === 'tb-200') {
      return renderTB200Vector();
    } else if (svgKey === 'med-100') {
      return renderMed100Vector();
    } else {
      return renderWH402Vector();
    }
  };

  // Wire Harness WH-402 Vector Drawing
  const renderWH402Vector = () => (
    <g>
      {/* Title Block */}
      <rect x="740" y="540" width="240" height="95" fill="#0B132B" stroke="#334155" strokeWidth="1.5" />
      <text x="750" y="560" fill="#94A3B8" fontSize="10" fontFamily="monospace">SPANDSONS HORIZON ENGINEERING</text>
      <text x="750" y="580" fill="#F8FAFC" fontSize="12" fontWeight="bold">DWG: WH-402-REV-C</text>
      <text x="750" y="600" fill="#38BDF8" fontSize="10">STD: IPC/WHMA-A-620 CLASS 3</text>
      <text x="750" y="620" fill="#64748B" fontSize="9">STATUS: RELEASED FOR PRODUCTION</text>

      {/* Grid Coordinates */}
      <text x="20" y="30" fill="#475569" fontSize="10" fontFamily="monospace">LOC A1</text>
      <text x="500" y="30" fill="#475569" fontSize="10" fontFamily="monospace">LOC B1</text>
      <text x="960" y="30" fill="#475569" fontSize="10" fontFamily="monospace">LOC C1</text>

      {/* CONNECTOR J1 (Main ECU 12-Pin) */}
      <rect x="50" y="140" width="130" height="340" rx="8" fill="#1E293B" stroke="#0284C7" strokeWidth="2.5" />
      <rect x="50" y="140" width="130" height="36" fill="#0369A1" />
      <text x="80" y="164" fill="#FFFFFF" fontSize="14" fontWeight="bold">J1 - ECU MAIN</text>
      <text x="65" y="195" fill="#94A3B8" fontSize="10">AMPSEAL 12-PIN</text>

      {/* J1 Pins */}
      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((pin, i) => (
        <g key={pin} transform={`translate(160, ${210 + i * 22})`}>
          <circle cx="0" cy="0" r="5" fill="#38BDF8" />
          <text x="-40" y="4" fill="#CBD5E1" fontSize="10" fontFamily="monospace">PIN {pin}</text>
        </g>
      ))}

      {/* CONNECTOR J2 (Actuator Feed 8-Pin) */}
      <rect x="440" y="100" width="120" height="230" rx="6" fill="#1E293B" stroke="#10B981" strokeWidth="2" />
      <rect x="440" y="100" width="120" height="30" fill="#047857" />
      <text x="460" y="121" fill="#FFFFFF" fontSize="13" fontWeight="bold">J2 - ACTUATOR</text>
      {[1, 2, 3, 4, 5, 6, 7, 8].map((pin, i) => (
        <g key={pin} transform={`translate(460, ${150 + i * 22})`}>
          <circle cx="0" cy="0" r="5" fill="#10B981" />
          <text x="15" y="4" fill="#CBD5E1" fontSize="10" fontFamily="monospace">PIN {pin}</text>
        </g>
      ))}

      {/* CONNECTOR J3 (Sensor Bus 6-Pin) */}
      <rect x="780" y="150" width="130" height="200" rx="6" fill="#1E293B" stroke="#F59E0B" strokeWidth="2" />
      <rect x="780" y="150" width="130" height="30" fill="#B45309" />
      <text x="800" y="171" fill="#FFFFFF" fontSize="13" fontWeight="bold">J3 - SENSOR BUS</text>
      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].slice(0, 8).map((pin, i) => (
        <g key={pin} transform={`translate(800, ${200 + i * 18})`}>
          <circle cx="0" cy="0" r="4.5" fill="#F59E0B" />
          <text x="15" y="4" fill="#CBD5E1" fontSize="9" fontFamily="monospace">P{pin} {pin === 12 ? '(GND/VCC)' : ''}</text>
        </g>
      ))}

      {/* WIRE TRACES */}
      {/* Wire W-101 (20 AWG RED) */}
      <path d="M 165 210 L 320 210 L 320 150 L 455 150" fill="none" stroke="#EF4444" strokeWidth="3" />
      <text x="210" y="200" fill="#F87171" fontSize="9" fontFamily="monospace">W-101 [20 AWG RED] +12V</text>

      {/* Wire W-102 (20 AWG BLK) */}
      <path d="M 165 232 L 300 232 L 300 172 L 455 172" fill="none" stroke="#64748B" strokeWidth="3" />
      <text x="210" y="246" fill="#94A3B8" fontSize="9" fontFamily="monospace">W-102 [20 AWG BLK] PWR_GND</text>

      {/* Wire W-103 (High Current Line - MISSING AWG FLAG) */}
      <path d="M 165 276 L 330 276 L 330 194 L 455 194" fill="none" stroke="#38BDF8" strokeWidth="4" strokeDasharray="6,2" />
      <rect x="230" y="260" width="130" height="24" rx="4" fill="#1E293B" stroke="#EF4444" strokeWidth="1.5" />
      <text x="238" y="276" fill="#EF4444" fontSize="10" fontWeight="bold">W-103 [NO AWG DECLARED]</text>

      {/* Wire W-104 (Netlist Mismatch BLK vs BLU) */}
      <path d="M 460 216 L 620 216 L 620 200 L 795 200" fill="none" stroke="#3B82F6" strokeWidth="2.5" />
      <rect x="580" y="180" width="140" height="22" rx="3" fill="#1E293B" stroke="#F59E0B" strokeWidth="1.5" />
      <text x="585" y="195" fill="#FBBF24" fontSize="9" fontFamily="monospace">NET L4: SCH=BLK / BOM=BLU</text>

      {/* Shielded Cable Bundle B-1 with Splice SP-02 */}
      <rect x="360" y="380" width="220" height="50" rx="8" fill="#1E293B" stroke="#64748B" strokeWidth="1.5" strokeDasharray="4,4" />
      <text x="370" y="400" fill="#94A3B8" fontSize="10">SHIELDED HARNESS BUNDLE B-1</text>
      
      {/* Splice SP-02 */}
      <circle cx="470" cy="415" r="9" fill="#0EA5E9" stroke="#E2E8F0" strokeWidth="2" />
      <text x="490" y="420" fill="#E2E8F0" fontSize="10" fontWeight="bold">SPLICE SP-02</text>
      <text x="490" y="433" fill="#EF4444" fontSize="8">[NO DEST REF TAG]</text>

      {/* Shield Drain wire exceeding 25mm */}
      <path d="M 580 405 L 720 405 L 720 490 L 780 490" fill="none" stroke="#94A3B8" strokeWidth="2.5" />
      <circle cx="780" cy="490" r="8" fill="#64748B" stroke="#38BDF8" strokeWidth="2" />
      <text x="750" y="515" fill="#F59E0B" fontSize="9">DRAIN WIRE: 48mm (MAX 25mm)</text>

      {/* J3 Pin 12 crossed to +28V VCC */}
      <path d="M 800 326 L 870 326 L 870 120 L 720 120" fill="none" stroke="#EF4444" strokeWidth="3" />
      <rect x="740" y="105" width="160" height="22" rx="4" fill="#450A0A" stroke="#EF4444" strokeWidth="1.5" />
      <text x="746" y="120" fill="#FCA5A5" fontSize="9" fontWeight="bold">D-006: PIN 12 TO +28V BUS</text>
    </g>
  );

  // MCC-VFD-01 Industrial Control Panel Vector Drawing
  const renderMCCVFDVector = () => (
    <g>
      {/* Title Block */}
      <rect x="740" y="540" width="240" height="95" fill="#0B132B" stroke="#334155" strokeWidth="1.5" />
      <text x="750" y="560" fill="#94A3B8" fontSize="10" fontFamily="monospace">SPANDSONS HORIZON ENGINEERING</text>
      <text x="750" y="580" fill="#F8FAFC" fontSize="12" fontWeight="bold">DWG: MCC-VFD-01-REV-E</text>
      <text x="750" y="600" fill="#38BDF8" fontSize="10">STD: UL 508A / NFPA 79</text>

      {/* 480VAC 3-Phase Incoming Bus */}
      <rect x="60" y="80" width="30" height="480" fill="#1E293B" stroke="#334155" />
      <text x="65" y="105" fill="#EF4444" fontSize="12" fontWeight="bold">L1</text>
      <text x="65" y="125" fill="#F59E0B" fontSize="12" fontWeight="bold">L2</text>
      <text x="65" y="145" fill="#3B82F6" fontSize="12" fontWeight="bold">L3</text>
      <text x="70" y="240" fill="#64748B" fontSize="10" transform="rotate(-90, 70, 240)">480VAC MAIN BUS</text>

      {/* D-102: Clearance violation to wall */}
      <rect x="20" y="60" width="14" height="520" fill="#334155" />
      <text x="22" y="120" fill="#94A3B8" fontSize="8" transform="rotate(-90, 22, 120)">ENCLOSURE STEEL WALL</text>
      <line x1="34" y1="90" x2="60" y2="90" stroke="#EF4444" strokeWidth="2" strokeDasharray="3,3" />
      <text x="35" y="82" fill="#EF4444" fontSize="8">0.32&quot; (&lt;0.50&quot;)</text>

      {/* Main Circuit Breaker CB-01 & Branch CB-02 */}
      <rect x="180" y="120" width="110" height="130" rx="4" fill="#1E293B" stroke="#38BDF8" strokeWidth="2" />
      <text x="195" y="145" fill="#F8FAFC" fontSize="12" fontWeight="bold">CB-01 (100A)</text>
      <text x="195" y="165" fill="#94A3B8" fontSize="10">MAIN FEEDER</text>

      <rect x="180" y="300" width="110" height="130" rx="4" fill="#1E293B" stroke="#EF4444" strokeWidth="2" />
      <text x="195" y="325" fill="#F8FAFC" fontSize="12" fontWeight="bold">CB-02 (60A)</text>
      <text x="195" y="345" fill="#EF4444" fontSize="10">12 AWG GND [REQ: 10]</text>

      {/* VFD Inverter Drive Module */}
      <rect x="420" y="120" width="180" height="240" rx="6" fill="#1E293B" stroke="#10B981" strokeWidth="2" />
      <text x="440" y="150" fill="#F8FAFC" fontSize="14" fontWeight="bold">VFD DRIVE 15HP</text>
      <text x="440" y="175" fill="#10B981" fontSize="10">VARIABLE FREQUENCY</text>
      <rect x="440" y="190" width="140" height="60" fill="#0F172A" rx="4" />
      <text x="450" y="215" fill="#38BDF8" fontSize="11" fontFamily="monospace">POWER: 11.2 kW</text>
      <text x="450" y="235" fill="#38BDF8" fontSize="11" fontFamily="monospace">OUTPUT: 0-60 Hz</text>

      {/* Contactor MTR-1 & Motor */}
      <rect x="700" y="150" width="140" height="120" rx="4" fill="#1E293B" stroke="#F59E0B" strokeWidth="2" />
      <text x="720" y="175" fill="#F8FAFC" fontSize="12" fontWeight="bold">MTR-1 CONTACTOR</text>
      <text x="720" y="195" fill="#F59E0B" fontSize="9">MISSING FLA RATING</text>
      <circle cx="770" cy="235" r="16" fill="#0F172A" stroke="#38BDF8" strokeWidth="1.5" />
      <text x="765" y="240" fill="#38BDF8" fontSize="14" fontWeight="bold">M</text>

      {/* Single Channel E-Stop circuit D-103 */}
      <rect x="420" y="420" width="220" height="90" rx="6" fill="#450A0A" stroke="#EF4444" strokeWidth="2" />
      <text x="435" y="445" fill="#FCA5A5" fontSize="12" fontWeight="bold">E-STOP-01 CIRCUIT</text>
      <text x="435" y="465" fill="#F87171" fontSize="10">DIRECT TO VFD DI-3 (NON-REDUNDANT)</text>
      <text x="435" y="485" fill="#CBD5E1" fontSize="9">VIOLATES NFPA 79 §9.2.5 DUAL-CHANNEL</text>
    </g>
  );

  // PLC Terminal Board TB-200 Vector Drawing
  const renderTB200Vector = () => (
    <g>
      {/* Title Block */}
      <rect x="740" y="540" width="240" height="95" fill="#0B132B" stroke="#334155" strokeWidth="1.5" />
      <text x="750" y="560" fill="#94A3B8" fontSize="10" fontFamily="monospace">SPANDSONS HORIZON ENGINEERING</text>
      <text x="750" y="580" fill="#F8FAFC" fontSize="12" fontWeight="bold">DWG: TB-200-REV-A</text>
      <text x="750" y="600" fill="#38BDF8" fontSize="10">STD: IPC-A-610 CLASS 2</text>

      {/* DIN Rail */}
      <rect x="80" y="220" width="820" height="35" fill="#334155" stroke="#475569" />
      <text x="90" y="242" fill="#94A3B8" fontSize="10" fontFamily="monospace">TS35 DIN RAIL 35mm</text>

      {/* Terminal Block Group TB1 (Power & Digital) */}
      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((t, idx) => (
        <g key={t} transform={`translate(${140 + idx * 36}, 160)`}>
          <rect x="0" y="0" width="32" height="160" rx="2" fill="#1E293B" stroke="#64748B" strokeWidth="1.5" />
          <rect x="4" y="8" width="24" height="24" rx="2" fill="#0F172A" />
          <text x="9" y="24" fill="#38BDF8" fontSize="10" fontWeight="bold">{t}</text>
          <text x="6" y="90" fill="#94A3B8" fontSize="8" transform="rotate(-90, 6, 90)">TB1-{t}</text>
        </g>
      ))}

      {/* Terminal Block Group TB2 (Analog & Sensors) */}
      {[11, 12, 13, 14, 15, 16, 17, 18, 19, 20].map((t, idx) => (
        <g key={t} transform={`translate(${540 + idx * 36}, 160)`}>
          <rect x="0" y="0" width="32" height="160" rx="2" fill="#1E293B" stroke="#64748B" strokeWidth="1.5" />
          <rect x="4" y="8" width="24" height="24" rx="2" fill="#0F172A" />
          <text x="7" y="24" fill="#10B981" fontSize="10" fontWeight="bold">{t}</text>
          <text x="6" y="90" fill="#94A3B8" fontSize="8" transform="rotate(-90, 6, 90)">TB2-{t}</text>
        </g>
      ))}

      {/* Missing Jumper at TB2-14 to 15 */}
      <line x1="648" y1="280" x2="720" y2="280" stroke="#F59E0B" strokeWidth="3" strokeDasharray="4,4" />
      <rect x="635" y="295" width="120" height="24" rx="3" fill="#1E293B" stroke="#F59E0B" strokeWidth="1.5" />
      <text x="640" y="311" fill="#F59E0B" fontSize="9" fontWeight="bold">D-201: MISSING JUMPER</text>

      {/* Unferruled Stranded Wires D-202 */}
      <rect x="135" y="340" width="160" height="50" rx="4" fill="#1E293B" stroke="#38BDF8" strokeWidth="1.5" />
      <text x="145" y="360" fill="#38BDF8" fontSize="10" fontWeight="bold">D-202: NO FERRULE CALLOUT</text>
      <text x="145" y="378" fill="#94A3B8" fontSize="8">Stranded 20 AWG into Spring Clamp</text>

      {/* Analog Loop Inversion D-204 */}
      <rect x="710" y="380" width="170" height="60" rx="4" fill="#1E293B" stroke="#F59E0B" strokeWidth="1.5" />
      <text x="720" y="405" fill="#F59E0B" fontSize="11" fontWeight="bold">TX-3 (4-20mA)</text>
      <text x="720" y="425" fill="#EF4444" fontSize="9">POLARITY REVERSED ON SIG+/RET-</text>
    </g>
  );

  // Clean PASS Medical 100 Vector Drawing
  const renderMed100Vector = () => (
    <g>
      {/* Title Block */}
      <rect x="740" y="540" width="240" height="95" fill="#0B132B" stroke="#334155" strokeWidth="1.5" />
      <text x="750" y="560" fill="#94A3B8" fontSize="10" fontFamily="monospace">SPANDSONS HORIZON ENGINEERING</text>
      <text x="750" y="580" fill="#F8FAFC" fontSize="12" fontWeight="bold">DWG: MED-100-REV-B</text>
      <text x="750" y="600" fill="#10B981" fontSize="10">QC RESULT: 100% VERIFIED PASS</text>

      {/* Connector P1 (Medical Circular Lemo Style) */}
      <circle cx="180" cy="300" r="80" fill="#1E293B" stroke="#10B981" strokeWidth="3" />
      <circle cx="180" cy="300" r="50" fill="#0F172A" stroke="#38BDF8" strokeWidth="1.5" />
      <text x="135" y="200" fill="#10B981" fontSize="14" fontWeight="bold">P1 - SENSOR HEAD</text>
      <text x="135" y="215" fill="#94A3B8" fontSize="9">LEMO 6-PIN BIO-COMPATIBLE</text>

      {/* Shielded Silicone Sheath */}
      <rect x="260" y="280" width="460" height="40" rx="10" fill="#334155" stroke="#10B981" strokeWidth="1.5" />
      <text x="320" y="305" fill="#F8FAFC" fontSize="11">DUAL BRAID SHIELDED SILICONE (USP CLASS VI)</text>

      {/* Connector J1 (Patient Monitor Interface) */}
      <rect x="720" y="210" width="120" height="180" rx="8" fill="#1E293B" stroke="#10B981" strokeWidth="2.5" />
      <text x="735" y="235" fill="#10B981" fontSize="12" fontWeight="bold">J1 - MONITOR PLUG</text>
      
      {/* All checks passed badge */}
      <rect x="360" y="420" width="280" height="60" rx="8" fill="#064E3B" stroke="#10B981" strokeWidth="2" />
      <text x="385" y="445" fill="#6EE7B7" fontSize="14" fontWeight="bold">142 OF 142 CHECKS PASSED</text>
      <text x="400" y="465" fill="#A7F3D0" fontSize="10">Zero Discrepancies Flagged by AI Engine</text>
    </g>
  );

  return (
    <div className="relative w-full h-[580px] bg-[#090D16] rounded-xl overflow-hidden border border-[#1E293B] shadow-2xl flex flex-col select-none">
      {/* Top Toolbar */}
      <div className="h-12 bg-[#0F172A]/90 backdrop-blur border-b border-[#1E293B] px-4 flex items-center justify-between z-20">
        <div className="flex items-center gap-3">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
            Vector Schematic Inspection Canvas
          </span>
          <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">
            {svgKey.toUpperCase()}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Toggle Overlays */}
          <button
            onClick={onToggleOverlays}
            className={`px-2.5 py-1 text-xs rounded-md font-medium flex items-center gap-1.5 transition-all ${
              showOverlays
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                : 'bg-slate-800 text-slate-400 hover:text-slate-200'
            }`}
            title="Toggle Discrepancy Bounding Boxes"
          >
            <Layers className="w-3.5 h-3.5" />
            {showOverlays ? 'Bounding Boxes: ON' : 'Bounding Boxes: OFF'}
          </button>

          <div className="h-4 w-[1px] bg-slate-700 mx-1"></div>

          {/* Zoom Buttons */}
          <button
            onClick={handleZoomIn}
            className="p-1.5 text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-700 rounded transition"
            title="Zoom In"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <span className="text-xs font-mono text-slate-400 w-12 text-center">
            {Math.round(zoom * 100)}%
          </span>
          <button
            onClick={handleZoomOut}
            className="p-1.5 text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-700 rounded transition"
            title="Zoom Out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <button
            onClick={handleResetZoom}
            className="p-1.5 text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-700 rounded transition"
            title="Reset Pan & Zoom"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Canvas Area */}
      <div
        ref={containerRef}
        className="relative flex-1 cursor-grab active:cursor-grabbing overflow-hidden bg-[#070A10]"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
      >
        {/* Subtle CAD Background Grid */}
        <div
          className="absolute inset-0 pointer-events-none opacity-25"
          style={{
            backgroundImage: `
              radial-gradient(circle at 1px 1px, rgba(56, 189, 248, 0.25) 1px, transparent 0)
            `,
            backgroundSize: `${30 * zoom}px ${30 * zoom}px`,
            backgroundPosition: `${pan.x}px ${pan.y}px`,
          }}
        />

        {/* Transformed SVG / Visual Stage */}
        <div
          className="absolute inset-0 flex items-center justify-center transition-transform duration-75 ease-out origin-center"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          }}
        >
          <div className="relative w-[1000px] h-[650px] bg-[#0B0F19] rounded-lg shadow-2xl border border-slate-800/60 p-4">
            <svg
              viewBox="0 0 1000 650"
              width="1000"
              height="650"
              className="w-full h-full block"
              xmlns="http://www.w3.org/2000/svg"
            >
              <defs>
                <pattern id="cadGrid" width="20" height="20" patternUnits="userSpaceOnUse">
                  <path d="M 20 0 L 0 0 0 20" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="0.5" />
                </pattern>
                {/* Glow Filter for Selected Box */}
                <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="3" result="blur" />
                  <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
              </defs>

              {/* Blueprint background grid */}
              <rect width="1000" height="650" fill="url(#cadGrid)" />

              {/* Render Diagram Entities */}
              {renderSvgContent()}

              {/* Discrepancy Bounding Boxes & Pins */}
              {showOverlays &&
                discrepancies.map((d) => {
                  const isSelected = selectedDiscrepancyId === d.id;
                  const isHovered = hoveredDiscrepancyId === d.id;
                  const color = getSeverityColor(d.severity);

                  // Convert percentage bounding box to 1000x650 SVG units
                  const x = (d.bbox.x / 100) * 1000;
                  const y = (d.bbox.y / 100) * 650;
                  const w = (d.bbox.width / 100) * 1000;
                  const h = (d.bbox.height / 100) * 650;

                  return (
                    <g
                      key={d.id}
                      className="cursor-pointer transition-all duration-200"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectDiscrepancy(d.id);
                      }}
                      onMouseEnter={() => setHoveredDiscrepancyId(d.id)}
                      onMouseLeave={() => setHoveredDiscrepancyId(null)}
                    >
                      {/* Bounding Box Outline */}
                      <rect
                        x={x}
                        y={y}
                        width={w}
                        height={h}
                        rx="6"
                        fill={isSelected ? `${color}25` : isHovered ? `${color}15` : 'transparent'}
                        stroke={color}
                        strokeWidth={isSelected ? '3' : '2'}
                        strokeDasharray={isSelected ? 'none' : '6,3'}
                        filter={isSelected ? 'url(#glow)' : undefined}
                      />

                      {/* Discrepancy Pin Badge */}
                      <g transform={`translate(${x}, ${y - 12})`}>
                        <rect
                          x="0"
                          y="0"
                          width="64"
                          height="20"
                          rx="4"
                          fill={color}
                          filter="drop-shadow(0 2px 4px rgba(0,0,0,0.5))"
                        />
                        <text
                          x="32"
                          y="14"
                          fill="#FFFFFF"
                          fontSize="10"
                          fontWeight="bold"
                          textAnchor="middle"
                          fontFamily="monospace"
                        >
                          {d.id}
                        </text>
                      </g>

                      {/* Radar Pulse when Selected */}
                      {isSelected && (
                        <circle
                          cx={x + w / 2}
                          cy={y + h / 2}
                          r="12"
                          fill="none"
                          stroke={color}
                          strokeWidth="2"
                          className="animate-ping"
                        />
                      )}
                    </g>
                  );
                })}
            </svg>
          </div>
        </div>

        {/* Hover / Selection Floating Info Card at Bottom */}
        {selectedDiscrepancyId && (
          <div className="absolute bottom-3 left-4 right-4 md:right-auto md:w-96 bg-slate-900/95 backdrop-blur-md border border-slate-700/80 rounded-lg p-3 shadow-xl z-20 animate-in fade-in slide-in-from-bottom-2">
            {(() => {
              const active = discrepancies.find((d) => d.id === selectedDiscrepancyId);
              if (!active) return null;
              const color = getSeverityColor(active.severity);
              return (
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span
                      className="px-2 py-0.5 rounded text-[11px] font-bold font-mono text-white"
                      style={{ backgroundColor: color }}
                    >
                      {active.id} • {active.severity}
                    </span>
                    <span className="text-xs font-semibold text-slate-300">
                      {active.confidence}% Confidence
                    </span>
                  </div>
                  <h4 className="text-sm font-semibold text-slate-100 line-clamp-1">
                    {active.title}
                  </h4>
                  <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                    {active.plainLanguageExplanation}
                  </p>
                  <div className="mt-2 pt-2 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
                    <span className="font-mono text-cyan-400">{active.standardRef}</span>
                    <span className="text-slate-500">Click in report table for full audit details</span>
                  </div>
                </div>
              );
            })()}
          </div>
        )}
      </div>
    </div>
  );
};
