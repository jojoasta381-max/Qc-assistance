'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import {
  ShieldCheck,
  Building2,
  Mail,
  Lock,
  User,
  Phone,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  Cpu,
} from 'lucide-react';

export default function SignupPage() {
  const router = useRouter();
  const { signup } = useAuth();

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    organizationName: '',
    phone: '',
    role: 'OWNER',
  });

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (formData.password.length < 8) {
      setErrorMsg('Password must be at least 8 characters long.');
      return;
    }

    setIsSubmitting(true);
    const result = await signup(formData);
    setIsSubmitting(false);

    if (result.success) {
      router.push('/');
    } else {
      setErrorMsg(result.error || 'Registration failed.');
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
            href="/login"
            className="text-xs font-mono text-sky-400 hover:text-sky-300 transition"
          >
            Already registered? Sign In &rarr;
          </Link>
        </div>
      </header>

      {/* Main Registration Card */}
      <main className="flex-1 flex items-center justify-center p-4 py-12">
        <div className="max-w-lg w-full bg-[#0A1120] border border-white/10 rounded-2xl p-8 sm:p-10 shadow-2xl space-y-6">
          <div className="space-y-1 text-center">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/[0.06] border border-white/10 text-emerald-400 text-[10px] font-mono font-bold uppercase tracking-wider mb-2">
              <Building2 className="w-3 h-3" /> Enterprise Organization Setup
            </div>
            <h1 className="text-2xl font-extrabold text-white">Create Tenant Account</h1>
            <p className="text-xs text-slate-400">
              Provision a dedicated multi-tenant partition for your engineering plant. Includes 100 free diagram checks.
            </p>
          </div>

          {errorMsg && (
            <div className="p-3.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2 font-mono">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Full Name */}
              <div className="space-y-1.5">
                <label className="text-xs font-mono text-slate-300 font-medium">
                  Full Name *
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    placeholder="e.g. Anand Kumar"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full pl-9 pr-3 py-2.5 rounded-lg bg-black/40 border border-white/10 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-sky-500 transition"
                  />
                </div>
              </div>

              {/* Work Email */}
              <div className="space-y-1.5">
                <label className="text-xs font-mono text-slate-300 font-medium">
                  Corporate Work Email *
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    placeholder="anand@company.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full pl-9 pr-3 py-2.5 rounded-lg bg-black/40 border border-white/10 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-sky-500 transition font-mono"
                  />
                </div>
              </div>
            </div>

            {/* Organization / Plant Name */}
            <div className="space-y-1.5">
              <label className="text-xs font-mono text-slate-300 font-medium">
                Organization / Manufacturing Plant Name *
              </label>
              <div className="relative">
                <Building2 className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  placeholder="e.g. Apex Wire Systems Ltd."
                  value={formData.organizationName}
                  onChange={(e) => setFormData({ ...formData, organizationName: e.target.value })}
                  className="w-full pl-9 pr-3 py-2.5 rounded-lg bg-black/40 border border-white/10 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-sky-500 transition"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Phone */}
              <div className="space-y-1.5">
                <label className="text-xs font-mono text-slate-300 font-medium">
                  Direct Phone Number (Optional)
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="tel"
                    placeholder="+91 98765 43210"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full pl-9 pr-3 py-2.5 rounded-lg bg-black/40 border border-white/10 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-sky-500 transition font-mono"
                  />
                </div>
              </div>

              {/* Role */}
              <div className="space-y-1.5">
                <label className="text-xs font-mono text-slate-300 font-medium">
                  Primary Role
                </label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-lg bg-black/40 border border-white/10 text-white text-xs focus:outline-none focus:border-sky-500 transition font-mono"
                >
                  <option value="OWNER">Plant Quality Director (Owner)</option>
                  <option value="QC_MANAGER">QA / QC Engineering Manager</option>
                  <option value="QC_INSPECTOR">Lead Harness Inspector</option>
                  <option value="VIEWER">Compliance Auditor</option>
                </select>
              </div>
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label className="text-xs font-mono text-slate-300 font-medium">
                Set Account Password *
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  placeholder="Minimum 8 characters"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full pl-9 pr-3 py-2.5 rounded-lg bg-black/40 border border-white/10 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-sky-500 transition font-mono"
                />
              </div>
            </div>

            {/* Zero model training clause reminder */}
            <div className="p-3 rounded-lg bg-white/[0.02] border border-white/5 text-[11px] text-slate-400 font-mono flex items-start gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span>
                By registering, your organization is covered under our Zero-Model-Training IP Guarantee. Uploaded CAD drawings are never stored or used for public AI training.
              </span>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 rounded-lg bg-[#0284C7] hover:bg-sky-500 disabled:opacity-50 text-white font-mono text-xs font-bold transition flex items-center justify-center gap-2 shadow-lg"
            >
              {isSubmitting ? (
                <span>Provisioning Organization Partition...</span>
              ) : (
                <>
                  <span>Create Organization &amp; Start Trial</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </form>

          <div className="pt-2 text-center text-xs text-slate-400">
            Already have an organization login?{' '}
            <Link href="/login" className="text-sky-400 hover:underline font-bold">
              Sign In
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
