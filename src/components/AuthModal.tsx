'use client';

import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import {
  X,
  Mail,
  Lock,
  ArrowRight,
  ShieldCheck,
  User,
  Phone,
  Building2,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess?: (user: any) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onLoginSuccess,
}) => {
  const { login, signup } = useAuth();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [organizationName, setOrganizationName] = useState('');
  const [phone, setPhone] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleQuickDemoLogin = async (demoRole: 'qc_lead' | 'ems_builder' | 'compliance_head') => {
    setErrorMsg(null);
    setIsSubmitting(true);
    const result = await login({ demoRole });
    setIsSubmitting(false);

    if (result.success) {
      if (onLoginSuccess) {
        onLoginSuccess({
          name: demoRole === 'qc_lead' ? 'Pravin' : demoRole === 'ems_builder' ? 'Gogulnath' : 'Anand Kumar',
          email: demoRole === 'qc_lead' ? 'pravin@spandsons.com' : demoRole === 'ems_builder' ? 'gogulnath@spandsons.com' : 'anand.k@tataautocomp.com',
          role: demoRole === 'qc_lead' ? 'Lead QC Inspector' : demoRole === 'ems_builder' ? 'Harness Engineer' : 'Plant Quality Head',
          plan: 'MID_5',
        });
      }
      onClose();
    } else {
      setErrorMsg(result.error || 'Demo login failed.');
    }
  };

  const handleGoogleAuth = async () => {
    setErrorMsg(null);
    setIsSubmitting(true);
    const result = await login({
      isGoogleAuth: true,
      email: email || 'lead.engineer@spandsons.com',
      name: name || 'Google Verified Engineer',
    });
    setIsSubmitting(false);

    if (result.success) {
      if (onLoginSuccess) {
        onLoginSuccess({
          name: name || 'Google Verified Engineer',
          email: email || 'lead.engineer@spandsons.com',
          role: 'Lead QC Inspector',
          plan: 'MID_5',
        });
      }
      onClose();
    } else {
      setErrorMsg(result.error || 'Google authentication failed.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setIsSubmitting(true);

    if (isSignUp) {
      if (!organizationName) {
        setErrorMsg('Organization name is required.');
        setIsSubmitting(false);
        return;
      }
      const result = await signup({
        name,
        email,
        password: password || 'DefaultPass123!',
        organizationName,
        phone,
      });
      setIsSubmitting(false);
      if (result.success) {
        if (onLoginSuccess) {
          onLoginSuccess({ name, email, role: 'OWNER', plan: 'MID_5' });
        }
        onClose();
      } else {
        setErrorMsg(result.error || 'Registration failed.');
      }
    } else {
      const result = await login({ email, password: password || 'DefaultPass123!' });
      setIsSubmitting(false);
      if (result.success) {
        if (onLoginSuccess) {
          onLoginSuccess({ name: email.split('@')[0], email, role: 'QC_INSPECTOR', plan: 'MID_5' });
        }
        onClose();
      } else {
        setErrorMsg(result.error || 'Login failed.');
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in select-none">
      <div className="relative w-full max-w-md bg-[#0A1120] border border-white/15 rounded-2xl shadow-2xl overflow-hidden text-slate-100 space-y-0">
        {/* Modal Header */}
        <div className="p-6 bg-white/[0.02] border-b border-white/10 relative">
          <button
            onClick={onClose}
            className="absolute top-5 right-5 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/[0.06] border border-white/10 text-sky-400 text-[10px] font-mono font-bold tracking-wider uppercase mb-2">
            Spandsons Horizon Engineering
          </div>
          <h3 className="text-2xl font-extrabold text-white">
            {isSignUp ? 'Create Tenant Account' : 'Sign In to QC Portal'}
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Access automated AI wiring diagram inspection &amp; audit reports.
          </p>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5">
          {errorMsg && (
            <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2 font-mono">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-3.5">
            {isSignUp && (
              <>
                <div className="space-y-1">
                  <label className="text-[11px] font-mono text-slate-300 font-medium">Full Name</label>
                  <div className="relative">
                    <User className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      placeholder="e.g. Anand Kumar"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 rounded-lg bg-black/40 border border-white/10 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-sky-500 transition"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-mono text-slate-300 font-medium">Organization / Plant Name</label>
                  <div className="relative">
                    <Building2 className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      placeholder="e.g. Apex Harness Systems Ltd."
                      value={organizationName}
                      onChange={(e) => setOrganizationName(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 rounded-lg bg-black/40 border border-white/10 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-sky-500 transition"
                    />
                  </div>
                </div>
              </>
            )}

            <div className="space-y-1">
              <label className="text-[11px] font-mono text-slate-300 font-medium">Corporate Work Email</label>
              <div className="relative">
                <Mail className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  placeholder="engineer@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-lg bg-black/40 border border-white/10 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-sky-500 transition font-mono"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-mono text-slate-300 font-medium">Password</label>
              <div className="relative">
                <Lock className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-lg bg-black/40 border border-white/10 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-sky-500 transition font-mono"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2.5 rounded-lg bg-[#0284C7] hover:bg-sky-500 disabled:opacity-50 text-white font-mono text-xs font-bold transition flex items-center justify-center gap-2 shadow-lg"
            >
              {isSubmitting ? (
                <span>Processing...</span>
              ) : (
                <>
                  <span>{isSignUp ? 'Create Organization & Start' : 'Sign In to Portal'}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </form>

          {/* Demo Quick Logins */}
          <div className="space-y-2 pt-2 border-t border-white/10">
            <span className="text-[10px] font-mono text-slate-400 block uppercase tracking-wider">
              1-Click Demo Profiles (Bangalore Plant)
            </span>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleQuickDemoLogin('qc_lead')}
                disabled={isSubmitting}
                className="p-2 rounded-lg bg-white/[0.03] hover:bg-white/[0.08] border border-white/10 text-left transition"
              >
                <div className="text-xs font-bold text-white">Pravin</div>
                <div className="text-[10px] text-emerald-400 font-mono">Lead QC Inspector</div>
              </button>
              <button
                type="button"
                onClick={() => handleQuickDemoLogin('ems_builder')}
                disabled={isSubmitting}
                className="p-2 rounded-lg bg-white/[0.03] hover:bg-white/[0.08] border border-white/10 text-left transition"
              >
                <div className="text-xs font-bold text-white">Gogulnath</div>
                <div className="text-[10px] text-sky-400 font-mono">Harness Engineer</div>
              </button>
            </div>
          </div>

          {/* Toggle Sign In / Sign Up */}
          <div className="text-center pt-1 text-xs text-slate-400">
            {isSignUp ? (
              <span>
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => setIsSignUp(false)}
                  className="text-sky-400 font-bold hover:underline ml-1"
                >
                  Sign In
                </button>
              </span>
            ) : (
              <span>
                New engineering organization?{' '}
                <button
                  type="button"
                  onClick={() => setIsSignUp(true)}
                  className="text-sky-400 font-bold hover:underline ml-1"
                >
                  Sign Up
                </button>
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
