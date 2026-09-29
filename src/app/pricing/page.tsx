'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { MarketingNav } from '@/components/marketing/MarketingNav';
import { MarketingFooter } from '@/components/marketing/MarketingFooter';
import {
  Check,
  Zap,
  Building2,
  ShieldCheck,
  ArrowRight,
  HelpCircle,
  ChevronDown,
  Sparkles,
  Info,
  Clock,
  Layers,
  FileCheck2,
} from 'lucide-react';

interface PlanPricing {
  id: string;
  name: string;
  badge?: string;
  popular?: boolean;
  pricePerDiagram: number;
  monthlyCommitment?: number;
  description: string;
  idealFor: string;
  features: string[];
  ctaText: string;
  ctaLink: string;
}

const FAQS = [
  {
    q: 'How does monthly diagram checking quota work?',
    a: 'Each uploaded schematic document (from 1 to 50 pages) counts as one inspection run. In the Engineering Team tier (₹9,999/month), 50 checks are included each month. In Enterprise Team (₹24,999/month), 350 diagram checks are included with multi-engineer review and custom plant rules.',
  },
  {
    q: 'Can we pay with UPI, NetBanking, Corporate Cards, or PO?',
    a: 'Yes. We support Razorpay checkout with instant UPI (Google Pay, PhonePe, Paytm, BHIM), NetBanking across 50+ Indian banks, corporate credit/debit cards, and Net-30 GST Purchase Orders for annual enterprise agreements.',
  },
  {
    q: 'What happens if our drawing has unusual proprietary symbols?',
    a: 'Our Enterprise Team and Industrial Scale plans support Custom Plant SOPs. Our team helps calibrate your specific component symbol libraries and custom wire labeling conventions.',
  },
  {
    q: 'Are our confidential engineering drawings safe?',
    a: 'Yes. We operate strict private storage isolation. Your proprietary schematics are never stored permanently in public buckets, never shared, and never used to train public LLM models.',
  },
  {
    q: 'Can we run Wiring Diagram QC in an isolated enterprise environment?',
    a: 'Yes. For aerospace, defense, and high-security installations, we offer dedicated single-tenant VPC deployments and offline containerized models.',
  },
];

export default function PricingPage() {
  const [isAnnual, setIsAnnual] = useState<boolean>(true);
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const plans: PlanPricing[] = [
    {
      id: 'engineering-team',
      name: 'Engineering Team',
      pricePerDiagram: 9999,
      description: 'Ideal for harness engineering and quality teams reviewing complex wiring schematics.',
      idealFor: 'Specialized harness shops & design teams',
      features: [
        '50 Diagram Inspection Runs / month',
        'IPC/WHMA-A-620 & UL 508A deterministic rules',
        'Netlist & topological electrical graph extraction',
        'Formal PDF QC review reports & 5-sheet Excel workbooks',
        'Cryptographic SHA-256 report verification',
        'Standard email support (24-hour response)',
      ],
      ctaText: 'Start with Engineering Team (₹9,999)',
      ctaLink: '/app/billing',
    },
    {
      id: 'enterprise-team',
      name: 'Enterprise Team',
      badge: 'RECOMMENDED',
      popular: true,
      pricePerDiagram: 24999,
      description: 'The standard choice for cable harness manufacturing plants and UL 508A control panel builders.',
      idealFor: 'Multi-plant harness manufacturing & Tier-1 builders',
      features: [
        '350 Diagram Inspection Runs / month',
        'Everything in Engineering Team plan',
        'Multi-engineer findings review & approval workflow',
        'Custom plant SOP rule authoring & evaluation',
        'Priority OCR and multimodal queue processing',
        'Dedicated engineering support with 4-hour SLA',
      ],
      ctaText: 'Start Enterprise Team (₹24,999)',
      ctaLink: '/app/billing',
    },
    {
      id: 'industrial-scale',
      name: 'Industrial Scale',
      badge: 'ENTERPRISE SCALE',
      pricePerDiagram: 75000,
      description: 'High-throughput harness plants requiring custom ERP/MES integration and high-volume quotas.',
      idealFor: 'Automotive OEMs & high-volume production lines',
      features: [
        '1,500+ Diagram Inspection Runs / month',
        'Custom volume quotas & dedicated SLA guarantees',
        'ERP / MES integration APIs & webhook ingestion',
        'Dedicated single-tenant VPC or isolated deployment',
        'Custom standard rules authoring & calibration',
        'Dedicated Technical Account Manager',
      ],
      ctaText: 'Contact Enterprise Sales',
      ctaLink: '/contact',
    },
  ];

  return (
    <div className="min-h-screen bg-[#060B14] text-slate-100 flex flex-col font-sans">
      <MarketingNav />

      {/* Hero Section */}
      <section className="border-b border-white/[0.08] bg-[#0A1120]/60 py-16 px-4">
        <div className="max-w-6xl mx-auto space-y-6 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.06] border border-white/10 text-emerald-400 text-xs font-mono font-bold">
            <Zap className="w-3.5 h-3.5 text-emerald-400" />
            TRANSPARENT ENGINEERING VALUE
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold text-white tracking-tight">
            Predictable, Usage-Based Engineering Pricing
          </h1>
          <p className="text-base sm:text-lg text-slate-300 max-w-3xl mx-auto leading-relaxed">
            Transparent, predictable subscription tiers for electrical engineering, wire harness design, and quality inspection teams.
          </p>

          {/* Monthly / Annual Toggle */}
          <div className="pt-4 flex items-center justify-center gap-3">
            <span className={`text-xs font-mono font-medium ${!isAnnual ? 'text-white' : 'text-slate-400'}`}>
              Standard Pay-Per-Check
            </span>
            <button
              onClick={() => setIsAnnual(!isAnnual)}
              className="w-12 h-6 rounded-full bg-white/10 border border-white/20 p-0.5 relative transition-colors"
            >
              <div
                className={`w-5 h-5 rounded-full bg-[#0284C7] shadow-md transition-transform ${
                  isAnnual ? 'translate-x-6' : 'translate-x-0'
                }`}
              />
            </button>
            <span className={`text-xs font-mono font-medium flex items-center gap-1.5 ${isAnnual ? 'text-white' : 'text-slate-400'}`}>
              Annual Volume Packs
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-bold border border-emerald-500/30">
                SAVE 20%
              </span>
            </span>
          </div>
        </div>
      </section>

      {/* Pricing Cards */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-16 space-y-20">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {plans.map((plan) => {
            const displayPrice = plan.id === 'enterprise'
              ? 'Custom'
              : isAnnual && plan.id === 'pay-per-check'
              ? `₹${Math.round(plan.pricePerDiagram * 0.8)}`
              : `₹${plan.pricePerDiagram.toLocaleString('en-IN')}`;

            return (
              <div
                key={plan.id}
                className={`rounded-2xl p-6 sm:p-7 flex flex-col justify-between space-y-6 transition-all relative ${
                  plan.popular
                    ? 'bg-[#0A1120] border-2 border-sky-500 shadow-2xl shadow-sky-950/40'
                    : 'bg-[#0A1120] border border-white/10 hover:border-white/20'
                }`}
              >
                {plan.badge && (
                  <div
                    className={`absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full text-[10px] font-mono font-extrabold uppercase tracking-wider ${
                      plan.popular
                        ? 'bg-[#0284C7] text-white shadow-md'
                        : 'bg-white/10 text-slate-300 border border-white/20'
                    }`}
                  >
                    {plan.badge}
                  </div>
                )}

                <div className="space-y-4">
                  <div>
                    <h3 className="text-xl font-bold text-white">{plan.name}</h3>
                    <p className="text-xs text-slate-400 mt-1 min-h-[32px]">{plan.idealFor}</p>
                  </div>

                  <div className="pt-2 border-t border-white/5">
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl sm:text-4xl font-extrabold font-mono text-white">
                        {displayPrice}
                      </span>
                      {plan.id !== 'enterprise' && (
                        <span className="text-xs text-slate-400 font-mono">
                          {plan.id === 'pro-monthly' ? '/ month' : plan.id === 'pro-annual' ? '/ year' : '/ diagram'}
                        </span>
                      )}
                    </div>
                    {isAnnual && plan.id === 'pay-per-check' && (
                      <div className="text-[11px] text-emerald-400 font-mono mt-0.5">
                        Billed as annual volume pack (save 20%)
                      </div>
                    )}
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed">{plan.description}</p>

                  <div className="space-y-2.5 pt-4 border-t border-white/5">
                    <div className="text-[11px] font-mono uppercase text-slate-400 font-bold">
                      Included Capabilities
                    </div>
                    <ul className="space-y-2">
                      {plan.features.map((feat, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-xs text-slate-200">
                          <Check className="w-3.5 h-3.5 text-sky-400 shrink-0 mt-0.5" />
                          <span>{feat}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="pt-4 border-t border-white/5">
                  <Link
                    href={plan.ctaLink}
                    className={`w-full block py-2.5 rounded-lg text-center font-mono text-xs font-bold transition ${
                      plan.popular
                        ? 'bg-[#0284C7] hover:bg-sky-500 text-white shadow-lg'
                        : 'bg-white/10 hover:bg-white/20 text-white'
                    }`}
                  >
                    {plan.ctaText} &rarr;
                  </Link>
                </div>
              </div>
            );
          })}
        </div>

        {/* Feature Comparison Matrix */}
        <section className="p-8 rounded-2xl bg-[#0A1120] border border-white/10 shadow-xl space-y-6">
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-white">Detailed Capability Matrix</h2>
            <p className="text-xs text-slate-400">
              Granular breakdown of features across all 4 engineering tiers.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-white/10 text-slate-400 font-mono">
                  <th className="py-3 px-4">Feature / Standard</th>
                  <th className="py-3 px-3 text-center">Engineering Team (₹9,999)</th>
                  <th className="py-3 px-3 text-center text-sky-400 font-bold">Enterprise Team (₹24,999)</th>
                  <th className="py-3 px-3 text-center text-emerald-400 font-bold">Industrial Scale (₹75,000+)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 font-mono text-slate-300">
                <tr>
                  <td className="py-3 px-4 font-sans font-medium text-white">Monthly Diagram Quota</td>
                  <td className="py-3 px-3 text-center">50 Diagram Checks</td>
                  <td className="py-3 px-3 text-center text-sky-300 font-bold">350 Diagram Checks</td>
                  <td className="py-3 px-3 text-center text-emerald-400 font-bold">1,500+ / Custom Volume</td>
                </tr>
                <tr>
                  <td className="py-3 px-4 font-sans font-medium text-white">IPC-WHMA-A-620 Rules</td>
                  <td className="py-3 px-3 text-center">Class 2 &amp; 3</td>
                  <td className="py-3 px-3 text-center text-sky-300 font-bold">Class 1, 2, 3 (Full)</td>
                  <td className="py-3 px-3 text-center text-emerald-400 font-bold">Class 1, 2, 3 + Custom</td>
                </tr>
                <tr>
                  <td className="py-3 px-4 font-sans font-medium text-white">UL 508A Industrial Panel Rules</td>
                  <td className="py-3 px-3 text-center"><Check className="w-4 h-4 mx-auto text-sky-400" /></td>
                  <td className="py-3 px-3 text-center text-sky-300 font-bold"><Check className="w-4 h-4 mx-auto text-sky-400" /></td>
                  <td className="py-3 px-3 text-center"><Check className="w-4 h-4 mx-auto text-emerald-400" /></td>
                </tr>
                <tr>
                  <td className="py-3 px-4 font-sans font-medium text-white">Topological Electrical Graph Extraction</td>
                  <td className="py-3 px-3 text-center"><Check className="w-4 h-4 mx-auto text-sky-400" /></td>
                  <td className="py-3 px-3 text-center text-sky-300 font-bold"><Check className="w-4 h-4 mx-auto text-sky-400" /></td>
                  <td className="py-3 px-3 text-center"><Check className="w-4 h-4 mx-auto text-emerald-400" /></td>
                </tr>
                <tr>
                  <td className="py-3 px-4 font-sans font-medium text-white">Multi-Sheet Excel (XLSX) Export</td>
                  <td className="py-3 px-3 text-center">5 Sheets</td>
                  <td className="py-3 px-3 text-center text-sky-300 font-bold">5 Sheets</td>
                  <td className="py-3 px-3 text-center text-emerald-400 font-bold">5 Sheets + Custom Formats</td>
                </tr>
                <tr>
                  <td className="py-3 px-4 font-sans font-medium text-white">Custom Plant SOP Rules Engine</td>
                  <td className="py-3 px-3 text-center text-slate-500">&mdash;</td>
                  <td className="py-3 px-3 text-center text-sky-300 font-bold"><Check className="w-4 h-4 mx-auto text-sky-400" /></td>
                  <td className="py-3 px-3 text-center"><Check className="w-4 h-4 mx-auto text-emerald-400" /></td>
                </tr>
                <tr>
                  <td className="py-3 px-4 font-sans font-medium text-white">Multi-Engineer Review &amp; Approval</td>
                  <td className="py-3 px-3 text-center text-slate-500">&mdash;</td>
                  <td className="py-3 px-3 text-center text-sky-300 font-bold"><Check className="w-4 h-4 mx-auto text-sky-400" /></td>
                  <td className="py-3 px-3 text-center"><Check className="w-4 h-4 mx-auto text-emerald-400" /></td>
                </tr>
                <tr>
                  <td className="py-3 px-4 font-sans font-medium text-white">Dedicated Support SLA</td>
                  <td className="py-3 px-3 text-center">Standard (24h)</td>
                  <td className="py-3 px-3 text-center text-sky-300 font-bold">Priority (4h)</td>
                  <td className="py-3 px-3 text-center text-emerald-400 font-bold">Dedicated TAM &amp; SLA</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* FAQ Accordion */}
        <section className="max-w-4xl mx-auto space-y-6">
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-bold text-white">Frequently Asked Questions</h2>
            <p className="text-xs text-slate-400">
              Clear answers regarding security, compliance, procurement, and deployment.
            </p>
          </div>

          <div className="space-y-3">
            {FAQS.map((faq, idx) => (
              <div
                key={idx}
                className="rounded-xl bg-[#0A1120] border border-white/10 overflow-hidden"
              >
                <button
                  onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                  className="w-full p-5 text-left flex items-center justify-between gap-4 hover:bg-white/[0.02] transition"
                >
                  <span className="font-bold text-sm text-white">{faq.q}</span>
                  <ChevronDown
                    className={`w-4 h-4 text-slate-400 shrink-0 transition-transform ${
                      openFaq === idx ? 'rotate-180 text-sky-400' : ''
                    }`}
                  />
                </button>
                {openFaq === idx && (
                  <div className="px-5 pb-5 text-xs text-slate-300 leading-relaxed border-t border-white/5 pt-3">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      </main>

      <MarketingFooter />
    </div>
  );
}
