'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { MarketingNav } from '@/components/marketing/MarketingNav';
import { MarketingFooter } from '@/components/marketing/MarketingFooter';
import {
  FileText,
  Cpu,
  CheckCircle2,
  AlertTriangle,
  FileSpreadsheet,
  ArrowRight,
  ShieldCheck,
  Zap,
  Layers,
  ChevronRight,
  Search,
  Check,
} from 'lucide-react';

const PIPELINE_STAGES = [
  {
    step: '01',
    label: 'Optical Ingestion',
    title: 'Document Ingestion & Optical Preprocessing',
    subtitle: 'High-resolution PDF parsing & vector segmentation',
    description:
      'The manual is ingested through our multi-page PDF rendering pipeline. Text labels, drawing title blocks, wire tables, and vector circuit traces are parsed with sub-millimeter precision.',
    input: 'WH-402_Wire_Harness_Manual.pdf (24 Pages, 300 DPI)',
    transformation: 'Vector primitives extraction, pinout table OCR, drawing boundary isolation',
    output: 'Structured CAD schematic layer + Netlist connection matrix',
    evidence: 'Drawing 4B, Coordinates [X: 820, Y: 340]',
  },
  {
    step: '02',
    label: 'Netlist Graph',
    title: 'Entity & Netlist Graph Extraction',
    subtitle: 'Pin-to-pin signal and component association',
    description:
      'Our optical entity recognizer maps connector blocks (Ampseal, Deutsch, Molex), circuit breakers, relays, and earth grounds into a directed electrical graph.',
    input: 'Vector connection layer & pin designator OCR strings',
    transformation: 'Associating source pin (J1-P3) to target destination (P1-Act1) with wire tag attributes',
    output: 'Complete topological electrical netlist with conductor gauge & color properties',
    evidence: '42 Component nodes, 86 Netlist connection paths',
  },
  {
    step: '03',
    label: 'Rules Engine',
    title: 'Automated Standards Verification Engine',
    subtitle: 'Deterministic rule evaluation against IPC & UL standards',
    description:
      'The extracted graph is audited against 156+ standard rules. The engine checks conductor continuous ampacities against IPC/WHMA-A-620 Table 4-2, equipment grounding sizing against UL 508A Table 15.1, and terminal crimp specifications.',
    input: 'Extracted Netlist + Standard Preset (IPC-WHMA-A-620 Class 3)',
    transformation: 'Rule comparison: Net W-103 carries 15A continuous but lacks minimum 16 AWG notation',
    output: '24 Discrepancy flags (6 Critical, 10 Major, 8 Minor)',
    evidence: 'IPC/WHMA-A-620 §4.2.1 Ampacity Derating Clause',
  },
  {
    step: '04',
    label: 'CAD Radar',
    title: 'Spatial CAD Pinpointing & Severity Scoring',
    subtitle: 'Interactive coordinate overlay and confidence calibration',
    description:
      'Every discrepancy is calibrated with an AI confidence score (e.g. 95%) and anchored to exact bounding box coordinates on the schematic diagram.',
    input: 'Discrepancy dataset + CAD schematic vector canvas',
    transformation: 'Generating radar pulse highlight & plain-language remediation instructions',
    output: 'Highlighted CAD overlays ready for quality inspector review',
    evidence: 'Discrepancy D-001 anchored on J1 Pin 3 Feed',
  },
  {
    step: '05',
    label: 'Audit Report',
    title: 'Audit Certification & Multi-Format Export',
    subtitle: 'Signed PDF certificates & multi-sheet Excel XLSX workbooks',
    description:
      'The inspection results are compiled into an executive audit report. Quality managers can download formal printable PDF compliance certificates and Excel workbooks.',
    input: 'Validated QC summary & discrepancies dataset',
    transformation: 'Compiling executive donut chart, summary matrix, and discrepancy table',
    output: 'Official PDF Certificate + Excel XLSX spreadsheet with 5 structured sheets',
    evidence: 'Audit Record ID: AUD-8492-2026',
  },
];

export default function HowItWorksPage() {
  const [activeStage, setActiveStage] = useState(0);
  const current = PIPELINE_STAGES[activeStage];

  return (
    <div className="min-h-screen bg-[#060B14] text-slate-100 flex flex-col font-sans">
      <MarketingNav />

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-16 space-y-20">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.06] border border-white/10 text-sky-400 text-xs font-mono font-bold">
            <span className="w-2 h-2 rounded-full bg-sky-400 animate-pulse" />
            ENGINEERING PIPELINE SPECIFICATION
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold text-white tracking-tight">
            How Wiring Diagram QC Works
          </h1>
          <p className="text-base sm:text-lg text-slate-300 leading-relaxed">
            From raw engineering drawing manuals to certified quality inspection reports in 5 verifiable, deterministic stages.
          </p>
        </div>

        {/* Interactive Pipeline Stage Explorer */}
        <div className="tech-card p-6 md:p-8 space-y-8">
          {/* Stage Step Selector Buttons */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 border-b border-white/10 pb-6">
            {PIPELINE_STAGES.map((s, idx) => {
              const isSelected = activeStage === idx;
              return (
                <button
                  key={s.step}
                  onClick={() => setActiveStage(idx)}
                  className={`p-3 rounded-xl text-left transition border ${
                    isSelected
                      ? 'bg-sky-500/15 border-sky-400/60 text-white shadow-lg'
                      : 'bg-white/[0.02] border-white/[0.06] text-slate-400 hover:text-white hover:bg-white/[0.05]'
                  }`}
                >
                  <div className="text-[10px] font-mono font-bold text-sky-400">
                    STAGE {s.step}
                  </div>
                  <div className="text-xs font-bold truncate mt-0.5">{s.label}</div>
                </button>
              );
            })}
          </div>

          {/* Active Stage Details */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            <div className="lg:col-span-7 space-y-4">
              <div className="inline-flex items-center gap-2 text-xs font-mono text-sky-400 font-bold">
                STAGE {current.step} OF 05 • {current.subtitle}
              </div>
              <h2 className="text-2xl font-bold text-white leading-tight">
                {current.title}
              </h2>
              <p className="text-sm text-slate-300 leading-relaxed">
                {current.description}
              </p>

              <div className="pt-4 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono">
                <div className="p-3.5 rounded-xl bg-[#060B14] border border-white/10 space-y-1">
                  <span className="text-slate-500 block uppercase font-bold text-[10px]">Input</span>
                  <span className="text-slate-200 block">{current.input}</span>
                </div>
                <div className="p-3.5 rounded-xl bg-[#060B14] border border-white/10 space-y-1">
                  <span className="text-emerald-400 block uppercase font-bold text-[10px]">Verified Output</span>
                  <span className="text-slate-200 block">{current.output}</span>
                </div>
              </div>
            </div>

            {/* Interactive Terminal / CAD Evidence Preview */}
            <div className="lg:col-span-5 rounded-2xl bg-[#060B14] border border-white/15 p-5 shadow-2xl font-mono text-xs space-y-3">
              <div className="flex items-center justify-between text-[11px] text-slate-500 pb-2 border-b border-white/10">
                <span>PIPELINE_EXECUTION.LOG</span>
                <span className="text-emerald-400">STAGE {current.step} ACTIVE</span>
              </div>
              <div className="space-y-1.5 text-[11px]">
                <div className="text-sky-400">&gt; Process: {current.transformation}</div>
                <div className="text-slate-400">&gt; Standards checked: IPC/WHMA-A-620 §4.2, UL 508A</div>
                <div className="text-slate-400">&gt; Reference: {current.evidence}</div>
                <div className="text-emerald-400 font-bold">&gt; Execution Latency: 280ms • Deterministic Match: 100%</div>
              </div>
            </div>
          </div>
        </div>

        {/* Engineering Architecture Diagram */}
        <div className="tech-card p-8 space-y-6">
          <div className="border-b border-white/10 pb-4">
            <span className="text-xs font-mono uppercase text-sky-400 font-bold">System Flow</span>
            <h3 className="text-xl font-bold text-white mt-1">End-to-End Enterprise Architecture</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs text-slate-300">
            <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] space-y-2">
              <div className="font-bold text-white flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-sky-400" /> Server-Side AI Guardrail
              </div>
              <p className="text-slate-400 leading-relaxed text-[11px]">
                Customer schematics and trade-secret inspection prompts never leave our secure server-side perimeter. We enforce strict SSRF validation and schema-verified JSON outputs.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] space-y-2">
              <div className="font-bold text-white flex items-center gap-2">
                <Cpu className="w-4 h-4 text-emerald-400" /> Hybrid Rule + Vision Model
              </div>
              <p className="text-slate-400 leading-relaxed text-[11px]">
                Combining deterministic engineering rule evaluation with vision LLMs (Qwen2.5-VL) ensures zero critical misses while maintaining rapid 1.4-second processing times.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] space-y-2">
              <div className="font-bold text-white flex items-center gap-2">
                <Layers className="w-4 h-4 text-purple-400" /> Multi-Tenant Data Isolation
              </div>
              <p className="text-slate-400 leading-relaxed text-[11px]">
                Every organization’s manuals, custom SOPs, and audit logs are isolated with strict tenant boundaries in our relational database.
              </p>
            </div>
          </div>
        </div>

        {/* Bottom CTA */}
        <div className="p-8 rounded-3xl bg-gradient-to-r from-[#0E172C] to-[#0A1120] border border-white/15 text-center space-y-4">
          <h3 className="text-2xl font-bold text-white">Ready to Inspect Your First Wiring Manual?</h3>
          <p className="text-xs sm:text-sm text-slate-400 max-w-xl mx-auto">
            Test with our preloaded industrial schematics (WH-402 wire harness or MCC-VFD control panel) or upload your own drawing.
          </p>
          <div className="pt-2">
            <Link
              href="/app"
              className="inline-flex items-center gap-2 btn-primary px-7 py-3 text-xs font-bold"
            >
              <span>Launch QC Workspace</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </main>

      <MarketingFooter />
    </div>
  );
}
