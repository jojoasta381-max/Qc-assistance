'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { MarketingNav } from '@/components/marketing/MarketingNav';
import { MarketingFooter } from '@/components/marketing/MarketingFooter';
import {
  BookOpen,
  FileText,
  Download,
  ExternalLink,
  Search,
  Layers,
  Cpu,
  Table,
  ShieldCheck,
  ArrowRight,
  Sparkles,
} from 'lucide-react';

interface ResourceItem {
  id: string;
  type: 'SAMPLE_MANUAL' | 'WHITEPAPER' | 'CHEAT_SHEET';
  title: string;
  category: string;
  description: string;
  pagesOrSize: string;
  format: string;
  standard: string;
  actionText: string;
  actionLink: string;
}

const RESOURCES: ResourceItem[] = [
  {
    id: 'res-1',
    type: 'SAMPLE_MANUAL',
    title: 'WH-402 Heavy Equipment Chassis Wire Harness',
    category: 'Automotive & Off-Highway',
    description:
      'Complete 24-page engineering drawing package featuring Ampseal 776164 connectors, sealed relay blocks, and multi-branch formboard routing with intentionally seeded IPC-620 discrepancies for test verification.',
    pagesOrSize: '24 Pages • 14.2 MB',
    format: 'Vector PDF',
    standard: 'IPC-WHMA-A-620 Class 3',
    actionText: 'Load in QC Inspector',
    actionLink: '/#upload-section',
  },
  {
    id: 'res-2',
    type: 'SAMPLE_MANUAL',
    title: 'MCC-VFD-01 Industrial 480V Motor Control Center',
    category: 'Industrial Automation',
    description:
      '12-page three-phase 480VAC variable frequency drive motor control panel schematic. Includes upstream circuit breaker sizing, contactor coordination, and equipment grounding busbar layout.',
    pagesOrSize: '12 Pages • 8.6 MB',
    format: 'High-Res PDF',
    standard: 'UL 508A 3rd Edition',
    actionText: 'Load in QC Inspector',
    actionLink: '/#upload-section',
  },
  {
    id: 'res-3',
    type: 'SAMPLE_MANUAL',
    title: 'TB-200 Aerospace Power Distribution Unit',
    category: 'Avionics & Defense',
    description:
      'Dual-redundant 28VDC avionics power rail schematic featuring MIL-DTL-38999 circular connectors, thermal circuit breakers, and 360-degree EMI backshell shield termination callouts.',
    pagesOrSize: '8 Pages • 6.1 MB',
    format: 'Vector PDF',
    standard: 'IPC-620 Class 3 / AS9100',
    actionText: 'Load in QC Inspector',
    actionLink: '/#upload-section',
  },
  {
    id: 'res-4',
    type: 'WHITEPAPER',
    title: 'Eliminating Human Audit Oversights in UL 508A Panel Certification',
    category: 'Technical Whitepaper',
    description:
      'An in-depth engineering study examining how automated calculation of Table 15.1 grounding conductor cross-sections and weakest-link SCCR evaluation reduces first-pass field inspection rejections by 98%.',
    pagesOrSize: '18 Pages • Technical Report',
    format: 'PDF Whitepaper',
    standard: 'UL 508A §31 & §15',
    actionText: 'Read Whitepaper',
    actionLink: '#',
  },
  {
    id: 'res-5',
    type: 'WHITEPAPER',
    title: 'Deterministic AI vs Large Vision Models in Electrical CAD Validation',
    category: 'Engineering Architecture',
    description:
      'Why pure LLM hallucinations are unacceptable in electrical safety engineering, and how hybrid deterministic graph extraction + vision verification provides 100% reproducible discrepancy audits.',
    pagesOrSize: '14 Pages • Research Paper',
    format: 'PDF Whitepaper',
    standard: 'Algorithm Architecture',
    actionText: 'Read Paper',
    actionLink: '#',
  },
  {
    id: 'res-6',
    type: 'CHEAT_SHEET',
    title: 'AWG Conductor Ampacity & Thermal Derating Table (IPC Table 4-2)',
    category: 'Engineering Reference',
    description:
      'Quick reference chart for copper conductor ampacities from 26 AWG to 4/0 AWG with bundle count derating factors and 80°C / 105°C / 125°C insulation temperature limits.',
    pagesOrSize: '2 Pages • Printable Desk Reference',
    format: 'PDF / SVG',
    standard: 'IPC-WHMA-A-620 Table 4-2',
    actionText: 'View Reference Chart',
    actionLink: '#',
  },
  {
    id: 'res-7',
    type: 'CHEAT_SHEET',
    title: 'Wire Color Coding Standards: NFPA 79 vs IEC 60204-1',
    category: 'Engineering Reference',
    description:
      'Side-by-side comparison of wire insulation color conventions for AC power conductors, DC power, neutral, earth ground, and external interlocking circuits energized when the main disconnect is OFF.',
    pagesOrSize: '2 Pages • Reference Chart',
    format: 'PDF / SVG',
    standard: 'NFPA 79 & IEC 60204-1',
    actionText: 'View Comparison',
    actionLink: '#',
  },
];

export default function ResourcesPage() {
  const [selectedType, setSelectedType] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const filteredResources = RESOURCES.filter((res) => {
    const matchType = selectedType === 'ALL' || res.type === selectedType;
    const matchQuery =
      searchQuery === '' ||
      res.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      res.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      res.standard.toLowerCase().includes(searchQuery.toLowerCase()) ||
      res.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchType && matchQuery;
  });

  return (
    <div className="min-h-screen bg-[#060B14] text-slate-100 flex flex-col font-sans">
      <MarketingNav />

      {/* Hero Section */}
      <section className="border-b border-white/[0.08] bg-[#0A1120]/60 py-16 px-4">
        <div className="max-w-6xl mx-auto space-y-6 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.06] border border-white/10 text-sky-400 text-xs font-mono font-bold">
            <BookOpen className="w-3.5 h-3.5 text-sky-400" />
            ENGINEERING KNOWLEDGE BASE
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold text-white tracking-tight">
            Technical Resources &amp; Test Schematics
          </h1>
          <p className="text-base sm:text-lg text-slate-300 max-w-3xl mx-auto leading-relaxed">
            Download verified sample wiring manuals to test in our AI engine, read whitepapers on automated compliance verification, and reference electrical engineering standards tables.
          </p>
        </div>
      </section>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-12 space-y-12">
        {/* Search & Filter Toolbar */}
        <div className="p-4 sm:p-5 rounded-2xl bg-[#0A1120] border border-white/10 shadow-xl flex flex-col sm:flex-row gap-4 items-stretch sm:items-center justify-between">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search sample manuals, whitepapers, or cheat sheets..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-lg bg-black/40 border border-white/10 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-sky-500 transition"
            />
          </div>

          {/* Type Filter */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            {[
              { id: 'ALL', label: 'All Resources' },
              { id: 'SAMPLE_MANUAL', label: 'Sample Manuals' },
              { id: 'WHITEPAPER', label: 'Whitepapers' },
              { id: 'CHEAT_SHEET', label: 'Reference Charts' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setSelectedType(tab.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition shrink-0 ${
                  selectedType === tab.id
                    ? 'bg-[#0284C7] text-white shadow-md'
                    : 'bg-white/[0.04] text-slate-300 hover:bg-white/[0.08] hover:text-white border border-white/5'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Resource Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredResources.map((item) => {
            const badgeColor =
              item.type === 'SAMPLE_MANUAL'
                ? 'bg-sky-500/10 text-sky-400 border-sky-500/20'
                : item.type === 'WHITEPAPER'
                ? 'bg-purple-500/10 text-purple-400 border-purple-500/20'
                : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';

            const typeLabel =
              item.type === 'SAMPLE_MANUAL'
                ? 'SAMPLE MANUAL'
                : item.type === 'WHITEPAPER'
                ? 'TECHNICAL WHITEPAPER'
                : 'ENGINEERING REFERENCE';

            return (
              <div
                key={item.id}
                className="p-6 rounded-2xl bg-[#0A1120] border border-white/10 hover:border-sky-500/40 hover:bg-white/[0.02] transition flex flex-col justify-between space-y-6 shadow-xl"
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`px-2.5 py-0.5 rounded text-[10px] font-mono font-bold border ${badgeColor}`}
                    >
                      {typeLabel}
                    </span>
                    <span className="text-[10px] font-mono text-slate-400">
                      {item.format}
                    </span>
                  </div>

                  <div>
                    <span className="text-[11px] font-mono text-slate-400 block">
                      {item.category}
                    </span>
                    <h3 className="text-base font-bold text-white mt-1 leading-snug">
                      {item.title}
                    </h3>
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed">
                    {item.description}
                  </p>
                </div>

                <div className="space-y-3 pt-4 border-t border-white/5">
                  <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
                    <span>{item.pagesOrSize}</span>
                    <span className="text-slate-300 font-semibold">{item.standard}</span>
                  </div>

                  <Link
                    href={item.actionLink}
                    className="w-full py-2.5 px-4 rounded-lg bg-white/10 hover:bg-white/20 text-white font-mono text-xs font-bold transition flex items-center justify-center gap-2"
                  >
                    <span>{item.actionText}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>

        {/* Quick Reference Table Preview */}
        <section className="p-8 rounded-2xl bg-[#0A1120] border border-white/10 shadow-2xl space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] font-mono font-bold border border-emerald-500/20">
                QUICK CHEAT SHEET
              </div>
              <h3 className="text-lg font-bold text-white mt-1">
                Conductor Ampacity &amp; Sizing Reference (IPC Table 4-2 Excerpt)
              </h3>
            </div>
            <span className="text-xs font-mono text-slate-400">
              Copper Conductor @ 30&deg;C Ambient
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse font-mono">
              <thead>
                <tr className="border-b border-white/10 text-slate-400">
                  <th className="py-2.5 px-3">Conductor AWG</th>
                  <th className="py-2.5 px-3">Nominal Area (mm&sup2;)</th>
                  <th className="py-2.5 px-3">Continuous Rating (Single)</th>
                  <th className="py-2.5 px-3">Bundled Derating (10 Wires)</th>
                  <th className="py-2.5 px-3">Typical Application</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-slate-200">
                <tr>
                  <td className="py-2.5 px-3 text-sky-400 font-bold">24 AWG</td>
                  <td className="py-2.5 px-3">0.20 mm&sup2;</td>
                  <td className="py-2.5 px-3">3.5 A</td>
                  <td className="py-2.5 px-3 text-amber-400">1.8 A</td>
                  <td className="py-2.5 px-3 text-slate-400 font-sans">Low-voltage sensor signals &amp; CAN-Bus</td>
                </tr>
                <tr>
                  <td className="py-2.5 px-3 text-sky-400 font-bold">20 AWG</td>
                  <td className="py-2.5 px-3">0.52 mm&sup2;</td>
                  <td className="py-2.5 px-3">7.5 A</td>
                  <td className="py-2.5 px-3 text-amber-400">3.8 A</td>
                  <td className="py-2.5 px-3 text-slate-400 font-sans">24VDC control circuits &amp; solenoids</td>
                </tr>
                <tr>
                  <td className="py-2.5 px-3 text-sky-400 font-bold">16 AWG</td>
                  <td className="py-2.5 px-3">1.31 mm&sup2;</td>
                  <td className="py-2.5 px-3">13.0 A</td>
                  <td className="py-2.5 px-3 text-amber-400">7.2 A</td>
                  <td className="py-2.5 px-3 text-slate-400 font-sans">Auxiliary relay power &amp; lighting</td>
                </tr>
                <tr>
                  <td className="py-2.5 px-3 text-sky-400 font-bold">12 AWG</td>
                  <td className="py-2.5 px-3">3.31 mm&sup2;</td>
                  <td className="py-2.5 px-3">25.0 A</td>
                  <td className="py-2.5 px-3 text-amber-400">14.0 A</td>
                  <td className="py-2.5 px-3 text-slate-400 font-sans">Motor branch feeds &amp; heater circuits</td>
                </tr>
                <tr>
                  <td className="py-2.5 px-3 text-sky-400 font-bold">8 AWG</td>
                  <td className="py-2.5 px-3">8.37 mm&sup2;</td>
                  <td className="py-2.5 px-3">55.0 A</td>
                  <td className="py-2.5 px-3 text-amber-400">32.0 A</td>
                  <td className="py-2.5 px-3 text-slate-400 font-sans">UL 508A Main Equipment Grounding Bus</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      </main>

      <MarketingFooter />
    </div>
  );
}
