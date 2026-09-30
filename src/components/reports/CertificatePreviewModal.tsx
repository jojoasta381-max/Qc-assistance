'use client';

import React, { useState } from 'react';
import { QCReport } from '@/types/qc';
import { buildAuditCertificate } from '@/lib/reports/audit-report-generator';
import { exportQCReportToExcel, exportQCReportToPrintablePDF, fallbackExportToCSV } from '@/lib/export-utils';
import {
  X,
  Printer,
  FileSpreadsheet,
  Download,
  Copy,
  Check,
  Award,
  Lock,
} from 'lucide-react';

interface CertificatePreviewModalProps {
  report: QCReport | null;
  isOpen: boolean;
  onClose: () => void;
}

export const CertificatePreviewModal: React.FC<CertificatePreviewModalProps> = ({
  report,
  isOpen,
  onClose,
}) => {
  const [copiedChecksum, setCopiedChecksum] = useState(false);

  if (!isOpen || !report) return null;

  const cert = buildAuditCertificate(report);
  const isPass = report.overallResult === 'PASS';

  const handleCopyChecksum = () => {
    navigator.clipboard.writeText(cert.sha256Fingerprint);
    setCopiedChecksum(true);
    setTimeout(() => setCopiedChecksum(false), 2000);
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-[#0A1120] border border-sky-500/30 rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden text-slate-100 flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Modal Header */}
        <div className="bg-[#0E172C] px-6 py-4 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Award className="w-5 h-5 text-amber-400" />
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                Engineering Quality Review Report
                <span className="text-[10px] px-2 py-0.5 rounded bg-sky-500/10 text-sky-400 font-mono font-bold border border-sky-500/20">
                  {cert.certificateId}
                </span>
              </h3>
              <p className="text-[11px] text-slate-400">
                Evidence-backed inspection findings with verifiable SHA-256 integrity hash.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => exportQCReportToPrintablePDF(report)}
              className="px-3 py-1.5 rounded-lg bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 border border-sky-500/20 text-xs font-mono font-bold transition flex items-center gap-1.5"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print / PDF</span>
            </button>

            <button
              onClick={() => exportQCReportToExcel(report)}
              className="px-3 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 text-xs font-mono font-bold transition flex items-center gap-1.5"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>5-Sheet Excel</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Certificate Body (Executive Paper Aesthetic inside Dark Shell) */}
        <div className="p-6 sm:p-8 overflow-y-auto space-y-6">
          <div className="p-8 rounded-2xl bg-white/[0.02] border border-white/10 relative overflow-hidden space-y-6">
            {/* Top Certificate Header */}
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-6 border-b border-white/10">
              <div>
                <span className="text-[10px] font-mono tracking-widest text-sky-400 font-bold uppercase block">
                  {cert.organization}
                </span>
                <h2 className="text-xl font-black text-white tracking-tight mt-1">
                  ENGINEERING QUALITY REVIEW REPORT
                </h2>
                <div className="text-xs text-slate-400 font-mono mt-1">
                  Governing Standard: <span className="text-slate-200 font-bold">{report.standard}</span>
                </div>
              </div>

              <div className="text-left sm:text-right">
                <span
                  className={`inline-block px-4 py-1.5 rounded-xl text-xs font-mono font-black uppercase tracking-wider ${
                    isPass
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                      : 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                  }`}
                >
                  DISPOSITION: {isPass ? 'QC REVIEW: PASS' : 'QC REVIEW: ACTION REQ.'}
                </span>
                <div className="text-[10px] font-mono text-slate-400 mt-1">
                  Report ID: {report.id}
                </div>
              </div>
            </div>

            {/* Document Metadata Table */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
              <div className="p-3 rounded-xl bg-black/40 border border-white/5 space-y-1">
                <span className="text-slate-500 text-[10px] block">Drawing Document</span>
                <span className="text-white font-bold truncate block">{report.diagramName}</span>
              </div>
              <div className="p-3 rounded-xl bg-black/40 border border-white/5 space-y-1">
                <span className="text-slate-500 text-[10px] block">Quality Health Score</span>
                <span className={`text-base font-bold ${isPass ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {report.qualityScore} / 100
                </span>
              </div>
              <div className="p-3 rounded-xl bg-black/40 border border-white/5 space-y-1">
                <span className="text-slate-500 text-[10px] block">Checks Executed</span>
                <span className="text-white font-bold">{report.summary.executed} Rules</span>
              </div>
              <div className="p-3 rounded-xl bg-black/40 border border-white/5 space-y-1">
                <span className="text-slate-500 text-[10px] block">Non-Conformances</span>
                <span className={`font-bold ${report.summary.failed > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                  {report.summary.failed} Detected
                </span>
              </div>
            </div>

            {/* Discrepancy Breakdown Table */}
            <div className="space-y-2">
              <h4 className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider">
                Non-Conformance &amp; Discrepancy Register ({report.discrepancies.length})
              </h4>
              <div className="rounded-xl border border-white/10 overflow-hidden">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="bg-black/40 text-slate-400 text-[10px] uppercase">
                    <tr>
                      <th className="py-2.5 px-3">Item #</th>
                      <th className="py-2.5 px-3">Severity</th>
                      <th className="py-2.5 px-3">Clause</th>
                      <th className="py-2.5 px-3">Component</th>
                      <th className="py-2.5 px-3">Violation Title</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-slate-300">
                    {report.discrepancies.length > 0 ? (
                      report.discrepancies.map((d, idx) => (
                        <tr key={d.id} className="hover:bg-white/[0.02]">
                          <td className="py-2 px-3 text-sky-400">{idx + 1}. {d.id}</td>
                          <td className="py-2 px-3">
                            <span
                              className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                d.severity === 'CRITICAL'
                                  ? 'bg-rose-500/20 text-rose-400'
                                  : d.severity === 'MAJOR'
                                  ? 'bg-amber-500/20 text-amber-400'
                                  : 'bg-slate-500/20 text-slate-400'
                              }`}
                            >
                              {d.severity}
                            </span>
                          </td>
                          <td className="py-2 px-3 text-slate-400 text-[11px]">{d.standardRef}</td>
                          <td className="py-2 px-3 text-slate-300 text-[11px] truncate max-w-[140px]">{d.componentRef}</td>
                          <td className="py-2 px-3 font-sans text-white text-[11px] truncate max-w-[220px]">{d.title}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="py-4 text-center text-emerald-400 font-bold">
                          Zero discrepancies found. Full compliance verified.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Cryptographic SHA-256 Seal Box */}
            <div className="p-3.5 rounded-xl bg-black/60 border border-white/10 space-y-1.5 font-mono text-[11px]">
              <div className="flex items-center justify-between">
                <span className="text-slate-400 font-bold flex items-center gap-1.5 text-xs">
                  <Lock className="w-3.5 h-3.5 text-sky-400" />
                  AS9100 / ISO 9001 Cryptographic Hash Verification
                </span>
                <button
                  onClick={handleCopyChecksum}
                  className="text-xs text-sky-400 hover:text-white flex items-center gap-1"
                >
                  {copiedChecksum ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-400" /> Copied
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" /> Copy SHA-256
                    </>
                  )}
                </button>
              </div>
              <p className="text-slate-400 text-[10px] break-all leading-relaxed">
                {cert.sha256Fingerprint}
              </p>
            </div>

            {/* Digital Sign-off Signatures */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4 border-t border-white/10 text-xs font-mono">
              <div className="space-y-1">
                <div className="h-10 flex items-end">
                  <span className="text-sky-400 font-semibold">{cert.leadAuditor}</span>
                </div>
                <div className="border-t border-white/20 pt-1 text-[11px]">
                  <strong>Lead Quality Reviewer:</strong> {cert.leadAuditor}
                  <span className="block text-[10px] text-slate-500">Automated Inspection &amp; Review Completed</span>
                </div>
              </div>
              <div className="space-y-1">
                <div className="h-10 flex items-end">
                  <span className="text-emerald-400 font-semibold">{cert.approverAuthority}</span>
                </div>
                <div className="border-t border-white/20 pt-1 text-[11px]">
                  <strong>Verification Authority:</strong> {cert.approverAuthority}
                  <span className="block text-[10px] text-slate-500">Decision Recorded: {new Date(report.timestamp).toLocaleDateString()}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Actions Footer */}
        <div className="bg-[#0E172C] px-6 py-4 border-t border-white/10 flex flex-wrap items-center justify-between gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-mono transition"
          >
            Close Preview
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={() => fallbackExportToCSV(report)}
              className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 text-xs font-mono transition flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5 text-slate-400" />
              <span>Download CSV</span>
            </button>
            <button
              onClick={() => exportQCReportToExcel(report)}
              className="px-3.5 py-2 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-xs font-mono font-bold transition flex items-center gap-1.5"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
              <span>Download 5-Sheet Excel</span>
            </button>
            <button
              onClick={() => exportQCReportToPrintablePDF(report)}
              className="btn-primary px-4 py-2 text-xs font-mono font-bold flex items-center gap-1.5 shadow-lg"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Official PDF</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
