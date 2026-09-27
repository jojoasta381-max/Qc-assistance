'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import {
  LayoutDashboard,
  FileCheck2,
  FileSpreadsheet,
  Layers,
  ShieldCheck,
  BarChart3,
  Users,
  CreditCard,
  Settings,
  ChevronDown,
  Building2,
  LogOut,
  Zap,
  Plus,
  ExternalLink,
  ChevronRight,
  Shield,
  HelpCircle,
  Menu,
  X,
} from 'lucide-react';

interface AppSidebarProps {
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
}

const NAV_ITEMS = [
  { label: 'Overview', href: '/app', icon: LayoutDashboard, exact: true },
  { label: 'QC Inspections', href: '/app/inspections', icon: FileCheck2 },
  { label: 'Audit Reports', href: '/app/reports', icon: FileSpreadsheet },
  { label: 'EasySchematic CAD', href: '/app/editor', icon: Layers },
  { label: 'Standards & SOPs', href: '/app/standards', icon: ShieldCheck },
  { label: 'Plant Analytics', href: '/app/analytics', icon: BarChart3 },
  { label: 'Team & RBAC', href: '/app/team', icon: Users },
  { label: 'Billing & Quota', href: '/app/billing', icon: CreditCard },
  { label: 'AI & Settings', href: '/app/settings', icon: Settings },
];

export const AppSidebar: React.FC<AppSidebarProps> = ({
  isMobileOpen = false,
  onCloseMobile,
}) => {
  const pathname = usePathname();
  const router = useRouter();
  const { user, tenant, logout } = useAuth();
  const [isTenantMenuOpen, setIsTenantMenuOpen] = useState(false);

  const quotaUsed = tenant?.quotaUsed ?? 38;
  const quotaLimit = tenant?.checkQuota ?? 100;
  const quotaPercent = Math.min(Math.round((quotaUsed / quotaLimit) * 100), 100);

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  const sidebarContent = (
    <aside className="w-64 bg-[#0A1120] border-r border-white/10 flex flex-col justify-between h-full select-none text-slate-100">
      {/* Top Header & Organization Selector */}
      <div className="space-y-4">
        {/* Brand Bar */}
        <div className="p-4 pb-3 border-b border-white/10 flex items-center justify-between">
          <Link href="/app" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#0284C7] flex items-center justify-center font-bold text-white text-xs shadow-md">
              QC
            </div>
            <div>
              <span className="font-extrabold text-sm tracking-tight text-white block">
                Wiring Diagram QC
              </span>
              <span className="text-[10px] text-slate-400 font-mono block -mt-0.5">
                Spandsons Horizon Eng.
              </span>
            </div>
          </Link>
          {onCloseMobile && (
            <button
              onClick={onCloseMobile}
              className="lg:hidden p-1 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Tenant Organization Selector */}
        <div className="px-3 relative">
          <button
            onClick={() => setIsTenantMenuOpen(!isTenantMenuOpen)}
            className="w-full p-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-left transition flex items-center justify-between"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-7 h-7 rounded-lg bg-sky-500/20 text-sky-400 border border-sky-500/30 flex items-center justify-center shrink-0">
                <Building2 className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold text-white truncate">
                  {tenant?.name || 'Spandsons Horizon'}
                </div>
                <div className="text-[10px] text-emerald-400 font-mono">
                  {tenant?.plan || 'MID_5 Plan'}
                </div>
              </div>
            </div>
            <ChevronDown
              className={`w-3.5 h-3.5 text-slate-400 transition-transform ${
                isTenantMenuOpen ? 'rotate-180' : ''
              }`}
            />
          </button>

          {isTenantMenuOpen && (
            <div className="absolute top-full left-3 right-3 mt-1.5 p-2 rounded-xl bg-[#060B14] border border-white/15 shadow-2xl z-50 space-y-1 animate-in fade-in">
              <div className="text-[10px] font-mono text-slate-400 px-2 py-1 uppercase tracking-wider">
                Switch Organization
              </div>
              <button
                onClick={() => setIsTenantMenuOpen(false)}
                className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium bg-sky-500/10 text-sky-300 border border-sky-500/20 flex items-center justify-between"
              >
                <span className="truncate">{tenant?.name || 'Spandsons Horizon'}</span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              </button>
              <div className="pt-1 border-t border-white/5">
                <Link
                  href="/app/team"
                  onClick={() => setIsTenantMenuOpen(false)}
                  className="w-full block px-2.5 py-1.5 rounded-lg text-[11px] text-slate-400 hover:text-white hover:bg-white/5 font-mono"
                >
                  Manage Organizations &rarr;
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Navigation Menu */}
        <nav className="px-3 space-y-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = item.exact
              ? pathname === item.href
              : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onCloseMobile}
                className={`flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium transition ${
                  isActive
                    ? 'bg-[#0284C7] text-white font-semibold shadow-md shadow-sky-950/40'
                    : 'text-slate-300 hover:text-white hover:bg-white/[0.05]'
                }`}
              >
                <Icon
                  className={`w-4 h-4 shrink-0 ${
                    isActive ? 'text-white' : 'text-slate-400'
                  }`}
                />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Bottom Area: Quota Meter & User Profile */}
      <div className="p-3 space-y-3 border-t border-white/10 bg-black/20">
        {/* Quota Progress Meter */}
        <div className="p-3 rounded-xl bg-white/[0.03] border border-white/10 space-y-2">
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-slate-400 flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              Checks Quota
            </span>
            <span className="font-bold text-white">
              {quotaUsed}/{quotaLimit}
            </span>
          </div>
          <div className="w-full h-1.5 bg-black/50 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                quotaPercent > 85
                  ? 'bg-rose-500'
                  : quotaPercent > 60
                  ? 'bg-amber-400'
                  : 'bg-emerald-400'
              }`}
              style={{ width: `${quotaPercent}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 pt-0.5">
            <span>{quotaLimit - quotaUsed} remaining</span>
            <Link
              href="/app/billing"
              className="text-sky-400 hover:text-sky-300 font-bold"
            >
              + Add Checks
            </Link>
          </div>
        </div>

        {/* User Card & Logout */}
        <div className="p-2.5 rounded-xl bg-white/[0.04] border border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-7 h-7 rounded-lg bg-[#0284C7]/20 border border-sky-500/30 text-sky-400 flex items-center justify-center font-bold text-xs uppercase shrink-0">
              {user?.name?.[0] || 'P'}
            </div>
            <div className="min-w-0">
              <div className="text-xs font-bold text-white truncate">
                {user?.name || 'Pravin'}
              </div>
              <div className="text-[10px] text-slate-400 font-mono truncate">
                {user?.role || 'Lead QC Inspector'}
              </div>
            </div>
          </div>
          <button
            onClick={handleLogout}
            title="Log Out"
            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>

        {/* Public Marketing Link */}
        <div className="text-center">
          <Link
            href="/"
            className="text-[11px] font-mono text-slate-500 hover:text-slate-300 flex items-center justify-center gap-1 transition"
          >
            <span>Public Marketing Site</span>
            <ExternalLink className="w-3 h-3" />
          </Link>
        </div>
      </div>
    </aside>
  );

  return (
    <>
      {/* Desktop Sidebar (Permanent) */}
      <div className="hidden lg:block h-screen sticky top-0 shrink-0">
        {sidebarContent}
      </div>

      {/* Mobile Drawer (Collapsible) */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 flex bg-black/80 backdrop-blur-sm lg:hidden animate-in fade-in">
          <div className="h-full shadow-2xl animate-in slide-in-from-left">
            {sidebarContent}
          </div>
          <div className="flex-1" onClick={onCloseMobile} />
        </div>
      )}
    </>
  );
};
