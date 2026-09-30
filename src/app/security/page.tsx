'use client';

import React from 'react';
import Link from 'next/link';
import { MarketingNav } from '@/components/marketing/MarketingNav';
import { MarketingFooter } from '@/components/marketing/MarketingFooter';
import {
  ShieldCheck,
  Lock,
  Server,
  FileCheck2,
  CheckCircle2,
  AlertOctagon,
  KeyRound,
  EyeOff,
  HardDrive,
  Cpu,
  ArrowRight,
} from 'lucide-react';

export default function SecurityPage() {
  return (
    <div className="min-h-screen bg-[#060B14] text-slate-100 flex flex-col font-sans">
      <MarketingNav />

      {/* Hero Section */}
      <section className="border-b border-white/[0.08] bg-[#0A1120]/60 py-16 px-4">
        <div className="max-w-6xl mx-auto space-y-6 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.06] border border-white/10 text-emerald-400 text-xs font-mono font-bold">
            <Lock className="w-3.5 h-3.5 text-emerald-400" />
            ENTERPRISE DEFENSE &amp; DATA SOVEREIGNTY
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold text-white tracking-tight">
            Security &amp; Intellectual Property Protection
          </h1>
          <p className="text-base sm:text-lg text-slate-300 max-w-3xl mx-auto leading-relaxed">
            Proprietary wiring diagrams contain your most sensitive engineering IP. Our architecture is engineered from the ground up for strict tenant isolation, zero model training, and cryptographic verification.
          </p>
        </div>
      </section>

      {/* 4 Pillars of Engineering Data Protection */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-16 space-y-20">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Pillar 1: Zero Model Training Guarantee */}
          <div className="p-8 rounded-2xl bg-[#0A1120] border border-white/10 shadow-xl space-y-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <EyeOff className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <span className="text-xs font-mono text-emerald-400 font-bold uppercase tracking-wider">
                Strict Privacy Clause
              </span>
              <h2 className="text-xl font-bold text-white">
                Zero Model Training on Customer IP
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Your wiring schematics, pinout netlists, and component specifications are never stored permanently, never used to train public or commercial AI models, and never shared with external parties.
            </p>
            <ul className="space-y-2 text-xs text-slate-400 pt-2 border-t border-white/5 font-mono">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                Ephemeral in-memory processing sandboxes
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                Automatic document purge after inspection session
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                Contractual IP indemnity for enterprise agreements
              </li>
            </ul>
          </div>

          {/* Pillar 2: Logical & Cryptographic Tenant Isolation */}
          <div className="p-8 rounded-2xl bg-[#0A1120] border border-white/10 shadow-xl space-y-4">
            <div className="w-12 h-12 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400">
              <KeyRound className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <span className="text-xs font-mono text-sky-400 font-bold uppercase tracking-wider">
                Multi-Tenant Architecture
              </span>
              <h2 className="text-xl font-bold text-white">
                Cryptographic Tenant Segregation
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Every organization operates within an isolated tenant partition. All database queries, cached netlists, and inspection artifacts are scoped strictly by organization ID with automated authorization checks.
            </p>
            <ul className="space-y-2 text-xs text-slate-400 pt-2 border-t border-white/5 font-mono">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                AES-256-GCM data encryption at rest
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                TLS 1.3 enforced for all data in transit
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                Granular RBAC: Owner, Admin, QC Manager, Inspector, Viewer
              </li>
            </ul>
          </div>

          {/* Pillar 3: Perimeter Defense & Ingestion Hardening */}
          <div className="p-8 rounded-2xl bg-[#0A1120] border border-white/10 shadow-xl space-y-4">
            <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <AlertOctagon className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <span className="text-xs font-mono text-amber-400 font-bold uppercase tracking-wider">
                Application Security
              </span>
              <h2 className="text-xl font-bold text-white">
                SSRF &amp; File Ingestion Hardening
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              File upload endpoints undergo deep binary inspection, MIME validation, and vector sanitization to prevent malformed SVG/PDF exploits, SSRF attacks against internal networks, and prototype pollution.
            </p>
            <ul className="space-y-2 text-xs text-slate-400 pt-2 border-t border-white/5 font-mono">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                Strict RFC 1918 private IP egress blocking
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                SVG sanitization stripping script tags &amp; event handlers
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                Automated continuous vulnerability auditing (0 npm CVEs)
              </li>
            </ul>
          </div>

          {/* Pillar 4: Tamper-Evident SHA-256 Audit Trail */}
          <div className="p-8 rounded-2xl bg-[#0A1120] border border-white/10 shadow-xl space-y-4">
            <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
              <FileCheck2 className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <span className="text-xs font-mono text-purple-400 font-bold uppercase tracking-wider">
                Quality Traceability
              </span>
              <h2 className="text-xl font-bold text-white">
                Cryptographic QC Review Reports
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Each generated QC review report is sealed with a deterministic SHA-256 hash of the source schematic, applied standard ruleset version, and discrepancies dataset for immutable non-repudiation.
            </p>
            <ul className="space-y-2 text-xs text-slate-400 pt-2 border-t border-white/5 font-mono">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                SHA-256 document fingerprinting
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                Timestamped inspector approval signatures
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                AS9100 / ISO 9001 audit readiness
              </li>
            </ul>
          </div>
        </div>

        {/* Air-Gapped On-Premises Option */}
        <section className="p-8 sm:p-10 rounded-2xl bg-gradient-to-r from-slate-900 via-[#0A1120] to-slate-900 border border-white/10 space-y-6">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8">
            <div className="space-y-3 max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.06] border border-white/10 text-sky-400 text-xs font-mono font-bold">
                <Server className="w-3.5 h-3.5" />
                DEFENSE &amp; CLASSIFIED NETWORKS
              </div>
              <h3 className="text-2xl font-bold text-white">
                Need Complete Physical Air-Gapping?
              </h3>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                For aerospace contractors, nuclear facilities, and defense installations, we provide a self-contained containerized appliance that deploys directly into your internal data center. Zero external internet connectivity is required.
              </p>
              <div className="flex flex-wrap gap-4 text-xs font-mono text-slate-400 pt-2">
                <span>&bull; Docker / Kubernetes Helm Charts</span>
                <span>&bull; Local Open-Source Vision AI</span>
                <span>&bull; Offline License Dongle / Key</span>
              </div>
            </div>
            <Link
              href="/contact"
              className="px-6 py-3.5 rounded-lg bg-[#0284C7] hover:bg-sky-500 text-white font-bold text-xs font-mono transition text-center shrink-0 shadow-lg"
            >
              Request On-Premise Spec Sheet &rarr;
            </Link>
          </div>
        </section>

        {/* Compliance Roadmap & Certifications */}
        <section className="space-y-6 text-center">
          <div className="space-y-2">
            <h3 className="text-xl font-bold text-white">Compliance &amp; Standards Alignment</h3>
            <p className="text-xs text-slate-400">
              Designed to meet the stringent security expectations of global engineering enterprises.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-4xl mx-auto">
            <div className="p-5 rounded-xl bg-[#0A1120] border border-white/10 space-y-1">
              <div className="text-base font-bold text-white">SOC 2 Type II</div>
              <div className="text-[11px] text-emerald-400 font-mono">Controls Compliant</div>
            </div>
            <div className="p-5 rounded-xl bg-[#0A1120] border border-white/10 space-y-1">
              <div className="text-base font-bold text-white">ISO/IEC 27001</div>
              <div className="text-[11px] text-sky-400 font-mono">ISMS Aligned</div>
            </div>
            <div className="p-5 rounded-xl bg-[#0A1120] border border-white/10 space-y-1">
              <div className="text-base font-bold text-white">AS9100 / ISO 9001</div>
              <div className="text-[11px] text-purple-400 font-mono">Traceability Ready</div>
            </div>
            <div className="p-5 rounded-xl bg-[#0A1120] border border-white/10 space-y-1">
              <div className="text-base font-bold text-white">GDPR &amp; CCPA</div>
              <div className="text-[11px] text-amber-400 font-mono">Zero PII Storage</div>
            </div>
          </div>
        </section>
      </main>

      <MarketingFooter />
    </div>
  );
}
