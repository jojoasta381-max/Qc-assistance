'use client';

import React, { useState } from 'react';
import { StandardsView } from '@/components/StandardsView';
import { RuleSandbox } from '@/components/rules/RuleSandbox';
import { STANDARDS_RULE_REGISTRY } from '@/lib/rules/standards-registry';
import { StandardPreset } from '@/types/qc';
import { ShieldCheck, Sparkles, Sliders, BookOpen, Calculator, Search, Filter } from 'lucide-react';

export default function AppStandardsPage() {
  const [activeTab, setActiveTab] = useState<'PRESETS' | 'SANDBOX' | 'REGISTRY'>('PRESETS');
  const [activeStandard, setActiveStandard] = useState<StandardPreset>('IPC-WHMA-A-620');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const filteredRules = STANDARDS_RULE_REGISTRY.filter((rule) => {
    const matchesSearch =
      rule.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      rule.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      rule.clause.toLowerCase().includes(searchQuery.toLowerCase()) ||
      rule.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCat = selectedCategory === 'ALL' || rule.category === selectedCategory;
    return matchesSearch && matchesCat;
  });

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#0A1120] border border-sky-500/40 text-white px-5 py-3 rounded-xl shadow-2xl text-xs font-bold flex items-center gap-2.5 animate-in fade-in">
          <Sparkles className="w-4 h-4 text-sky-400" />
          {toastMessage}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/[0.06] border border-white/10 text-emerald-400 text-xs font-mono font-bold mb-1">
            <ShieldCheck className="w-3.5 h-3.5" />
            STANDARDS &amp; DETERMINISTIC RULE ENGINE
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Engineering Standards &amp; Custom Plant SOPs
          </h1>
          <p className="text-xs text-slate-400">
            Configure active audit rulesets, verify mathematical derating formulas in the live sandbox, and inspect standard clauses.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-1 bg-black/40 p-1 rounded-xl border border-white/10 text-xs font-mono self-start sm:self-auto">
          <button
            onClick={() => setActiveTab('PRESETS')}
            className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition ${
              activeTab === 'PRESETS'
                ? 'bg-[#0284C7] text-white font-bold shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            Standards Presets
          </button>
          <button
            onClick={() => setActiveTab('SANDBOX')}
            className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition ${
              activeTab === 'SANDBOX'
                ? 'bg-[#0284C7] text-white font-bold shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Calculator className="w-3.5 h-3.5" />
            Rule Sandbox
          </button>
          <button
            onClick={() => setActiveTab('REGISTRY')}
            className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition ${
              activeTab === 'REGISTRY'
                ? 'bg-[#0284C7] text-white font-bold shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            Rules Catalog ({STANDARDS_RULE_REGISTRY.length})
          </button>
        </div>
      </div>

      {/* TAB 1: STANDARDS PRESETS VIEW */}
      {activeTab === 'PRESETS' && (
        <StandardsView
          activeStandard={activeStandard}
          onSelectActiveStandard={(std) => {
            setActiveStandard(std);
            showToast(`Default inspection standard updated to ${std}`);
          }}
        />
      )}

      {/* TAB 2: LIVE DETERMINISTIC RULE SANDBOX */}
      {activeTab === 'SANDBOX' && <RuleSandbox />}

      {/* TAB 3: MASTER RULES REGISTRY CATALOG */}
      {activeTab === 'REGISTRY' && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-[#0A1120] p-4 rounded-xl border border-white/10">
            <div className="flex items-center gap-2 bg-black/40 px-3 py-1.5 rounded-lg border border-white/10 w-full sm:w-80">
              <Search className="w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search rule title, clause, or formula..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-transparent text-xs text-white placeholder-slate-500 outline-none w-full font-mono"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="bg-black/40 text-xs font-mono text-slate-200 border border-white/10 rounded-lg px-3 py-1.5 outline-none cursor-pointer"
              >
                <option value="ALL">All Categories</option>
                <option value="CONDUCTOR_SIZING">Conductor Sizing</option>
                <option value="ELECTRICAL_SAFETY">Electrical Safety</option>
                <option value="GROUNDING_BONDING">Grounding &amp; Bonding</option>
                <option value="MECHANICAL_RELIABILITY">Mechanical Reliability</option>
                <option value="TERMINATION_CRIMPING">Termination &amp; Crimping</option>
                <option value="DOCUMENTATION_SOP">Documentation &amp; SOP</option>
              </select>
            </div>
          </div>

          {/* Rules Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredRules.map((rule) => (
              <div
                key={rule.code}
                className="bg-[#0A1120] border border-white/10 hover:border-sky-500/40 rounded-xl p-5 space-y-3 transition group"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-sky-500/10 text-sky-400 border border-sky-500/20">
                        {rule.standard}
                      </span>
                      <span className="font-mono text-[10px] text-slate-400">
                        Clause: {rule.clause}
                      </span>
                    </div>
                    <h4 className="text-sm font-bold text-white mt-1 group-hover:text-sky-300 transition">
                      {rule.title}
                    </h4>
                  </div>
                  <span
                    className={`font-mono text-[10px] font-bold px-2 py-0.5 rounded ${
                      rule.severityDefault === 'CRITICAL'
                        ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                        : rule.severityDefault === 'MAJOR'
                        ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                        : 'bg-slate-500/10 text-slate-400 border border-slate-500/20'
                    }`}
                  >
                    {rule.severityDefault}
                  </span>
                </div>

                <p className="text-xs text-slate-400 leading-relaxed">
                  {rule.description}
                </p>

                <div className="p-2.5 rounded bg-black/50 border border-white/5 font-mono text-[11px] text-emerald-400">
                  <span className="text-slate-500 block text-[10px]">Verification Equation:</span>
                  {rule.formulaOrCheck}
                </div>

                <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[11px] text-slate-400 font-mono">
                  <span>Category: {rule.category.replace('_', ' ')}</span>
                  <span className="text-sky-400 font-bold">{rule.code}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
