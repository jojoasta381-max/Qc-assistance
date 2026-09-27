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
    q: 'How does per-diagram pricing work?',
    a: 'Each uploaded schematic document (from 1 to 25 pages) counts as one inspection run. In the Pay-Per-Check tier (₹99/diagram), individual schematics are audited on demand. In Pro Monthly (₹499/month), 100 checks are included each month with netlist graph extraction and coordinate overlays.',
  },
  {
    q: 'Can we pay with UPI, NetBanking, Corporate Cards, or PO?',
    a: 'Yes. We support Razorpay Standard Checkout with instant UPI (Google Pay, PhonePe, Paytm, BHIM), NetBanking across 50+ Indian banks, corporate credit/debit cards, and Net-30 GST Purchase Orders for enterprise annual contracts.',
  },
  {
    q: 'What happens if our drawing has unusual proprietary symbols?',
    a: 'Our Industrial Annual and Enterprise plans support Custom Plant SOPs. Our engineering team helps digitize your specific component symbol libraries and custom wire labeling conventions.',
  },
  {
    q: 'Are our confidential engineering drawings safe?',
    a: 'Absolutely. We operate a strict Zero-Model-Training policy. Your proprietary schematics are never stored permanently, never shared, and never used to train public LLM models. All processing occurs in ephemeral memory sandboxes.',
  },
  {
    q: 'Can we run Wiring Diagram QC on-premises in an air-gapped network?',
    a: 'Yes. For aerospace, defense, and nuclear installations, we offer an On-Premises Air-Gapped Appliance containerized with Docker/Kubernetes that runs entirely offline with local open-source vision-language models.',
  },
];

export default function PricingPage() {
  const [isAnnual, setIsAnnual] = useState<boolean>(true);
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const plans: PlanPricing[] = [
    {
      id: 'pay-per-check',
      name: 'Pay-Per-Check',
      pricePerDiagram: 99,
      description: 'Ideal for independent engineers and small prototype repair shops auditing individual manuals.',
      idealFor: 'Single-diagram audit, zero commitment',
      features: [
        'Single-page or multi-page schematic verification',
        'Basic IPC-WHMA-A-620 Class 2 & UL 508A rules',
        'Standard Turnaround (~60 seconds)',
        'Executive PDF Compliance Certificate & Excel workbook',
        'Email Support',
      ],
      ctaText: 'Start with Pay-Per-Check (₹99)',
      ctaLink: '/app/billing',
    },
    {
      id: 'pro-monthly',
      name: 'Pro Monthly',
      badge: 'CORE REVENUE DRIVER',
      popular: true,
      pricePerDiagram: 499,
      description: 'The standard choice for cable harness manufacturing plants and UL 508A control panel builders.',
      idealFor: 'Production harness plants & panel shops',
      features: [
        '100 checks included / month',
        'Full IPC-WHMA-A-620 + UL 508A 3rd Edition',
        'Interactive CAD Pinpointing with radar coordinate box',
        'Executive PDF + 5-Sheet Excel (XLSX) workbook',
        'EasySchematic CAD Editor link & visual annotation',
        'Dedicated Open-Source Vision Model routing',
        'Priority email & ticket support',
      ],
      ctaText: 'Start Pro Monthly (₹499)',
      ctaLink: '/app/billing',
    },
    {
      id: 'pro-annual',
      name: 'Industrial Annual',
      badge: 'BEST VALUE (SAVE 17%)',
      pricePerDiagram: 4999,
      description: 'Highest automated engineering tier for aerospace, defense avionics, and high-density industrial harnesses.',
      idealFor: 'Aerospace, defense & critical infrastructure',
      features: [
        '1,500 checks included / year',
        'IPC-620 Class 3 + UL 508A + IPC-A-610 + ISO 1219',
        'Custom Plant SOP rule engine integration',
        'Full Netlist Graph JSON & XML electrical export',
        'Continuous regression feedback training loop',
        'Rapid < 30-second priority queue processing',
        'Dedicated Technical Account Manager',
      ],
      ctaText: 'Start Industrial Annual (₹4,999)',
      ctaLink: '/app/billing',
    },
    {
      id: 'enterprise',
      name: 'Enterprise Custom',
      badge: 'ON-PREM / AIR-GAPPED',
      pricePerDiagram: 0, // Custom volume
      description: 'Custom volume licensing, dedicated cloud tenant isolation, and air-gapped on-premises appliance deployments.',
      idealFor: 'Defense contractors & multi-plant enterprises',
      features: [
        'Unlimited monthly diagram volume licensing',
        'Air-Gapped On-Premises appliance deployment',
        'SOC 2 Type II compliant dedicated tenant isolation',
        'Custom standard rule drafting by our electrical engineers',
        'Direct ERP / MES / Formboard tester API integrations',
        'Custom SSO (SAML 2.0 / Okta / Azure AD)',
        '99.99% Uptime SLA & 24/7 engineering phone support',
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
            Pay only for what you inspect. From $1 single-page checks to mission-critical aerospace audits, choose the tier that matches your production throughput.
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
                  <th className="py-3 px-3 text-center">Pay-Per-Check (₹99)</th>
                  <th className="py-3 px-3 text-center text-sky-400 font-bold">Pro Monthly (₹499)</th>
                  <th className="py-3 px-3 text-center">Industrial Annual (₹4,999)</th>
                  <th className="py-3 px-3 text-center">Enterprise Custom</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 font-mono text-slate-300">
                <tr>
                  <td className="py-3 px-4 font-sans font-medium text-white">Document Page Limit</td>
                  <td className="py-3 px-3 text-center">1 Page</td>
                  <td className="py-3 px-3 text-center text-sky-300 font-bold">Up to 15 Pages</td>
                  <td className="py-3 px-3 text-center">Up to 50 Pages</td>
                  <td className="py-3 px-3 text-center text-emerald-400 font-bold">Unlimited</td>
                </tr>
                <tr>
                  <td className="py-3 px-4 font-sans font-medium text-white">IPC-WHMA-A-620 Rules</td>
                  <td className="py-3 px-3 text-center">Class 2 (Basic)</td>
                  <td className="py-3 px-3 text-center text-sky-300 font-bold">Class 2 &amp; 3 (Full)</td>
                  <td className="py-3 px-3 text-center">Class 1, 2, 3 (Full)</td>
                  <td className="py-3 px-3 text-center text-emerald-400 font-bold">Class 1, 2, 3 + Custom</td>
                </tr>
                <tr>
                  <td className="py-3 px-4 font-sans font-medium text-white">UL 508A Industrial Panel Rules</td>
                  <td className="py-3 px-3 text-center text-slate-500">&mdash;</td>
                  <td className="py-3 px-3 text-center text-sky-300 font-bold"><Check className="w-4 h-4 mx-auto text-sky-400" /></td>
                  <td className="py-3 px-3 text-center"><Check className="w-4 h-4 mx-auto text-sky-400" /></td>
                  <td className="py-3 px-3 text-center"><Check className="w-4 h-4 mx-auto text-emerald-400" /></td>
                </tr>
                <tr>
                  <td className="py-3 px-4 font-sans font-medium text-white">Interactive CAD Coordinate Pinpointing</td>
                  <td className="py-3 px-3 text-center text-slate-500">&mdash;</td>
                  <td className="py-3 px-3 text-center text-sky-300 font-bold"><Check className="w-4 h-4 mx-auto text-sky-400" /></td>
                  <td className="py-3 px-3 text-center"><Check className="w-4 h-4 mx-auto text-sky-400" /></td>
                  <td className="py-3 px-3 text-center"><Check className="w-4 h-4 mx-auto text-emerald-400" /></td>
                </tr>
                <tr>
                  <td className="py-3 px-4 font-sans font-medium text-white">Multi-Sheet Excel (XLSX) Export</td>
                  <td className="py-3 px-3 text-center text-slate-500">&mdash;</td>
                  <td className="py-3 px-3 text-center text-sky-300 font-bold">5 Sheets</td>
                  <td className="py-3 px-3 text-center">5 Sheets</td>
                  <td className="py-3 px-3 text-center">Custom Formats</td>
                </tr>
                <tr>
                  <td className="py-3 px-4 font-sans font-medium text-white">Custom Plant SOP Rules Engine</td>
                  <td className="py-3 px-3 text-center text-slate-500">&mdash;</td>
                  <td className="py-3 px-3 text-center text-slate-500">&mdash;</td>
                  <td className="py-3 px-3 text-center"><Check className="w-4 h-4 mx-auto text-sky-400" /></td>
                  <td className="py-3 px-3 text-center"><Check className="w-4 h-4 mx-auto text-emerald-400" /></td>
                </tr>
                <tr>
                  <td className="py-3 px-4 font-sans font-medium text-white">Turnaround Speed SLA</td>
                  <td className="py-3 px-3 text-center">Standard (~3m)</td>
                  <td className="py-3 px-3 text-center text-sky-300 font-bold">&lt; 60 Seconds</td>
                  <td className="py-3 px-3 text-center">&lt; 30 Seconds</td>
                  <td className="py-3 px-3 text-center text-emerald-400 font-bold">Instant Dedicated GPU</td>
                </tr>
                <tr>
                  <td className="py-3 px-4 font-sans font-medium text-white">Air-Gapped On-Premises Option</td>
                  <td className="py-3 px-3 text-center text-slate-500">&mdash;</td>
                  <td className="py-3 px-3 text-center text-slate-500">&mdash;</td>
                  <td className="py-3 px-3 text-center text-slate-500">&mdash;</td>
                  <td className="py-3 px-3 text-center"><Check className="w-4 h-4 mx-auto text-emerald-400" /></td>
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
