'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { EasySchematicEditor } from '@/components/EasySchematicEditor';
import { NetlistGraphView } from '@/components/graph/NetlistGraphView';
import { Layers, FileCheck2, Network, Cpu } from 'lucide-react';

export default function AppEditorPage() {
  const [viewMode, setViewMode] = useState<'CAD' | 'NETLIST'>('CAD');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/[0.06] border border-white/10 text-sky-400 text-xs font-mono font-bold mb-1">
            <Layers className="w-3.5 h-3.5" />
            ENGINEERING CAD &amp; TOPOLOGY SUITE
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Wiring Schematic &amp; Electrical Netlist
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Design orthogonal schematics in CAD, audit component pin-to-pin connectivity, verify continuous ampacity, and export tester schedules.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 self-start sm:self-auto">
          {/* Mode Switcher */}
          <div className="flex items-center gap-1 bg-black/40 p-1 rounded-xl border border-white/10 text-xs font-mono">
            <button
              onClick={() => setViewMode('CAD')}
              className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition ${
                viewMode === 'CAD'
                  ? 'bg-[#0284C7] text-white font-bold shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Cpu className="w-3.5 h-3.5" />
              CAD Editor
            </button>
            <button
              onClick={() => setViewMode('NETLIST')}
              className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition ${
                viewMode === 'NETLIST'
                  ? 'bg-[#0284C7] text-white font-bold shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Network className="w-3.5 h-3.5" />
              Netlist &amp; Tester Schedules
            </button>
          </div>

          <Link
            href="/app/inspections"
            className="btn-primary px-4 py-2 text-xs font-bold flex items-center gap-1.5 shadow-lg"
          >
            <FileCheck2 className="w-4 h-4" />
            <span>Launch QC Inspection</span>
          </Link>
        </div>
      </div>

      {/* Main View Area */}
      {viewMode === 'CAD' ? (
        <EasySchematicEditor />
      ) : (
        <NetlistGraphView />
      )}
    </div>
  );
}
