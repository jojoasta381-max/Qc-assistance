'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { SAMPLE_DIAGRAMS, INITIAL_AUDIT_HISTORY } from '@/data/samples';
import { exportQCReportToExcel, exportQCReportToPrintablePDF } from '@/lib/export-utils';
import {
  FileCheck2,
  TrendingUp,
  AlertTriangle,
  Clock,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  FileSpreadsheet,
  Layers,
  Sparkles,
  Download,
  Plus,
  Zap,
} from 'lucide-react';

export default function AppOverviewPage() {
  const router = useRouter();
  const { user, tenant } = useAuth();
  const [history] = useState(INITIAL_AUDIT_HISTORY);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleDownloadExcel = (diagramCode: string) => {
    const found = SAMPLE_DIAGRAMS.find((s) => diagramCode.includes(s.code) || s.name.includes(diagramCode));
    if (found) {
      exportQCReportToExcel(found.sampleReport);
      showToast(`Exported 5-Sheet Excel for ${found.name}`);
    }
  };

  const handleDownloadPDF = (diagramCode: string) => {
    const found = SAMPLE_DIAGRAMS.find((s) => diagramCode.includes(s.code) || s.name.includes(diagramCode));
    if (found) {
      exportQCReportToPrintablePDF(found.sampleReport);
      showToast(`Generated PDF Certificate for ${found.name}`);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#0A1120] border border-sky-500/40 text-white px-5 py-3 rounded-xl shadow-2xl text-xs font-bold flex items-center gap-2.5 animate-in fade-in">
          <Sparkles className="w-4 h-4 text-sky-400" />
          {toastMessage}
        </div>
      )}

      {/* Welcome Banner */}
      <div className="p-6 sm:p-8 rounded-2xl bg-gradient-to-r from-[#0A1120] via-[#0E172C] to-[#0A1120] border border-white/10 shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-white/[0.06] border border-white/10 text-emerald-400 text-xs font-mono font-bold">
            <ShieldCheck className="w-3.5 h-3.5" />
            OPERATIONAL QUALITY CENTER
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Welcome back, {user?.name || 'Lead Inspector'}
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 max-w-xl leading-relaxed">
            Active Organization: <strong className="text-white">{tenant?.name || 'Spandsons Horizon Engineering'}</strong> &bull; Plan:{' '}
            <span className="text-sky-400 font-mono font-bold">{tenant?.plan || 'MID_5'}</span>. Over 400+ algorithmic compliance checks active.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <Link
            href="/app/inspections"
            className="btn-primary px-5 py-2.5 text-xs font-bold flex items-center gap-2 shadow-lg"
          >
            <Plus className="w-4 h-4" />
            <span>Upload Diagram</span>
          </Link>
          <Link
            href="/app/editor"
            className="px-4 py-2.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-mono font-bold transition flex items-center gap-1.5"
          >
            <Layers className="w-3.5 h-3.5 text-sky-400" />
            <span>Open CAD Editor</span>
          </Link>
        </div>
      </div>

      {/* 4 Quality KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1 */}
        <div className="p-5 rounded-2xl bg-[#0A1120] border border-white/10 space-y-3">
          <div className="flex items-center justify-between text-xs font-mono text-slate-400">
            <span>Total Audited</span>
            <FileCheck2 className="w-4 h-4 text-sky-400" />
          </div>
          <div className="text-3xl font-extrabold font-mono text-white">142</div>
          <div className="text-[11px] text-emerald-400 font-mono flex items-center gap-1">
            <TrendingUp className="w-3 h-3" /> +18 drawings this week
          </div>
        </div>

        {/* KPI 2 */}
        <div className="p-5 rounded-2xl bg-[#0A1120] border border-white/10 space-y-3">
          <div className="flex items-center justify-between text-xs font-mono text-slate-400">
            <span>First-Pass Yield</span>
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-3xl font-extrabold font-mono text-emerald-400">94.8%</div>
          <div className="text-[11px] text-slate-400 font-mono">
            Target: 95.0% threshold
          </div>
        </div>

        {/* KPI 3 */}
        <div className="p-5 rounded-2xl bg-[#0A1120] border border-white/10 space-y-3">
          <div className="flex items-center justify-between text-xs font-mono text-slate-400">
            <span>Critical Defect Prevention</span>
            <AlertTriangle className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-3xl font-extrabold font-mono text-rose-400">24</div>
          <div className="text-[11px] text-slate-400 font-mono">
            ~$76,800 rework saved
          </div>
        </div>

        {/* KPI 4 */}
        <div className="p-5 rounded-2xl bg-[#0A1120] border border-white/10 space-y-3">
          <div className="flex items-center justify-between text-xs font-mono text-slate-400">
            <span>Avg Audit Latency</span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-3xl font-extrabold font-mono text-white">42s</div>
          <div className="text-[11px] text-emerald-400 font-mono">
            92% faster than manual
          </div>
        </div>
      </div>

      {/* Quick Launch Sample Inspection Cards */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-white">Test Pre-Loaded Engineering Schematics</h2>
            <p className="text-xs text-slate-400">
              Instantly run full deterministic audits on industry reference drawings.
            </p>
          </div>
          <Link
            href="/app/inspections"
            className="text-xs font-mono text-sky-400 hover:text-sky-300 font-bold"
          >
            Upload Custom PDF &rarr;
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {SAMPLE_DIAGRAMS.map((sample) => (
            <div
              key={sample.code}
              className="p-5 rounded-2xl bg-[#0A1120] border border-white/10 hover:border-sky-500/40 transition flex flex-col justify-between space-y-4"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-sky-500/10 text-sky-400 border border-sky-500/20">
                    {sample.standard}
                  </span>
                  <span className="text-[10px] font-mono text-slate-500">
                    {sample.category}
                  </span>
                </div>
                <h3 className="text-sm font-bold text-white">{sample.name}</h3>
                <p className="text-xs text-slate-400 line-clamp-2">
                  {sample.description}
                </p>
              </div>

              <div className="pt-3 border-t border-white/5 flex items-center justify-between">
                <span className="text-xs font-mono text-slate-400">
                  {sample.sampleReport.discrepancies.length} Discrepancies
                </span>
                <Link
                  href="/app/inspections"
                  className="px-3 py-1.5 rounded-lg bg-[#0284C7] hover:bg-sky-500 text-white font-mono text-xs font-bold transition flex items-center gap-1"
                >
                  <span>Inspect</span>
                  <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Recent Inspection Records Table */}
      <section className="p-6 rounded-2xl bg-[#0A1120] border border-white/10 shadow-xl space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-white/5">
          <div>
            <h2 className="text-base font-bold text-white">Recent Compliance Audit Records</h2>
            <p className="text-xs text-slate-400">
              Verified non-destructive inspections with SHA-256 certificate hashes.
            </p>
          </div>
          <Link
            href="/app/reports"
            className="text-xs font-mono text-sky-400 hover:text-sky-300 font-bold"
          >
            View All Reports &rarr;
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-white/10 text-slate-400 font-mono">
                <th className="py-2.5 px-3">Audit ID</th>
                <th className="py-2.5 px-3">Schematic Drawing</th>
                <th className="py-2.5 px-3">Standard</th>
                <th className="py-2.5 px-3 text-center">Score</th>
                <th className="py-2.5 px-3 text-center">Result</th>
                <th className="py-2.5 px-3 text-center">Flaws</th>
                <th className="py-2.5 px-3">Inspector</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 font-mono text-slate-300">
              {history.map((record) => (
                <tr key={record.id} className="hover:bg-white/[0.02] transition">
                  <td className="py-3 px-3 text-sky-400 font-bold">{record.id}</td>
                  <td className="py-3 px-3 font-sans font-medium text-white max-w-[200px] truncate">
                    {record.diagramName}
                  </td>
                  <td className="py-3 px-3 text-slate-400">{record.standard}</td>
                  <td className="py-3 px-3 text-center font-bold text-white">
                    {record.qualityScore}/100
                  </td>
                  <td className="py-3 px-3 text-center">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        record.overallResult === 'PASS'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                      }`}
                    >
                      {record.overallResult}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-center text-amber-400">
                    {record.discrepanciesCount}
                  </td>
                  <td className="py-3 px-3 text-slate-400 font-sans">{record.operator}</td>
                  <td className="py-3 px-3 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => handleDownloadPDF(record.diagramName)}
                        title="Download Signed PDF Certificate"
                        className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDownloadExcel(record.diagramName)}
                        title="Export 5-Sheet Excel (XLSX)"
                        className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-emerald-400 transition"
                      >
                        <FileSpreadsheet className="w-3.5 h-3.5" />
                      </button>
                      <Link
                        href="/app/inspections"
                        className="px-2.5 py-1 rounded-lg bg-[#0284C7] hover:bg-sky-500 text-white text-[11px] font-bold transition"
                      >
                        Inspect
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
