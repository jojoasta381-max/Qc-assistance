'use client';

import React, { useState } from 'react';
import { StandardPreset } from '@/types/qc';
import { BookOpen, Check, Sliders, Plus, CheckCircle2 } from 'lucide-react';

interface StandardsViewProps {
  activeStandard: StandardPreset;
  onSelectActiveStandard: (standard: StandardPreset) => void;
}

const STANDARDS_INFO = [
  {
    id: 'IPC-WHMA-A-620' as StandardPreset,
    name: 'IPC/WHMA-A-620 Revision E',
    title: 'Requirements and Acceptance for Cable and Wire Harness Assemblies',
    scope: 'Electronics Manufacturing, Automotive Harness, Aerospace Avionics',
    rulesCount: 156,
    keyChecks: [
      'Conductor strand damage & untwist limits (§3.1)',
      'Minimum wire gauge (AWG) vs continuous ampacity (§4.2)',
      'Stamped & machined terminal crimp height / pull-force (§5.1)',
      'Ultrasonic & solder splice identification tags (§8.4)',
      'Shield drain wire pigtail length ≤ 25mm (§17.2)',
      'Wire harness bend radius & tie-wrap spacing (§18.1)',
    ],
  },
  {
    id: 'UL-508A' as StandardPreset,
    name: 'UL 508A Edition 3',
    title: 'Standard for Industrial Control Panels & Motor Starters',
    scope: 'Industrial Automation, VFD Panels, MCCs, Switchgear',
    rulesCount: 184,
    keyChecks: [
      'Equipment grounding conductor sizing per Table 15.1 (§15.2)',
      'Electrical creepage and clearance spacing Table 28.1 (§28.4)',
      'Dual-channel safety interlock redundancy per NFPA 79 (§9.2.5)',
      'Full Load Amp (FLA) overload trip rating annotation (§54.1)',
      'Conduit wire raceway fill percentage ≤ 40% (§32.1)',
      'Short-Circuit Current Rating (SCCR) labeling (§67.1)',
    ],
  },
  {
    id: 'IPC-A-610' as StandardPreset,
    name: 'IPC-A-610 Revision H',
    title: 'Acceptability of Electronic Assemblies & Terminal Blocks',
    scope: 'PCBA Assembly, DIN Rail Terminal Distribution, Instrumentation',
    rulesCount: 98,
    keyChecks: [
      'Wire end ferrule requirement on stranded push-in terminals (§4.1)',
      'Equipotential common jumper bar continuity (§4.2)',
      'Terminal screw torque annotation and verification paint (§8.3)',
      'Solder fillet wetting angle and pin protrusion (§7.1)',
      'Component polarity & diode direction labeling (§9.4)',
    ],
  },
  {
    id: 'ISO-1219' as StandardPreset,
    name: 'ISO 1219 / IEC 60617',
    title: 'Graphical Symbols and Circuit Diagram Conventions',
    scope: 'Hydraulic, Pneumatic, and Electro-Fluidic Schematics',
    rulesCount: 112,
    keyChecks: [
      'Standardized IEC/ISO symbol nomenclature',
      'Port numbering and flow path arrow directions',
      'Pressure relief valve cracking setpoint callouts',
      'Dual-coil solenoid latching logic tags',
    ],
  },
  {
    id: 'CUSTOMER-SOP' as StandardPreset,
    name: 'Custom Customer SOP & Enterprise Rules',
    title: 'Proprietary OEM Internal Standard Operating Procedures',
    scope: 'Spandsons Horizon Engineering Internal Guidelines',
    rulesCount: 42,
    keyChecks: [
      'Internal Part Number cross-referencing with ERP system',
      'Color code override: Net L4 permitted as BLU or BLK with note',
      'Splice sleeve labeling on outer protective conduit allowed',
      'Plant-specific safety lock-out tag-out (LOTO) symbols',
    ],
  },
];

export const StandardsView: React.FC<StandardsViewProps> = ({
  activeStandard,
  onSelectActiveStandard,
}) => {
  const [customRuleText, setCustomRuleText] = useState('');
  const [customRules, setCustomRules] = useState<string[]>([
    'Enforce 100% crimp height verification notes on all 16 AWG feeds',
    'Allow pre-approved heat-shrink labels for prototype builds',
  ]);

  const handleAddRule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customRuleText.trim()) return;
    setCustomRules([...customRules, customRuleText.trim()]);
    setCustomRuleText('');
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto py-2">
      <div>
        <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-cyan-400" />
          Industry Standards Presets & QC Rule Engine
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          Select or configure the quality standard against which your wiring diagrams will be analyzed.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {STANDARDS_INFO.map((std) => {
          const isActive = activeStandard === std.id;

          return (
            <div
              key={std.id}
              className={`p-5 rounded-xl border transition-all ${
                isActive
                  ? 'bg-slate-900 border-cyan-500 shadow-lg shadow-cyan-950/40 ring-1 ring-cyan-500/50'
                  : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <span className="font-mono text-xs font-bold text-cyan-400 uppercase tracking-wider">
                    {std.id}
                  </span>
                  <h3 className="text-base font-bold text-slate-100 mt-0.5">{std.name}</h3>
                  <p className="text-xs text-slate-400 mt-0.5">{std.title}</p>
                </div>
                {isActive && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500 text-slate-950 flex items-center gap-1">
                    <Check className="w-3 h-3" /> ACTIVE
                  </span>
                )}
              </div>

              <div className="mt-3 pt-3 border-t border-slate-800 text-xs">
                <span className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider block mb-1.5">
                  Standard Specifications ({std.rulesCount} catalog checks)
                </span>
                <ul className="space-y-1.5 text-slate-300">
                  {std.keyChecks.map((check, i) => (
                    <li key={i} className="flex items-start gap-1.5">
                      <span className="text-cyan-400 shrink-0">•</span>
                      <span>{check}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between">
                <span className="text-[11px] text-slate-500">Domain: {std.scope}</span>
                {!isActive ? (
                  <button
                    onClick={() => onSelectActiveStandard(std.id)}
                    className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-white transition border border-slate-700"
                  >
                    Set as Active
                  </button>
                ) : (
                  <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-4 h-4" /> Selected for Inspection
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Custom SOP Builder Section */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-6 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Sliders className="w-5 h-5 text-amber-400" />
            <h3 className="text-base font-semibold text-slate-100">
              Customer Proprietary SOP Rules Extension
            </h3>
          </div>
          <span className="text-xs text-slate-400">
            {customRules.length} Custom rules active
          </span>
        </div>

        <p className="text-xs text-slate-400 mb-4">
          Add company-specific engineering rules, customer deviations, or drawing conventions. The AI model incorporates these guidelines into its inspection prompt.
        </p>

        <div className="space-y-2 mb-4">
          {customRules.map((rule, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-300"
            >
              <div className="flex items-center gap-2">
                <span className="font-mono text-amber-400 font-bold">CR-{idx + 1}:</span>
                <span>{rule}</span>
              </div>
              <button
                onClick={() => setCustomRules(customRules.filter((_, i) => i !== idx))}
                className="text-slate-500 hover:text-rose-400 text-xs transition"
              >
                Remove
              </button>
            </div>
          ))}
        </div>

        <form onSubmit={handleAddRule} className="flex gap-2">
          <input
            type="text"
            value={customRuleText}
            onChange={(e) => setCustomRuleText(e.target.value)}
            placeholder="Type custom rule (e.g. Mandate 360-degree shielding band on all MIL-DTL-38999 connectors)..."
            className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-cyan-500"
          />
          <button
            type="submit"
            className="px-4 py-2 text-xs font-semibold rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white transition flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" /> Add Rule
          </button>
        </form>
      </div>
    </div>
  );
};
