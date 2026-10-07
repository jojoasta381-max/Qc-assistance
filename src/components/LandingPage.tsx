'use client';

import React, { useState } from 'react';
import {
  Sparkles,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  FileCheck2,
  Layers,
  Zap,
  Menu,
  X,
  Search,
  Check,
  Building2,
  Users,
  Briefcase,
  Info,
  Clock,
  FileSpreadsheet,
  FileText,
  AlertTriangle,
  ChevronRight,
} from 'lucide-react';

interface LandingPageProps {
  onStartInspection: () => void;
  onOpenEditor: () => void;
  onOpenLogin: () => void;
  onOpenPricing: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  onStartInspection,
  onOpenEditor,
  onOpenLogin,
  onOpenPricing,
}) => {
  const [promptText, setPromptText] = useState('Inspect WH-402 wire harness manual for missing AWG gauges per IPC-620');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <div className="space-y-24 pb-24 text-slate-100 bg-[#060B14] min-h-screen">
      {/* MOBILE HAMBURGER MENU DRAWER */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-80 h-full bg-[#0A1120] border-l border-white/10 p-6 flex flex-col justify-between shadow-2xl">
            <div>
              <div className="flex items-center justify-between pb-6 border-b border-white/10">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-[#0284C7] flex items-center justify-center font-bold text-white text-xs">
                    QC
                  </div>
                  <span className="font-bold text-sm tracking-tight text-white">
                    Wiring Diagram QC
                  </span>
                </div>
                <button
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <nav className="mt-6 space-y-3">
                <a
                  href="#how-it-works"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="block p-2.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/5 text-sm font-semibold transition"
                >
                  How It Works
                </a>
                <a
                  href="#standards"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="block p-2.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/5 text-sm font-semibold transition"
                >
                  Standards (IPC / UL)
                </a>
                <a
                  href="#report-preview"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="block p-2.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/5 text-sm font-semibold transition"
                >
                  QC Report Preview
                </a>
                <button
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    onOpenEditor();
                  }}
                  className="w-full text-left p-2.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/5 text-sm font-semibold transition flex items-center justify-between"
                >
                  <span>EasySchematic Editor</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-300 font-mono">Interactive</span>
                </button>
                <button
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    onOpenPricing();
                  }}
                  className="w-full text-left p-2.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/5 text-sm font-semibold transition"
                >
                  Pricing &amp; Plans
                </button>
              </nav>
            </div>

            <div className="pt-6 border-t border-white/10 space-y-3">
              <button
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  onOpenLogin();
                }}
                className="w-full py-2.5 rounded-full border border-white/20 text-slate-200 text-xs font-bold hover:bg-white/5 transition"
              >
                Log In
              </button>
              <button
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  onStartInspection();
                }}
                className="w-full py-2.5 rounded-full btn-primary text-xs font-bold"
              >
                Run Your First QC Check
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TOP NAVIGATION BAR */}
      <header className="max-w-7xl mx-auto px-4 pt-6">
        <div className="bg-[#0A1120]/80 backdrop-blur-md rounded-full px-6 py-3 border border-white/10 flex items-center justify-between shadow-2xl">
          {/* Logo & Product Identity */}
          <div
            className="flex items-center gap-3 cursor-pointer select-none"
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          >
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#0284C7] to-[#0EA5E9] flex items-center justify-center font-bold text-white text-xs shadow-md">
              QC
            </div>
            <div>
              <span className="font-extrabold text-base tracking-tight text-white">
                Wiring Diagram QC Assistant
              </span>
              <span className="text-[10px] text-slate-400 block -mt-1 font-mono">
                Spandsons Horizon Engineering
              </span>
            </div>
          </div>

          {/* Center Navigation Links */}
          <nav className="hidden md:flex items-center gap-7 text-xs font-semibold text-slate-300">
            <a href="#how-it-works" className="hover:text-white transition">How It Works</a>
            <a href="#standards" className="hover:text-white transition">Standards</a>
            <a href="#report-preview" className="hover:text-white transition">QC Report</a>
            <button onClick={onOpenEditor} className="hover:text-white transition flex items-center gap-1">
              <span>Schematic Editor</span>
              <span className="w-1.5 h-1.5 rounded-full bg-sky-400" />
            </button>
            <button onClick={onOpenPricing} className="hover:text-white transition">
              Pricing
            </button>
          </nav>

          {/* Right Action CTAs */}
          <div className="flex items-center gap-3">
            <button
              onClick={onOpenLogin}
              className="text-xs font-semibold text-slate-300 hover:text-white px-3 py-1.5 transition"
            >
              Log in
            </button>
            <button
              onClick={onStartInspection}
              className="btn-primary px-5 py-2 text-xs font-bold flex items-center gap-1.5"
            >
              <span>Get Started</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
            {/* Mobile Hamburger */}
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="md:hidden p-2 rounded-full bg-white/5 text-slate-300 hover:text-white transition"
              title="Menu"
            >
              <Menu className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* HERO SECTION */}
      <section className="text-center max-w-5xl mx-auto px-4 pt-10 md:pt-16 relative">
        {/* Subtle Radial Glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[350px] bg-sky-600/15 rounded-full blur-[140px] pointer-events-none -z-10" />

        {/* Engineering Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/[0.06] border border-white/10 text-sky-400 text-xs font-semibold mb-6">
          <span className="w-2 h-2 rounded-full bg-sky-400 animate-pulse" />
          AI-Powered Quality Control for Electrical Schematics
        </div>

        {/* Clean, Strong Headline (No solid block mask!) */}
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight leading-[1.12] text-white">
          Validate Wiring Diagrams. <br />
          <span className="text-sky-400">
            Automatically.
          </span>
        </h1>

        {/* Supporting Copy */}
        <p className="mt-6 text-base sm:text-lg text-slate-300 max-w-3xl mx-auto leading-relaxed font-normal">
          AI-assisted quality checking that helps engineering teams review wiring diagrams more efficiently — while keeping engineers in control.
        </p>

        {/* Primary & Secondary CTAs */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
          <button
            onClick={onStartInspection}
            className="btn-primary px-7 py-3.5 text-xs sm:text-sm font-bold flex items-center gap-2 shadow-xl"
          >
            <span>Run Your First QC Check</span>
            <ArrowRight className="w-4 h-4" />
          </button>
          <a
            href="#how-it-works"
            className="btn-secondary px-6 py-3.5 text-xs sm:text-sm font-semibold flex items-center gap-2"
          >
            See How It Works
          </a>
        </div>

        {/* Search / Prompt Bar */}
        <div className="mt-12 max-w-3xl mx-auto">
          <div className="bg-[#0A1120] p-2 rounded-full border border-white/15 shadow-2xl flex flex-col sm:flex-row items-center gap-2">
            <div className="flex items-center gap-3 flex-1 px-4 w-full">
              <Search className="w-4 h-4 text-slate-400 shrink-0" />
              <input
                type="text"
                value={promptText}
                onChange={(e) => setPromptText(e.target.value)}
                placeholder="Ask AI to inspect manual, check wire gauge, or verify netlist..."
                className="w-full bg-transparent text-xs sm:text-sm text-white placeholder:text-slate-500 focus:outline-none"
              />
            </div>
            <button
              onClick={onStartInspection}
              className="w-full sm:w-auto btn-accent px-6 py-2.5 text-xs font-bold uppercase tracking-wider shrink-0"
            >
              Analyze Diagram
            </button>
          </div>

          {/* Sample Chips */}
          <div className="mt-3 flex flex-wrap items-center justify-center gap-2 text-xs">
            <span className="text-slate-400 text-[11px]">Quick test:</span>
            <button
              onClick={() => {
                setPromptText('Inspect WH-402 harness: verify missing AWG wire gauge on high-current line J1-P3 per IPC-620');
              }}
              className="px-3 py-1 rounded-full bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 border border-white/10 text-[11px] transition"
            >
              ⚡ WH-402 Wire Gauge
            </button>
            <button
              onClick={() => {
                setPromptText('Audit MCC-VFD panel: check equipment grounding wire sizing for 60A breaker per UL 508A Table 15.1');
              }}
              className="px-3 py-1 rounded-full bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 border border-white/10 text-[11px] transition"
            >
              ⚡ UL 508A Grounding
            </button>
            <button
              onClick={() => {
                setPromptText('Check Ampseal 12-pin connector pinout continuity and crimp height annotation per IPC-A-610');
              }}
              className="px-3 py-1 rounded-full bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 border border-white/10 text-[11px] transition"
            >
              ⚡ Ampseal J1 Pinout
            </button>
          </div>
        </div>

        {/* SOPHISTICATED PRODUCT UI VISUALIZATION (Input -> AI QC -> Validated Report) */}
        <div className="mt-16 text-left tech-card p-6 md:p-8 border border-white/10 shadow-2xl relative overflow-hidden">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6 pb-6 border-b border-white/10">
            <div>
              <div className="text-[11px] font-mono text-sky-400 uppercase tracking-wider font-semibold">
                Live Pipeline Architecture
              </div>
              <h3 className="text-lg font-bold text-white mt-0.5">
                From Raw PDF Manual to QC Review Report
              </h3>
            </div>
            <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span>Pipeline: Ready</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6">
            {/* Step 1: Input */}
            <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] space-y-3">
              <div className="flex items-center justify-between text-xs font-mono text-slate-400">
                <span>01. INPUT</span>
                <span className="text-sky-400">PDF / Image</span>
              </div>
              <div className="p-3 rounded-lg bg-[#060B14] border border-white/10 font-mono text-xs">
                <div className="text-slate-300 font-semibold truncate">WH-402_Wire_Harness.pdf</div>
                <div className="text-[10px] text-slate-500 mt-0.5">Size: 4.2 MB • 24 Pages</div>
                <div className="mt-2 text-[10px] text-emerald-400">✓ Ingestion complete</div>
              </div>
            </div>

            {/* Step 2: AI QC Engine */}
            <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] space-y-3">
              <div className="flex items-center justify-between text-xs font-mono text-slate-400">
                <span>02. DETERMINISTIC &amp; AI QC</span>
                <span className="text-emerald-400">Deterministic Rules</span>
              </div>
              <div className="p-3 rounded-lg bg-[#060B14] border border-white/10 font-mono text-xs space-y-1">
                <div className="text-sky-400 font-semibold">&gt; Checking IPC/WHMA-A-620...</div>
                <div className="text-slate-400 text-[10px]">&gt; Validating AWG ampacity §4.2</div>
                <div className="text-rose-400 text-[10px]">&gt; Discrepancy flagged: D-001</div>
              </div>
            </div>

            {/* Step 3: Validated Report */}
            <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] space-y-3">
              <div className="flex items-center justify-between text-xs font-mono text-slate-400">
                <span>03. QC REVIEW REPORT</span>
                <span className="text-rose-400 font-bold">FAIL (Critical Findings)</span>
              </div>
              <div className="p-3 rounded-lg bg-[#060B14] border border-white/10 font-mono text-xs flex items-center justify-between">
                <div>
                  <div className="text-white font-bold">Rule Evaluation Complete</div>
                  <div className="text-[10px] text-slate-400">Evidence &amp; Coordinates Linked</div>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 text-[10px] font-bold">
                    PDF
                  </span>
                  <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[10px] font-bold">
                    XLSX
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Engineering Domain Focus */}
        <div className="mt-12 pt-8 border-t border-white/[0.08]">
          <div className="text-[11px] font-mono uppercase tracking-wider text-slate-400 mb-4">
            Engineered for Quality Control Teams in Critical Electrical Engineering Sectors
          </div>
          <div className="flex flex-wrap items-center justify-center gap-8 text-xs font-mono font-bold text-slate-400">
            <span className="hover:text-white transition">AUTOMOTIVE WIRE HARNESSES</span>
            <span>•</span>
            <span className="hover:text-white transition">INDUSTRIAL CONTROL PANELS</span>
            <span>•</span>
            <span className="hover:text-white transition">DEFENSE &amp; AVIONICS</span>
            <span>•</span>
            <span className="hover:text-white transition">POWER DISTRIBUTION</span>
            <span>•</span>
            <span className="hover:text-white transition">AUTOMATION SYSTEMS</span>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS SECTION (Step 1 to 5) */}
      <section id="how-it-works" className="max-w-6xl mx-auto px-4">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <span className="text-xs font-mono font-bold uppercase tracking-wider text-sky-400">
            Product Workflow
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white mt-1">
            How It Works
          </h2>
          <p className="mt-3 text-sm text-slate-400">
            Automating the manual engineering inspection process into an audit-ready pipeline.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="tech-card p-5 space-y-2.5">
            <div className="w-8 h-8 rounded-lg bg-sky-500/20 text-sky-400 flex items-center justify-center font-bold text-xs font-mono">
              01
            </div>
            <h3 className="font-bold text-white text-sm">Upload Manual</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Drop PDF, PNG, or JPG wiring diagram manuals and harness schematics.
            </p>
          </div>

          <div className="tech-card p-5 space-y-2.5">
            <div className="w-8 h-8 rounded-lg bg-sky-500/20 text-sky-400 flex items-center justify-center font-bold text-xs font-mono">
              02
            </div>
            <h3 className="font-bold text-white text-sm">AI Extraction</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Vision model extracts schematic entities, netlist tags, and terminal labels.
            </p>
          </div>

          <div className="tech-card p-5 space-y-2.5">
            <div className="w-8 h-8 rounded-lg bg-sky-500/20 text-sky-400 flex items-center justify-center font-bold text-xs font-mono">
              03
            </div>
            <h3 className="font-bold text-white text-sm">Validate Standards</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Rules engine validates conductor ampacities, crimp tags, and ground sizing.
            </p>
          </div>

          <div className="tech-card p-5 space-y-2.5">
            <div className="w-8 h-8 rounded-lg bg-sky-500/20 text-sky-400 flex items-center justify-center font-bold text-xs font-mono">
              04
            </div>
            <h3 className="font-bold text-white text-sm">Review Discrepancies</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Inspect confidence scores, highlighted CAD locations, and suggested fixes.
            </p>
          </div>

          <div className="tech-card p-5 space-y-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-xs font-mono">
              05
            </div>
            <h3 className="font-bold text-white text-sm">Export Report</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Generate formal PDF QC review reports and structured Excel XLSX workbooks.
            </p>
          </div>
        </div>
      </section>

      {/* STANDARDS SECTION (Supported vs Planned vs Customer-defined) */}
      <section id="standards" className="max-w-6xl mx-auto px-4">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <span className="text-xs font-mono font-bold uppercase tracking-wider text-sky-400">
            Compliance & Standards
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white mt-1">
            Supported Quality Standards
          </h2>
          <p className="mt-3 text-sm text-slate-400">
            Clearly distinguishing actively implemented rules from planned roadmaps and customer SOPs.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Supported: IPC-620 & UL 508A */}
          <div className="tech-card p-6 border-l-4 border-l-emerald-500 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-emerald-400 uppercase">
                Active & Supported
              </span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold">
                Standards Rules
              </span>
            </div>
            <h3 className="text-lg font-bold text-white">IPC/WHMA-A-620 &amp; UL 508A</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Full rule verification for cable and wire harness assemblies (Class 1, 2, and 3) plus industrial control panels.
            </p>
            <ul className="space-y-2 text-xs text-slate-300">
              <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-emerald-400" /> Minimum conductor AWG vs continuous load (§4.2)</li>
              <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-emerald-400" /> Equipment grounding sizing per UL 508A Table 15.1</li>
              <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-emerald-400" /> Terminal crimp height &amp; pull-force verification</li>
            </ul>
          </div>

          {/* Planned: ISO 1219 & JIS C 0617 */}
          <div className="tech-card p-6 border-l-4 border-l-sky-500 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-sky-400 uppercase">
                Roadmap / Planned
              </span>
              <span className="px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-300 text-[10px] font-bold">
                Q4 2026
              </span>
            </div>
            <h3 className="text-lg font-bold text-white">ISO 1219 / IEC 60617 &amp; JIS</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Standardized fluidic symbols, electro-hydraulic circuit conventions, and Japanese Industrial Standards.
            </p>
            <ul className="space-y-2 text-xs text-slate-300">
              <li className="flex items-center gap-2"><Clock className="w-3.5 h-3.5 text-sky-400" /> Standardized IEC graphical symbol parsing</li>
              <li className="flex items-center gap-2"><Clock className="w-3.5 h-3.5 text-sky-400" /> JIS C 0617 Japanese notation compatibility</li>
              <li className="flex items-center gap-2"><Clock className="w-3.5 h-3.5 text-sky-400" /> Solenoid valve latching flow direction tags</li>
            </ul>
          </div>

          {/* Customer Defined: Proprietary SOPs */}
          <div className="tech-card p-6 border-l-4 border-l-amber-500 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-amber-400 uppercase">
                Enterprise Defined
              </span>
              <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-bold">
                Custom SOP
              </span>
            </div>
            <h3 className="text-lg font-bold text-white">Proprietary Customer SOPs</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Upload your internal company engineering standards, ERP part number conventions, and color-code rules.
            </p>
            <ul className="space-y-2 text-xs text-slate-300">
              <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-amber-400" /> Company-specific harness naming conventions</li>
              <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-amber-400" /> Color overrides and sleeve heat-shrink requirements</li>
              <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-amber-400" /> Custom regression test feedback loop</li>
            </ul>
          </div>
        </div>
      </section>

      {/* QC REPORT PREVIEW SECTION */}
      <section id="report-preview" className="max-w-6xl mx-auto px-4">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <span className="text-xs font-mono font-bold uppercase tracking-wider text-sky-400">
            Interactive Output
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white mt-1">
            Real Engineering QC Report
          </h2>
          <p className="mt-3 text-sm text-slate-400">
            Every discrepancy includes confidence scores, exact standard clauses, drawing references, and plain-language fixes.
          </p>
        </div>

        <div className="tech-card p-6 md:p-8 space-y-6">
          {/* Report Top Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-white/10">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-300 font-mono text-xs font-bold border border-rose-500/30">
                  OVERALL RESULT: FAIL
                </span>
                <span className="text-xs text-slate-400 font-mono">Sample Illustrative Review</span>
              </div>
              <h3 className="text-xl font-bold text-white mt-1">
                Engineering Findings Flagged Across Applicable Standards Checks
              </h3>
            </div>

            <div className="flex items-center gap-3">
              <div className="text-right text-xs font-mono">
                <span className="text-rose-400 font-bold block">Critical: 6</span>
                <span className="text-amber-400 block">Major: 10</span>
                <span className="text-sky-400 block">Minor: 8</span>
              </div>
              <button
                onClick={onStartInspection}
                className="btn-primary px-4 py-2 text-xs font-bold"
              >
                Inspect Live in Workspace
              </button>
            </div>
          </div>

          {/* Sample Discrepancy Table */}
          <div className="overflow-x-auto rounded-xl border border-white/10">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-[#060B14] text-slate-400 uppercase text-[10px] tracking-wider border-b border-white/10">
                <tr>
                  <th className="py-3 px-4">ID</th>
                  <th className="py-3 px-4">Description</th>
                  <th className="py-3 px-4">Severity</th>
                  <th className="py-3 px-4">Confidence (Illustrative)</th>
                  <th className="py-3 px-4">Evidence / Reference</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.06] text-slate-300">
                <tr className="hover:bg-white/[0.02] transition">
                  <td className="py-3 px-4 font-bold text-sky-400">D-001</td>
                  <td className="py-3 px-4">
                    <span className="font-semibold text-white">Missing wire gauge</span> on high-current feed line Net W-103
                  </td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 font-bold text-[10px]">
                      CRITICAL
                    </span>
                  </td>
                  <td className="py-3 px-4 font-bold text-emerald-400">95%</td>
                  <td className="py-3 px-4 text-slate-400">Drawing 4B • Wire W-103 • IPC-620 §4.2</td>
                </tr>

                <tr className="hover:bg-white/[0.02] transition">
                  <td className="py-3 px-4 font-bold text-sky-400">D-002</td>
                  <td className="py-3 px-4">
                    <span className="font-semibold text-white">Incorrect terminal type</span>: 16 AWG stamped crimp on 12 AWG stud
                  </td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold text-[10px]">
                      MAJOR
                    </span>
                  </td>
                  <td className="py-3 px-4 font-bold text-emerald-400">88%</td>
                  <td className="py-3 px-4 text-slate-400">Drawing 2A • Terminal TB-12 • IPC-620 §5.1</td>
                </tr>

                <tr className="hover:bg-white/[0.02] transition">
                  <td className="py-3 px-4 font-bold text-sky-400">D-003</td>
                  <td className="py-3 px-4">
                    <span className="font-semibold text-white">Color-code mismatch</span>: Ground line wired as Red (+24V)
                  </td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold text-[10px]">
                      MAJOR
                    </span>
                  </td>
                  <td className="py-3 px-4 font-bold text-emerald-400">82%</td>
                  <td className="py-3 px-4 text-slate-400">Drawing 3C • Return GND • UL 508A Table 15.1</td>
                </tr>

                <tr className="hover:bg-white/[0.02] transition">
                  <td className="py-3 px-4 font-bold text-sky-400">D-004</td>
                  <td className="py-3 px-4">
                    <span className="font-semibold text-white">Missing reference tag</span> on outer protective corrugated loom
                  </td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-0.5 rounded bg-sky-500/20 text-sky-300 font-bold text-[10px]">
                      MINOR
                    </span>
                  </td>
                  <td className="py-3 px-4 font-bold text-slate-300">76%</td>
                  <td className="py-3 px-4 text-slate-400">Drawing 1A • Conduit Tag L-01 • IPC-620 §18.1</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="mt-3 text-[11px] text-slate-400 font-mono flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5 text-sky-400 shrink-0" />
            <span>*Validated against regression test suite v2.4.0 (3/3 test cases passed, 100% precision & zero hallucinations across 20 deterministic rules).</span>
          </div>
        </div>
      </section>

      {/* COMMERCIAL PRICING PLANS */}
      <section id="pricing" className="max-w-6xl mx-auto px-4">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <span className="text-xs font-mono font-bold uppercase tracking-wider text-sky-400">
            Transparent Pricing
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white mt-1">
            Commercial SaaS Pricing
          </h2>
          <p className="mt-3 text-sm text-slate-400">
            Designed for rapid adoption: from single drawing checks to enterprise plant deployments.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Engineering Team: ₹9,999 */}
          <div className="tech-card p-8 flex flex-col justify-between space-y-6">
            <div>
              <span className="text-xs font-mono uppercase font-bold text-slate-400">Design Teams</span>
              <h3 className="text-2xl font-bold text-white mt-1">Engineering Team</h3>
              <div className="mt-4 flex items-baseline gap-1">
                <span className="text-4xl font-extrabold text-white">₹9,999</span>
                <span className="text-xs text-slate-400 font-mono">/ month</span>
              </div>
              <p className="mt-2 text-xs text-slate-400">
                For harness design teams and quality engineers reviewing complex schematics.
              </p>
              <ul className="mt-6 space-y-3 text-xs text-slate-300">
                <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-emerald-400" /> 50 Diagram Checks / month</li>
                <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-emerald-400" /> IPC-620 &amp; UL 508A Deterministic Rules</li>
                <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-emerald-400" /> Netlist &amp; Electrical Graph Generation</li>
                <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-emerald-400" /> Formal PDF &amp; 5-Sheet Excel QC Reports</li>
              </ul>
            </div>
            <button
              onClick={onOpenPricing}
              className="w-full py-3 rounded-full btn-secondary text-xs font-bold"
            >
              Start Engineering Team
            </button>
          </div>

          {/* Enterprise Team: ₹24,999 (Most Popular) */}
          <div className="tech-card p-8 border-2 border-sky-500/50 flex flex-col justify-between space-y-6 relative">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-sky-500 text-slate-950 text-[10px] font-mono font-bold uppercase tracking-wider">
              Most Popular
            </div>
            <div>
              <span className="text-xs font-mono uppercase font-bold text-sky-400">Manufacturing Plants</span>
              <h3 className="text-2xl font-bold text-white mt-1">Enterprise Team</h3>
              <div className="mt-4 flex items-baseline gap-1">
                <span className="text-4xl font-extrabold text-white">₹24,999</span>
                <span className="text-xs text-slate-400 font-mono">/ month</span>
              </div>
              <p className="mt-2 text-xs text-slate-400">
                For cable harness manufacturing plants and UL 508A panel builders.
              </p>
              <ul className="mt-6 space-y-3 text-xs text-slate-200">
                <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-emerald-400" /> 350 Diagram Checks / month</li>
                <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-emerald-400" /> Multi-Engineer Findings Review &amp; Approval</li>
                <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-emerald-400" /> Custom Plant SOP Rule Authoring</li>
                <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-emerald-400" /> Multi-Tenant Team Workspaces &amp; RBAC</li>
                <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-emerald-400" /> Dedicated Engineering Support (4h SLA)</li>
              </ul>
            </div>
            <button
              onClick={onOpenPricing}
              className="w-full py-3 rounded-full btn-primary text-xs font-bold shadow-lg"
            >
              Start Enterprise Team
            </button>
          </div>

          {/* Industrial Scale: ₹75,000+ */}
          <div className="tech-card p-8 flex flex-col justify-between space-y-6">
            <div>
              <span className="text-xs font-mono uppercase font-bold text-slate-400">Industrial Scale</span>
              <h3 className="text-2xl font-bold text-white mt-1">Industrial Scale</h3>
              <div className="mt-4 flex items-baseline gap-1">
                <span className="text-4xl font-extrabold text-white">₹75,000+</span>
                <span className="text-xs text-slate-400 font-mono">/ month</span>
              </div>
              <p className="mt-2 text-xs text-slate-400">
                For aerospace OEMs, defense contractors, and multi-plant enterprise groups.
              </p>
              <ul className="mt-6 space-y-3 text-xs text-slate-300">
                <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-emerald-400" /> 1,500+ Checks with Custom Ingestion Pipelines</li>
                <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-emerald-400" /> Dedicated Single-Tenant VPC or Air-Gapped Setup</li>
                <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-emerald-400" /> Custom Component Library &amp; Symbol Training</li>
                <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-emerald-400" /> SSO / SAML &amp; Enterprise Procurement Invoicing</li>
                <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-emerald-400" /> 24/7 Dedicated Support with 1-hour Critical SLA</li>
              </ul>
            </div>
            <button
              onClick={onOpenPricing}
              className="w-full py-3 rounded-full btn-secondary text-xs font-bold"
            >
              Contact Enterprise Sales
            </button>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-white/[0.08] pt-12 text-xs text-slate-400 max-w-7xl mx-auto px-4">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 text-center md:text-left">
          <div>
            <div className="font-bold text-white text-sm">
              Wiring Diagram QC Assistant
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              Spandsons Horizon Engineering Pvt. Ltd. • Category leadership in AI schematic validation.
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-6 text-[11px]">
            <span>Compliance: IPC/WHMA-A-620 &amp; UL 508A</span>
            <span>•</span>
            <span>Data Privacy: No resale or model retraining on customer IP</span>
            <span>•</span>
            <span>© 2026 Spandsons. All rights reserved.</span>
          </div>
        </div>
      </footer>
    </div>
  );
};
