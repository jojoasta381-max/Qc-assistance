'use client';

import React from 'react';
import Link from 'next/link';

export const MarketingFooter: React.FC = () => {
  return (
    <footer className="border-t border-white/[0.08] bg-[#0A1120] text-slate-400 text-xs py-16 px-4 select-none">
      <div className="max-w-7xl mx-auto space-y-12">
        {/* Top 5-Column Grid */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8">
          {/* Column 1: Brand & Identity */}
          <div className="col-span-2 space-y-4">
            <Link href="/" className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-[#0284C7] flex items-center justify-center font-bold text-white text-xs">
                QC
              </div>
              <span className="font-extrabold text-base tracking-tight text-white">
                Wiring Diagram QC Assistant
              </span>
            </Link>
            <p className="text-xs text-slate-400 leading-relaxed max-w-sm">
              Category leadership in automated AI-powered engineering quality control for wiring diagrams, cable harness assemblies, and industrial control panels.
            </p>
            <div className="pt-2 text-[11px] text-slate-500 font-mono space-y-1">
              <div>Spandsons Horizon Engineering Pvt. Ltd.</div>
              <div>Bangalore &amp; Global Engineering Centers</div>
            </div>
          </div>

          {/* Column 2: Product */}
          <div className="space-y-3">
            <h4 className="font-bold text-white text-xs uppercase tracking-wider font-mono">
              Product
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link href="/how-it-works" className="hover:text-white transition">
                  How It Works
                </Link>
              </li>
              <li>
                <Link href="/standards" className="hover:text-white transition">
                  Supported Standards
                </Link>
              </li>
              <li>
                <Link href="/pricing" className="hover:text-white transition">
                  Pricing Plans
                </Link>
              </li>
              <li>
                <Link href="/#report-preview" className="hover:text-white transition">
                  Interactive Report Preview
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 3: Standards */}
          <div className="space-y-3">
            <h4 className="font-bold text-white text-xs uppercase tracking-wider font-mono">
              Standards
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link href="/standards" className="hover:text-white transition">
                  IPC/WHMA-A-620
                </Link>
              </li>
              <li>
                <Link href="/standards" className="hover:text-white transition">
                  UL 508A Industrial Panels
                </Link>
              </li>
              <li>
                <Link href="/standards" className="hover:text-white transition">
                  IPC-A-610 Assemblies
                </Link>
              </li>
              <li>
                <Link href="/standards" className="hover:text-white transition">
                  ISO 1219 / IEC 60617 (Planned)
                </Link>
              </li>
              <li>
                <Link href="/standards" className="hover:text-white transition">
                  Custom Customer SOPs
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 4: Security & Company */}
          <div className="space-y-3">
            <h4 className="font-bold text-white text-xs uppercase tracking-wider font-mono">
              Trust &amp; Company
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link href="/security" className="hover:text-white transition">
                  Security Architecture
                </Link>
              </li>
              <li>
                <Link href="/resources" className="hover:text-white transition">
                  Engineering Resources
                </Link>
              </li>
              <li>
                <Link href="/solutions" className="hover:text-white transition">
                  Industry Solutions
                </Link>
              </li>
              <li>
                <Link href="/contact" className="hover:text-white transition">
                  Contact Engineering
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar: Legal & IP Protection */}
        <div className="border-t border-white/[0.08] pt-8 flex flex-col md:flex-row items-center justify-between gap-4 text-[11px] text-slate-500">
          <div>
            © {new Date().getFullYear()} Spandsons Horizon Engineering Pvt. Ltd. All rights reserved.
          </div>

          <div className="flex flex-wrap items-center gap-6">
            <span>Trade Secret Prompt IP Protected</span>
            <span>•</span>
            <span>Zero Customer Manual Resale</span>
            <span>•</span>
            <span>IPC/WHMA-A-620 &amp; UL 508A Verified</span>
            <span>•</span>
            <Link href="/security" className="hover:text-slate-300">Privacy &amp; Data Security</Link>
          </div>
        </div>
      </div>
    </footer>
  );
};
