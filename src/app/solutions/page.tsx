'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { MarketingNav } from '@/components/marketing/MarketingNav';
import { MarketingFooter } from '@/components/marketing/MarketingFooter';
import {
  Factory,
  Cpu,
  Plane,
  Layers,
  CheckCircle2,
  TrendingUp,
  Clock,
  ShieldCheck,
  ArrowRight,
  Calculator,
  Zap,
  BarChart3,
  FileCheck,
} from 'lucide-react';

const INDUSTRIES = [
  {
    id: 'harness',
    title: 'Wire Harness Manufacturers',
    badge: 'Tier 1 & Tier 2 Automotive / Off-Highway',
    icon: Factory,
    painPoint:
      'Manual continuity checks across 50-pin connectors take 4+ hours per drawing. Mismatched pinouts slip through to formboards, costing $3,200 per harness rework.',
    solution:
      'Instant vector netlist extraction compares connector pinouts, wire gauges, and color tags against IPC-WHMA-A-620 Class 3 in under 45 seconds.',
    metrics: [
      { label: 'Audit Time Reduction', val: '92%' },
      { label: 'First-Pass Formboard Yield', val: '99.8%' },
      { label: 'Inspection Turnaround', val: '< 60s' },
    ],
    standards: ['IPC-WHMA-A-620 Class 2 & 3', 'USCAR-21', 'ISO 6722'],
    workflow: 'Drawing PDF Ingestion &rarr; Netlist Matrix &rarr; Pin-by-Pin Discrepancy &rarr; Tester Export',
  },
  {
    id: 'panels',
    title: 'Control Panel Builders',
    badge: 'UL 508A Industrial Automation',
    icon: Cpu,
    painPoint:
      'Field inspector rejections due to undersized equipment grounding conductors (Table 15.1) and mismatched component SCCR ratings halt multi-million dollar commissioning.',
    solution:
      'Deterministic rule validation calculates upstream breaker ratings against ground conductor gauges and identifies the weakest SCCR link in power branch circuits.',
    metrics: [
      { label: 'UL 508A First-Pass Rate', val: '100%' },
      { label: 'SCCR Calculation Time', val: 'Instant' },
      { label: 'Site Redo Penalty Avoidance', val: '$15k+' },
    ],
    standards: ['UL 508A 3rd Edition', 'NFPA 79', 'NEC Article 409'],
    workflow: 'Schematic Ingestion &rarr; OCPD & Ground Trace &rarr; SCCR Derating Tree &rarr; QC Review Report',
  },
  {
    id: 'aerospace',
    title: 'Aerospace & Avionics',
    badge: 'Mission-Critical & Defense',
    icon: Plane,
    painPoint:
      'Stringent AS9100 quality documentation demands full traceability for every conductor, crimp sleeve, and EMI shield pigtail termination under extreme thermal deratings.',
    solution:
      'Class 3 aerospace standard rules enforce altitude/ambient thermal derating tables, shield grounding limits, and generate cryptographic SHA-256 sealed QC reports.',
    metrics: [
      { label: 'FAA Audit Compliance', val: '100%' },
      { label: 'Traceability Coverage', val: 'Full Netlist' },
      { label: 'Non-Conformance Reports', val: '-87%' },
    ],
    standards: ['IPC-WHMA-A-620 Class 3', 'MIL-STD-202', 'AS9100'],
    workflow: 'Avionics Manual &rarr; Dual-Bus Verification &rarr; Class 3 Rule Engine &rarr; Signed Audit Trail',
  },
  {
    id: 'ems',
    title: 'Contract EMS & ODM Assemblers',
    badge: 'High-Mix Low-Volume Production',
    icon: Layers,
    painPoint:
      'Quoting dozens of varied customer drawings weekly without automated DRC leads to underestimated rework labor and costly production holds.',
    solution:
      'Automated optical ingestion ingests multi-format customer drawings, cross-references BOM items against schematic callouts, and flags discrepancies during the bid phase.',
    metrics: [
      { label: 'Quoting Speedup', val: '4x Faster' },
      { label: 'ECO Detection Rate', val: '99.5%' },
      { label: 'Rework Labor Saved', val: '14 hrs/wk' },
    ],
    standards: ['IPC-A-610', 'IPC-WHMA-A-620', 'Customer Custom SOPs'],
    workflow: 'Customer Drawing &rarr; BOM Discrepancy Check &rarr; Quick DRC Report &rarr; Fast Accurate Quote',
  },
];

export default function SolutionsPage() {
  const [selectedIndustry, setSelectedIndustry] = useState<string>('harness');

  // ROI Calculator States
  const [monthlyDrawings, setMonthlyDrawings] = useState<number>(120);
  const [pagesPerDrawing, setPagesPerDrawing] = useState<number>(6);
  const [hourlyEngineerRate, setHourlyEngineerRate] = useState<number>(65);

  const activeInd = INDUSTRIES.find((i) => i.id === selectedIndustry) || INDUSTRIES[0];

  // Calculations
  const manualHoursPerDrawing = (pagesPerDrawing * 0.4); // 24 mins per page
  const totalManualHours = Math.round(monthlyDrawings * manualHoursPerDrawing);
  const aiHours = Math.round(monthlyDrawings * 0.05); // 3 mins per drawing
  const savedHours = totalManualHours - aiHours;
  const grossSavings = savedHours * hourlyEngineerRate;
  const estimatedAppCost = Math.round(24999 / 83); // Enterprise Team tier equivalent (~$300/month)
  const netMonthlySavings = Math.max(0, grossSavings - estimatedAppCost);
  const annualSavings = netMonthlySavings * 12;

  return (
    <div className="min-h-screen bg-[#060B14] text-slate-100 flex flex-col font-sans">
      <MarketingNav />

      {/* Hero Section */}
      <section className="border-b border-white/[0.08] bg-[#0A1120]/60 py-16 px-4">
        <div className="max-w-6xl mx-auto space-y-6 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.06] border border-white/10 text-sky-400 text-xs font-mono font-bold">
            <TrendingUp className="w-4 h-4 text-sky-400" />
            ENGINEERED FOR MODERN MANUFACTURING
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold text-white tracking-tight">
            Solutions Built for Industrial Excellence
          </h1>
          <p className="text-base sm:text-lg text-slate-300 max-w-3xl mx-auto leading-relaxed">
            Whether you operate high-speed automated harness formboards or fabricate custom UL 508A motor control centers, our AI QC engine catches wiring flaws before copper is cut.
          </p>
        </div>
      </section>

      {/* Industry Tabs & Deep Dive */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-16 space-y-20">
        <div className="space-y-8">
          {/* Navigation Pill Selector */}
          <div className="flex flex-wrap items-center justify-center gap-2">
            {INDUSTRIES.map((ind) => {
              const Icon = ind.icon;
              const isSelected = ind.id === selectedIndustry;
              return (
                <button
                  key={ind.id}
                  onClick={() => setSelectedIndustry(ind.id)}
                  className={`flex items-center gap-2.5 px-5 py-3 rounded-xl text-xs sm:text-sm font-semibold transition ${
                    isSelected
                      ? 'bg-[#0284C7] text-white shadow-lg'
                      : 'bg-[#0A1120] text-slate-400 hover:text-white border border-white/10 hover:bg-white/[0.04]'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{ind.title}</span>
                </button>
              );
            })}
          </div>

          {/* Solution Showcase Card */}
          <div className="p-8 sm:p-10 rounded-2xl bg-[#0A1120] border border-white/10 shadow-2xl space-y-8">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-white/10">
              <div className="space-y-1">
                <span className="text-xs font-mono text-sky-400 font-bold uppercase tracking-wider">
                  {activeInd.badge}
                </span>
                <h2 className="text-2xl sm:text-3xl font-extrabold text-white">
                  {activeInd.title}
                </h2>
              </div>
              <Link
                href="/contact"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-white/10 hover:bg-white/20 text-white font-mono text-xs font-bold transition self-start lg:self-auto"
              >
                Schedule Technical Demo <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Left Column: Problem & AI Solution */}
              <div className="space-y-6">
                <div className="space-y-2">
                  <div className="text-xs font-mono text-rose-400 font-bold uppercase tracking-wider flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-rose-400" /> The Quality Challenge
                  </div>
                  <p className="text-sm text-slate-300 leading-relaxed bg-rose-500/5 p-4 rounded-xl border border-rose-500/10">
                    {activeInd.painPoint}
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="text-xs font-mono text-emerald-400 font-bold uppercase tracking-wider flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-400" /> Automated AI Solution
                  </div>
                  <p className="text-sm text-slate-200 leading-relaxed bg-emerald-500/5 p-4 rounded-xl border border-emerald-500/10">
                    {activeInd.solution}
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="text-xs font-mono text-slate-400 uppercase tracking-wider">
                    Applicable Engineering Standards
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {activeInd.standards.map((std) => (
                      <span
                        key={std}
                        className="px-3 py-1 rounded-md bg-white/[0.04] border border-white/10 text-xs font-mono text-slate-300"
                      >
                        {std}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Right Column: Key Metrics & Workflow */}
              <div className="space-y-6 flex flex-col justify-between">
                <div className="grid grid-cols-3 gap-4">
                  {activeInd.metrics.map((m, idx) => (
                    <div
                      key={idx}
                      className="p-4 rounded-xl bg-white/[0.03] border border-white/10 text-center"
                    >
                      <div className="text-2xl sm:text-3xl font-extrabold text-white font-mono">
                        {m.val}
                      </div>
                      <div className="text-[11px] text-slate-400 mt-1 font-sans">
                        {m.label}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="p-5 rounded-xl bg-black/40 border border-white/10 space-y-3">
                  <div className="text-xs font-mono text-sky-400 uppercase tracking-wider flex items-center gap-2">
                    <Zap className="w-3.5 h-3.5" /> Deterministic Pipeline Execution
                  </div>
                  <div className="text-xs font-mono text-slate-300 leading-relaxed">
                    {activeInd.workflow}
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-sky-950/20 border border-sky-500/20 text-xs text-sky-300 flex items-center justify-between">
                  <span>Need custom ERP / tester integration?</span>
                  <Link href="/contact" className="underline font-bold hover:text-white">
                    Talk with integration engineers &rarr;
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Interactive ROI Calculator */}
        <section className="p-8 sm:p-10 rounded-2xl bg-gradient-to-b from-[#0A1120] to-[#060B14] border border-white/10 shadow-2xl space-y-8">
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.06] border border-white/10 text-emerald-400 text-xs font-mono font-bold">
              <Calculator className="w-3.5 h-3.5" />
              ENGINEERING ECONOMICS ESTIMATOR
            </div>
            <h2 className="text-3xl font-extrabold text-white tracking-tight">
              Calculate Your Plant&apos;s Return on Investment
            </h2>
            <p className="text-xs sm:text-sm text-slate-400">
              See how eliminating manual drawing audits directly translates into engineering hours and dollars saved.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center pt-4">
            {/* Sliders Box */}
            <div className="p-6 rounded-xl bg-white/[0.02] border border-white/10 space-y-6">
              {/* Slider 1: Monthly Drawings */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-slate-300">Monthly Engineering Manuals / Drawings:</span>
                  <span className="text-white font-bold text-sm">{monthlyDrawings} diagrams</span>
                </div>
                <input
                  type="range"
                  min="20"
                  max="500"
                  step="10"
                  value={monthlyDrawings}
                  onChange={(e) => setMonthlyDrawings(Number(e.target.value))}
                  className="w-full accent-sky-400 bg-slate-800 h-2 rounded-lg cursor-pointer"
                />
              </div>

              {/* Slider 2: Average Pages */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-slate-300">Average Pages per Drawing / Manual:</span>
                  <span className="text-white font-bold text-sm">{pagesPerDrawing} pages</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="30"
                  step="1"
                  value={pagesPerDrawing}
                  onChange={(e) => setPagesPerDrawing(Number(e.target.value))}
                  className="w-full accent-sky-400 bg-slate-800 h-2 rounded-lg cursor-pointer"
                />
              </div>

              {/* Slider 3: Engineer Hourly Rate */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-slate-300">QC Engineer Loaded Hourly Rate:</span>
                  <span className="text-white font-bold text-sm">${hourlyEngineerRate}/hr</span>
                </div>
                <input
                  type="range"
                  min="30"
                  max="150"
                  step="5"
                  value={hourlyEngineerRate}
                  onChange={(e) => setHourlyEngineerRate(Number(e.target.value))}
                  className="w-full accent-sky-400 bg-slate-800 h-2 rounded-lg cursor-pointer"
                />
              </div>

              <div className="pt-2 text-[11px] text-slate-500 font-mono">
                * Based on benchmark industry average of 24 minutes per drawing page for thorough manual pinout &amp; rule audit.
              </div>
            </div>

            {/* Calculated Output Display */}
            <div className="p-8 rounded-xl bg-black/40 border border-sky-500/20 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-lg bg-white/[0.03] border border-white/5">
                  <div className="text-xs text-slate-400 font-mono">Manual Time Spent</div>
                  <div className="text-2xl font-bold font-mono text-slate-300 mt-1">
                    {totalManualHours} hrs/mo
                  </div>
                </div>

                <div className="p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                  <div className="text-xs text-emerald-400 font-mono">Hours Saved With QC AI</div>
                  <div className="text-2xl font-bold font-mono text-emerald-400 mt-1">
                    {savedHours} hrs/mo
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-white/10 space-y-2 text-center">
                <div className="text-xs text-slate-400 font-mono uppercase tracking-wider">
                  Net Estimated Annual Savings
                </div>
                <div className="text-4xl sm:text-5xl font-extrabold text-white font-mono">
                  ${annualSavings.toLocaleString()}
                </div>
                <div className="text-xs text-emerald-400 font-mono">
                  Payback period: ~4 days into each month
                </div>
              </div>

              <div className="pt-2">
                <Link
                  href="/pricing"
                  className="w-full block py-3 rounded-lg bg-[#0284C7] hover:bg-sky-500 text-white font-bold text-center text-xs font-mono transition shadow-lg"
                >
                  View Tiered Pricing &amp; Start Today &rarr;
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* CAD & Format Compatibility Matrix */}
        <section className="space-y-6">
          <div className="text-center max-w-xl mx-auto space-y-2">
            <h3 className="text-xl font-bold text-white">Universal Ingestion Compatibility</h3>
            <p className="text-xs text-slate-400">
              Integrates directly into your existing electrical design workflows without rip-and-replace.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 text-center">
            {[
              { name: 'AutoCAD Electrical', ext: '.dwg / .pdf' },
              { name: 'EPLAN Pro Panel', ext: '.epj / .pdf' },
              { name: 'SolidWorks Electrical', ext: '.sldprt / .pdf' },
              { name: 'Zuken E3.series', ext: '.e3s / .pdf' },
              { name: 'EasySchematic CAD', ext: '.json / .svg' },
              { name: 'High-Res Scanned PDF', ext: '300 DPI Multi-page' },
            ].map((item, idx) => (
              <div
                key={idx}
                className="p-4 rounded-xl bg-[#0A1120] border border-white/10 space-y-1"
              >
                <div className="text-xs font-bold text-white">{item.name}</div>
                <div className="text-[10px] font-mono text-slate-400">{item.ext}</div>
              </div>
            ))}
          </div>
        </section>
      </main>

      <MarketingFooter />
    </div>
  );
}
