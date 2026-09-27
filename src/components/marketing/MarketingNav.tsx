'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import {
  Menu,
  X,
  ArrowRight,
  LogOut,
} from 'lucide-react';

interface MarketingNavProps {
  onOpenLogin?: () => void;
  onStartInspection?: () => void;
}

export const MarketingNav: React.FC<MarketingNavProps> = ({
  onOpenLogin,
  onStartInspection,
}) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const pathname = usePathname();
  const { user, tenant, isAuthenticated, logout } = useAuth();

  const navLinks = [
    { label: 'How It Works', href: '/how-it-works' },
    { label: 'Standards', href: '/standards' },
    { label: 'Solutions', href: '/solutions' },
    { label: 'Pricing', href: '/pricing' },
    { label: 'Security', href: '/security' },
    { label: 'Resources', href: '/resources' },
    { label: 'Contact', href: '/contact' },
  ];

  return (
    <>
      {/* MOBILE DRAWER */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/80 backdrop-blur-sm animate-in fade-in lg:hidden">
          <div className="w-80 h-full bg-[#0A1120] border-l border-white/10 p-6 flex flex-col justify-between shadow-2xl">
            <div>
              <div className="flex items-center justify-between pb-6 border-b border-white/10">
                <Link
                  href="/"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center gap-2.5"
                >
                  <div className="w-8 h-8 rounded-lg bg-[#0284C7] flex items-center justify-center font-bold text-white text-xs">
                    QC
                  </div>
                  <div>
                    <span className="font-extrabold text-sm tracking-tight text-white block">
                      Wiring Diagram QC
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono block -mt-0.5">
                      Spandsons Engineering
                    </span>
                  </div>
                </Link>
                <button
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {isAuthenticated && (
                <div className="my-4 p-3 rounded-xl bg-white/[0.04] border border-white/10 space-y-1">
                  <div className="text-xs font-bold text-white flex items-center justify-between">
                    <span>{user?.name}</span>
                    <span className="text-[10px] font-mono text-emerald-400 px-1.5 py-0.5 rounded bg-emerald-500/10">
                      {tenant?.plan || 'MID_5'}
                    </span>
                  </div>
                  <div className="text-[11px] font-mono text-slate-400">
                    {tenant?.name}
                  </div>
                </div>
              )}

              <nav className="mt-4 space-y-1.5">
                {navLinks.map((link) => {
                  const isActive = pathname === link.href;
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className={`block px-3 py-2 rounded-lg text-xs font-semibold transition ${
                        isActive
                          ? 'bg-sky-500/20 text-sky-400 font-bold'
                          : 'text-slate-300 hover:text-white hover:bg-white/5'
                      }`}
                    >
                      {link.label}
                    </Link>
                  );
                })}
              </nav>
            </div>

            <div className="pt-6 border-t border-white/10 space-y-3">
              {isAuthenticated ? (
                <button
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    logout();
                  }}
                  className="w-full py-2.5 rounded-full border border-white/20 text-rose-400 text-xs font-bold hover:bg-white/5 transition flex items-center justify-center gap-2"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Log Out</span>
                </button>
              ) : (
                <>
                  <Link
                    href="/login"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="w-full block py-2.5 text-center rounded-full border border-white/20 text-slate-200 text-xs font-bold hover:bg-white/5 transition"
                  >
                    Log In
                  </Link>
                  <Link
                    href="/signup"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="w-full block py-2.5 text-center rounded-full btn-primary text-xs font-bold"
                  >
                    Start 100 Free Checks
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* DESKTOP HEADER */}
      <header className="max-w-7xl mx-auto px-4 pt-6">
        <div className="bg-[#0A1120]/80 backdrop-blur-md rounded-full px-6 py-3 border border-white/10 flex items-center justify-between shadow-2xl">
          {/* Logo & Product Identity */}
          <Link
            href="/"
            className="flex items-center gap-3 cursor-pointer select-none"
          >
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#0284C7] to-[#0EA5E9] flex items-center justify-center font-bold text-white text-xs shadow-md">
              QC
            </div>
            <div>
              <span className="font-extrabold text-base tracking-tight text-white block">
                Wiring Diagram QC Assistant
              </span>
              <span className="text-[10px] text-slate-400 block -mt-1 font-mono">
                Spandsons Horizon Engineering
              </span>
            </div>
          </Link>

          {/* Center Navigation Links */}
          <nav className="hidden lg:flex items-center gap-6 text-xs font-semibold text-slate-300">
            {navLinks.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`transition ${
                    isActive ? 'text-sky-400 font-bold' : 'hover:text-white'
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>

          {/* Right Action CTAs */}
          <div className="flex items-center gap-3">
            {isAuthenticated ? (
              <div className="flex items-center gap-3">
                <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.04] border border-white/10 text-xs font-mono">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-white font-bold">{user?.name}</span>
                  <span className="text-slate-500">|</span>
                  <span className="text-sky-400 text-[10px]">{tenant?.name?.slice(0, 18)}...</span>
                </div>
                <button
                  onClick={() => logout()}
                  title="Log Out"
                  className="p-2 rounded-full bg-white/5 hover:bg-white/10 text-slate-400 hover:text-rose-400 transition"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <>
                {onOpenLogin ? (
                  <button
                    onClick={onOpenLogin}
                    className="text-xs font-semibold text-slate-300 hover:text-white px-3 py-1.5 transition"
                  >
                    Log in
                  </button>
                ) : (
                  <Link
                    href="/login"
                    className="text-xs font-semibold text-slate-300 hover:text-white px-3 py-1.5 transition"
                  >
                    Log in
                  </Link>
                )}

                {onStartInspection ? (
                  <button
                    onClick={onStartInspection}
                    className="btn-primary px-5 py-2 text-xs font-bold flex items-center gap-1.5"
                  >
                    <span>Get Started</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                ) : (
                  <Link
                    href="/signup"
                    className="btn-primary px-5 py-2 text-xs font-bold flex items-center gap-1.5"
                  >
                    <span>Get Started</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                )}
              </>
            )}

            {/* Mobile Hamburger */}
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="lg:hidden p-2 rounded-full bg-white/5 text-slate-300 hover:text-white transition"
              title="Menu"
            >
              <Menu className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>
    </>
  );
};
