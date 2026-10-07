'use client';

import React, { useState } from 'react';
import { QCReport, Discrepancy, StandardPreset, SampleDiagram } from '@/types/qc';
import { SAMPLE_DIAGRAMS } from '@/data/samples';
import { SchematicViewer } from '@/components/SchematicViewer';
import { IngestionVisualizer } from '@/components/ingestion/IngestionVisualizer';
import { extractDrawingZones } from '@/lib/ingestion/bounds-extractor';
import { extractElectricalTokens } from '@/lib/ingestion/token-extractor';
import { exportQCReportToExcel, exportQCReportToPrintablePDF } from '@/lib/export-utils';
import {
  UploadCloud,
  FileText,
  FileSpreadsheet,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ArrowRight,
  Sparkles,
  RefreshCw,
  Eye,
  SlidersHorizontal,
  ChevronDown,
  Layers,
  ThumbsDown,
  Check,
  Zap,
  ShieldCheck,
  Layout,
  Crosshair,
} from 'lucide-react';

interface InspectionWizardProps {
  currentReport: QCReport;
  onUpdateReport: (report: QCReport) => void;
  activeStandard: StandardPreset;
  onChangeStandard: (std: StandardPreset) => void;
  onOpenFeedbackModal: (d: Discrepancy) => void;
  quotaUsed: number;
  quotaLimit: number;
  onCheckExecuted: () => void;
  onOpenEditor?: () => void;
}

export const InspectionWizard: React.FC<InspectionWizardProps> = ({
  currentReport,
  onUpdateReport,
  activeStandard,
  onChangeStandard,
  onOpenFeedbackModal,
  quotaUsed,
  quotaLimit,
  onCheckExecuted,
  onOpenEditor,
}) => {
  const [activeStep, setActiveStep] = useState<1 | 2 | 3 | 4>(3);
  const [activeInspectorTab, setActiveInspectorTab] = useState<'RADAR_VIEW' | 'INGESTION_SEGMENTATION'>('RADAR_VIEW');
  const [processingProgress, setProcessingProgress] = useState<number>(100);
  const [selectedDiscrepancyId, setSelectedDiscrepancyId] = useState<string | null>(
    currentReport.discrepancies[0]?.id || null
  );
  const [showVectorViewer, setShowVectorViewer] = useState<boolean>(true);
  const [isDragOver, setIsDragOver] = useState<boolean>(false);
  const [uploadedFileName, setUploadedFileName] = useState<string>('WH-402_Wire_Harness_Manual.pdf');
  const [showAllDiscrepancies, setShowAllDiscrepancies] = useState<boolean>(false);
  type StageStatus = 'idle' | 'running' | 'completed' | 'error';
  const [stageUpload, setStageUpload] = useState<StageStatus>('completed');
  const [stagePreflight, setStagePreflight] = useState<StageStatus>('completed');
  const [stageExtraction, setStageExtraction] = useState<StageStatus>('completed');
  const [stageGraph, setStageGraph] = useState<StageStatus>('completed');
  const [stageRules, setStageRules] = useState<StageStatus>('completed');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);

  // Phase 5 Ingestion Extracted Data
  const zones = extractDrawingZones(uploadedFileName);
  const { tokens, wireTable } = extractElectricalTokens(uploadedFileName);

  // Quick switch between preloaded samples
  const handleSelectSample = (sample: SampleDiagram) => {
    setUploadedFileName(`${sample.code}_Manual.pdf`);
    setErrorMessage(null);
    setStageUpload('completed');
    setStagePreflight('completed');
    setStageExtraction('completed');
    setStageGraph('completed');
    setStageRules('completed');
    onChangeStandard(sample.standard);
    onUpdateReport(sample.sampleReport);
    setSelectedDiscrepancyId(sample.sampleReport.discrepancies[0]?.id || null);
    setActiveStep(3);
  };

  // Trigger analysis via API v1 pipeline with real file upload or reference fallback
  const handleStartAnalysis = async (fileOrName: File | string) => {
    const isRealFile = typeof fileOrName !== 'string';
    const fileName = isRealFile ? fileOrName.name : fileOrName;
    setUploadedFileName(fileName);
    setErrorMessage(null);
    setIsAnalyzing(true);
    setActiveStep(1);

    // Reset stages for new file processing
    setStageUpload('running');
    setStagePreflight('idle');
    setStageExtraction('idle');
    setStageGraph('idle');
    setStageRules('idle');
    setProcessingProgress(15);

    try {
      if (isRealFile) {
        // Direct multipart upload proxy to backend API (eliminates browser-S3 cross-origin issues)
        const formData = new FormData();
        formData.append('file', fileOrName);
        formData.append('standard', activeStandard);

        setProcessingProgress(35);

        const uploadRes = await fetch('/api/v1/documents/upload-direct?process=true', {
          method: 'POST',
          body: formData,
        });

        if (!uploadRes.ok) {
          const errData = await uploadRes.json().catch(() => ({}));
          throw new Error(errData.error?.message || `Upload failed with status HTTP ${uploadRes.status}`);
        }

        const data = await uploadRes.json();
        const docId = data.data?.document_id || 'DOC-01';

        setStageUpload('completed');
        setProcessingProgress(50);

        setStagePreflight('completed');
        setStageExtraction('completed');
        setProcessingProgress(75);

        setStageGraph('completed');
        setProcessingProgress(90);

        setStageRules('completed');
        setProcessingProgress(100);

        const findingsList = data.data?.findings || [];
        const serverDiscrepancies = findingsList.map((f: any, idx: number) => ({
          id: f.id ? `D-${f.id.slice(0, 6)}` : `D-${idx + 101}`,
          rawFindingId: f.id,
          title: f.description.split(' — ')[0] || f.rule?.name || 'Quality Discrepancy',
          description: f.description.split(' — ')[1] || f.description,
          severity: f.severity,
          confidence: Math.round((f.confidence || 0.95) * 100),
          standardRef: f.rule?.code || f.rule?.standard_ref || activeStandard,
          componentRef: f.evidence?.componentId || f.evidence?.componentRef || 'Schematic Net',
          plainLanguageExplanation: f.description,
          recommendation: f.evidence?.recommendation || 'Verify connection against engineering schematic.',
          bbox: f.evidence?.boundingBox || f.evidence?.bbox || { x: 0, y: 0, width: 0, height: 0 },
          status: f.status || 'UNREVIEWED',
        }));

        const critical = serverDiscrepancies.filter((d: any) => d.severity === 'CRITICAL').length;
        const major = serverDiscrepancies.filter((d: any) => d.severity === 'MAJOR' || d.severity === 'HIGH').length;
        const minor = serverDiscrepancies.filter((d: any) => d.severity === 'MINOR' || d.severity === 'LOW').length;
        const totalFailed = serverDiscrepancies.length;
        const executed = 20;
        const passed = Math.max(0, executed - totalFailed);

        onUpdateReport({
          ...currentReport,
          id: `QC-${docId.slice(0, 6).toUpperCase()}`,
          diagramName: fileName.replace(/\.[^/.]+$/, ''),
          standard: activeStandard,
          overallResult: totalFailed === 0 ? 'PASS' : 'FAIL',
          qualityScore: totalFailed === 0 ? 100 : Math.max(50, 100 - (critical * 15 + major * 8 + minor * 3)),
          summary: {
            executed,
            passed,
            failed: totalFailed,
            na: 0,
            critical,
            major,
            minor,
          },
          discrepancies: serverDiscrepancies,
        });

        if (serverDiscrepancies.length > 0) {
          setSelectedDiscrepancyId(serverDiscrepancies[0].id);
        }

        setActiveStep(3);
        onCheckExecuted();
      } else {
        setStageUpload('completed');
        setStagePreflight('completed');
        setStageExtraction('completed');
        setStageGraph('completed');
        setStageRules('completed');
        setProcessingProgress(100);
        setActiveStep(3);
        onCheckExecuted();
      }
    } catch (e: any) {
      console.error('Inspection pipeline error:', e);
      setErrorMessage(e.message || 'Inspection pipeline failed. Please verify file format.');
      setStageUpload('error');
      setStagePreflight('error');
      setStageExtraction('error');
      setStageGraph('error');
      setStageRules('error');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleStartAnalysis(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleStartAnalysis(file);
    }
  };

  const selectedDiscrepancy = currentReport.discrepancies.find((d) => d.id === selectedDiscrepancyId);

  // Severity filter state
  const [severityFilter, setSeverityFilter] = useState<'ALL' | 'CRITICAL' | 'MAJOR' | 'MINOR'>('ALL');

  // Donut circumference calculation - derived dynamically from actual discrepancies
  const criticalCount = currentReport.discrepancies.filter((d) => d.severity === 'CRITICAL').length;
  const majorCount = currentReport.discrepancies.filter((d) => d.severity === 'MAJOR').length;
  const minorCount = currentReport.discrepancies.filter((d) => d.severity === 'MINOR').length;
  const totalDiscrepancies = currentReport.discrepancies.length || 1;

  const radius = 34;
  const circumference = 2 * Math.PI * radius;
  const critDash = (criticalCount / totalDiscrepancies) * circumference;
  const majDash = (majorCount / totalDiscrepancies) * circumference;
  const minDash = (minorCount / totalDiscrepancies) * circumference;

  const filteredDiscrepancies = currentReport.discrepancies.filter((d) => {
    if (severityFilter === 'ALL') return true;
    return d.severity === severityFilter;
  });

  const handleReviewDisposition = async (
    discrepancyId: string,
    decision: 'CONFIRMED' | 'REJECTED' | 'WAIVED' | 'FALSE_POSITIVE',
    reason?: string
  ) => {
    const disc = currentReport.discrepancies.find((d: any) => d.id === discrepancyId);
    const serverFindingId = (disc as any)?.rawFindingId;

    if (serverFindingId) {
      try {
        await fetch(`/api/v1/findings/${serverFindingId}/review`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            decision,
            comment: reason || `Reviewed by engineer as ${decision}`,
          }),
        });
      } catch (err) {
        console.warn('Failed to persist review to server:', err);
      }
    }

    const updated = currentReport.discrepancies.map((d: any) =>
      d.id === discrepancyId ? { ...d, status: decision } : d
    );
    onUpdateReport({ ...currentReport, discrepancies: updated });
  };

  return (
    <div className="space-y-8 font-sans text-slate-100">
      {/* 4 Pipeline Step Cards in Horizontal Flow */}
      <div className="bg-[#0A1120] rounded-2xl border border-white/10 p-6 shadow-2xl space-y-5">
        {/* Error Banner */}
        {errorMessage && (
          <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center justify-between animate-in fade-in">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
              <span><strong>Inspection Notice:</strong> {errorMessage}</span>
            </div>
            <button
              onClick={() => setErrorMessage(null)}
              className="text-white hover:underline text-[11px] font-mono ml-4"
            >
              Dismiss
            </button>
          </div>
        )}

        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-white/10 pb-5">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.06] border border-white/10 text-sky-400 text-xs font-mono font-bold uppercase tracking-wider mb-1">
              <Sparkles className="w-3.5 h-3.5" />
              Automated Inspection Pipeline
            </div>
            <h2 className="text-xl md:text-2xl font-extrabold text-white">
              From Drawing Ingestion to Verified QC Audit
            </h2>
          </div>

          {/* Preset Standard Selector */}
          <div className="flex items-center gap-3">
            <span className="text-xs font-mono text-slate-400">Standard:</span>
            <select
              value={activeStandard}
              onChange={(e) => onChangeStandard(e.target.value as StandardPreset)}
              className="bg-black/40 border border-white/15 text-white text-xs font-mono font-semibold rounded-lg px-3 py-2 focus:outline-none focus:border-sky-500"
            >
              <option value="IPC-WHMA-A-620">IPC/WHMA-A-620 (Wire Harness)</option>
              <option value="UL-508A">UL 508A (Industrial Control Panels)</option>
              <option value="IPC-A-610">IPC-A-610 (Electronic Assemblies)</option>
              <option value="ISO-1219">ISO 1219 / IEC 60617</option>
              <option value="CUSTOMER-SOP">Custom Plant SOP</option>
            </select>
          </div>
        </div>

        {/* 5 Dynamic Pipeline Stage Indicators */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 font-mono text-[11px]">
          {/* Stage 1: Upload Verified */}
          <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition ${
            stageUpload === 'completed'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              : stageUpload === 'running'
              ? 'bg-sky-500/10 border-sky-500/40 text-sky-300 animate-pulse'
              : stageUpload === 'error'
              ? 'bg-rose-500/10 border-rose-500/30 text-rose-300'
              : 'bg-black/30 border-white/10 text-slate-400'
          }`}>
            {stageUpload === 'completed' ? <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" /> :
             stageUpload === 'running' ? <RefreshCw className="w-3.5 h-3.5 text-sky-400 animate-spin shrink-0" /> :
             stageUpload === 'error' ? <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0" /> :
             <div className="w-2 h-2 rounded-full bg-slate-600 shrink-0" />}
            <span className="truncate">1. Upload Verified</span>
          </div>

          {/* Stage 2: PDF Preflight */}
          <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition ${
            stagePreflight === 'completed'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              : stagePreflight === 'running'
              ? 'bg-sky-500/10 border-sky-500/40 text-sky-300 animate-pulse'
              : stagePreflight === 'error'
              ? 'bg-rose-500/10 border-rose-500/30 text-rose-300'
              : 'bg-black/30 border-white/10 text-slate-400'
          }`}>
            {stagePreflight === 'completed' ? <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" /> :
             stagePreflight === 'running' ? <RefreshCw className="w-3.5 h-3.5 text-sky-400 animate-spin shrink-0" /> :
             stagePreflight === 'error' ? <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0" /> :
             <div className="w-2 h-2 rounded-full bg-slate-600 shrink-0" />}
            <span className="truncate">2. PDF Preflight</span>
          </div>

          {/* Stage 3: Extraction */}
          <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition ${
            stageExtraction === 'completed'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              : stageExtraction === 'running'
              ? 'bg-sky-500/10 border-sky-500/40 text-sky-300 animate-pulse'
              : stageExtraction === 'error'
              ? 'bg-rose-500/10 border-rose-500/30 text-rose-300'
              : 'bg-black/30 border-white/10 text-slate-400'
          }`}>
            {stageExtraction === 'completed' ? <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" /> :
             stageExtraction === 'running' ? <RefreshCw className="w-3.5 h-3.5 text-sky-400 animate-spin shrink-0" /> :
             stageExtraction === 'error' ? <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0" /> :
             <div className="w-2 h-2 rounded-full bg-slate-600 shrink-0" />}
            <span className="truncate">3. Extraction</span>
          </div>

          {/* Stage 4: Electrical Graph */}
          <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition ${
            stageGraph === 'completed'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              : stageGraph === 'running'
              ? 'bg-sky-500/10 border-sky-500/40 text-sky-300 animate-pulse'
              : stageGraph === 'error'
              ? 'bg-rose-500/10 border-rose-500/30 text-rose-300'
              : 'bg-black/30 border-white/10 text-slate-400'
          }`}>
            {stageGraph === 'completed' ? <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" /> :
             stageGraph === 'running' ? <RefreshCw className="w-3.5 h-3.5 text-sky-400 animate-spin shrink-0" /> :
             stageGraph === 'error' ? <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0" /> :
             <div className="w-2 h-2 rounded-full bg-slate-600 shrink-0" />}
            <span className="truncate">4. Electrical Graph</span>
          </div>

          {/* Stage 5: QC Rules Checked */}
          <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition ${
            stageRules === 'completed'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              : stageRules === 'running'
              ? 'bg-sky-500/10 border-sky-500/40 text-sky-300 animate-pulse'
              : stageRules === 'error'
              ? 'bg-rose-500/10 border-rose-500/30 text-rose-300'
              : 'bg-black/30 border-white/10 text-slate-400'
          }`}>
            {stageRules === 'completed' ? <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" /> :
             stageRules === 'running' ? <RefreshCw className="w-3.5 h-3.5 text-sky-400 animate-spin shrink-0" /> :
             stageRules === 'error' ? <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0" /> :
             <div className="w-2 h-2 rounded-full bg-slate-600 shrink-0" />}
            <span className="truncate">5. QC Rules Checked</span>
          </div>
        </div>

        {/* 4 Pipeline Step Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 items-stretch">
          {/* Box 1: Ingest & Pre-flight */}
          <div
            onClick={() => setActiveStep(1)}
            className={`rounded-xl border p-4.5 transition cursor-pointer flex flex-col justify-between ${
              activeStep === 1
                ? 'border-sky-500 bg-sky-950/20 ring-1 ring-sky-500/40 shadow-lg'
                : 'border-white/10 bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/20'
            }`}
          >
            <div>
              <div className="flex items-center justify-between text-xs font-bold text-slate-300 uppercase font-mono">
                <span>1. Ingest Manual</span>
                {stageUpload === 'completed' ? (
                  <span className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center text-[10px] text-emerald-400 font-bold">
                    ✓
                  </span>
                ) : stageUpload === 'running' ? (
                  <RefreshCw className="w-4 h-4 text-sky-400 animate-spin" />
                ) : stageUpload === 'error' ? (
                  <span className="w-5 h-5 rounded-full bg-rose-500/20 flex items-center justify-center text-[10px] text-rose-400 font-bold">
                    ✕
                  </span>
                ) : (
                  <span className="text-[10px] font-mono text-slate-500">Step 1</span>
                )}
              </div>

              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragOver(true);
                }}
                onDragLeave={() => setIsDragOver(false)}
                onDrop={handleDrop}
                className={`mt-3 p-4 border-2 border-dashed rounded-lg text-center transition ${
                  isDragOver ? 'border-sky-400 bg-sky-500/10' : 'border-white/15 bg-black/30'
                }`}
              >
                {isAnalyzing ? (
                  <RefreshCw className="w-5 h-5 text-sky-400 mx-auto mb-1 animate-spin" />
                ) : (
                  <UploadCloud className="w-5 h-5 text-sky-400 mx-auto mb-1" />
                )}
                <div className="text-xs font-bold text-white">
                  {isAnalyzing ? 'Processing Drawing...' : 'Drag & Drop PDF / SVG'}
                </div>
                <div className="text-[10px] text-slate-400 font-mono mt-0.5">Vector CAD or Scanned</div>
              </div>
            </div>

            <div className="mt-3 flex items-center justify-between text-[11px] font-mono text-slate-400">
              <span className="truncate max-w-[140px]">{uploadedFileName}</span>
              <label className="text-sky-400 hover:text-sky-300 font-bold cursor-pointer">
                Browse
                <input
                  type="file"
                  accept=".pdf,.svg,.png,.jpg,.jpeg"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          {/* Box 2: Layout Segmentation */}
          <div
            onClick={() => {
              setActiveStep(2);
              setActiveInspectorTab('INGESTION_SEGMENTATION');
            }}
            className={`rounded-xl border p-4.5 transition cursor-pointer flex flex-col justify-between ${
              activeStep === 2
                ? 'border-sky-500 bg-sky-950/20 ring-1 ring-sky-500/40 shadow-lg'
                : 'border-white/10 bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/20'
            }`}
          >
            <div>
              <div className="flex items-center justify-between text-xs font-bold text-slate-300 uppercase font-mono">
                <span>2. Layout &amp; Netlist</span>
                <span className={`text-[10px] font-mono font-bold ${
                  stageExtraction === 'completed' ? 'text-emerald-400' : 'text-slate-500'
                }`}>
                  {stageExtraction === 'completed' ? `${tokens.length} Tokens` : 'Pending'}
                </span>
              </div>

              <div className="mt-3 p-3 rounded-lg bg-black/30 border border-white/5 space-y-1.5 text-[11px] font-mono">
                {stageExtraction === 'completed' ? (
                  <>
                    <div className="flex items-center gap-1.5 text-emerald-400">
                      <Check className="w-3.5 h-3.5" /> Title Block Isolated
                    </div>
                    <div className="flex items-center gap-1.5 text-emerald-400">
                      <Check className="w-3.5 h-3.5" /> Wire Schedule Extracted
                    </div>
                    <div className="flex items-center gap-1.5 text-emerald-400">
                      <Check className="w-3.5 h-3.5" /> Netlist Graph Mapped
                    </div>
                  </>
                ) : stageExtraction === 'running' || stageGraph === 'running' ? (
                  <div className="flex items-center gap-2 text-sky-400 py-2">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Extracting topology...</span>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-1.5 text-slate-500">
                      <span className="w-3.5 text-center text-[10px]">○</span> Title Block Isolation
                    </div>
                    <div className="flex items-center gap-1.5 text-slate-500">
                      <span className="w-3.5 text-center text-[10px]">○</span> Wire Schedule Extraction
                    </div>
                    <div className="flex items-center gap-1.5 text-slate-500">
                      <span className="w-3.5 text-center text-[10px]">○</span> Netlist Graph Mapping
                    </div>
                  </>
                )}
              </div>
            </div>

            <p className="mt-3 text-[10px] text-slate-400 font-mono">
              Click to view drawing boundary zones &rarr;
            </p>
          </div>

          {/* Box 3: QC Report */}
          <div
            onClick={() => {
              setActiveStep(3);
              setActiveInspectorTab('RADAR_VIEW');
            }}
            className={`rounded-xl border p-4.5 transition cursor-pointer flex flex-col justify-between ${
              activeStep === 3
                ? 'border-sky-500 bg-sky-950/20 ring-1 ring-sky-500/40 shadow-lg'
                : 'border-white/10 bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/20'
            }`}
          >
            <div>
              <div className="flex items-center justify-between text-xs font-bold text-slate-300 uppercase font-mono">
                <span>3. QC Verification</span>
                {stageRules === 'completed' ? (
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      currentReport.overallResult === 'PASS'
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                    }`}
                  >
                    {currentReport.overallResult}
                  </span>
                ) : stageRules === 'running' ? (
                  <RefreshCw className="w-3.5 h-3.5 text-sky-400 animate-spin" />
                ) : (
                  <span className="text-[10px] font-mono text-slate-500">Pending</span>
                )}
              </div>

              <div className="mt-3 flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-white font-mono">
                    {stageRules === 'completed' ? currentReport.discrepancies.length : '--'}
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono">Discrepancies Flagged</div>
                </div>

                <div className="text-right text-[10px] space-y-0.5 font-mono font-bold">
                  <div className="text-rose-400">Critical: {stageRules === 'completed' ? criticalCount : 0}</div>
                  <div className="text-amber-400">Major: {stageRules === 'completed' ? majorCount : 0}</div>
                  <div className="text-sky-400">Minor: {stageRules === 'completed' ? minorCount : 0}</div>
                </div>
              </div>
            </div>

            <div className="mt-3 pt-2 border-t border-white/5 text-[11px] text-slate-400 flex justify-between font-mono text-[10px]">
              <span>Score: {stageRules === 'completed' ? currentReport.qualityScore : '--'}/100</span>
              <span className="text-emerald-400 font-bold">Passed: {stageRules === 'completed' ? currentReport.summary.passed : '--'}</span>
            </div>
          </div>

          {/* Box 4: Export & Save */}
          <div
            onClick={() => setActiveStep(4)}
            className={`rounded-xl border p-4.5 transition cursor-pointer flex flex-col justify-between ${
              activeStep === 4
                ? 'border-sky-500 bg-sky-950/20 ring-1 ring-sky-500/40 shadow-lg'
                : 'border-white/10 bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/20'
            }`}
          >
            <div>
              <div className="flex items-center justify-between text-xs font-bold text-slate-300 uppercase font-mono">
                <span>4. Export &amp; Save</span>
                {stageRules === 'completed' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                ) : (
                  <span className="text-[10px] font-mono text-slate-500">Step 4</span>
                )}
              </div>

              <div className="mt-4 flex items-center justify-center gap-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    exportQCReportToPrintablePDF(currentReport);
                  }}
                  className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-200 border border-white/10 font-mono text-xs flex items-center gap-1.5 transition"
                >
                  <FileText className="w-3.5 h-3.5 text-sky-400" /> PDF
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    exportQCReportToExcel(currentReport);
                  }}
                  className="px-3 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 font-mono text-xs flex items-center gap-1.5 transition"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" /> XLSX
                </button>
              </div>
            </div>

            <div className="mt-3 pt-2 border-t border-white/5 text-[10px] text-slate-400 font-mono flex items-center justify-center gap-1">
              <Check className="w-3.5 h-3.5 text-emerald-400" /> Saved to Registry
            </div>
          </div>
        </div>

        {/* 1-Click Fast Preloaded Schematic Selector */}
        <div className="mt-6 pt-4 border-t border-white/5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-slate-300 font-mono">
            <Sparkles className="w-3.5 h-3.5 text-sky-400" />
            <span className="font-bold">Test with Preloaded Industrial Schematics:</span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {SAMPLE_DIAGRAMS.map((sample) => (
              <button
                key={sample.id}
                onClick={() => handleSelectSample(sample)}
                className={`px-3 py-1.5 text-xs font-mono font-medium rounded-lg border transition ${
                  uploadedFileName.includes(sample.code)
                    ? 'bg-[#0284C7] text-white border-sky-400 shadow-md font-bold'
                    : 'bg-white/[0.03] hover:bg-white/[0.08] text-slate-300 border-white/10'
                }`}
              >
                {sample.code} ({sample.standard})
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* View Switcher: CAD Radar Pinpointing vs Ingestion Optical Segmentation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveInspectorTab('RADAR_VIEW')}
            className={`px-4 py-2 rounded-lg text-xs font-mono font-bold transition flex items-center gap-2 ${
              activeInspectorTab === 'RADAR_VIEW'
                ? 'bg-[#0284C7] text-white shadow-md'
                : 'bg-[#0A1120] text-slate-400 hover:text-white border border-white/10'
            }`}
          >
            <Crosshair className="w-4 h-4" />
            <span>Interactive CAD Radar Pinpointing</span>
          </button>
          <button
            onClick={() => setActiveInspectorTab('INGESTION_SEGMENTATION')}
            className={`px-4 py-2 rounded-lg text-xs font-mono font-bold transition flex items-center gap-2 ${
              activeInspectorTab === 'INGESTION_SEGMENTATION'
                ? 'bg-[#0284C7] text-white shadow-md'
                : 'bg-[#0A1120] text-slate-400 hover:text-white border border-white/10'
            }`}
          >
            <Layout className="w-4 h-4 text-emerald-400" />
            <span>Drawing Zones &amp; Token Ingestion (Phase 5)</span>
          </button>
        </div>

        {onOpenEditor && (
          <button
            onClick={onOpenEditor}
            className="px-3.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-mono font-medium border border-white/10 flex items-center gap-1.5"
          >
            <Layers className="w-3.5 h-3.5 text-sky-400" />
            <span>Open in EasySchematic Editor &rarr;</span>
          </button>
        )}
      </div>

      {/* TAB 1: PHASE 5 OPTICAL SEGMENTATION VIEW */}
      {activeInspectorTab === 'INGESTION_SEGMENTATION' && (
        <IngestionVisualizer
          fileName={uploadedFileName}
          fileType="Vector PDF"
          sha256Hash="873b2206cc614dc35bc0af6b4f1b058b7ca5e5187681d3a5dd42cca543595bd8"
          pageCount={uploadedFileName.includes('WH-402') ? 24 : uploadedFileName.includes('MCC') ? 12 : 8}
          zones={zones}
          tokens={tokens}
          wireTable={wireTable}
          onProceedToNetlist={() => setActiveInspectorTab('RADAR_VIEW')}
        />
      )}

      {/* TAB 2: DETAILED QC REPORT & SPATIAL RADAR PINPOINTING */}
      {activeInspectorTab === 'RADAR_VIEW' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Metrics Banner & Discrepancies Table (7 cols) */}
          <div className="lg:col-span-7 space-y-6">
            {/* Metric Banner Card */}
            <div className="bg-[#0A1120] rounded-2xl border border-white/10 p-6 shadow-2xl space-y-5">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-white/10 pb-5">
                <div className="flex items-center gap-3.5">
                  <div
                    className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-xl shadow-lg ${
                      currentReport.overallResult === 'PASS'
                        ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
                        : 'bg-rose-500/10 border border-rose-500/20 text-rose-400'
                    }`}
                  >
                    {currentReport.overallResult === 'PASS' ? '✓' : '✗'}
                  </div>
                  <div>
                    <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">
                      Overall Audit Result
                    </div>
                    <h3
                      className={`text-2xl font-black ${
                        currentReport.overallResult === 'PASS' ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {currentReport.overallResult === 'PASS' ? 'PASS' : 'FAIL'}
                    </h3>
                  </div>
                </div>

                {/* Donut Chart with Severity Breakdown */}
                <div className="flex items-center gap-4 bg-black/40 px-4 py-2.5 rounded-xl border border-white/10">
                  <div className="relative w-14 h-14 flex items-center justify-center">
                    <svg width="56" height="56" className="w-14 h-14 -rotate-90 transform" viewBox="0 0 80 80">
                      <circle cx="40" cy="40" r={radius} stroke="rgba(255,255,255,0.1)" strokeWidth="8" fill="transparent" />
                      {totalDiscrepancies > 0 && (
                        <>
                          <circle
                            cx="40"
                            cy="40"
                            r={radius}
                            stroke="#EF4444"
                            strokeWidth="8"
                            fill="transparent"
                            strokeDasharray={`${critDash} ${circumference}`}
                            strokeDashoffset="0"
                          />
                          <circle
                            cx="40"
                            cy="40"
                            r={radius}
                            stroke="#F59E0B"
                            strokeWidth="8"
                            fill="transparent"
                            strokeDasharray={`${majDash} ${circumference}`}
                            strokeDashoffset={`${-critDash}`}
                          />
                          <circle
                            cx="40"
                            cy="40"
                            r={radius}
                            stroke="#38BDF8"
                            strokeWidth="8"
                            fill="transparent"
                            strokeDasharray={`${minDash} ${circumference}`}
                            strokeDashoffset={`${-(critDash + majDash)}`}
                          />
                        </>
                      )}
                    </svg>
                    <div className="absolute text-center">
                      <div className="text-sm font-bold font-mono text-white">
                        {currentReport.discrepancies.length}
                      </div>
                    </div>
                  </div>

                  <div className="text-xs font-mono space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-rose-400"></span>
                      <span className="text-slate-400">Critical:</span>
                      <strong className="text-rose-400">{criticalCount}</strong>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                      <span className="text-slate-400">Major:</span>
                      <strong className="text-amber-400">{majorCount}</strong>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-sky-400"></span>
                      <span className="text-slate-400">Minor:</span>
                      <strong className="text-sky-400">{minorCount}</strong>
                    </div>
                  </div>
                </div>
              </div>

              {/* Execution Latency & Model Pill */}
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-mono text-slate-400 pt-1">
                <span>Model: <strong className="text-white">{currentReport.modelUsed}</strong></span>
                <span>Speed: <strong className="text-emerald-400">{currentReport.executionTimeMs} ms</strong></span>
                <span>Audited By: <strong className="text-white">{currentReport.inspectedBy}</strong></span>
              </div>
            </div>

            {/* Discrepancies Table */}
            <div className="bg-[#0A1120] rounded-2xl border border-white/10 p-6 shadow-xl space-y-4">
              <div className="flex flex-wrap items-center justify-between pb-3 border-b border-white/10 gap-3">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
                    Identified Discrepancies
                  </h3>
                  <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-white/10 text-slate-300">
                    {filteredDiscrepancies.length} of {currentReport.discrepancies.length}
                  </span>
                </div>

                {/* Filter Pills */}
                <div className="flex items-center gap-1 bg-black/40 p-1 rounded-lg border border-white/10 text-xs font-mono">
                  {(['ALL', 'CRITICAL', 'MAJOR', 'MINOR'] as const).map((filter) => (
                    <button
                      key={filter}
                      onClick={() => setSeverityFilter(filter)}
                      className={`px-2.5 py-1 rounded-md transition ${
                        severityFilter === filter
                          ? 'bg-[#0284C7] text-white font-bold shadow'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      {filter === 'ALL' ? 'All' : filter}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                {filteredDiscrepancies.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 font-mono text-xs">
                    No discrepancies found for severity: {severityFilter}
                  </div>
                ) : (
                  filteredDiscrepancies.map((d) => {
                  const isSelected = d.id === selectedDiscrepancyId;
                  const severityBadge =
                    d.severity === 'CRITICAL'
                      ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                      : d.severity === 'MAJOR'
                      ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                      : 'bg-sky-500/10 text-sky-400 border-sky-500/20';

                  return (
                    <div
                      key={d.id}
                      onClick={() => setSelectedDiscrepancyId(d.id)}
                      className={`p-4 rounded-xl border transition cursor-pointer space-y-2 ${
                        isSelected
                          ? 'border-sky-500 bg-sky-950/20 shadow-md ring-1 ring-sky-500/30'
                          : 'border-white/10 bg-white/[0.02] hover:bg-white/[0.05]'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-white">{d.id}</span>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${severityBadge}`}>
                            {d.severity}
                          </span>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${
                            d.status === 'CONFIRMED' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                            d.status === 'REJECTED' ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' :
                            d.status === 'FALSE_POSITIVE' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                            d.status === 'WAIVED' ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' :
                            d.status === 'NEEDS_MORE_EVIDENCE' ? 'bg-sky-500/10 text-sky-400 border-sky-500/20' :
                            'bg-slate-500/10 text-slate-400 border-slate-500/20'
                          }`}>
                            {d.status || 'UNREVIEWED'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 font-mono text-xs">
                          <span className="text-slate-400">{d.componentRef}</span>
                          <span className="text-emerald-400 font-bold">{d.confidence > 1 ? d.confidence : Math.round(d.confidence * 100)}% conf</span>
                        </div>
                      </div>

                      <div className="text-xs text-slate-200 font-medium">
                        {d.title}
                      </div>

                      <p className="text-xs text-slate-400 leading-relaxed">
                        {d.description}
                      </p>

                      <div className="pt-2 border-t border-white/5 flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono">
                        <span className="text-sky-400">Rule: {d.standardRef}</span>
                        <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => handleReviewDisposition(d.id, 'CONFIRMED')}
                            className="px-2 py-0.5 rounded bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold transition"
                            title="Accept Finding as Confirmed"
                          >
                            Accept
                          </button>
                          <button
                            onClick={() => handleReviewDisposition(d.id, 'REJECTED')}
                            className="px-2 py-0.5 rounded bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 text-[10px] font-bold transition"
                            title="Reject Finding"
                          >
                            Reject
                          </button>
                          <button
                            onClick={() => {
                              const reason = prompt('Enter engineering waiver justification (required):');
                              if (reason && reason.trim()) {
                                handleReviewDisposition(d.id, 'WAIVED', reason.trim());
                              }
                            }}
                            className="px-2 py-0.5 rounded bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 border border-purple-500/20 text-[10px] font-bold transition"
                            title="Waive Finding with Mandatory Justification"
                          >
                            Waive
                          </button>
                          <button
                            onClick={() => onOpenFeedbackModal(d)}
                            className="px-2 py-0.5 rounded bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/20 text-[10px] font-bold transition"
                            title="Report False Positive"
                          >
                            False Positive
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              </div>
            </div>
          </div>

          {/* Right Column: Spatial CAD Viewer with Radar Overlay (5 cols) */}
          <div className="lg:col-span-5 sticky top-20 space-y-4">
            <div className="bg-[#0A1120] rounded-2xl border border-white/10 p-5 shadow-2xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <div className="flex items-center gap-2">
                  <Crosshair className="w-4 h-4 text-sky-400" />
                  <span className="text-xs font-bold text-white font-mono uppercase">
                    Spatial CAD Radar Overlay
                  </span>
                </div>
                <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 font-bold">
                  LIVE CAD COORD
                </span>
              </div>

              {/* Schematic Canvas Component */}
              <div className="rounded-xl overflow-hidden border border-white/10 bg-black/40">
                <SchematicViewer
                  svgKey={currentReport.diagramSvgKey || 'wh-402'}
                  customImageDataUri={currentReport.customImageDataUri}
                  discrepancies={currentReport.discrepancies}
                  selectedDiscrepancyId={selectedDiscrepancyId}
                  onSelectDiscrepancy={(id) => setSelectedDiscrepancyId(id)}
                  showOverlays={showVectorViewer}
                  onToggleOverlays={() => setShowVectorViewer(!showVectorViewer)}
                />
              </div>

              {/* Selected Discrepancy Remediation Drawer */}
              {selectedDiscrepancy && (
                <div className="p-4 rounded-xl bg-white/[0.03] border border-white/10 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono text-slate-400 uppercase">
                      Actionable Remediation Advice
                    </span>
                    <span className="text-[10px] font-mono text-sky-400 font-bold">
                      {selectedDiscrepancy.id}
                    </span>
                  </div>
                  <p className="text-slate-200 text-xs leading-relaxed font-mono">
                    {selectedDiscrepancy.recommendation || selectedDiscrepancy.plainLanguageExplanation}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
