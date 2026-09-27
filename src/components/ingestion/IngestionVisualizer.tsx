'use client';

import React, { useState } from 'react';
import { DrawingZones } from '@/lib/ingestion/bounds-extractor';
import { ExtractedToken, WireScheduleEntry } from '@/lib/ingestion/token-extractor';
import {
  Table,
  ShieldCheck,
  Hash,
  ArrowRight,
} from 'lucide-react';

interface IngestionVisualizerProps {
  fileName: string;
  fileType: string;
  sha256Hash: string;
  pageCount: number;
  zones: DrawingZones;
  tokens: ExtractedToken[];
  wireTable: WireScheduleEntry[];
  onProceedToNetlist?: () => void;
}

export const IngestionVisualizer: React.FC<IngestionVisualizerProps> = ({
  fileName,
  fileType,
  sha256Hash,
  pageCount,
  zones,
  tokens,
  wireTable,
  onProceedToNetlist,
}) => {
  const [showZones, setShowZones] = useState(true);
  const [showTokens, setShowTokens] = useState(true);
  const [selectedToken, setSelectedToken] = useState<ExtractedToken | null>(null);

  return (
    <div className="bg-[#0A1120] border border-white/10 rounded-2xl p-6 shadow-2xl space-y-6 text-slate-100 select-none">
      {/* Top Pre-Flight Diagnostic Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-white/10">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-mono font-bold text-xs">
              INGESTION STAGE 01 PASS
            </span>
            <span className="text-xs font-mono text-slate-400">
              {fileName} ({fileType} &bull; {pageCount} {pageCount === 1 ? 'Page' : 'Pages'})
            </span>
          </div>
          <h3 className="text-lg font-bold text-white mt-1">
            Optical Layout Segmentation &amp; Text Tokenization
          </h3>
        </div>

        {/* Security & Verification Pills */}
        <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono">
          <div className="px-2.5 py-1 rounded bg-black/40 border border-white/10 text-slate-300 flex items-center gap-1.5">
            <Hash className="w-3 h-3 text-sky-400" />
            <span title={sha256Hash}>SHA-256: {sha256Hash.slice(0, 10)}...</span>
          </div>
          <div className="px-2.5 py-1 rounded bg-emerald-500/5 border border-emerald-500/20 text-emerald-400 flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Clean / Sanitized</span>
          </div>
        </div>
      </div>

      {/* Layer Toggle Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/5 text-xs font-mono">
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 cursor-pointer text-slate-300 hover:text-white">
            <input
              type="checkbox"
              checked={showZones}
              onChange={(e) => setShowZones(e.target.checked)}
              className="accent-sky-400 rounded cursor-pointer"
            />
            <span>Show Drawing Zones ({zones ? '4 Active' : '0'})</span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer text-slate-300 hover:text-white">
            <input
              type="checkbox"
              checked={showTokens}
              onChange={(e) => setShowTokens(e.target.checked)}
              className="accent-sky-400 rounded cursor-pointer"
            />
            <span>Show Electrical Tokens ({tokens.length} Extracted)</span>
          </label>
        </div>

        <div className="flex items-center gap-3 text-slate-400">
          <span className="inline-flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500/40 border border-emerald-400" />
            Schematic Canvas
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-sm bg-purple-500/40 border border-purple-400" />
            Wire Table
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-sm bg-sky-500/40 border border-sky-400" />
            Title Block
          </span>

          {onProceedToNetlist && (
            <button
              onClick={onProceedToNetlist}
              className="ml-2 px-2.5 py-1 rounded bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 border border-sky-500/30 text-[11px] font-mono font-medium transition flex items-center gap-1.5"
            >
              <span>Netlist Graph</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* Interactive 2D Layout Canvas (1000x1000 Coordinate Simulator) */}
      <div className="relative w-full aspect-[16/9] bg-black/60 border border-white/10 rounded-xl overflow-hidden shadow-inner">
        {/* Subtle Grid Backdrop */}
        <div
          className="absolute inset-0 opacity-15 pointer-events-none"
          style={{
            backgroundImage:
              'radial-gradient(circle, #38BDF8 1px, transparent 1px)',
            backgroundSize: '24px 24px',
          }}
        />

        {/* Zone 1: Schematic Canvas */}
        {showZones && (
          <div
            className="absolute border-2 border-emerald-500/50 bg-emerald-500/5 rounded transition-all pointer-events-none flex flex-col justify-between p-2"
            style={{
              left: `${zones.schematicCanvas.x / 10}%`,
              top: `${zones.schematicCanvas.y / 10}%`,
              width: `${zones.schematicCanvas.width / 10}%`,
              height: `${zones.schematicCanvas.height / 10}%`,
            }}
          >
            <span className="text-[10px] font-mono text-emerald-400 font-bold bg-black/70 px-1.5 py-0.5 rounded self-start border border-emerald-500/30">
              CORE SCHEMATIC CANVAS
            </span>
          </div>
        )}

        {/* Zone 2: Wire Schedule Table */}
        {showZones && (
          <div
            className="absolute border-2 border-purple-500/50 bg-purple-500/5 rounded transition-all pointer-events-none flex flex-col justify-between p-2"
            style={{
              left: `${zones.wireScheduleTable.x / 10}%`,
              top: `${zones.wireScheduleTable.y / 10}%`,
              width: `${zones.wireScheduleTable.width / 10}%`,
              height: `${zones.wireScheduleTable.height / 10}%`,
            }}
          >
            <span className="text-[10px] font-mono text-purple-400 font-bold bg-black/70 px-1.5 py-0.5 rounded self-start border border-purple-500/30">
              WIRE SCHEDULE TABLE ({wireTable.length} NETS)
            </span>
          </div>
        )}

        {/* Zone 3: Title Block */}
        {showZones && (
          <div
            className="absolute border-2 border-sky-500/50 bg-sky-500/5 rounded transition-all pointer-events-none flex flex-col justify-between p-2"
            style={{
              left: `${zones.titleBlock.x / 10}%`,
              top: `${zones.titleBlock.y / 10}%`,
              width: `${zones.titleBlock.width / 10}%`,
              height: `${zones.titleBlock.height / 10}%`,
            }}
          >
            <span className="text-[10px] font-mono text-sky-400 font-bold bg-black/70 px-1.5 py-0.5 rounded self-start border border-sky-500/30">
              TITLE BLOCK ({zones.titleBlockMetadata.drawingNumber})
            </span>
            <div className="text-[9px] font-mono text-slate-400 bg-black/70 p-1 rounded">
              Rev: {zones.titleBlockMetadata.revision} &bull; Sheet: {zones.titleBlockMetadata.sheetNumber}
            </div>
          </div>
        )}

        {/* Optical Tokens Overlay */}
        {showTokens &&
          tokens.map((tok) => {
            const isSelected = selectedToken?.id === tok.id;
            const badgeColor =
              tok.type === 'CONNECTOR'
                ? 'bg-sky-500/20 text-sky-300 border-sky-500/50'
                : tok.type === 'WIRE_TAG'
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/50'
                : tok.type === 'GAUGE'
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50'
                : 'bg-white/10 text-white border-white/20';

            return (
              <button
                key={tok.id}
                onClick={() => setSelectedToken(tok)}
                className={`absolute rounded border px-1 py-0.5 text-[9px] font-mono font-bold transition-transform hover:scale-110 shadow-sm ${badgeColor} ${
                  isSelected ? 'ring-2 ring-white scale-110 z-20' : 'z-10'
                }`}
                style={{
                  left: `${tok.bbox.x / 10}%`,
                  top: `${tok.bbox.y / 10}%`,
                }}
                title={`${tok.type}: ${tok.text} (${Math.round(tok.confidence * 100)}% conf)`}
              >
                {tok.text}
              </button>
            );
          })}
      </div>

      {/* Selected Token Inspector */}
      {selectedToken && (
        <div className="p-4 rounded-xl bg-white/[0.03] border border-sky-500/30 flex items-center justify-between text-xs font-mono">
          <div className="flex items-center gap-3">
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-sky-500/10 text-sky-400 border border-sky-500/20">
              {selectedToken.type}
            </span>
            <span className="text-white font-bold">{selectedToken.text}</span>
            <span className="text-slate-400">
              Coordinates: [X: {selectedToken.bbox.x}, Y: {selectedToken.bbox.y}, W: {selectedToken.bbox.width}, H: {selectedToken.bbox.height}]
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-emerald-400 font-bold">
              {Math.round(selectedToken.confidence * 100)}% Confidence
            </span>
            <button
              onClick={() => setSelectedToken(null)}
              className="text-slate-500 hover:text-white"
            >
              &times;
            </button>
          </div>
        </div>
      )}

      {/* Wire Schedule Table Extract Preview */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-bold font-mono text-white uppercase tracking-wider flex items-center gap-2">
            <Table className="w-3.5 h-3.5 text-purple-400" />
            Extracted Wire Schedule Table ({wireTable.length} Conductors)
          </h4>
          <span className="text-[11px] font-mono text-slate-400">
            Auto-parsed for IPC-620 Ampacity &amp; Gauge verification
          </span>
        </div>

        <div className="overflow-x-auto rounded-xl border border-white/10 bg-black/30">
          <table className="w-full text-left text-xs font-mono border-collapse">
            <thead>
              <tr className="border-b border-white/10 text-slate-400 bg-white/[0.02]">
                <th className="py-2 px-3">Wire ID</th>
                <th className="py-2 px-3">From Conn &bull; Pin</th>
                <th className="py-2 px-3">To Conn &bull; Pin</th>
                <th className="py-2 px-3">Gauge</th>
                <th className="py-2 px-3">Color</th>
                <th className="py-2 px-3">Voltage Domain</th>
                <th className="py-2 px-3 text-right">Continuous Amps</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-slate-300">
              {wireTable.map((wire, idx) => (
                <tr key={idx} className="hover:bg-white/[0.02] transition">
                  <td className="py-2 px-3 font-bold text-sky-400">{wire.wireId}</td>
                  <td className="py-2 px-3">
                    {wire.fromConnector}:{wire.fromPin}
                  </td>
                  <td className="py-2 px-3">
                    {wire.toConnector}:{wire.toPin}
                  </td>
                  <td className="py-2 px-3 text-emerald-400 font-bold">{wire.gauge}</td>
                  <td className="py-2 px-3">{wire.color}</td>
                  <td className="py-2 px-3 text-slate-400">{wire.voltage || 'N/A'}</td>
                  <td className="py-2 px-3 text-right font-bold text-white">
                    {wire.continuousAmps ? `${wire.continuousAmps} A` : '0 A'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
