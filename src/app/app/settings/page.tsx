'use client';

import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { DEFAULT_LLM_CONFIG } from '@/lib/llm-engine';
import { LLMConfig } from '@/types/qc';
import {
  Settings,
  Cpu,
  Sliders,
  ShieldCheck,
  Save,
  CheckCircle2,
  Sparkles,
  Server,
  Bell,
  HardDrive,
} from 'lucide-react';

export default function AppSettingsPage() {
  const { user, tenant } = useAuth();
  const [config, setConfig] = useState<LLMConfig>(DEFAULT_LLM_CONFIG);
  const [confidenceCutoff, setConfidenceCutoff] = useState<number>(85);
  const [ingestionDpi, setIngestionDpi] = useState<number>(300);
  const [webhookUrl, setWebhookUrl] = useState<string>('https://hooks.slack.com/services/spandsons/qc-alerts');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    showToast('Saved AI engine configuration & plant parameters.');
  };

  return (
    <div className="space-y-8 animate-in fade-in max-w-4xl">
      {/* Toast */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#0A1120] border border-sky-500/40 text-white px-5 py-3 rounded-xl shadow-2xl text-xs font-bold flex items-center gap-2.5 animate-in fade-in">
          <Sparkles className="w-4 h-4 text-sky-400" />
          {toastMessage}
        </div>
      )}

      {/* Header */}
      <div className="pb-4 border-b border-white/10 space-y-1">
        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/[0.06] border border-white/10 text-sky-400 text-xs font-mono font-bold mb-1">
          <Settings className="w-3.5 h-3.5" />
          CONFIGURATION &amp; AI RUNTIME
        </div>
        <h1 className="text-2xl font-bold text-white tracking-tight">
          AI Engine &amp; Plant Ingestion Settings
        </h1>
        <p className="text-xs text-slate-400">
          Configure model inference providers, confidence thresholds, optical resolution, and webhook alerts.
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Section 1: AI Model Selection */}
        <div className="p-6 rounded-2xl bg-[#0A1120] border border-white/10 shadow-xl space-y-4">
          <div className="flex items-center gap-2 text-white font-bold text-sm">
            <Cpu className="w-4 h-4 text-sky-400" />
            <span>AI Model &amp; Vision Engine Provider</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div
              onClick={() => setConfig({ ...config, provider: 'ollama', modelName: 'qwen2-vl:7b' })}
              className={`p-4 rounded-xl cursor-pointer border transition flex flex-col justify-between space-y-3 ${
                config.provider === 'ollama'
                  ? 'bg-sky-500/10 border-sky-500/40 shadow-md'
                  : 'bg-white/[0.02] border-white/10 hover:border-white/20'
              }`}
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white">Local Vision AI (Recommended)</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold">
                    ZERO TOKEN COST
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  Qwen2-VL-7B local vision-language model running directly inside your private container. Air-gap ready.
                </p>
              </div>
              <div className="text-[10px] font-mono text-slate-500">
                Deterministic Netlist Extraction &bull; No Internet Egress
              </div>
            </div>

            <div
              onClick={() => setConfig({ ...config, provider: 'builtin', modelName: 'builtin-rule-graph-v1' })}
              className={`p-4 rounded-xl cursor-pointer border transition flex flex-col justify-between space-y-3 ${
                config.provider === 'builtin'
                  ? 'bg-sky-500/10 border-sky-500/40 shadow-md'
                  : 'bg-white/[0.02] border-white/10 hover:border-white/20'
              }`}
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white">Deterministic Rule Engine</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20 font-bold">
                    100% REPRODUCIBLE
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  Algorithmic graph checker verifying continuous ampacities, Table 15.1 grounding, and pin-to-pin nets.
                </p>
              </div>
              <div className="text-[10px] font-mono text-slate-500">
                Mathematical Rule Verification &bull; Ultra Fast (&lt; 500ms)
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: Sensitivity & Inspection Calibration */}
        <div className="p-6 rounded-2xl bg-[#0A1120] border border-white/10 shadow-xl space-y-6">
          <div className="flex items-center gap-2 text-white font-bold text-sm">
            <Sliders className="w-4 h-4 text-emerald-400" />
            <span>Inspection Calibration &amp; Optical Resolution</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-slate-300">Confidence Cutoff Threshold:</span>
                <span className="text-white font-bold">{confidenceCutoff}%</span>
              </div>
              <input
                type="range"
                min="50"
                max="99"
                step="1"
                value={confidenceCutoff}
                onChange={(e) => setConfidenceCutoff(Number(e.target.value))}
                className="w-full accent-sky-400 bg-slate-800 h-2 rounded-lg cursor-pointer"
              />
              <span className="text-[10px] text-slate-500 font-mono block">
                Discrepancies below this score will be flagged for secondary human inspector review.
              </span>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-slate-300">Inference Temperature:</span>
                <span className="text-white font-bold">{config.temperature}</span>
              </div>
              <input
                type="range"
                min="0.0"
                max="0.5"
                step="0.05"
                value={config.temperature}
                onChange={(e) => setConfig({ ...config, temperature: Number(e.target.value) })}
                className="w-full accent-sky-400 bg-slate-800 h-2 rounded-lg cursor-pointer"
              />
              <span className="text-[10px] text-slate-500 font-mono block">
                0.0 to 0.1 recommended for deterministic engineering safety verification.
              </span>
            </div>
          </div>

          <div className="pt-4 border-t border-white/5 space-y-2">
            <label className="text-xs font-mono text-slate-300">
              PDF Vector Rasterization DPI
            </label>
            <div className="flex gap-3">
              {[150, 300, 600].map((dpi) => (
                <button
                  type="button"
                  key={dpi}
                  onClick={() => setIngestionDpi(dpi)}
                  className={`px-4 py-2 rounded-lg text-xs font-mono font-bold transition ${
                    ingestionDpi === dpi
                      ? 'bg-[#0284C7] text-white shadow-md'
                      : 'bg-white/5 text-slate-300 hover:bg-white/10'
                  }`}
                >
                  {dpi} DPI {dpi === 300 ? '(Standard)' : dpi === 600 ? '(High Precision)' : '(Draft)'}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Section 3: Webhook Notifications */}
        <div className="p-6 rounded-2xl bg-[#0A1120] border border-white/10 shadow-xl space-y-4">
          <div className="flex items-center gap-2 text-white font-bold text-sm">
            <Bell className="w-4 h-4 text-amber-400" />
            <span>Manufacturing Webhook Notifications</span>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-mono text-slate-300">
              Alert Webhook URL (Slack / Teams / MES)
            </label>
            <input
              type="url"
              value={webhookUrl}
              onChange={(e) => setWebhookUrl(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-lg bg-black/40 border border-white/10 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-sky-500 font-mono transition"
            />
            <span className="text-[11px] text-slate-500 font-mono block">
              Triggers instant JSON payload upon detection of any CRITICAL or MAJOR discrepancy.
            </span>
          </div>
        </div>

        <button
          type="submit"
          className="btn-primary px-6 py-3 text-xs font-bold flex items-center gap-2 shadow-lg"
        >
          <Save className="w-4 h-4" />
          <span>Save Configuration</span>
        </button>
      </form>
    </div>
  );
}
