'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import {
  ShieldCheck,
  Lock,
  Mail,
  ArrowRight,
  UserCheck,
  Building2,
  AlertCircle,
  Cpu,
  CheckCircle2,
} from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setIsSubmitting(true);

    const result = await login({ email, password });
    setIsSubmitting(false);

    if (result.success) {
      router.push('/');
    } else {
      setErrorMsg(result.error || 'Invalid credentials.');
    }
  };

  const handleDemoLogin = async (demoRole: 'qc_lead' | 'ems_builder' | 'compliance_head') => {
    setErrorMsg(null);
    setIsSubmitting(true);
    const result = await login({ demoRole });
    setIsSubmitting(false);

    if (result.success) {
      router.push('/');
    } else {
      setErrorMsg(result.error || 'Demo login failed.');
    }
  };

  const handleGoogleLogin = async () => {
    setErrorMsg(null);
    setIsSubmitting(true);
    const result = await login({
      isGoogleAuth: true,
      email: email || 'lead.engineer@spandsons.com',
      name: 'Google Verified Engineer',
    });
    setIsSubmitting(false);

    if (result.success) {
      router.push('/');
    } else {
      setErrorMsg(result.error || 'Google authentication failed.');
    }
  };

  return (
    <div className="min-h-screen bg-[#060B14] text-slate-100 flex flex-col justify-between font-sans">
      {/* Minimal Header */}
      <header className="border-b border-white/[0.08] bg-[#0A1120] px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#0284C7] flex items-center justify-center font-bold text-white text-xs">
              QC
            </div>
            <div>
              <span className="font-extrabold text-sm tracking-tight text-white block">
                Wiring Diagram QC
              </span>
              <span className="text-[10px] text-slate-400 font-mono block -mt-0.5">
                Spandsons Horizon Engineering
              </span>
            </div>
          </Link>
          <Link
            href="/signup"
            className="text-xs font-mono text-sky-400 hover:text-sky-300 transition"
          >
            Create Organization Account &rarr;
          </Link>
        </div>
      </header>

      {/* Main Login Card */}
      <main className="flex-1 flex items-center justify-center p-4 py-12">
        <div className="max-w-md w-full bg-[#0A1120] border border-white/10 rounded-2xl p-8 shadow-2xl space-y-6">
          <div className="space-y-1 text-center">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/[0.06] border border-white/10 text-sky-400 text-[10px] font-mono font-bold uppercase tracking-wider mb-2">
              <Lock className="w-3 h-3" /> Secure Tenant Gateway
            </div>
            <h1 className="text-2xl font-extrabold text-white">Sign In to QC Portal</h1>
            <p className="text-xs text-slate-400">
              Access your plant schematics, netlists, and compliance audit certificates.
            </p>
          </div>

          {errorMsg && (
            <div className="p-3.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2 font-mono">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-mono text-slate-300 font-medium">
                Corporate Work Email
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  placeholder="engineer@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 rounded-lg bg-black/40 border border-white/10 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-sky-500 transition font-mono"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-mono text-slate-300 font-medium">
                  Password
                </label>
                <Link
                  href="/contact"
                  className="text-[11px] font-mono text-sky-400 hover:text-sky-300"
                >
                  Forgot?
                </Link>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 rounded-lg bg-black/40 border border-white/10 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-sky-500 transition font-mono"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2.5 rounded-lg bg-[#0284C7] hover:bg-sky-500 disabled:opacity-50 text-white font-mono text-xs font-bold transition flex items-center justify-center gap-2 shadow-lg"
            >
              {isSubmitting ? (
                <span>Authenticating...</span>
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </form>

          {/* Social / SSO Divider */}
          <div className="relative flex items-center justify-center">
            <div className="border-t border-white/10 w-full" />
            <span className="bg-[#0A1120] px-3 text-[10px] font-mono text-slate-500 uppercase tracking-wider relative">
              Or Instant Demo Access
            </span>
          </div>

          {/* Quick Demo Logins for Fast Review */}
          <div className="space-y-2">
            <button
              type="button"
              onClick={() => handleDemoLogin('qc_lead')}
              disabled={isSubmitting}
              className="w-full py-2 px-3 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-left flex items-center justify-between text-xs transition"
            >
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-[10px]">
                  P
                </div>
                <div>
                  <span className="font-bold text-white block text-xs">Pravin</span>
                  <span className="text-[10px] text-slate-400 font-mono">Lead QC Inspector (Spandsons)</span>
                </div>
              </div>
              <span className="text-[10px] text-sky-400 font-mono font-bold">1-Click &rarr;</span>
            </button>

            <button
              type="button"
              onClick={() => handleDemoLogin('ems_builder')}
              disabled={isSubmitting}
              className="w-full py-2 px-3 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-left flex items-center justify-between text-xs transition"
            >
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded bg-sky-500/20 text-sky-400 flex items-center justify-center font-bold text-[10px]">
                  G
                </div>
                <div>
                  <span className="font-bold text-white block text-xs">Gogulnath</span>
                  <span className="text-[10px] text-slate-400 font-mono">Wire Harness Engineer (Spandsons)</span>
                </div>
              </div>
              <span className="text-[10px] text-sky-400 font-mono font-bold">1-Click &rarr;</span>
            </button>

            <button
              type="button"
              onClick={() => handleDemoLogin('compliance_head')}
              disabled={isSubmitting}
              className="w-full py-2 px-3 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-left flex items-center justify-between text-xs transition"
            >
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded bg-purple-500/20 text-purple-400 flex items-center justify-center font-bold text-[10px]">
                  A
                </div>
                <div>
                  <span className="font-bold text-white block text-xs">Anand Kumar</span>
                  <span className="text-[10px] text-slate-400 font-mono">Plant Quality Head (Tata AutoComp)</span>
                </div>
              </div>
              <span className="text-[10px] text-sky-400 font-mono font-bold">1-Click &rarr;</span>
            </button>
          </div>

          {/* Google SSO Button */}
          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={isSubmitting}
            className="w-full py-2 px-3 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-mono font-semibold text-slate-300 transition flex items-center justify-center gap-2"
          >
            <span>Continue with Corporate Google SSO</span>
          </button>

          <div className="pt-2 text-center text-xs text-slate-400">
            Don&apos;t have an account yet?{' '}
            <Link href="/signup" className="text-sky-400 hover:underline font-bold">
              Sign Up
            </Link>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/[0.08] bg-[#0A1120] py-4 px-6 text-center text-xs text-slate-500 font-mono">
        Spandsons Horizon Engineering Pvt. Ltd. &bull; Enterprise SOC 2 Isolation &bull; Bangalore, India
      </footer>
    </div>
  );
}
