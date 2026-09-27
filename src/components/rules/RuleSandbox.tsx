'use client';

import React, { useState } from 'react';
import { getAwgSpec } from '@/lib/graph/netlist-graph';
import { getBundleDeratingFactor, getThermalDeratingFactor } from '@/lib/rules/ipc-620-engine';
import { getUl508aTable15MinGroundAwg } from '@/lib/rules/ul-508a-engine';
import { Calculator, CheckCircle2, AlertTriangle, Cpu, Shield } from 'lucide-react';

export const RuleSandbox: React.FC = () => {
  const [activeCalculator, setActiveCalculator] = useState<'AMPACITY' | 'GROUNDING' | 'DUCT_FILL'>('AMPACITY');

  // Ampacity State
  const [ampAwg, setAmpAwg] = useState<number>(20);
  const [continuousAmps, setContinuousAmps] = useState<number>(14);
  const [bundleCount, setBundleCount] = useState<number>(6);
  const [ambientTempC, setAmbientTempC] = useState<number>(40);

  // Grounding State
  const [mainBreakerAmps, setMainBreakerAmps] = useState<number>(100);
  const [actualGroundAwg, setActualGroundAwg] = useState<number>(12);

  // Duct Fill State
  const [ductWidthMm, setDuctWidthMm] = useState<number>(60);
  const [ductHeightMm, setDuctHeightMm] = useState<number>(80);
  const [ductWireCount, setDuctWireCount] = useState<number>(45);
  const [ductWireAwg, setDuctWireAwg] = useState<number>(18);

  // 1. Ampacity Calculations
  const awgSpec = getAwgSpec(`${ampAwg} AWG`);
  const bundleFactor = getBundleDeratingFactor(bundleCount);
  const thermalFactor = getThermalDeratingFactor(ambientTempC);
  const safeAmps = Number((awgSpec.maxAmps * bundleFactor * thermalFactor).toFixed(2));
  const isAmpacityPass = continuousAmps <= safeAmps;

  // 2. Grounding Calculations
  const groundRequirement = getUl508aTable15MinGroundAwg(mainBreakerAmps);
  const actualGroundSpec = getAwgSpec(`${actualGroundAwg} AWG`);
  const isGroundPass = actualGroundAwg <= groundRequirement.minAwg; // Lower numerical AWG = thicker wire

  // 3. Duct Fill Calculations
  const ductAreaMm2 = ductWidthMm * ductHeightMm;
  const singleWireArea = getAwgSpec(`${ductWireAwg} AWG`).mm2 * 2.6; // copper + insulation
  const totalWireAreaMm2 = singleWireArea * ductWireCount;
  const fillRatioPercent = Number(((totalWireAreaMm2 / ductAreaMm2) * 100).toFixed(1));
  const isDuctPass = fillRatioPercent <= 20.0;

  return (
    <div className="bg-[#0A1120] border border-white/10 rounded-2xl p-6 shadow-2xl space-y-6 text-slate-100 select-none">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-mono font-bold text-xs">
              DETERMINISTIC RULE ENGINE (PHASE 7)
            </span>
            <span className="text-xs font-mono text-slate-400">
              Zero-Hallucination &bull; Mathematical Proof
            </span>
          </div>
          <h3 className="text-lg font-bold text-white mt-1">
            Live Standards Sandbox &amp; Compliance Calculator
          </h3>
          <p className="text-xs text-slate-400">
            Simulate physical electrical constraints and observe deterministic rule dispositions in real-time.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-1 bg-black/40 p-1 rounded-xl border border-white/10 text-xs font-mono">
          <button
            onClick={() => setActiveCalculator('AMPACITY')}
            className={`px-3 py-1.5 rounded-lg transition ${
              activeCalculator === 'AMPACITY'
                ? 'bg-[#0284C7] text-white font-bold shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            IPC-620 Ampacity
          </button>
          <button
            onClick={() => setActiveCalculator('GROUNDING')}
            className={`px-3 py-1.5 rounded-lg transition ${
              activeCalculator === 'GROUNDING'
                ? 'bg-[#0284C7] text-white font-bold shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            UL-508A Table 15.1
          </button>
          <button
            onClick={() => setActiveCalculator('DUCT_FILL')}
            className={`px-3 py-1.5 rounded-lg transition ${
              activeCalculator === 'DUCT_FILL'
                ? 'bg-[#0284C7] text-white font-bold shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Wire Duct 20% Fill
          </button>
        </div>
      </div>

      {/* 1. IPC-620 AMPACITY CALCULATOR */}
      {activeCalculator === 'AMPACITY' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Controls Form */}
          <div className="lg:col-span-6 space-y-4 bg-white/[0.02] border border-white/5 p-5 rounded-xl">
            <div className="text-xs font-mono font-bold text-sky-400 flex items-center gap-1.5">
              <Calculator className="w-4 h-4" />
              INPUT PARAMETERS (IPC/WHMA-A-620 §4.2.1)
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-slate-400 block mb-1">
                  Conductor Gauge: <span className="text-white font-bold">{ampAwg} AWG</span> ({awgSpec.mm2} mm²)
                </label>
                <select
                  value={ampAwg}
                  onChange={(e) => setAmpAwg(Number(e.target.value))}
                  className="w-full bg-black/60 border border-white/10 rounded-lg p-2 text-white font-mono text-xs outline-none"
                >
                  {[26, 24, 22, 20, 18, 16, 14, 12, 10].map((g) => (
                    <option key={g} value={g}>
                      {g} AWG ({getAwgSpec(`${g} AWG`).mm2} mm²) - Nominal {getAwgSpec(`${g} AWG`).maxAmps}A
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <div className="flex justify-between text-slate-400 mb-1">
                  <span>Continuous Load Current:</span>
                  <span className="text-white font-mono font-bold">{continuousAmps} Amperes</span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="35"
                  step="0.5"
                  value={continuousAmps}
                  onChange={(e) => setContinuousAmps(Number(e.target.value))}
                  className="w-full accent-sky-500"
                />
              </div>

              <div>
                <div className="flex justify-between text-slate-400 mb-1">
                  <span>Harness Bundle Wire Count:</span>
                  <span className="text-white font-mono font-bold">{bundleCount} Wires</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="28"
                  value={bundleCount}
                  onChange={(e) => setBundleCount(Number(e.target.value))}
                  className="w-full accent-sky-500"
                />
              </div>

              <div>
                <div className="flex justify-between text-slate-400 mb-1">
                  <span>Ambient Operating Temperature:</span>
                  <span className="text-white font-mono font-bold">{ambientTempC} &deg;C</span>
                </div>
                <input
                  type="range"
                  min="25"
                  max="65"
                  value={ambientTempC}
                  onChange={(e) => setAmbientTempC(Number(e.target.value))}
                  className="w-full accent-sky-500"
                />
              </div>
            </div>
          </div>

          {/* Math Output */}
          <div className="lg:col-span-6 space-y-4 bg-black/40 border border-white/10 p-5 rounded-xl">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-slate-400">
                DERATED THERMAL CAPACITY
              </span>
              <span
                className={`px-2.5 py-0.5 rounded text-xs font-mono font-bold flex items-center gap-1 ${
                  isAmpacityPass
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                }`}
              >
                {isAmpacityPass ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" /> PASS (SAFE)
                  </>
                ) : (
                  <>
                    <AlertTriangle className="w-3.5 h-3.5" /> VIOLATION FLAGGED
                  </>
                )}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs font-mono">
              <div className="p-3 rounded-lg bg-white/[0.02] border border-white/5">
                <span className="text-slate-400 block text-[10px]">Nominal Single Wire</span>
                <span className="text-white font-bold text-sm">{awgSpec.maxAmps}A</span>
              </div>
              <div className="p-3 rounded-lg bg-white/[0.02] border border-white/5">
                <span className="text-slate-400 block text-[10px]">Bundle Factor (kb)</span>
                <span className="text-sky-400 font-bold text-sm">{bundleFactor}x</span>
              </div>
              <div className="p-3 rounded-lg bg-white/[0.02] border border-white/5">
                <span className="text-slate-400 block text-[10px]">Thermal Factor (kt)</span>
                <span className="text-amber-400 font-bold text-sm">{thermalFactor}x</span>
              </div>
              <div className="p-3 rounded-lg bg-white/[0.02] border border-white/5">
                <span className="text-slate-400 block text-[10px]">Derated Safe Limit</span>
                <span className={`font-bold text-sm ${isAmpacityPass ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {safeAmps}A
                </span>
              </div>
            </div>

            <div className="pt-3 border-t border-white/10 text-xs text-slate-300 space-y-1.5 font-mono">
              <div className="text-[11px] text-slate-400">
                Formula: <span className="text-white">I_safe = I_nom ({awgSpec.maxAmps}A) &times; {bundleFactor} &times; {thermalFactor} = {safeAmps}A</span>
              </div>
              <div className="text-[11px]">
                Actual Load: <span className="font-bold text-white">{continuousAmps}A</span> ({Number((continuousAmps / safeAmps * 100).toFixed(0))}% of safe limit)
              </div>
              {!isAmpacityPass && (
                <div className="p-2.5 rounded bg-rose-500/10 border border-rose-500/20 text-rose-300 text-[11px] leading-relaxed">
                  <strong>Non-Conformance:</strong> Continuous load of {continuousAmps}A exceeds {safeAmps}A derated limit. Recommend upgrading to 16 AWG or reducing load.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 2. UL 508A TABLE 15.1 GROUNDING */}
      {activeCalculator === 'GROUNDING' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-6 space-y-4 bg-white/[0.02] border border-white/5 p-5 rounded-xl">
            <div className="text-xs font-mono font-bold text-sky-400 flex items-center gap-1.5">
              <Shield className="w-4 h-4" />
              INPUT PARAMETERS (UL 508A TABLE 15.1)
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-slate-400 block mb-1">
                  Main Overcurrent Protective Device (OCPD / Breaker Rating):
                </label>
                <select
                  value={mainBreakerAmps}
                  onChange={(e) => setMainBreakerAmps(Number(e.target.value))}
                  className="w-full bg-black/60 border border-white/10 rounded-lg p-2 text-white font-mono text-xs outline-none"
                >
                  {[15, 20, 30, 60, 100, 200, 300, 400, 500, 600].map((amps) => (
                    <option key={amps} value={amps}>
                      {amps}A Main Circuit Breaker
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-slate-400 block mb-1">
                  Actual Equipment Grounding Conductor Size:
                </label>
                <select
                  value={actualGroundAwg}
                  onChange={(e) => setActualGroundAwg(Number(e.target.value))}
                  className="w-full bg-black/60 border border-white/10 rounded-lg p-2 text-white font-mono text-xs outline-none"
                >
                  {[18, 16, 14, 12, 10, 8, 6, 4, 3, 2, 1].map((awg) => (
                    <option key={awg} value={awg}>
                      {awg} AWG ({getAwgSpec(`${awg} AWG`).mm2} mm²)
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="lg:col-span-6 space-y-4 bg-black/40 border border-white/10 p-5 rounded-xl">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-slate-400">
                UL 508A TABLE 15.1 VERDICT
              </span>
              <span
                className={`px-2.5 py-0.5 rounded text-xs font-mono font-bold flex items-center gap-1 ${
                  isGroundPass
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                }`}
              >
                {isGroundPass ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" /> COMPLIANT
                  </>
                ) : (
                  <>
                    <AlertTriangle className="w-3.5 h-3.5" /> CODE VIOLATION
                  </>
                )}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs font-mono">
              <div className="p-3 rounded-lg bg-white/[0.02] border border-white/5">
                <span className="text-slate-400 block text-[10px]">Breaker Rating</span>
                <span className="text-white font-bold text-sm">{mainBreakerAmps}A</span>
              </div>
              <div className="p-3 rounded-lg bg-white/[0.02] border border-white/5">
                <span className="text-slate-400 block text-[10px]">Table 15.1 Minimum</span>
                <span className="text-sky-400 font-bold text-sm">{groundRequirement.minAwgStr}</span>
              </div>
              <div className="p-3 rounded-lg bg-white/[0.02] border border-white/5">
                <span className="text-slate-400 block text-[10px]">Actual Installed</span>
                <span className="text-white font-bold text-sm">{actualGroundAwg} AWG</span>
              </div>
              <div className="p-3 rounded-lg bg-white/[0.02] border border-white/5">
                <span className="text-slate-400 block text-[10px]">Actual Copper Area</span>
                <span className="text-slate-200 font-bold text-sm">{actualGroundSpec.mm2} mm²</span>
              </div>
            </div>

            <div className="pt-3 border-t border-white/10 text-xs text-slate-300 space-y-1.5 font-mono">
              {!isGroundPass ? (
                <div className="p-2.5 rounded bg-rose-500/10 border border-rose-500/20 text-rose-300 text-[11px] leading-relaxed">
                  <strong>Critical Hazard:</strong> {actualGroundAwg} AWG conductor is undersized for a {mainBreakerAmps}A feeder. In a ground-fault scenario, the wire will melt before the breaker trips. Replace with minimum {groundRequirement.minAwgStr}.
                </div>
              ) : (
                <div className="p-2.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-[11px] leading-relaxed">
                  <strong>Approved:</strong> {actualGroundAwg} AWG meets or exceeds Table 15.1 minimum ({groundRequirement.minAwgStr}) for {mainBreakerAmps}A upstream protection.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 3. WIRE DUCT 20% FILL CALCULATOR */}
      {activeCalculator === 'DUCT_FILL' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-6 space-y-4 bg-white/[0.02] border border-white/5 p-5 rounded-xl">
            <div className="text-xs font-mono font-bold text-sky-400 flex items-center gap-1.5">
              <Cpu className="w-4 h-4" />
              DUCT &amp; HARNESS GEOMETRY (UL 508A §29.3.4)
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1">Duct Width (mm):</label>
                  <input
                    type="number"
                    value={ductWidthMm}
                    onChange={(e) => setDuctWidthMm(Number(e.target.value))}
                    className="w-full bg-black/60 border border-white/10 rounded-lg p-2 text-white font-mono text-xs outline-none"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Duct Height (mm):</label>
                  <input
                    type="number"
                    value={ductHeightMm}
                    onChange={(e) => setDuctHeightMm(Number(e.target.value))}
                    className="w-full bg-black/60 border border-white/10 rounded-lg p-2 text-white font-mono text-xs outline-none"
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-slate-400 mb-1">
                  <span>Number of Conductors Inside Raceway:</span>
                  <span className="text-white font-mono font-bold">{ductWireCount} Conductors</span>
                </div>
                <input
                  type="range"
                  min="5"
                  max="120"
                  value={ductWireCount}
                  onChange={(e) => setDuctWireCount(Number(e.target.value))}
                  className="w-full accent-sky-500"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Average Conductor Gauge:</label>
                <select
                  value={ductWireAwg}
                  onChange={(e) => setDuctWireAwg(Number(e.target.value))}
                  className="w-full bg-black/60 border border-white/10 rounded-lg p-2 text-white font-mono text-xs outline-none"
                >
                  {[22, 20, 18, 16, 14, 12, 10].map((g) => (
                    <option key={g} value={g}>
                      {g} AWG (OD Cross-Section: {(getAwgSpec(`${g} AWG`).mm2 * 2.6).toFixed(1)} mm²)
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="lg:col-span-6 space-y-4 bg-black/40 border border-white/10 p-5 rounded-xl">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-slate-400">
                CALCULATED FILL RATIO
              </span>
              <span
                className={`px-2.5 py-0.5 rounded text-xs font-mono font-bold flex items-center gap-1 ${
                  isDuctPass
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                }`}
              >
                {isDuctPass ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" /> COMPLIANT (&le; 20%)
                  </>
                ) : (
                  <>
                    <AlertTriangle className="w-3.5 h-3.5" /> EXCEEDS 20% LIMIT
                  </>
                )}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs font-mono">
              <div className="p-3 rounded-lg bg-white/[0.02] border border-white/5">
                <span className="text-slate-400 block text-[10px]">Duct Interior Area</span>
                <span className="text-white font-bold text-sm">{ductAreaMm2} mm²</span>
              </div>
              <div className="p-3 rounded-lg bg-white/[0.02] border border-white/5">
                <span className="text-slate-400 block text-[10px]">20% Max Area</span>
                <span className="text-sky-400 font-bold text-sm">{(ductAreaMm2 * 0.2).toFixed(0)} mm²</span>
              </div>
              <div className="p-3 rounded-lg bg-white/[0.02] border border-white/5">
                <span className="text-slate-400 block text-[10px]">Total Wire Area</span>
                <span className="text-slate-200 font-bold text-sm">{totalWireAreaMm2.toFixed(0)} mm²</span>
              </div>
              <div className="p-3 rounded-lg bg-white/[0.02] border border-white/5">
                <span className="text-slate-400 block text-[10px]">Calculated Fill</span>
                <span className={`font-bold text-sm ${isDuctPass ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {fillRatioPercent}%
                </span>
              </div>
            </div>

            <div className="pt-3 border-t border-white/10 text-xs text-slate-300 space-y-1.5 font-mono">
              <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
                <div
                  className={`h-full transition-all duration-300 ${
                    isDuctPass ? 'bg-emerald-500' : 'bg-rose-500'
                  }`}
                  style={{ width: `${Math.min(100, fillRatioPercent * 2.5)}%` }}
                />
              </div>
              {!isDuctPass ? (
                <div className="p-2.5 rounded bg-rose-500/10 border border-rose-500/20 text-rose-300 text-[11px] leading-relaxed">
                  <strong>Code Violation:</strong> Fill ratio of {fillRatioPercent}% violates the 20% limit of UL 508A §29.3.4. Excessive fill traps thermal energy. Upsize duct to {ductWidthMm + 20}mm &times; {ductHeightMm + 20}mm.
                </div>
              ) : (
                <div className="p-2.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-[11px] leading-relaxed">
                  <strong>Compliant:</strong> Wire raceway has adequate heat dissipation margins ({fillRatioPercent}% &le; 20.0%).
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
