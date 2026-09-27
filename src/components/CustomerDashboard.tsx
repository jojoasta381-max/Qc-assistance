'use client';

import React from 'react';
import { AuditRecord, QCReport } from '@/types/qc';
import { SAMPLE_DIAGRAMS } from '@/data/samples';
import { exportQCReportToExcel, exportQCReportToPrintablePDF } from '@/lib/export-utils';
import {
  FileText,
  FileSpreadsheet,
  CheckCircle2,
  XCircle,
  PlusCircle,
  ArrowUpRight,
  TrendingUp,
  Sliders,
  History,
  Shield,
  Download,
  Building2,
  Zap,
} from 'lucide-react';

interface CustomerDashboardProps {
  user: { name: string; email: string; phone?: string; role: string; plan: string; tenantName?: string };
  quotaUsed: number;
  quotaLimit: number;
  history: AuditRecord[];
  onStartNewInspection: () => void;
  onOpenReport: (diagramCode: string) => void;
  onOpenStandards: () => void;
  onOpenPricing: () => void;
  onOpenEditor?: () => void;
}

export const CustomerDashboard: React.FC<CustomerDashboardProps> = ({
  user,
  quotaUsed,
  quotaLimit,
  history,
  onStartNewInspection,
  onOpenReport,
  onOpenStandards,
  onOpenPricing,
  onOpenEditor,
}) => {
  const percentUsed = Math.min(Math.round((quotaUsed / quotaLimit) * 100), 100);

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Welcome Banner & Quota Meter (Hostinger Dark Violet Gradient) */}
      <div className="bg-gradient-to-r from-[#2F1C6A] via-[#3B2082] to-[#1D1042] border border-purple-500/30 text-white rounded-3xl p-8 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#673DE6]/20 rounded-full blur-3xl pointer-events-none -z-0" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-purple-300 text-xs font-bold uppercase tracking-wider mb-2 border border-white/15">
              <Building2 className="w-3.5 h-3.5 text-teal-400" />
              {user.tenantName || 'Spandsons Horizon Engineering Pvt. Ltd.'}
            </div>
            <h2 className="text-3xl md:text-4xl font-black text-white">
              Welcome back, {user.name}
            </h2>
            <p className="text-xs md:text-sm text-purple-200/80 mt-1">
              Account: {user.email} • {user.role} • Plan: <span className="text-teal-300 font-bold">{user.plan}</span>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={onStartNewInspection}
              className="btn-hostinger-primary px-6 py-3 text-xs font-extrabold flex items-center gap-2 shadow-xl"
            >
              <PlusCircle className="w-4 h-4" /> New Wiring QC Check
            </button>
            {onOpenEditor && (
              <button
                onClick={onOpenEditor}
                className="px-5 py-3 rounded-full bg-white/10 hover:bg-white/20 text-white font-bold text-xs uppercase tracking-wider transition border border-white/20"
              >
                Launch Editor
              </button>
            )}
            <button
              onClick={onOpenPricing}
              className="px-5 py-3 rounded-full bg-white/10 hover:bg-white/20 text-white font-bold text-xs uppercase tracking-wider transition border border-white/20"
            >
              Manage Quota
            </button>
          </div>
        </div>

        {/* Quota Usage Bar inside Banner */}
        <div className="mt-8 pt-6 border-t border-purple-500/20 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-purple-200">
              Monthly Check Quota: <strong className="text-white font-mono">{quotaUsed}</strong> of {quotaLimit} Used
            </span>
            <span className="text-teal-300 font-mono font-bold">{quotaLimit - quotaUsed} Checks Remaining</span>
          </div>
          <div className="w-full h-3 bg-[#140C2E]/80 rounded-full overflow-hidden p-0.5 border border-purple-500/30">
            <div
              className="h-full bg-gradient-to-r from-[#673DE6] to-[#06B6D4] rounded-full transition-all duration-500"
              style={{ width: `${percentUsed}%` }}
            />
          </div>
        </div>
      </div>

      {/* Overview Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-[#1A0E3B]/80 backdrop-blur-xl p-6 rounded-3xl border border-purple-500/25 shadow-xl">
          <span className="text-xs font-bold text-purple-300 uppercase tracking-wider">Checks Performed</span>
          <div className="text-3xl font-black text-white mt-1 font-mono">{history.length}</div>
          <span className="text-[11px] text-teal-400 font-semibold">↑ Saved to Audit Trail</span>
        </div>

        <div className="bg-[#1A0E3B]/80 backdrop-blur-xl p-6 rounded-3xl border border-purple-500/25 shadow-xl">
          <span className="text-xs font-bold text-purple-300 uppercase tracking-wider">Average Latency</span>
          <div className="text-3xl font-black text-white mt-1 font-mono">1.4s</div>
          <span className="text-[11px] text-purple-300/70">vs 4h manual review</span>
        </div>

        <div className="bg-[#1A0E3B]/80 backdrop-blur-xl p-6 rounded-3xl border border-purple-500/25 shadow-xl">
          <span className="text-xs font-bold text-purple-300 uppercase tracking-wider">Discrepancy Accuracy</span>
          <div className="text-3xl font-black text-emerald-400 mt-1 font-mono">98.4%</div>
          <span className="text-[11px] text-emerald-400/80">Zero critical misses</span>
        </div>

        <div className="bg-[#1A0E3B]/80 backdrop-blur-xl p-6 rounded-3xl border border-purple-500/25 shadow-xl">
          <span className="text-xs font-bold text-purple-300 uppercase tracking-wider">Active Standard</span>
          <div className="text-2xl font-black text-teal-300 mt-1 font-mono">IPC-620</div>
          <span className="text-[11px] text-purple-300/70">Class 3 High-Reliability</span>
        </div>
      </div>

      {/* Account History / Audit Trail Table */}
      <div className="bg-[#1A0E3B]/85 backdrop-blur-xl rounded-3xl border border-purple-500/25 overflow-hidden shadow-2xl">
        <div className="p-6 border-b border-purple-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-xl font-black text-white">
              Audit Trail & QC Inspection History
            </h3>
            <p className="text-xs text-purple-200/70">
              All wiring diagram manuals previously analyzed and verified for manufacturing compliance.
            </p>
          </div>

          <button
            onClick={onStartNewInspection}
            className="px-4 py-2 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 text-purple-200 border border-purple-500/30 text-xs font-bold transition flex items-center gap-1.5 self-start sm:self-auto"
          >
            <PlusCircle className="w-3.5 h-3.5" /> Run Another Check
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#241355]/90 border-b border-purple-500/30 text-purple-200 font-bold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3.5 px-6">Audit ID</th>
                <th className="py-3.5 px-4">Wiring Diagram</th>
                <th className="py-3.5 px-4">Standard</th>
                <th className="py-3.5 px-4">Timestamp</th>
                <th className="py-3.5 px-4">Result</th>
                <th className="py-3.5 px-4 text-center">Score</th>
                <th className="py-3.5 px-4 text-center">Discrepancies</th>
                <th className="py-3.5 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-purple-500/15 text-purple-100">
              {history.map((record) => (
                <tr
                  key={record.id}
                  onClick={() => onOpenReport(record.diagramName)}
                  className="hover:bg-white/5 cursor-pointer transition"
                >
                  <td className="py-4 px-6 font-mono font-bold text-teal-300">
                    {record.id}
                  </td>
                  <td className="py-4 px-4 font-semibold text-white">
                    {record.diagramName}
                  </td>
                  <td className="py-4 px-4 font-mono text-[11px] text-purple-300">
                    {record.standard}
                  </td>
                  <td className="py-4 px-4 text-purple-300/80 font-mono text-[11px]">
                    {record.timestamp}
                  </td>
                  <td className="py-4 px-4">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                        record.overallResult === 'PASS'
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                      }`}
                    >
                      {record.overallResult}
                    </span>
                  </td>
                  <td className="py-4 px-4 text-center font-mono font-black text-white">
                    {record.qualityScore}%
                  </td>
                  <td className="py-4 px-4 text-center font-mono font-bold text-rose-400">
                    {record.discrepanciesCount}
                  </td>
                  <td className="py-4 px-6 text-right">
                    <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => {
                          const sample = SAMPLE_DIAGRAMS.find(
                            (s) => record.diagramName.includes(s.code) || s.name.includes(record.diagramName)
                          );
                          if (sample) exportQCReportToPrintablePDF(sample.sampleReport);
                        }}
                        className="p-1.5 rounded-lg text-purple-300 hover:text-white hover:bg-white/10 transition"
                        title="Download PDF Certificate"
                      >
                        <FileText className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          const sample = SAMPLE_DIAGRAMS.find(
                            (s) => record.diagramName.includes(s.code) || s.name.includes(record.diagramName)
                          );
                          if (sample) exportQCReportToExcel(sample.sampleReport);
                        }}
                        className="p-1.5 rounded-lg text-purple-300 hover:text-white hover:bg-white/10 transition"
                        title="Download Excel XLSX Report"
                      >
                        <FileSpreadsheet className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onOpenReport(record.diagramName)}
                        className="p-1.5 rounded-lg text-teal-400 hover:text-teal-300 hover:bg-white/10 transition"
                        title="Open Interactive View"
                      >
                        <ArrowUpRight className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
