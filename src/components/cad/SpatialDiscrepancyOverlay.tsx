'use client';

import React, { useState } from 'react';
import { Discrepancy } from '@/types/qc';
import { EditorNode, EditorWire } from '@/components/EasySchematicEditor';
import { AlertTriangle, CheckCircle2, Wrench, X, ShieldAlert, ArrowRight } from 'lucide-react';

interface SpatialDiscrepancyOverlayProps {
  discrepancies: Discrepancy[];
  nodes: EditorNode[];
  wires: EditorWire[];
  selectedDiscrepancyId: string | null;
  onSelectDiscrepancy: (discrepancy: Discrepancy | null) => void;
  onAutoFix: (discrepancy: Discrepancy) => void;
}

export const SpatialDiscrepancyOverlay: React.FC<SpatialDiscrepancyOverlayProps> = ({
  discrepancies,
  nodes,
  wires,
  selectedDiscrepancyId,
  onSelectDiscrepancy,
  onAutoFix,
}) => {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  // Helper to resolve spatial anchor point for each discrepancy
  const resolveAnchor = (d: Discrepancy): { x: number; y: number; label: string } => {
    // Check if discrepancy targets a specific wire
    const lowerComp = d.componentRef.toLowerCase();
    const lowerDesc = d.description.toLowerCase();

    for (const wire of wires) {
      if (
        lowerComp.includes(wire.id.toLowerCase()) ||
        lowerDesc.includes(wire.id.toLowerCase()) ||
        (wire.signalName && lowerComp.includes(wire.signalName.toLowerCase())) ||
        (wire.signalName && lowerDesc.includes(wire.signalName.toLowerCase()))
      ) {
        const fromNode = nodes.find((n) => n.id === wire.fromNodeId);
        const toNode = nodes.find((n) => n.id === wire.toNodeId);
        if (fromNode && toNode) {
          const midX = (fromNode.x + toNode.x) / 2 + 80;
          const midY = (fromNode.y + toNode.y) / 2 + 50;
          return { x: midX, y: midY, label: wire.signalName || wire.id };
        }
      }
    }

    // Check if discrepancy targets a node (e.g. J1, P1, CB-MAIN)
    for (const node of nodes) {
      if (
        lowerComp.includes(node.designator.toLowerCase()) ||
        lowerDesc.includes(node.designator.toLowerCase()) ||
        lowerComp.includes(node.id.toLowerCase())
      ) {
        return {
          x: node.x + node.width / 2,
          y: node.y - 18,
          label: node.designator,
        };
      }
    }

    // Default: use discrepancy bbox normalized percentage
    return {
      x: d.bbox.x * 9 + 40,
      y: d.bbox.y * 6 + 40,
      label: d.id,
    };
  };

  const activeModalDiscrepancy = discrepancies.find((d) => d.id === selectedDiscrepancyId);

  return (
    <>
      {/* SVG Spatial Markers */}
      <g className="spatial-discrepancies-layer">
        {discrepancies.map((d) => {
          const anchor = resolveAnchor(d);
          const isSelected = selectedDiscrepancyId === d.id;
          const isHovered = hoveredId === d.id;
          const isCritical = d.severity === 'CRITICAL';

          return (
            <g
              key={d.id}
              className="cursor-pointer transition-transform duration-200"
              transform={`translate(${anchor.x}, ${anchor.y})`}
              onClick={(e) => {
                e.stopPropagation();
                onSelectDiscrepancy(isSelected ? null : d);
              }}
              onMouseEnter={() => setHoveredId(d.id)}
              onMouseLeave={() => setHoveredId(null)}
            >
              {/* Outer Pulsing Glow */}
              <circle
                r={isSelected || isHovered ? 20 : 15}
                className={`${
                  isCritical ? 'fill-rose-500/20 stroke-rose-500' : 'fill-amber-500/20 stroke-amber-500'
                } animate-ping stroke-[1.5]`}
                opacity="0.6"
              />

              {/* Core Badge Circle */}
              <circle
                r={isSelected || isHovered ? 15 : 12}
                className={`${
                  isCritical
                    ? 'fill-rose-600 stroke-rose-300'
                    : 'fill-amber-600 stroke-amber-300'
                } stroke-2 shadow-2xl`}
              />

              {/* Exclamation Symbol */}
              <text
                x="0"
                y="4.5"
                textAnchor="middle"
                fontSize={isSelected || isHovered ? "13" : "11"}
                fontWeight="900"
                fill="#FFFFFF"
                fontFamily="monospace"
              >
                !
              </text>

              {/* Hover Badge Pill */}
              {(isHovered || isSelected) && (
                <g transform="translate(0, -24)">
                  <rect
                    x="-75"
                    y="-12"
                    width="150"
                    height="20"
                    rx="5"
                    className="fill-[#060B14] stroke-white/20 stroke-1 shadow-2xl"
                  />
                  <text
                    x="0"
                    y="2"
                    textAnchor="middle"
                    fontSize="9.5"
                    fontWeight="bold"
                    fill={isCritical ? '#F87171' : '#FBBF24'}
                    fontFamily="monospace"
                  >
                    {d.severity}: {d.standardRef}
                  </text>
                </g>
              )}
            </g>
          );
        })}
      </g>

      {/* Floating Interactive Popover when a discrepancy is selected */}
      {activeModalDiscrepancy && (
        <div
          className="absolute z-50 bg-[#060B14]/95 border border-rose-500/40 rounded-2xl p-5 shadow-2xl backdrop-blur-xl w-96 text-slate-100 font-sans space-y-3 animate-in fade-in zoom-in-95 pointer-events-auto"
          style={{
            top: 20,
            right: 20,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-start justify-between gap-3 pb-2.5 border-b border-white/10">
            <div>
              <div className="flex items-center gap-2">
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                    activeModalDiscrepancy.severity === 'CRITICAL'
                      ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                      : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                  }`}
                >
                  {activeModalDiscrepancy.severity} VIOLATION
                </span>
                <span className="text-[10px] font-mono text-slate-400">
                  {activeModalDiscrepancy.standardRef}
                </span>
              </div>
              <h4 className="text-xs font-bold text-white mt-1">
                {activeModalDiscrepancy.title}
              </h4>
            </div>

            <button
              onClick={() => onSelectDiscrepancy(null)}
              className="p-1 hover:text-white text-slate-400 rounded-lg hover:bg-white/10 transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Description */}
          <p className="text-xs text-slate-300 leading-relaxed font-sans">
            {activeModalDiscrepancy.description}
          </p>

          {/* Explanation */}
          <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5 space-y-1">
            <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block font-bold">
              Engineering Root Cause:
            </span>
            <p className="text-[11px] text-slate-300 leading-normal">
              {activeModalDiscrepancy.plainLanguageExplanation}
            </p>
          </div>

          {/* Recommendation */}
          <div className="p-3 rounded-xl bg-sky-950/40 border border-sky-500/30 space-y-1">
            <span className="text-[10px] font-mono uppercase tracking-wider text-sky-400 block font-bold">
              Mandated Remediation:
            </span>
            <p className="text-[11px] text-sky-200 leading-normal">
              {activeModalDiscrepancy.recommendation}
            </p>
          </div>

          {/* Actions */}
          <div className="pt-2 flex items-center justify-between gap-3">
            <button
              onClick={() => onSelectDiscrepancy(null)}
              className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-mono transition"
            >
              Dismiss
            </button>

            <button
              onClick={() => onAutoFix(activeModalDiscrepancy)}
              className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold font-mono shadow-lg flex items-center gap-1.5 transition"
            >
              <Wrench className="w-3.5 h-3.5" />
              1-Click Auto-Fix
            </button>
          </div>
        </div>
      )}
    </>
  );
};
