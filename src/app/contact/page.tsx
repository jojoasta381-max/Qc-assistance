'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { MarketingNav } from '@/components/marketing/MarketingNav';
import { MarketingFooter } from '@/components/marketing/MarketingFooter';
import {
  Mail,
  Phone,
  MapPin,
  Clock,
  ShieldCheck,
  CheckCircle2,
  ArrowRight,
  Send,
  Building2,
  Cpu,
} from 'lucide-react';

export default function ContactPage() {
  const [formData, setFormData] = useState({
    fullName: '',
    workEmail: '',
    companyName: '',
    organizationType: 'Wire Harness Manufacturer',
    monthlyVolume: '50 - 200 Diagrams',
    primaryStandard: 'IPC-WHMA-A-620',
    deploymentPreference: 'Cloud Multi-Tenant SaaS',
    message: '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedRef, setSubmittedRef] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      const randArr = new Uint32Array(1);
      if (typeof window !== 'undefined' && window.crypto) {
        window.crypto.getRandomValues(randArr);
      }
      const refNum = 1000 + (randArr[0] % 9000);
      const generatedRef = `ENG-${refNum}-2026`;
      setSubmittedRef(generatedRef);
    }, 900);
  };



  return (
    <div className="min-h-screen bg-[#060B14] text-slate-100 flex flex-col font-sans">
      <MarketingNav />

      {/* Hero Section */}
      <section className="border-b border-white/[0.08] bg-[#0A1120]/60 py-16 px-4">
        <div className="max-w-6xl mx-auto space-y-6 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.06] border border-white/10 text-sky-400 text-xs font-mono font-bold">
            <Mail className="w-3.5 h-3.5 text-sky-400" />
            ENTERPRISE TECHNICAL CONSULTATION
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold text-white tracking-tight">
            Schedule an Engineering Demo
          </h1>
          <p className="text-base sm:text-lg text-slate-300 max-w-3xl mx-auto leading-relaxed">
            Connect with our applications engineering team to review your plant wiring drawings, test custom SOP rules, or discuss air-gapped on-premises deployments.
          </p>
        </div>
      </section>

      {/* Main Form & Info Section */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-16 space-y-16">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          {/* Left Column: Contact Form (7 cols) */}
          <div className="lg:col-span-7 bg-[#0A1120] border border-white/10 rounded-2xl p-8 sm:p-10 shadow-2xl space-y-8">
            {submittedRef ? (
              <div className="py-12 text-center space-y-5 animate-in fade-in">
                <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mx-auto">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-2xl font-bold text-white">Inquiry Received</h3>
                  <p className="text-xs sm:text-sm text-slate-300 max-w-md mx-auto">
                    Your request has been routed to our Lead Electrical QC Applications Engineer. We respond to technical inquiries within 2 business hours.
                  </p>
                </div>
                <div className="p-4 rounded-xl bg-black/40 border border-white/10 max-w-xs mx-auto font-mono text-xs">
                  <span className="text-slate-400 block">Reference ID:</span>
                  <span className="text-sky-400 font-bold text-base">{submittedRef}</span>
                </div>
                <button
                  onClick={() => setSubmittedRef(null)}
                  className="px-5 py-2.5 rounded-lg bg-white/10 hover:bg-white/20 text-white font-mono text-xs font-bold transition"
                >
                  Submit Another Inquiry
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <h2 className="text-2xl font-bold text-white">Engineering Consultation Request</h2>
                  <p className="text-xs text-slate-400 mt-1">
                    Please provide your plant technical details for tailored rule analysis.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Name */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-mono text-slate-300 font-medium">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Dr. Rajesh Kumar"
                      value={formData.fullName}
                      onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-lg bg-black/40 border border-white/10 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-sky-500 transition"
                    />
                  </div>

                  {/* Work Email */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-mono text-slate-300 font-medium">
                      Corporate Work Email *
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="r.kumar@company.com"
                      value={formData.workEmail}
                      onChange={(e) => setFormData({ ...formData, workEmail: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-lg bg-black/40 border border-white/10 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-sky-500 transition"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Company Name */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-mono text-slate-300 font-medium">
                      Company / Plant Name *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Horizon Wiring Systems Ltd."
                      value={formData.companyName}
                      onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-lg bg-black/40 border border-white/10 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-sky-500 transition"
                    />
                  </div>

                  {/* Organization Type */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-mono text-slate-300 font-medium">
                      Manufacturing Category
                    </label>
                    <select
                      value={formData.organizationType}
                      onChange={(e) => setFormData({ ...formData, organizationType: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-lg bg-black/40 border border-white/10 text-white text-xs focus:outline-none focus:border-sky-500 transition font-mono"
                    >
                      <option value="Wire Harness Manufacturer">Wire Harness Manufacturer</option>
                      <option value="Control Panel Builder (UL 508A)">Control Panel Builder (UL 508A)</option>
                      <option value="Aerospace / Defense Avionics">Aerospace / Defense Avionics</option>
                      <option value="Contract EMS / ODM">Contract EMS / ODM</option>
                      <option value="Automotive OEM">Automotive OEM</option>
                      <option value="Other">Other Industrial</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {/* Volume */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-mono text-slate-300 font-medium">
                      Monthly Volume
                    </label>
                    <select
                      value={formData.monthlyVolume}
                      onChange={(e) => setFormData({ ...formData, monthlyVolume: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-lg bg-black/40 border border-white/10 text-white text-xs focus:outline-none focus:border-sky-500 transition font-mono"
                    >
                      <option value="1 - 50 Diagrams">1 - 50 Diagrams</option>
                      <option value="50 - 200 Diagrams">50 - 200 Diagrams</option>
                      <option value="200 - 1,000 Diagrams">200 - 1,000 Diagrams</option>
                      <option value="1,000+ Diagrams">1,000+ Diagrams</option>
                    </select>
                  </div>

                  {/* Primary Standard */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-mono text-slate-300 font-medium">
                      Primary Standard
                    </label>
                    <select
                      value={formData.primaryStandard}
                      onChange={(e) => setFormData({ ...formData, primaryStandard: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-lg bg-black/40 border border-white/10 text-white text-xs focus:outline-none focus:border-sky-500 transition font-mono"
                    >
                      <option value="IPC-WHMA-A-620">IPC-WHMA-A-620</option>
                      <option value="UL 508A 3rd Ed.">UL 508A 3rd Ed.</option>
                      <option value="IPC-A-610">IPC-A-610</option>
                      <option value="Custom Plant SOPs">Custom Plant SOPs</option>
                      <option value="Multi-Standard">Multi-Standard</option>
                    </select>
                  </div>

                  {/* Deployment */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-mono text-slate-300 font-medium">
                      Deployment Target
                    </label>
                    <select
                      value={formData.deploymentPreference}
                      onChange={(e) => setFormData({ ...formData, deploymentPreference: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-lg bg-black/40 border border-white/10 text-white text-xs focus:outline-none focus:border-sky-500 transition font-mono"
                    >
                      <option value="Cloud Multi-Tenant SaaS">Cloud Multi-Tenant SaaS</option>
                      <option value="Dedicated Private Cloud">Dedicated Private Cloud</option>
                      <option value="Air-Gapped On-Premises">Air-Gapped On-Premises</option>
                    </select>
                  </div>
                </div>

                {/* Message */}
                <div className="space-y-1.5">
                  <label className="text-xs font-mono text-slate-300 font-medium">
                    Technical Scope / Specific Requirements
                  </label>
                  <textarea
                    rows={4}
                    placeholder="Describe your current inspection bottleneck, CAD drawing formats (AutoCAD, EPLAN, PDF), or custom crimping/derating requirements..."
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-lg bg-black/40 border border-white/10 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-sky-500 transition resize-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3.5 rounded-lg bg-[#0284C7] hover:bg-sky-500 disabled:opacity-50 text-white font-mono text-xs font-bold transition flex items-center justify-center gap-2 shadow-lg"
                >
                  {isSubmitting ? (
                    <span>Routing Request...</span>
                  ) : (
                    <>
                      <span>Submit Technical Demo Request</span>
                      <Send className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>

                <div className="text-[11px] text-slate-500 font-mono text-center">
                  Zero spam guarantee &bull; NDA covered &bull; Enterprise SLA
                </div>
              </form>
            )}
          </div>

          {/* Right Column: Direct Engineering Desk & Headquarters (5 cols) */}
          <div className="lg:col-span-5 space-y-8">
            {/* Headquarters Card */}
            <div className="p-8 rounded-2xl bg-[#0A1120] border border-white/10 shadow-xl space-y-6">
              <div className="space-y-1">
                <span className="text-xs font-mono text-sky-400 font-bold uppercase tracking-wider">
                  Direct Engineering Desk
                </span>
                <h3 className="text-xl font-bold text-white">Global Headquarters</h3>
              </div>

              <div className="space-y-4 text-xs font-mono text-slate-300">
                <div className="flex items-start gap-3">
                  <MapPin className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-white block font-sans">Spandsons Horizon Engineering Pvt. Ltd.</strong>
                    <span>Brigade Tech Gardens, 7th Floor, Whitefield</span>
                    <span className="block">Bangalore, Karnataka 560066, India</span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Mail className="w-4 h-4 text-sky-400 shrink-0" />
                  <div>
                    <span className="text-slate-400 block text-[10px]">Technical Inquiries:</span>
                    <a href="mailto:engineering@spandsons.com" className="text-white hover:text-sky-300 underline">
                      engineering@spandsons.com
                    </a>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Phone className="w-4 h-4 text-sky-400 shrink-0" />
                  <div>
                    <span className="text-slate-400 block text-[10px]">Direct Desk:</span>
                    <span className="text-white">+91 (80) 4129-8400</span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Clock className="w-4 h-4 text-sky-400 shrink-0" />
                  <div>
                    <span className="text-slate-400 block text-[10px]">Engineering Coverage:</span>
                    <span className="text-white">Monday &ndash; Friday: 08:00 &ndash; 20:00 IST / UTC+5:30</span>
                  </div>
                </div>
              </div>
            </div>

            {/* SLA Commitment Card */}
            <div className="p-6 rounded-2xl bg-emerald-500/5 border border-emerald-500/20 space-y-3">
              <div className="flex items-center gap-2 text-emerald-400 text-xs font-mono font-bold">
                <ShieldCheck className="w-4 h-4" />
                ENTERPRISE RESPONSE SLA
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                All production inquiries, custom SOP rule drafting requests, and NDA submissions receive an initial evaluation from a qualified applications engineer in under 2 business hours.
              </p>
            </div>
          </div>
        </div>
      </main>

      <MarketingFooter />
    </div>
  );
}
