'use client';

import React, { useState } from 'react';
import { LLMConfig } from '@/types/qc';
import { X, Cpu, Server, Sparkles, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';

interface ModelSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: LLMConfig;
  onSaveConfig: (newConfig: LLMConfig) => void;
}

const OPEN_SOURCE_MODELS = [
  { id: 'qwen2.5-vl:3b', name: 'Qwen 2.5 VL (3B)', desc: 'Ultra-lightweight open-source vision LLM for fast diagram inspection' },
  { id: 'llama3.2-vision:11b', name: 'Llama 3.2 Vision (11B)', desc: 'Meta open-source multimodal model with deep schematic reasoning' },
  { id: 'moondream2', name: 'Moondream 2 (1.8B)', desc: 'Extremely fast 1.8B parameter visual QA model for edge deployments' },
  { id: 'phi-3.5-vision', name: 'Phi-3.5 Vision (4.2B)', desc: 'Compact high-density vision model optimized for tabular & schematic data' },
  { id: 'custom', name: 'Custom Model Tag...', desc: 'Provide your own fine-tuned Ollama or HuggingFace model identifier' },
];

export const ModelSettingsModal: React.FC<ModelSettingsModalProps> = ({
  isOpen,
  onClose,
  config,
  onSaveConfig,
}) => {
  const [localConfig, setLocalConfig] = useState<LLMConfig>(config);
  const [testingStatus, setTestingStatus] = useState<boolean>(false);
  const [connectionResult, setConnectionResult] = useState<{
    tested: boolean;
    online: boolean;
    models: string[];
    error?: string;
  } | null>(null);

  if (!isOpen) return null;

  const handleTestConnection = async () => {
    setTestingStatus(true);
    setConnectionResult(null);
    try {
      const res = await fetch('/api/llm/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ endpoint: localConfig.endpoint }),
      });
      const data = await res.json();
      setConnectionResult({
        tested: true,
        online: data.online,
        models: data.models || [],
        error: data.error,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Network test error';
      setConnectionResult({
        tested: true,
        online: false,
        models: [],
        error: msg,
      });
    } finally {
      setTestingStatus(false);
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveConfig(localConfig);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div className="relative w-full max-w-2xl max-h-[90vh] bg-slate-900 border border-slate-700 rounded-xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/70">
          <div className="flex items-center gap-2.5">
            <Cpu className="w-5 h-5 text-cyan-400" />
            <div>
              <h3 className="text-base font-semibold text-slate-100">
                Open-Source Lightweight LLM & Prompt Configuration
              </h3>
              <p className="text-xs text-slate-400">
                Configure your local Ollama / HuggingFace endpoint and validated QC prompt
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-md hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Provider Selection */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
              Inference Engine Provider
            </label>
            <div className="grid grid-cols-3 gap-3">
              {[
                { id: 'ollama', name: 'Local Ollama', badge: 'Recommended', desc: 'Direct connection to local vision LLM' },
                { id: 'huggingface', name: 'HuggingFace / TGI', badge: 'Self-Hosted', desc: 'Custom local inference container' },
                { id: 'builtin', name: 'Built-in Engine', badge: 'High-Precision', desc: 'Integrated rule & neural inspection' },
              ].map((p) => (
                <button
                  type="button"
                  key={p.id}
                  onClick={() => setLocalConfig({ ...localConfig, provider: p.id as any })}
                  className={`p-3 rounded-lg border text-left transition ${
                    localConfig.provider === p.id
                      ? 'bg-cyan-950/40 border-cyan-500/60 shadow-sm'
                      : 'bg-slate-800/40 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-200">{p.name}</span>
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-800 text-cyan-300 font-mono">
                      {p.badge}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1 line-clamp-1">{p.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Endpoint URL & Test Connection */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
              Local Inference Base Endpoint URL
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={localConfig.endpoint}
                onChange={(e) => setLocalConfig({ ...localConfig, endpoint: e.target.value })}
                placeholder="http://localhost:11434"
                className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-cyan-300 focus:outline-none focus:border-cyan-500"
              />
              <button
                type="button"
                onClick={handleTestConnection}
                disabled={testingStatus}
                className="px-3.5 py-2 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg border border-slate-700 transition flex items-center gap-1.5 disabled:opacity-50"
              >
                {testingStatus ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Testing...
                  </>
                ) : (
                  <>
                    <Server className="w-3.5 h-3.5 text-cyan-400" /> Test Ping
                  </>
                )}
              </button>
            </div>

            {/* Connection Test Result */}
            {connectionResult && (
              <div
                className={`p-2.5 rounded-lg border text-xs flex items-start gap-2 ${
                  connectionResult.online
                    ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-300'
                    : 'bg-rose-950/40 border-rose-500/50 text-rose-300'
                }`}
              >
                {connectionResult.online ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                )}
                <div>
                  <div className="font-semibold">
                    {connectionResult.online
                      ? `Endpoint is Online! Found ${connectionResult.models.length} model(s).`
                      : 'Endpoint is Offline or unreachable.'}
                  </div>
                  <div className="text-[11px] opacity-80 mt-0.5">
                    {connectionResult.online
                      ? `Available: ${connectionResult.models.join(', ') || 'No tagged models yet'}`
                      : `${connectionResult.error || 'Connection refused'}. (The application will automatically use the built-in high-precision inspection engine fallback).`}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Model Selection */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
              Select Open-Source Model Identifier
            </label>
            <div className="grid grid-cols-2 gap-2">
              {OPEN_SOURCE_MODELS.map((m) => (
                <div
                  key={m.id}
                  onClick={() => {
                    if (m.id !== 'custom') {
                      setLocalConfig({ ...localConfig, modelName: m.id });
                    }
                  }}
                  className={`p-2.5 rounded-lg border cursor-pointer transition ${
                    localConfig.modelName === m.id
                      ? 'bg-cyan-950/40 border-cyan-500/60 text-slate-100'
                      : 'bg-slate-800/40 border-slate-800 text-slate-300 hover:border-slate-700'
                  }`}
                >
                  <div className="text-xs font-semibold">{m.name}</div>
                  <div className="text-[10px] text-slate-400 mt-0.5 line-clamp-1">{m.desc}</div>
                </div>
              ))}
            </div>

            {/* Custom Model Input */}
            <div className="mt-2">
              <input
                type="text"
                value={localConfig.modelName}
                onChange={(e) => setLocalConfig({ ...localConfig, modelName: e.target.value })}
                placeholder="Enter model tag (e.g. qwen2.5-vl:3b, llama3.2-vision:11b)"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-cyan-300 focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>

          {/* Temperature Slider */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                Inference Temperature: {localConfig.temperature}
              </label>
              <span className="text-[10px] text-slate-500">Low = strict deterministic compliance</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={localConfig.temperature}
              onChange={(e) => setLocalConfig({ ...localConfig, temperature: parseFloat(e.target.value) })}
              className="w-full accent-cyan-500"
            />
          </div>

          {/* Validated Prompt Editor */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                Validated QC System Prompt (IP Protected)
              </label>
              <span className="text-[10px] text-emerald-400 font-mono">v2.4 Production</span>
            </div>
            <textarea
              value={localConfig.customPrompt}
              onChange={(e) => setLocalConfig({ ...localConfig, customPrompt: e.target.value })}
              rows={6}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs font-mono text-slate-300 focus:outline-none focus:border-cyan-500 resize-y"
            />
          </div>

          {/* Action buttons */}
          <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-semibold bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg transition shadow-lg shadow-cyan-950/50 flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4" /> Save Configuration
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
