'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { MarketingNav } from '@/components/marketing/MarketingNav';
import { MarketingFooter } from '@/components/marketing/MarketingFooter';
import {
  ShieldCheck,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Info,
  Layers,
  ArrowRight,
  ExternalLink,
  BookOpen,
  Cpu,
  FileText,
  SlidersHorizontal,
  ChevronRight,
  Download,
  Check,
} from 'lucide-react';

interface RuleDefinition {
  id: string;
  standard: 'IPC-WHMA-A-620' | 'UL 508A' | 'IPC-A-610' | 'ISO 1219' | 'Plant SOP';
  clause: string;
  title: string;
  category: 'Ampacity & Gauge' | 'Grounding & Safety' | 'Terminals & Crimps' | 'Routing & Spacing' | 'Marking & Colors' | 'Component Specs';
  severity: 'CRITICAL' | 'MAJOR' | 'MINOR';
  classes: string;
  summary: string;
  logic: string;
  remediation: string;
  detectionAlgorithm: string;
}

const STANDARDS_RULES: RuleDefinition[] = [
  {
    id: 'R-620-001',
    standard: 'IPC-WHMA-A-620',
    clause: '§4.2.1 Table 4-2',
    title: 'Continuous Ampacity Conductor Derating',
    category: 'Ampacity & Gauge',
    severity: 'CRITICAL',
    classes: 'Class 2 & Class 3',
    summary: 'Conductors carrying continuous current must meet cross-sectional gauge minimums with ambient thermal derating applied.',
    logic: 'Extract net continuous load (Amperes) from wire table; verify Wire AWG >= minimum required gauge in bundle at specified operating temperature.',
    remediation: 'Upsize conductor from 18 AWG to 16 AWG or reduce circuit breaker trip rating to protect conductor insulation.',
    detectionAlgorithm: 'Topological Netlist extraction cross-referenced against wire table amperage notations.',
  },
  {
    id: 'R-620-002',
    standard: 'IPC-WHMA-A-620',
    clause: '§19.5.1',
    title: 'Crimp Terminal Conductor Brush Protrusion',
    category: 'Terminals & Crimps',
    severity: 'CRITICAL',
    classes: 'Class 1, 2, 3',
    summary: 'Stripped conductor brush must extend past the crimp barrel terminal inspection window without interfering with contact mating.',
    logic: 'Validate terminal part number callout matches wire strand bundle geometry; check drawing notes specify brush protrusion between 0.5mm and 1.5mm.',
    remediation: 'Specify correct crimp contact part number (e.g. TE 1-968855-1) and update drawing note N-14 to enforce Class 3 brush tolerance.',
    detectionAlgorithm: 'OCR part-number cross-referencing against manufacturer crimp specification database.',
  },
  {
    id: 'R-620-003',
    standard: 'IPC-WHMA-A-620',
    clause: '§13.4.2',
    title: 'In-Line Wire Splice Stagger & Insulation',
    category: 'Routing & Spacing',
    severity: 'MAJOR',
    classes: 'Class 3',
    summary: 'Multiple in-line conductor splices within a single harness bundle must be staggered by a minimum of twice the overall harness diameter.',
    logic: 'Parse coordinate points of adjacent ultrasonic or crimp splice callouts on harness branch B-04; compute linear distance along bundle axis.',
    remediation: 'Stagger Splice S-102 and Splice S-103 by at least 65 mm along the longitudinal harness run.',
    detectionAlgorithm: 'Spatial 2D coordinate distance analysis along extracted vector harness centerline.',
  },
  {
    id: 'R-620-004',
    standard: 'IPC-WHMA-A-620',
    clause: '§10.2.3',
    title: 'Braided Shield Pigtail Termination & Grounding',
    category: 'Grounding & Safety',
    severity: 'MAJOR',
    classes: 'Class 2 & Class 3',
    summary: 'Braided shield pigtails must not exceed 50mm in length prior to ground termination to prevent high-frequency RF ingress/egress.',
    logic: 'Identify shield callout on differential communication pair (CAN-Bus / Ethernet); measure conductor segment length to grounding stud G-01.',
    remediation: 'Shorten shield pigtail to 35mm maximum or specify a 360-degree EMI backshell termination band.',
    detectionAlgorithm: 'Graph segment trace from cable shield termination tag to chassis ground node.',
  },
  {
    id: 'R-620-005',
    standard: 'IPC-WHMA-A-620',
    clause: '§15.1.2',
    title: 'Minimum Bend Radius for Bundled Multi-Conductor Cables',
    category: 'Routing & Spacing',
    severity: 'MINOR',
    classes: 'Class 2 & Class 3',
    summary: 'Harness curves must maintain a minimum internal bend radius of 6x the outer bundle diameter (10x for shielded cables).',
    logic: 'Calculate arc radius on harness branches displaying right-angle routing; verify radius >= 6 * bundle_OD.',
    remediation: 'Redraw harness bend B-07 with minimum 45mm bend radius on manufacturing formboard drawing.',
    detectionAlgorithm: 'Geometric curve arc fitting on CAD vector line primitives.',
  },
  {
    id: 'R-508-001',
    standard: 'UL 508A',
    clause: 'Table 15.1',
    title: 'Equipment Grounding Conductor Sizing',
    category: 'Grounding & Safety',
    severity: 'CRITICAL',
    classes: 'Mandatory',
    summary: 'Grounding and bonding conductors must be sized according to the rating of the upstream overcurrent protective device (OCPD).',
    logic: 'Identify main circuit breaker / fuse rating (e.g. 100A); query Table 15.1 for required copper grounding conductor size (8 AWG minimum).',
    remediation: 'Increase PE / Earth ground lead from 12 AWG to 8 AWG green/yellow conductor.',
    detectionAlgorithm: 'Upstream OCPD node resolution linked to ground terminal busbar net.',
  },
  {
    id: 'R-508-002',
    standard: 'UL 508A',
    clause: '§31.1 & §31.4',
    title: 'Short-Circuit Current Rating (SCCR) Coordination',
    category: 'Ampacity & Gauge',
    severity: 'CRITICAL',
    classes: 'Mandatory',
    summary: 'The overall panel SCCR cannot exceed the lowest rated component in the primary power circuit branch.',
    logic: 'Extract SCCR ratings of power distribution blocks, contactors, overload relays, and disconnect switches; flag any component with rating < target panel SCCR (e.g. 65kA).',
    remediation: 'Replace 10kA rated terminal block TB-1 with 65kA UL-listed feeder power distribution block.',
    detectionAlgorithm: 'Component BOM parser cross-referenced against UL SCCR certification registry.',
  },
  {
    id: 'R-508-003',
    standard: 'UL 508A',
    clause: '§37.2.1',
    title: 'Control Circuit Conductor Color Coding Convention',
    category: 'Marking & Colors',
    severity: 'MAJOR',
    classes: 'Mandatory',
    summary: 'AC control circuits must use Red conductors; DC control circuits must use Blue; ungrounded circuits supplied from external sources must use Yellow/Orange.',
    logic: 'Parse wire color callout strings on control netlist branches; verify color matches voltage domain (24VDC vs 120VAC).',
    remediation: 'Change 24VDC sensor supply wiring notation from RED to BLUE on sheets 3 and 4.',
    detectionAlgorithm: 'Color text label OCR coupled with voltage domain net assignment.',
  },
  {
    id: 'R-508-004',
    standard: 'UL 508A',
    clause: '§28.1.3',
    title: 'Wire Fill Ratio in Slotted Wiring Duct',
    category: 'Routing & Spacing',
    severity: 'MINOR',
    classes: 'Mandatory',
    summary: 'Total cross-sectional conductor area must not exceed 20% of the interior cross-sectional area of internal raceways and wiring ducts.',
    logic: 'Sum cross-sectional area of all conductors routed through duct trunk D-02; compare against declared duct dimension (e.g. 2" x 3").',
    remediation: 'Increase wire duct width to 3" x 3" or route auxiliary communication lines through separate partition.',
    detectionAlgorithm: 'Conductor count summation per duct channel segment from layout drawings.',
  },
  {
    id: 'R-610-001',
    standard: 'IPC-A-610',
    clause: '§4.1.2',
    title: 'Electrical Clearance & Creepage Insulation Distance',
    category: 'Routing & Spacing',
    severity: 'CRITICAL',
    classes: 'Class 2 & Class 3',
    summary: 'High-voltage terminals must maintain minimum physical clearance from adjacent conductive chassis panels and low-voltage signal traces.',
    logic: 'Compute Euclidean distance between 480VAC bus terminal boundary and low-voltage microcontroller header boundary.',
    remediation: 'Provide minimum 6.4mm physical separation or install UL 94 V-0 insulating barrier plate.',
    detectionAlgorithm: 'Spatial boundary collision detection on component footprint layers.',
  },
  {
    id: 'R-610-002',
    standard: 'IPC-A-610',
    clause: '§7.2.1',
    title: 'Wire Dress & Insulation Clearance at Solder Cup Terminals',
    category: 'Terminals & Crimps',
    severity: 'MAJOR',
    classes: 'Class 2 & Class 3',
    summary: 'Insulation clearance from the solder fillet must not exceed one wire diameter and must not be embedded in solder.',
    logic: 'Inspect drawing detail view callout for solder cup connections; verify insulation gap specification note.',
    remediation: 'Update fabrication note N-08 to enforce solder cup insulation clearance of 0.8mm max.',
    detectionAlgorithm: 'OCR detail note parsing against solder termination standard clauses.',
  },
  {
    id: 'R-1219-001',
    standard: 'ISO 1219',
    clause: '§5.3.2',
    title: 'Solenoid Valve Port Designator & Flow Designation',
    category: 'Component Specs',
    severity: 'MINOR',
    classes: 'Hydraulic & Pneumatic',
    summary: 'Pneumatic/hydraulic electro-valves must designate inlet (P/1), working lines (A/2, B/4), and exhaust (R/3, S/5) per ISO 1219.',
    logic: 'Parse port labeling strings on electro-pneumatic schematic blocks; flag legacy numeric or ambiguous alphabetical tags.',
    remediation: 'Rename valve solenoid manifold port "IN" to "1" and exhaust ports to "3" and "5".',
    detectionAlgorithm: 'Symbol glyph classifier matching ISO 1219 electro-pneumatic library.',
  },
  {
    id: 'R-SOP-001',
    standard: 'Plant SOP',
    clause: 'SOP-SPAND-09',
    title: 'Insulated Bootlace Ferrule Requirement on Stranded Wires',
    category: 'Terminals & Crimps',
    severity: 'CRITICAL',
    classes: 'Corporate Standard',
    summary: 'All fine-stranded flexible conductors terminating in screw-clamp or push-in terminal blocks must utilize DIN 46228-4 insulated wire ferrules.',
    logic: 'Match wire type (flexible class 5/6) against terminal block termination style; verify BOM contains DIN 46228 ferrule part callout.',
    remediation: 'Add insulated twin ferrule (e.g. Phoenix Contact AI-TWIN 2X 1-8 GY) to terminal TB-10 connections.',
    detectionAlgorithm: 'BOM item correlation with terminal block pin termination property.',
  },
  {
    id: 'R-SOP-002',
    standard: 'Plant SOP',
    clause: 'SOP-SPAND-14',
    title: 'Dual-End Heat-Shrink Sleeve Serialization & Directional Arrows',
    category: 'Marking & Colors',
    severity: 'MAJOR',
    classes: 'Corporate Standard',
    summary: 'Every wire segment exceeding 300mm must have thermal-transfer printable polyolefin sleeves printed with source-destination IDs at both extremities.',
    logic: 'Calculate wire length between endpoints; flag any wire segment > 300mm missing dual-end wire marker notation.',
    remediation: 'Add wire marker tags W-201A and W-201B at J1-Pin4 and M1-Pin2 respectively.',
    detectionAlgorithm: 'Geometric line length calculation cross-checked with wire marking attributes.',
  },
];

export default function StandardsPage() {
  const [selectedStandard, setSelectedStandard] = useState<string>('ALL');
  const [selectedSeverity, setSelectedSeverity] = useState<string>('ALL');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeRuleModal, setActiveRuleModal] = useState<RuleDefinition | null>(null);

  const filteredRules = useMemo(() => {
    return STANDARDS_RULES.filter((rule) => {
      const matchStd = selectedStandard === 'ALL' || rule.standard === selectedStandard;
      const matchSev = selectedSeverity === 'ALL' || rule.severity === selectedSeverity;
      const matchCat = selectedCategory === 'ALL' || rule.category === selectedCategory;
      const matchQuery =
        searchQuery === '' ||
        rule.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        rule.clause.toLowerCase().includes(searchQuery.toLowerCase()) ||
        rule.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        rule.summary.toLowerCase().includes(searchQuery.toLowerCase());
      return matchStd && matchSev && matchCat && matchQuery;
    });
  }, [selectedStandard, selectedSeverity, selectedCategory, searchQuery]);

  return (
    <div className="min-h-screen bg-[#060B14] text-slate-100 flex flex-col font-sans">
      <MarketingNav />

      {/* Hero Section */}
      <section className="border-b border-white/[0.08] bg-[#0A1120]/60 py-16 px-4">
        <div className="max-w-6xl mx-auto space-y-6 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.06] border border-white/10 text-emerald-400 text-xs font-mono font-bold">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            ENGINEERING STANDARDS AUDIT ENGINE
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold text-white tracking-tight">
            Supported Engineering Standards
          </h1>
          <p className="text-base sm:text-lg text-slate-300 max-w-3xl mx-auto leading-relaxed">
            Deterministic verification against global wire harness, industrial control panel, and electronic assembly standards. The active engine evaluates 20 core production rules from an extensible catalog of 400+ industry specifications.
          </p>

          {/* Quick Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-4xl mx-auto pt-6">
            <div className="p-4 rounded-xl bg-white/[0.03] border border-white/10 text-left">
              <div className="text-2xl font-mono font-bold text-white">156</div>
              <div className="text-xs text-slate-400 mt-1">IPC-WHMA-A-620 Catalog</div>
              <div className="text-[10px] text-emerald-400 font-mono mt-0.5">Classes 1, 2, 3 (Illustrative Catalog)</div>
            </div>
            <div className="p-4 rounded-xl bg-white/[0.03] border border-white/10 text-left">
              <div className="text-2xl font-mono font-bold text-white">184</div>
              <div className="text-xs text-slate-400 mt-1">UL 508A Rules</div>
              <div className="text-[10px] text-sky-400 font-mono mt-0.5">3rd Edition 2024</div>
            </div>
            <div className="p-4 rounded-xl bg-white/[0.03] border border-white/10 text-left">
              <div className="text-2xl font-mono font-bold text-white">98</div>
              <div className="text-xs text-slate-400 mt-1">IPC-A-610 Rules</div>
              <div className="text-[10px] text-amber-400 font-mono mt-0.5">Electronic Assemblies</div>
            </div>
            <div className="p-4 rounded-xl bg-white/[0.03] border border-white/10 text-left">
              <div className="text-2xl font-mono font-bold text-white">&infin;</div>
              <div className="text-xs text-slate-400 mt-1">Custom Plant SOPs</div>
              <div className="text-[10px] text-indigo-400 font-mono mt-0.5">Tenant Rule Engine</div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Interactive Rule Matrix */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-12 space-y-8">
        {/* Search & Filters */}
        <div className="p-5 rounded-2xl bg-[#0A1120] border border-white/10 shadow-xl space-y-4">
          <div className="flex flex-col lg:flex-row gap-4 items-stretch lg:items-center justify-between">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search rule title, clause (e.g. Table 15.1), keyword (ampacity, ferrule)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-black/40 border border-white/10 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-sky-500 transition"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-white"
                >
                  Clear
                </button>
              )}
            </div>

            {/* Severity Filter */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400 font-mono flex items-center gap-1.5">
                <SlidersHorizontal className="w-3.5 h-3.5" />
                Severity:
              </span>
              <div className="inline-flex rounded-lg border border-white/10 bg-black/30 p-1 text-xs">
                {['ALL', 'CRITICAL', 'MAJOR', 'MINOR'].map((sev) => (
                  <button
                    key={sev}
                    onClick={() => setSelectedSeverity(sev)}
                    className={`px-2.5 py-1 rounded font-mono font-medium transition ${
                      selectedSeverity === sev
                        ? 'bg-white/15 text-white shadow-sm'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {sev}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Standard Tabs */}
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-white/5">
            <span className="text-xs text-slate-400 font-mono mr-1">Standard:</span>
            {[
              { id: 'ALL', label: 'All Standards' },
              { id: 'IPC-WHMA-A-620', label: 'IPC-WHMA-A-620' },
              { id: 'UL 508A', label: 'UL 508A' },
              { id: 'IPC-A-610', label: 'IPC-A-610' },
              { id: 'ISO 1219', label: 'ISO 1219' },
              { id: 'Plant SOP', label: 'Custom Plant SOP' },
            ].map((std) => (
              <button
                key={std.id}
                onClick={() => setSelectedStandard(std.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                  selectedStandard === std.id
                    ? 'bg-[#0284C7] text-white font-semibold shadow-md'
                    : 'bg-white/[0.04] text-slate-300 hover:bg-white/[0.08] hover:text-white border border-white/5'
                }`}
              >
                {std.label}
              </button>
            ))}
          </div>
        </div>

        {/* Results Count & Matrix View */}
        <div className="flex items-center justify-between px-1">
          <div className="text-xs text-slate-400 font-mono">
            Showing <span className="font-bold text-white">{filteredRules.length}</span> verified rules in library
          </div>
          <div className="text-xs text-slate-500 font-mono hidden sm:block">
            Click any rule for mathematical logic &amp; detection algorithm
          </div>
        </div>

        {/* Rule Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredRules.map((rule) => {
            const severityColor =
              rule.severity === 'CRITICAL'
                ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                : rule.severity === 'MAJOR'
                ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                : 'bg-sky-500/10 text-sky-400 border-sky-500/20';

            const standardBadgeColor =
              rule.standard === 'IPC-WHMA-A-620'
                ? 'text-emerald-400 border-emerald-500/20 bg-emerald-500/10'
                : rule.standard === 'UL 508A'
                ? 'text-sky-400 border-sky-500/20 bg-sky-500/10'
                : rule.standard === 'IPC-A-610'
                ? 'text-amber-400 border-amber-500/20 bg-amber-500/10'
                : 'text-indigo-400 border-indigo-500/20 bg-indigo-500/10';

            return (
              <div
                key={rule.id}
                onClick={() => setActiveRuleModal(rule)}
                className="group cursor-pointer p-5 rounded-xl bg-[#0A1120] border border-white/10 hover:border-sky-500/40 hover:bg-white/[0.03] transition-all flex flex-col justify-between space-y-4"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`px-2 py-0.5 rounded text-[11px] font-mono font-bold border ${standardBadgeColor}`}
                    >
                      {rule.standard}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${severityColor}`}
                    >
                      {rule.severity}
                    </span>
                  </div>

                  <div>
                    <div className="text-[11px] font-mono text-slate-400 flex items-center gap-1.5">
                      <span>{rule.clause}</span>
                      <span>&bull;</span>
                      <span className="text-slate-500">{rule.category}</span>
                    </div>
                    <h3 className="text-sm font-bold text-white group-hover:text-sky-300 transition mt-1">
                      {rule.title}
                    </h3>
                  </div>

                  <p className="text-xs text-slate-300 line-clamp-2 leading-relaxed">
                    {rule.summary}
                  </p>
                </div>

                <div className="pt-3 border-t border-white/5 flex items-center justify-between text-[11px] font-mono text-slate-400">
                  <span>Class: {rule.classes}</span>
                  <span className="inline-flex items-center gap-1 text-sky-400 group-hover:translate-x-1 transition-transform">
                    Inspect <ChevronRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Modal: Rule Detail Inspection */}
        {activeRuleModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
            <div className="max-w-2xl w-full bg-[#0A1120] border border-white/20 rounded-2xl p-6 sm:p-8 space-y-6 shadow-2xl relative">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-sky-500/10 border border-sky-500/20 text-sky-400">
                      {activeRuleModal.standard}
                    </span>
                    <span className="text-xs font-mono text-slate-400">
                      {activeRuleModal.clause}
                    </span>
                    <span
                      className={`text-xs font-mono font-bold px-2 py-0.5 rounded border ${
                        activeRuleModal.severity === 'CRITICAL'
                          ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                          : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                      }`}
                    >
                      {activeRuleModal.severity}
                    </span>
                  </div>
                  <h2 className="text-xl font-bold text-white mt-2">
                    {activeRuleModal.title}
                  </h2>
                </div>
                <button
                  onClick={() => setActiveRuleModal(null)}
                  className="text-slate-400 hover:text-white p-1 rounded-lg text-sm font-mono"
                >
                  &times; CLOSE
                </button>
              </div>

              <div className="space-y-4 text-xs">
                <div className="p-3.5 rounded-lg bg-white/[0.03] border border-white/10 space-y-1">
                  <div className="font-mono text-slate-400 text-[10px] uppercase">
                    Requirement Summary &amp; Scope
                  </div>
                  <div className="text-slate-200 text-sm leading-relaxed">
                    {activeRuleModal.summary}
                  </div>
                </div>

                <div className="p-3.5 rounded-lg bg-black/40 border border-white/10 space-y-1">
                  <div className="font-mono text-sky-400 text-[10px] uppercase">
                    Deterministic Algorithmic Logic
                  </div>
                  <div className="text-slate-300 font-mono text-xs leading-relaxed">
                    {activeRuleModal.logic}
                  </div>
                </div>

                <div className="p-3.5 rounded-lg bg-emerald-500/5 border border-emerald-500/20 space-y-1">
                  <div className="font-mono text-emerald-400 text-[10px] uppercase">
                    Automated Detection Method
                  </div>
                  <div className="text-slate-300 text-xs">
                    {activeRuleModal.detectionAlgorithm}
                  </div>
                </div>

                <div className="p-3.5 rounded-lg bg-amber-500/5 border border-amber-500/20 space-y-1">
                  <div className="font-mono text-amber-400 text-[10px] uppercase">
                    Standard Remediation Guidance
                  </div>
                  <div className="text-slate-300 text-xs">
                    {activeRuleModal.remediation}
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-white/10 flex items-center justify-between">
                <span className="text-[11px] font-mono text-slate-400">
                  Target Classes: <span className="text-white font-bold">{activeRuleModal.classes}</span>
                </span>
                <button
                  onClick={() => setActiveRuleModal(null)}
                  className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white font-mono text-xs font-bold transition"
                >
                  Dismiss Inspector
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Corporate SOP Engine Callout */}
        <div className="p-8 rounded-2xl bg-gradient-to-r from-sky-950/40 to-slate-900 border border-sky-500/20 space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-sky-500/10 border border-sky-500/20 text-sky-400 text-xs font-mono font-bold">
                ENTERPRISE EXTENSION
              </div>
              <h3 className="text-xl font-bold text-white">
                Have proprietary plant wiring norms or OEM internal standards?
              </h3>
              <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
                Our rule engine allows quality directors to define custom regex, terminal logic, crimp codes, and wire coloring policies. Upload your plant SOP manual and deploy organization-wide rules in minutes.
              </p>
            </div>
            <Link
              href="/contact"
              className="px-5 py-3 rounded-lg bg-[#0284C7] hover:bg-sky-500 text-white font-bold text-xs font-mono transition text-center shrink-0 shadow-lg"
            >
              Configure Plant SOPs &rarr;
            </Link>
          </div>
        </div>
      </main>

      <MarketingFooter />
    </div>
  );
}
