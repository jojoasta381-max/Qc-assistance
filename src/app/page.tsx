'use client';

import React, { useState, useEffect } from 'react';
import {
  StandardPreset,
  SampleDiagram,
  QCReport,
  Discrepancy,
  LLMConfig,
  AuditRecord,
} from '@/types/qc';
import { SAMPLE_DIAGRAMS, INITIAL_AUDIT_HISTORY } from '@/data/samples';
import { DEFAULT_LLM_CONFIG } from '@/lib/llm-engine';
import { useAuth } from '@/context/AuthContext';
import { LandingPage } from '@/components/LandingPage';
import { InspectionWizard } from '@/components/InspectionWizard';
import { EasySchematicEditor } from '@/components/EasySchematicEditor';
import { CustomerDashboard } from '@/components/CustomerDashboard';
import { StandardsView } from '@/components/StandardsView';
import { PricingView } from '@/components/PricingView';
import { AuthModal } from '@/components/AuthModal';
import { FeedbackModal } from '@/components/FeedbackModal';
import { ModelSettingsModal } from '@/components/ModelSettingsModal';
import {
  FileCheck2,
  Sparkles,
  Settings,
  User,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  ChevronRight,
  Layers,
  Menu,
  X,
  Building2,
  Zap,
  Info,
  Users,
  Briefcase,
  ChevronDown,
  LogOut,
} from 'lucide-react';

type ViewMode = 'LANDING' | 'WORKSPACE' | 'EDITOR' | 'DASHBOARD' | 'STANDARDS' | 'PRICING';

interface TenantOrg {
  id: string;
  name: string;
  plan: string;
  checksAllowed: number;
}

const AVAILABLE_TENANTS: TenantOrg[] = [
  {
    id: 'spandsons',
    name: 'Spandsons Horizon Engineering',
    plan: 'MID_5 ($5/check)',
    checksAllowed: 100,
  },
  {
    id: 'tata-autocomp',
    name: 'Tata AutoComp Systems',
    plan: 'MAX_10 ($10/check)',
    checksAllowed: 500,
  },
  {
    id: 'apex-harness',
    name: 'Apex Harness Solutions',
    plan: 'MID_5 ($5/check)',
    checksAllowed: 100,
  },
];

export default function Home() {
  const { user: authUser, tenant: authTenant, isAuthenticated, logout: authLogout } = useAuth();

  const [currentView, setCurrentView] = useState<ViewMode>('LANDING');
  const [report, setReport] = useState<QCReport>(SAMPLE_DIAGRAMS[0].sampleReport);
  const [activeStandard, setActiveStandard] = useState<StandardPreset>('IPC-WHMA-A-620');
  const [llmConfig, setLLMConfig] = useState<LLMConfig>(DEFAULT_LLM_CONFIG);

  // Multi-Tenant Organization State
  const [activeTenant, setActiveTenant] = useState<TenantOrg>(AVAILABLE_TENANTS[0]);
  const [isTenantDropdownOpen, setIsTenantDropdownOpen] = useState(false);

  // Modals & Drawers
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false);
  const [isBurgerMenuOpen, setIsBurgerMenuOpen] = useState(false);
  const [activeFeedbackDiscrepancy, setActiveFeedbackDiscrepancy] = useState<Discrepancy | null>(null);

  // Quota & History State
  const [quotaUsed, setQuotaUsed] = useState(38);
  const [quotaLimit, setQuotaLimit] = useState(100);
  const [history, setHistory] = useState<AuditRecord[]>(INITIAL_AUDIT_HISTORY);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Sync state when authTenant changes
  useEffect(() => {
    if (authTenant) {
      setActiveTenant({
        id: authTenant.slug,
        name: authTenant.name,
        plan: authTenant.plan,
        checksAllowed: authTenant.checkQuota,
      });
      setQuotaLimit(authTenant.checkQuota);
      setQuotaUsed(authTenant.quotaUsed);
    }
  }, [authTenant]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleOpenFeedback = (d: Discrepancy) => {
    setActiveFeedbackDiscrepancy(d);
    setIsFeedbackModalOpen(true);
  };

  const handleSubmitFeedback = (
    id: string,
    status: 'FALSE_POSITIVE',
    note: string,
    category: string
  ) => {
    setReport((prev) => {
      const updated = prev.discrepancies.map((d) => (d.id === id ? { ...d, status } : d));
      return { ...prev, discrepancies: updated };
    });
    showToast(`Marked ${id} as False Positive (${category}). Logged to regression test set.`);
  };

  const handleCheckExecuted = () => {
    setQuotaUsed((prev) => Math.min(prev + 1, quotaLimit));
    const newRecord: AuditRecord = {
      id: `AUD-${Math.floor(Math.random() * 8000 + 1000)}`,
      diagramName: report.diagramName,
      standard: activeStandard,
      timestamp: new Date().toISOString().replace('T', ' ').slice(0, 16),
      overallResult: report.overallResult,
      qualityScore: report.qualityScore,
      totalChecks: report.summary.executed,
      discrepanciesCount: report.discrepancies.length,
      operator: authUser?.name || 'Pravin',
      reviewedCount: 0,
    };
    setHistory((prev) => [newRecord, ...prev]);
    showToast('QC Report generated and saved to your Dashboard.');
  };

  const handleSwitchTenant = (tenant: TenantOrg) => {
    setActiveTenant(tenant);
    setQuotaLimit(tenant.checksAllowed);
    setIsTenantDropdownOpen(false);
    showToast(`Switched active tenant organization to ${tenant.name}`);
  };

  const activeUserName = authUser?.name || 'Pravin';
  const activeUserRole = authUser?.role || 'Lead QC Inspector';

  return (
    <div className="min-h-screen bg-[#060B14] text-slate-100 flex flex-col font-sans">
      {/* BURGER MENU DRAWER */}
      {isBurgerMenuOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/80 backdrop-blur-md animate-in fade-in">
          <div className="w-80 h-full bg-[#0A1120] border-l border-white/10 p-6 flex flex-col justify-between shadow-2xl text-slate-100">
            <div>
              <div className="flex items-center justify-between pb-6 border-b border-white/10">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-[#0284C7] flex items-center justify-center font-bold text-white text-xs">
                    QC
                  </div>
                  <span className="font-extrabold text-sm tracking-tight text-white">
                    QC-BOT CONTROLS
                  </span>
                </div>
                <button
                  onClick={() => setIsBurgerMenuOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Navigation Links */}
              <nav className="mt-6 space-y-2">
                <button
                  onClick={() => {
                    setIsBurgerMenuOpen(false);
                    setCurrentView('LANDING');
                  }}
                  className="w-full text-left p-3 rounded-xl hover:bg-white/5 text-white font-semibold text-xs flex items-center justify-between transition"
                >
                  <span className="flex items-center gap-3">
                    <Info className="w-4 h-4 text-sky-400" /> Overview &amp; Specifications
                  </span>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
                </button>

                <button
                  onClick={() => {
                    setIsBurgerMenuOpen(false);
                    setCurrentView('WORKSPACE');
                  }}
                  className="w-full text-left p-3 rounded-xl hover:bg-white/5 text-white font-semibold text-xs flex items-center justify-between transition"
                >
                  <span className="flex items-center gap-3">
                    <FileCheck2 className="w-4 h-4 text-emerald-400" /> QC Inspection Workspace
                  </span>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
                </button>

                <button
                  onClick={() => {
                    setIsBurgerMenuOpen(false);
                    setCurrentView('EDITOR');
                  }}
                  className="w-full text-left p-3 rounded-xl hover:bg-white/5 text-white font-semibold text-xs flex items-center justify-between transition"
                >
                  <span className="flex items-center gap-3">
                    <Layers className="w-4 h-4 text-sky-400" /> EasySchematic CAD Editor
                  </span>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
                </button>

                <button
                  onClick={() => {
                    setIsBurgerMenuOpen(false);
                    setCurrentView('DASHBOARD');
                  }}
                  className="w-full text-left p-3 rounded-xl hover:bg-white/5 text-white font-semibold text-xs flex items-center justify-between transition"
                >
                  <span className="flex items-center gap-3">
                    <ShieldCheck className="w-4 h-4 text-indigo-400" /> History &amp; Audit Logs
                  </span>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
                </button>

                <button
                  onClick={() => {
                    setIsBurgerMenuOpen(false);
                    setCurrentView('PRICING');
                  }}
                  className="w-full text-left p-3 rounded-xl hover:bg-white/5 text-white font-semibold text-xs flex items-center justify-between transition"
                >
                  <span className="flex items-center gap-3">
                    <Zap className="w-4 h-4 text-amber-400" /> Pricing &amp; Checks Quota
                  </span>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
                </button>

                <div className="pt-4 border-t border-white/10 space-y-1">
                  <div className="text-[10px] font-mono text-slate-500 uppercase tracking-wider px-3 mb-1">
                    Organization Info
                  </div>
                  <div className="p-3 text-slate-300 text-xs flex items-center gap-3">
                    <Building2 className="w-4 h-4 text-sky-400" />
                    <span className="truncate">{activeTenant.name}</span>
                  </div>
                </div>
              </nav>
            </div>

            <div className="pt-6 border-t border-white/10 space-y-2">
              {isAuthenticated ? (
                <button
                  onClick={() => {
                    setIsBurgerMenuOpen(false);
                    authLogout();
                  }}
                  className="w-full py-2.5 rounded-lg border border-white/20 text-rose-400 hover:text-white hover:bg-rose-500/20 text-xs font-mono font-bold transition flex items-center justify-center gap-2"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Log Out ({activeUserName})</span>
                </button>
              ) : (
                <button
                  onClick={() => {
                    setIsBurgerMenuOpen(false);
                    setIsAuthModalOpen(true);
                  }}
                  className="w-full py-2.5 rounded-lg bg-[#0284C7] hover:bg-sky-500 text-white text-xs font-mono font-bold transition shadow-lg"
                >
                  Sign In / Register Organization
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TOP NAVIGATION BAR FOR IN-APP SAAS VIEWS */}
      {currentView !== 'LANDING' && (
        <header className="bg-[#0A1120]/95 backdrop-blur-md sticky top-0 z-40 border-b border-white/10 shadow-2xl">
          <div className="max-w-7xl mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-4">
            {/* Left: Brand Identity + Tenant Switcher */}
            <div className="flex items-center gap-4">
              <div
                onClick={() => setCurrentView('LANDING')}
                className="flex items-center gap-3 cursor-pointer select-none"
              >
                <div className="w-8 h-8 rounded-lg bg-[#0284C7] flex items-center justify-center font-bold text-white text-xs shadow-md">
                  QC
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-extrabold tracking-tight text-white">
                      Wiring Diagram QC
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-400 font-mono font-bold border border-sky-500/30">
                      SaaS v1.0
                    </span>
                  </div>
                </div>
              </div>

              {/* Multi-Tenant Organization Selector */}
              <div className="relative hidden md:block">
                <button
                  onClick={() => setIsTenantDropdownOpen(!isTenantDropdownOpen)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-black/40 hover:bg-white/[0.06] border border-white/10 text-xs font-semibold transition"
                >
                  <Building2 className="w-3.5 h-3.5 text-sky-400" />
                  <span className="text-slate-200 max-w-[170px] truncate">{activeTenant.name}</span>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                </button>

                {isTenantDropdownOpen && (
                  <div className="absolute top-full left-0 mt-2 w-64 bg-[#0A1120] border border-white/15 rounded-xl shadow-2xl p-2 z-50 animate-in fade-in">
                    <div className="px-3 py-1.5 text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">
                      Tenant Organizations
                    </div>
                    {AVAILABLE_TENANTS.map((t) => (
                      <button
                        key={t.id}
                        onClick={() => handleSwitchTenant(t)}
                        className={`w-full text-left p-2.5 rounded-lg text-xs font-medium transition flex items-center justify-between ${
                          activeTenant.id === t.id
                            ? 'bg-[#0284C7]/20 border border-sky-500/40 text-white font-bold'
                            : 'text-slate-300 hover:bg-white/5'
                        }`}
                      >
                        <div>
                          <div className="truncate">{t.name}</div>
                          <div className="text-[10px] font-mono text-slate-400">{t.plan}</div>
                        </div>
                        {activeTenant.id === t.id && (
                          <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Center: In-App View Navigation */}
            <nav className="flex items-center gap-1 bg-black/40 p-1 rounded-xl border border-white/10 text-xs font-semibold">
              <button
                onClick={() => setCurrentView('WORKSPACE')}
                className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 ${
                  currentView === 'WORKSPACE'
                    ? 'bg-[#0284C7] text-white shadow-md font-bold'
                    : 'text-slate-300 hover:text-white hover:bg-white/5'
                }`}
              >
                <FileCheck2 className="w-3.5 h-3.5" />
                QC Workspace
              </button>
              <button
                onClick={() => setCurrentView('EDITOR')}
                className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 ${
                  currentView === 'EDITOR'
                    ? 'bg-[#0284C7] text-white shadow-md font-bold'
                    : 'text-slate-300 hover:text-white hover:bg-white/5'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                EasySchematic Editor
              </button>
              <button
                onClick={() => setCurrentView('DASHBOARD')}
                className={`px-3 py-1.5 rounded-lg transition ${
                  currentView === 'DASHBOARD'
                    ? 'bg-[#0284C7] text-white shadow-md font-bold'
                    : 'text-slate-300 hover:text-white hover:bg-white/5'
                }`}
              >
                Dashboard
              </button>
              <button
                onClick={() => setCurrentView('STANDARDS')}
                className={`px-3 py-1.5 rounded-lg transition ${
                  currentView === 'STANDARDS'
                    ? 'bg-[#0284C7] text-white shadow-md font-bold'
                    : 'text-slate-300 hover:text-white hover:bg-white/5'
                }`}
              >
                Standards
              </button>
              <button
                onClick={() => setCurrentView('PRICING')}
                className={`px-3 py-1.5 rounded-lg transition ${
                  currentView === 'PRICING'
                    ? 'bg-[#0284C7] text-white shadow-md font-bold'
                    : 'text-slate-300 hover:text-white hover:bg-white/5'
                }`}
              >
                Pricing
              </button>
            </nav>

            {/* Right: AI Engine, Quota & User Profile */}
            <div className="flex items-center gap-3">
              {/* Return to Home Landing */}
              <button
                onClick={() => setCurrentView('LANDING')}
                className="hidden lg:inline-flex text-xs font-mono font-medium text-slate-400 hover:text-white px-2.5 py-1 rounded-lg hover:bg-white/5 transition"
              >
                Marketing Site &rarr;
              </button>

              {/* Quota Badge */}
              <div
                onClick={() => setCurrentView('PRICING')}
                className="cursor-pointer bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 border border-white/10 px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition flex items-center gap-1.5"
                title="Remaining Diagram Checks"
              >
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                <span>{quotaUsed}/{quotaLimit} Checks</span>
              </div>

              {/* User Profile / Login */}
              <div
                onClick={() => setIsAuthModalOpen(true)}
                className="cursor-pointer flex items-center gap-2 bg-white/[0.04] hover:bg-white/[0.08] px-3 py-1.5 rounded-lg text-xs transition border border-white/10 shadow-sm"
              >
                <User className="w-3.5 h-3.5 text-sky-400" />
                <span className="font-bold text-white">{activeUserName}</span>
              </div>

              {/* Burger Menu Button */}
              <button
                onClick={() => setIsBurgerMenuOpen(true)}
                className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-white transition"
                title="Menu"
              >
                <Menu className="w-4 h-4" />
              </button>
            </div>
          </div>
        </header>
      )}

      {/* MAIN VIEWPORT */}
      <main className="flex-1 w-full mx-auto">
        {/* Toast Notification */}
        {toastMessage && (
          <div className="fixed bottom-6 right-6 z-50 bg-[#0A1120] border border-sky-500/40 text-white px-5 py-3 rounded-xl shadow-2xl text-xs font-bold flex items-center gap-2.5 animate-in fade-in">
            <Sparkles className="w-4 h-4 text-sky-400" />
            {toastMessage}
          </div>
        )}

        {/* VIEW 1: PUBLIC HOSTINGER-STYLE LANDING PAGE (DEFAULT VIEW) */}
        {currentView === 'LANDING' && (
          <LandingPage
            onStartInspection={() => setCurrentView('WORKSPACE')}
            onOpenEditor={() => setCurrentView('EDITOR')}
            onOpenLogin={() => setIsAuthModalOpen(true)}
            onOpenPricing={() => setCurrentView('PRICING')}
          />
        )}

        {/* IN-APP CONTAINER WRAPPER */}
        {currentView !== 'LANDING' && (
          <div className="max-w-7xl mx-auto p-4 md:p-8">
            {/* VIEW 2: QC WORKSPACE (Upload to Report Flow) */}
            {currentView === 'WORKSPACE' && (
              <InspectionWizard
                currentReport={report}
                onUpdateReport={(newRep) => setReport(newRep)}
                activeStandard={activeStandard}
                onChangeStandard={(std) => {
                  setActiveStandard(std);
                  showToast(`Active inspection standard set to ${std}`);
                }}
                onOpenFeedbackModal={handleOpenFeedback}
                quotaUsed={quotaUsed}
                quotaLimit={quotaLimit}
                onCheckExecuted={handleCheckExecuted}
                onOpenEditor={() => setCurrentView('EDITOR')}
              />
            )}

            {/* VIEW 3: INTERACTIVE EASYSCHEMATIC EDITOR */}
            {currentView === 'EDITOR' && (
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/[0.06] border border-white/10 text-sky-400 text-xs font-mono font-bold uppercase tracking-wider mb-1">
                      <Layers className="w-3.5 h-3.5 text-sky-400" />
                      EasySchematic CAD Editor Reference Engine
                    </div>
                    <h2 className="text-2xl font-extrabold text-white">
                      Interactive Wiring Schematic Editor
                    </h2>
                    <p className="text-xs text-slate-400">
                      Drag components, route 90° orthogonal wires, adjust wire gauges, and run live IPC-620/UL-508A diagnostics.
                    </p>
                  </div>
                  <button
                    onClick={() => setCurrentView('WORKSPACE')}
                    className="btn-primary px-5 py-2.5 text-xs font-bold flex items-center gap-2 self-start sm:self-auto"
                  >
                    <FileCheck2 className="w-4 h-4" /> Run Full QC Report
                  </button>
                </div>

                <EasySchematicEditor />
              </div>
            )}

            {/* VIEW 4: CUSTOMER DASHBOARD */}
            {currentView === 'DASHBOARD' && (
              <CustomerDashboard
                user={{
                  name: activeUserName,
                  email: authUser?.email || 'pravin@spandsons.com',
                  phone: authUser?.phone || '+91 98765 43210',
                  role: activeUserRole,
                  plan: activeTenant.plan,
                  tenantName: activeTenant.name,
                }}
                quotaUsed={quotaUsed}
                quotaLimit={quotaLimit}
                history={history}
                onStartNewInspection={() => setCurrentView('WORKSPACE')}
                onOpenReport={(diagramCode) => {
                  const found = SAMPLE_DIAGRAMS.find(
                    (s) => diagramCode.includes(s.code) || s.name.includes(diagramCode)
                  );
                  if (found) {
                    setReport(found.sampleReport);
                    setActiveStandard(found.standard);
                    setCurrentView('WORKSPACE');
                    showToast(`Loaded ${found.name} report.`);
                  }
                }}
                onOpenStandards={() => setCurrentView('STANDARDS')}
                onOpenPricing={() => setCurrentView('PRICING')}
                onOpenEditor={() => setCurrentView('EDITOR')}
              />
            )}

            {/* VIEW 5: STANDARDS PRESETS & CUSTOM SOPs */}
            {currentView === 'STANDARDS' && (
              <StandardsView
                activeStandard={activeStandard}
                onSelectActiveStandard={(std) => {
                  setActiveStandard(std);
                  showToast(`Standard updated to ${std}`);
                }}
              />
            )}

            {/* VIEW 6: PRICING & QUOTA MANAGEMENT */}
            {currentView === 'PRICING' && (
              <PricingView
                quotaUsed={quotaUsed}
                quotaLimit={quotaLimit}
                currentPlan="SUBSCRIPTION"
                onUpgradePlan={(p) => {
                  if (p === 'ENTERPRISE') setQuotaLimit(1000);
                  else setQuotaLimit(100);
                  showToast(`Updated account plan to ${p}`);
                }}
                onAddQuota={(amt) => {
                  setQuotaLimit((prev) => prev + amt);
                  showToast(`Added ${amt} checks to account quota.`);
                }}
              />
            )}
          </div>
        )}
      </main>

      {/* FOOTER (When in-app) */}
      {currentView !== 'LANDING' && (
        <footer className="border-t border-white/10 bg-[#0A1120] py-6 px-4 text-xs text-slate-400 mt-auto">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
            <div>
              <div className="font-bold text-white">
                Wiring Diagram QC Assistant • Spandsons Horizon Engineering Pvt. Ltd.
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5 font-mono">
                Category leadership in automated AI-powered engineering quality control.
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-4 text-[11px] font-mono text-slate-400">
              <span>IPC-WHMA-A-620</span>
              <span>&bull;</span>
              <span>UL 508A 3rd Ed.</span>
              <span>&bull;</span>
              <span>Tenant: {activeTenant.name}</span>
            </div>
          </div>
        </footer>
      )}

      {/* MODALS */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onLoginSuccess={(loggedUser) => {
          setCurrentView('WORKSPACE');
          showToast(`Welcome ${loggedUser.name}! Signed in successfully.`);
        }}
      />

      <FeedbackModal
        discrepancy={activeFeedbackDiscrepancy}
        isOpen={isFeedbackModalOpen}
        onClose={() => {
          setIsFeedbackModalOpen(false);
          setActiveFeedbackDiscrepancy(null);
        }}
        onSubmitFeedback={handleSubmitFeedback}
      />

      <ModelSettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        config={llmConfig}
        onSaveConfig={(cfg) => {
          setLLMConfig(cfg);
          showToast(`Saved LLM config: ${cfg.modelName}`);
        }}
      />
    </div>
  );
}
