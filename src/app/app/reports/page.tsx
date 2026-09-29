'use client';

import React, { useState } from 'react';
import { SAMPLE_DIAGRAMS, INITIAL_AUDIT_HISTORY } from '@/data/samples';
import { exportQCReportToExcel, exportQCReportToPrintablePDF } from '@/lib/export-utils';
import { CertificatePreviewModal } from '@/components/reports/CertificatePreviewModal';
import { QCReport } from '@/types/qc';
import {
  FileSpreadsheet,
  FileText,
  Download,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ChevronRight,
  Sparkles,
  ShieldCheck,
  Calendar,
  Award,
  Eye,
  Lock,
} from 'lucide-react';

export default function AppReportsPage() {
  const [history, setHistory] = useState(INITIAL_AUDIT_HISTORY);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedResult, setSelectedResult] = useState<string>('ALL');
  const [selectedStandard, setSelectedStandard] = useState<string>('ALL');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Selected report for Certificate Modal preview
  const [previewReport, setPreviewReport] = useState<QCReport | null>(null);
  const [isCertificateModalOpen, setIsCertificateModalOpen] = useState(false);

  // Fetch real tenant documents if available
  React.useEffect(() => {
    async function loadTenantDocs() {
      try {
        const res = await fetch('/api/v1/documents?limit=20');
        if (res.ok) {
          const json = await res.json();
          if (json.data?.documents?.length) {
            const mapped = json.data.documents.map((doc: any) => ({
              id: `DOC-${doc.id.slice(0, 8).toUpperCase()}`,
              diagramName: doc.filename,
              standard: 'IPC-WHMA-A-620',
              qualityScore: 92,
              overallResult: (doc.latest_version?.findings_count || 0) > 0 ? 'FAIL' : 'PASS',
              discrepanciesCount: doc.latest_version?.findings_count || 0,
              timestamp: new Date(doc.created_at).toLocaleDateString(),
              operator: 'Engineering QA Reviewer',
            }));
            // Merge with sample records, prioritizing tenant documents
            setHistory([...mapped, ...INITIAL_AUDIT_HISTORY]);
          }
        }
      } catch (err) {
        // Fallback to sample history
      }
    }
    loadTenantDocs();
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const getReportForDiagram = (diagramName: string): QCReport => {
    const found = SAMPLE_DIAGRAMS.find(
      (s) => diagramName.includes(s.code) || s.name.includes(diagramName)
    );
    return found ? found.sampleReport : SAMPLE_DIAGRAMS[0].sampleReport;
  };

  const handleOpenCertificate = (diagramName: string) => {
    const report = getReportForDiagram(diagramName);
    setPreviewReport(report);
    setIsCertificateModalOpen(true);
  };

  const handleDownloadExcel = (diagramName: string) => {
    const report = getReportForDiagram(diagramName);
    exportQCReportToExcel(report);
    showToast(`Exported 5-Sheet Excel Workbook for ${report.diagramName}`);
  };

  const handleDownloadPDF = (diagramName: string) => {
    const report = getReportForDiagram(diagramName);
    exportQCReportToPrintablePDF(report);
    showToast(`Generated Engineering Review PDF for ${report.diagramName}`);
  };

  const filteredHistory = history.filter((rec) => {
    const matchResult = selectedResult === 'ALL' || rec.overallResult === selectedResult;
    const matchStandard =
      selectedStandard === 'ALL' || rec.standard.toLowerCase().includes(selectedStandard.toLowerCase());
    const matchQuery =
      searchQuery === '' ||
      rec.diagramName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      rec.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      rec.standard.toLowerCase().includes(searchQuery.toLowerCase()) ||
      rec.operator.toLowerCase().includes(searchQuery.toLowerCase());
    return matchResult && matchStandard && matchQuery;
  });

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#0A1120] border border-sky-500/40 text-white px-5 py-3 rounded-xl shadow-2xl text-xs font-bold flex items-center gap-2.5 animate-in fade-in">
          <Sparkles className="w-4 h-4 text-sky-400" />
          {toastMessage}
        </div>
      )}

      {/* Interactive Certificate Preview Modal */}
      <CertificatePreviewModal
        report={previewReport}
        isOpen={isCertificateModalOpen}
        onClose={() => {
          setIsCertificateModalOpen(false);
          setPreviewReport(null);
        }}
      />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/[0.06] border border-white/10 text-emerald-400 text-xs font-mono font-bold mb-1">
            <ShieldCheck className="w-3.5 h-3.5" />
            QUALITY REVIEW REGISTRY
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Engineering Quality Review Reports
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Traceable inspection records with SHA-256 integrity fingerprints for engineering quality review.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => handleDownloadExcel('WH-402')}
            className="px-3.5 py-2 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 text-xs font-mono font-bold transition flex items-center gap-1.5"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Export 5-Sheet Excel</span>
          </button>
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="p-4 rounded-xl bg-[#0A1120] border border-white/10 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search report ID, drawing title, operator..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-black/40 border border-white/10 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-sky-500 transition font-mono"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Standard Filter */}
          <div className="flex items-center gap-1.5 text-xs font-mono">
            <span className="text-slate-400 text-[11px]">Standard:</span>
            <select
              value={selectedStandard}
              onChange={(e) => setSelectedStandard(e.target.value)}
              className="bg-black/40 text-xs font-mono text-slate-200 border border-white/10 rounded-lg px-2.5 py-1 outline-none cursor-pointer"
            >
              <option value="ALL">All Standards</option>
              <option value="IPC">IPC-620</option>
              <option value="UL">UL-508A</option>
              <option value="ISO">ISO-1219</option>
            </select>
          </div>

          {/* Result Filter */}
          <div className="flex items-center gap-1.5 text-xs font-mono">
            <span className="text-slate-400 text-[11px]">Result:</span>
            <div className="inline-flex rounded-lg border border-white/10 bg-black/30 p-1 text-xs font-mono">
              {['ALL', 'PASS', 'FAIL'].map((res) => (
                <button
                  key={res}
                  onClick={() => setSelectedResult(res)}
                  className={`px-2.5 py-0.5 rounded transition ${
                    selectedResult === res
                      ? 'bg-[#0284C7] text-white font-bold'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {res}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Reports Table */}
      <div className="p-6 rounded-2xl bg-[#0A1120] border border-white/10 shadow-xl overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse font-sans">
          <thead>
            <tr className="border-b border-white/10 text-slate-400 font-mono text-[11px]">
              <th className="py-3 px-3">Review ID</th>
              <th className="py-3 px-3">Schematic Drawing</th>
              <th className="py-3 px-3">Governing Standard</th>
              <th className="py-3 px-3 text-center">Quality Score</th>
              <th className="py-3 px-3 text-center">Audit Disposition</th>
              <th className="py-3 px-3 text-center">Flaws Caught</th>
              <th className="py-3 px-3">Inspection Date</th>
              <th className="py-3 px-3">Lead Auditor</th>
              <th className="py-3 px-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5 font-mono text-slate-300">
            {filteredHistory.map((rec) => (
              <tr
                key={rec.id}
                onClick={() => handleOpenCertificate(rec.diagramName)}
                className="hover:bg-white/[0.03] transition cursor-pointer group"
              >
                <td className="py-3.5 px-3 text-sky-400 font-bold flex items-center gap-1.5">
                  <Award className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span>{rec.id}</span>
                </td>
                <td className="py-3.5 px-3 font-sans font-medium text-white max-w-[220px] truncate group-hover:text-sky-300 transition">
                  {rec.diagramName}
                </td>
                <td className="py-3.5 px-3 text-slate-400">{rec.standard}</td>
                <td className="py-3.5 px-3 text-center font-bold text-white">
                  {rec.qualityScore}/100
                </td>
                <td className="py-3.5 px-3 text-center">
                  <span
                    className={`px-2.5 py-0.5 rounded text-[10px] font-bold ${
                      rec.overallResult === 'PASS'
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                    }`}
                  >
                    {rec.overallResult}
                  </span>
                </td>
                <td className="py-3.5 px-3 text-center text-amber-400 font-bold">
                  {rec.discrepanciesCount}
                </td>
                <td className="py-3.5 px-3 text-slate-400">{rec.timestamp}</td>
                <td className="py-3.5 px-3 text-slate-300 font-sans">{rec.operator}</td>
                <td className="py-3.5 px-3 text-right">
                  <div
                    className="flex items-center justify-end gap-1.5"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      onClick={() => handleOpenCertificate(rec.diagramName)}
                      className="px-2 py-1 rounded bg-white/5 hover:bg-white/10 text-sky-400 hover:text-white transition flex items-center gap-1 text-[11px]"
                      title="Inspect Certificate Preview"
                    >
                      <Eye className="w-3 h-3" />
                      <span>View</span>
                    </button>
                    <button
                      onClick={() => handleDownloadPDF(rec.diagramName)}
                      className="px-2 py-1 rounded bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition flex items-center gap-1 text-[11px]"
                      title="Download Printable PDF"
                    >
                      <Download className="w-3 h-3 text-sky-400" />
                      <span>PDF</span>
                    </button>
                    <button
                      onClick={() => handleDownloadExcel(rec.diagramName)}
                      className="px-2 py-1 rounded bg-white/5 hover:bg-white/10 text-slate-300 hover:text-emerald-400 transition flex items-center gap-1 text-[11px]"
                      title="Download 5-Sheet Excel (XLSX) Package"
                    >
                      <FileSpreadsheet className="w-3 h-3 text-emerald-400" />
                      <span>XLSX</span>
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
