'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Menu,
  Search,
  Plus,
  Bell,
  ChevronRight,
} from 'lucide-react';

interface AppHeaderProps {
  onOpenMobileMenu?: () => void;
}

export const AppHeader: React.FC<AppHeaderProps> = ({ onOpenMobileMenu }) => {
  const pathname = usePathname();
  const [searchQuery, setSearchQuery] = useState('');
  const [showNotifications, setShowNotifications] = useState(false);

  // Compute clean title from route
  const getSectionTitle = () => {
    if (pathname === '/app') return 'Plant Quality Overview';
    if (pathname.startsWith('/app/inspections')) return 'QC Inspection Wizard';
    if (pathname.startsWith('/app/reports')) return 'Certified Audit Reports';
    if (pathname.startsWith('/app/editor')) return 'EasySchematic CAD Editor';
    if (pathname.startsWith('/app/standards')) return 'Standards & Custom SOPs';
    if (pathname.startsWith('/app/analytics')) return 'Plant Defect Analytics';
    if (pathname.startsWith('/app/team')) return 'Team & Access Control';
    if (pathname.startsWith('/app/billing')) return 'Billing & Check Quota';
    if (pathname.startsWith('/app/settings')) return 'AI Engine & Configuration';
    return 'Quality Control Portal';
  };

  return (
    <header className="h-16 bg-[#0A1120] border-b border-white/10 px-4 sm:px-6 flex items-center justify-between gap-4 sticky top-0 z-30 select-none">
      {/* Left: Mobile Toggle & Breadcrumbs */}
      <div className="flex items-center gap-3">
        {onOpenMobileMenu && (
          <button
            onClick={onOpenMobileMenu}
            className="lg:hidden p-2 rounded-lg bg-white/5 text-slate-300 hover:text-white hover:bg-white/10 transition"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}

        <div className="flex items-center gap-2 text-xs font-mono">
          <span className="text-slate-400 hidden sm:inline">Workspace</span>
          <ChevronRight className="w-3.5 h-3.5 text-slate-600 hidden sm:inline" />
          <h1 className="text-sm font-bold text-white tracking-tight">
            {getSectionTitle()}
          </h1>
        </div>
      </div>

      {/* Center: Quick Search Input */}
      <div className="hidden md:flex items-center flex-1 max-w-md mx-4">
        <div className="relative w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search schematics, audit IDs (AUD-8492), pins, wires..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-1.5 rounded-lg bg-black/40 border border-white/10 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-sky-500 transition font-mono"
          />
        </div>
      </div>

      {/* Right: Actions, AI Engine Status, Notifications */}
      <div className="flex items-center gap-3">
        {/* Model Status Pill */}
        <div className="hidden xl:flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.04] border border-white/10 text-[11px] font-mono text-slate-300">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>Local Engine Active</span>
          <span className="text-slate-500">&bull;</span>
          <span className="text-emerald-400">0 Token Cost</span>
        </div>

        {/* Notifications Popover Toggle */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            title="Notifications"
            className="p-2 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 hover:text-white border border-white/10 transition relative"
          >
            <Bell className="w-4 h-4" />
            <span className="w-2 h-2 rounded-full bg-sky-400 absolute top-1.5 right-1.5" />
          </button>

          {showNotifications && (
            <div className="absolute right-0 top-full mt-2 w-80 bg-[#0A1120] border border-white/15 rounded-xl shadow-2xl p-4 z-50 space-y-3 animate-in fade-in">
              <div className="flex items-center justify-between pb-2 border-b border-white/10">
                <span className="text-xs font-bold text-white">Recent System Events</span>
                <span className="text-[10px] font-mono text-slate-400">3 unread</span>
              </div>
              <div className="space-y-2 text-xs">
                <div className="p-2 rounded-lg bg-white/[0.02] border border-white/5 space-y-0.5">
                  <div className="text-[11px] font-bold text-emerald-400 flex items-center justify-between">
                    <span>Audit AUD-8492 Certified</span>
                    <span className="text-[10px] font-mono text-slate-500">12m ago</span>
                  </div>
                  <p className="text-[11px] text-slate-300">
                    WH-402 passed with 94/100 score. Signed PDF certificate generated.
                  </p>
                </div>
                <div className="p-2 rounded-lg bg-white/[0.02] border border-white/5 space-y-0.5">
                  <div className="text-[11px] font-bold text-amber-400 flex items-center justify-between">
                    <span>UL 508A Discrepancy Flagged</span>
                    <span className="text-[10px] font-mono text-slate-500">1h ago</span>
                  </div>
                  <p className="text-[11px] text-slate-300">
                    Ground wire gauge derating requirement flagged on MCC-VFD-01.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowNotifications(false)}
                className="w-full py-1 text-center text-[10px] font-mono text-slate-400 hover:text-white"
              >
                Close Notifications
              </button>
            </div>
          )}
        </div>

        {/* Start New Inspection CTA Button */}
        <Link
          href="/app/inspections"
          className="btn-primary px-3.5 py-1.5 text-xs font-bold flex items-center gap-1.5 shadow-md shadow-sky-950/40"
        >
          <Plus className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">New Inspection</span>
        </Link>
      </div>
    </header>
  );
};
