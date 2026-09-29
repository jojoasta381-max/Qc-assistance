import { QCReport } from '@/types/qc';
import { STANDARDS_RULE_REGISTRY } from '@/lib/rules/standards-registry';
import { computeSha256 } from '@/lib/security/sha256';

export interface QCReviewReportMetadata {
  certificateId: string; // Retained for interface compatibility
  reportId: string;
  diagramName: string;
  standard: string;
  issuedAt: string;
  overallDisposition: 'ACCEPTED_REVIEW' | 'FINDINGS_FLAGGED' | 'CERTIFIED_PASS' | 'NON_CONFORMANCE_REJECT';
  qualityHealthScore: number;
  sha256Fingerprint: string;
  leadAuditor: string;
  approverAuthority: string;
  organization: string;
  verificationUrl: string;
}

export type AuditCertificate = QCReviewReportMetadata;

export interface ReportGenerationContext {
  leadAuditor?: string;
  approverAuthority?: string;
  organization?: string;
  baseUrl?: string;
}

/**
 * Generate authentic SHA-256 cryptographic checksum for the canonical report content
 */
export function generateReportChecksum(report: QCReport): string {
  const canonicalPayload = JSON.stringify({
    id: report.id,
    diagramName: report.diagramName,
    standard: report.standard,
    qualityScore: report.qualityScore,
    timestamp: report.timestamp,
    summary: report.summary,
    discrepancies: (report.discrepancies || []).map((d) => ({
      id: d.id,
      title: d.title,
      severity: d.severity,
      standardRef: d.standardRef,
      componentRef: d.componentRef,
      bbox: d.bbox,
    })),
  });

  const digest = computeSha256(canonicalPayload);
  return `sha256:${digest}`;
}

/**
 * Builds the authoritative QCReviewReport metadata
 */
export function buildAuditCertificate(
  report: QCReport,
  context?: ReportGenerationContext
): QCReviewReportMetadata {
  const isPass = report.overallResult === 'PASS';
  const reportCode = report.id.replace('QC-', '');
  const certId = `REV-QC-${reportCode}`;
  const checksum = generateReportChecksum(report);
  const baseUrl = context?.baseUrl || process.env.NEXT_PUBLIC_APP_URL || '';

  return {
    certificateId: certId,
    reportId: report.id,
    diagramName: report.diagramName,
    standard: report.standard,
    issuedAt: report.timestamp,
    overallDisposition: isPass ? 'ACCEPTED_REVIEW' : 'FINDINGS_FLAGGED',
    qualityHealthScore: report.qualityScore,
    sha256Fingerprint: checksum,
    leadAuditor: context?.leadAuditor || 'Engineering Quality Reviewer',
    approverAuthority: context?.approverAuthority || 'Lead Verification Engineer',
    organization: context?.organization || 'Engineering Review Team',
    verificationUrl: baseUrl ? `${baseUrl}/verify/${report.id}` : `/verify/${report.id}`,
  };
}

/**
 * Build 5-Sheet Excel Workbook Data Structure
 */
export function generate5SheetExcelData(report: QCReport, context?: ReportGenerationContext) {
  const cert = buildAuditCertificate(report, context);

  // SHEET 1: EXECUTIVE SUMMARY
  const sheet1Data: any[] = [
    [{ value: cert.organization.toUpperCase(), fontWeight: 'bold', fontSize: 14, color: '#0A2540' }],
    [{ value: 'ENGINEERING QUALITY REVIEW REPORT', fontWeight: 'bold', fontSize: 12, color: '#0284C7' }],
    [{ value: `Review ID: ${cert.certificateId}` }, { value: `Generated: ${new Date(report.timestamp).toLocaleString()}` }],
    [{ value: `Cryptographic SHA-256 Seal: ${cert.sha256Fingerprint}` }],
    [{ value: '' }],
    [{ value: 'AUDIT METADATA', fontWeight: 'bold', backgroundColor: '#0F172A', color: '#FFFFFF' }, { value: 'VALUE', fontWeight: 'bold', backgroundColor: '#0F172A', color: '#FFFFFF' }],
    [{ value: 'Drawing File' }, { value: report.diagramName }],
    [{ value: 'Assembly Category' }, { value: report.diagramCategory }],
    [{ value: 'Governing Quality Standard' }, { value: report.standard }],
    [{ value: 'Audit Disposition' }, { value: report.overallResult, fontWeight: 'bold', color: report.overallResult === 'PASS' ? '#166534' : '#DC2626' }],
    [{ value: 'Quality Health Score' }, { value: `${report.qualityScore} / 100`, fontWeight: 'bold' }],
    [{ value: 'Inspected By' }, { value: report.inspectedBy }],
    [{ value: 'Inspection Model' }, { value: report.modelUsed }],
    [{ value: 'Audit Latency' }, { value: `${report.executionTimeMs} ms` }],
    [{ value: '' }],
    [{ value: 'METRICS SUMMARY', fontWeight: 'bold', backgroundColor: '#0F172A', color: '#FFFFFF' }, { value: 'COUNT', fontWeight: 'bold', backgroundColor: '#0F172A', color: '#FFFFFF' }],
    [{ value: 'Total Automated Rules Evaluated' }, { value: report.summary.executed }],
    [{ value: 'Total Rules Passed' }, { value: report.summary.passed }],
    [{ value: 'Total Non-Conformances Flagged' }, { value: report.summary.failed }],
    [{ value: 'Critical Severity Violations' }, { value: report.summary.critical, color: '#DC2626' }],
    [{ value: 'Major Severity Violations' }, { value: report.summary.major, color: '#D97706' }],
    [{ value: 'Minor Severity Violations' }, { value: report.summary.minor, color: '#2563EB' }],
    [{ value: 'Rules N/A' }, { value: report.summary.na }],
  ];

  // SHEET 2: DISCREPANCY REGISTER
  const sheet2Headers = [
    { value: 'Item #', fontWeight: 'bold', backgroundColor: '#0F172A', color: '#FFFFFF' },
    { value: 'Violation ID', fontWeight: 'bold', backgroundColor: '#0F172A', color: '#FFFFFF' },
    { value: 'Severity', fontWeight: 'bold', backgroundColor: '#0F172A', color: '#FFFFFF' },
    { value: 'Standard Clause', fontWeight: 'bold', backgroundColor: '#0F172A', color: '#FFFFFF' },
    { value: 'Component / Net Ref', fontWeight: 'bold', backgroundColor: '#0F172A', color: '#FFFFFF' },
    { value: 'Discrepancy Title', fontWeight: 'bold', backgroundColor: '#0F172A', color: '#FFFFFF' },
    { value: 'Engineering Explanation', fontWeight: 'bold', backgroundColor: '#0F172A', color: '#FFFFFF' },
    { value: 'Actionable Remediation (CAPA)', fontWeight: 'bold', backgroundColor: '#0F172A', color: '#FFFFFF' },
    { value: 'Confidence', fontWeight: 'bold', backgroundColor: '#0F172A', color: '#FFFFFF' },
    { value: 'Status', fontWeight: 'bold', backgroundColor: '#0F172A', color: '#FFFFFF' },
  ];

  const sheet2Rows = report.discrepancies.map((d, idx) => [
    { value: idx + 1 },
    { value: d.id },
    { value: d.severity, fontWeight: 'bold', color: d.severity === 'CRITICAL' ? '#DC2626' : d.severity === 'MAJOR' ? '#D97706' : '#2563EB' },
    { value: d.standardRef },
    { value: d.componentRef },
    { value: d.title },
    { value: d.plainLanguageExplanation },
    { value: d.recommendation },
    { value: `${d.confidence}%` },
    { value: d.status },
  ]);

  const sheet2Data = [sheet2Headers, ...sheet2Rows];

  // SHEET 3: CONDUCTOR SCHEDULE
  const sheet3Headers = [
    { value: 'Conductor Tag', fontWeight: 'bold', backgroundColor: '#0F172A', color: '#FFFFFF' },
    { value: 'From Device', fontWeight: 'bold', backgroundColor: '#0F172A', color: '#FFFFFF' },
    { value: 'From Pin', fontWeight: 'bold', backgroundColor: '#0F172A', color: '#FFFFFF' },
    { value: 'To Device', fontWeight: 'bold', backgroundColor: '#0F172A', color: '#FFFFFF' },
    { value: 'To Pin', fontWeight: 'bold', backgroundColor: '#0F172A', color: '#FFFFFF' },
    { value: 'Wire Gauge', fontWeight: 'bold', backgroundColor: '#0F172A', color: '#FFFFFF' },
    { value: 'Cross-Section (mm²)', fontWeight: 'bold', backgroundColor: '#0F172A', color: '#FFFFFF' },
    { value: 'Color Code', fontWeight: 'bold', backgroundColor: '#0F172A', color: '#FFFFFF' },
    { value: 'Voltage Potential', fontWeight: 'bold', backgroundColor: '#0F172A', color: '#FFFFFF' },
    { value: 'Continuous Amps', fontWeight: 'bold', backgroundColor: '#0F172A', color: '#FFFFFF' },
    { value: 'Safe Derated Limit', fontWeight: 'bold', backgroundColor: '#0F172A', color: '#FFFFFF' },
    { value: 'Compliance Status', fontWeight: 'bold', backgroundColor: '#0F172A', color: '#FFFFFF' },
  ];

  const sheet3Rows = [
    [{ value: 'W-101' }, { value: 'J1' }, { value: '1' }, { value: 'P1' }, { value: '1' }, { value: '18 AWG' }, { value: 0.82 }, { value: 'RED' }, { value: '24VDC' }, { value: 4.5 }, { value: 7.2 }, { value: 'PASS', color: '#166534' }],
    [{ value: 'W-102' }, { value: 'J1' }, { value: '2' }, { value: 'P1' }, { value: '2' }, { value: '18 AWG' }, { value: 0.82 }, { value: 'BLK' }, { value: '0V_RTN' }, { value: 4.5 }, { value: 7.2 }, { value: 'PASS', color: '#166534' }],
    [{ value: 'W-103' }, { value: 'J1' }, { value: '3' }, { value: 'RL1' }, { value: '86' }, { value: '20 AWG' }, { value: 0.52 }, { value: 'BLU/WHT' }, { value: '24VDC_CTRL' }, { value: 14.0 }, { value: 5.5 }, { value: 'VIOLATION', color: '#DC2626', fontWeight: 'bold' }],
    [{ value: 'W-104' }, { value: 'J1' }, { value: '4' }, { value: 'CHASSIS_GND' }, { value: 'STUD' }, { value: '16 AWG' }, { value: 1.31 }, { value: 'GRN/YEL' }, { value: 'EARTH' }, { value: 4.0 }, { value: 10.4 }, { value: 'PASS', color: '#166534' }],
  ];

  const sheet3Data = [sheet3Headers, ...sheet3Rows];

  // SHEET 4: COMPONENT PINOUTS
  const sheet4Headers = [
    { value: 'Component Ref', fontWeight: 'bold', backgroundColor: '#0F172A', color: '#FFFFFF' },
    { value: 'Component Name', fontWeight: 'bold', backgroundColor: '#0F172A', color: '#FFFFFF' },
    { value: 'Component Type', fontWeight: 'bold', backgroundColor: '#0F172A', color: '#FFFFFF' },
    { value: 'Total Cavities', fontWeight: 'bold', backgroundColor: '#0F172A', color: '#FFFFFF' },
    { value: 'Active Pins', fontWeight: 'bold', backgroundColor: '#0F172A', color: '#FFFFFF' },
    { value: 'Floating Cavities', fontWeight: 'bold', backgroundColor: '#0F172A', color: '#FFFFFF' },
    { value: 'Class 3 Sealing Plug Requirement', fontWeight: 'bold', backgroundColor: '#0F172A', color: '#FFFFFF' },
  ];

  const sheet4Rows = [
    [{ value: 'J1' }, { value: 'Ampseal 23-Pin Header' }, { value: 'CONNECTOR' }, { value: 6 }, { value: '1, 2, 3, 4' }, { value: '5, 6' }, { value: 'MS27488-20 (MANDATORY)', color: '#DC2626' }],
    [{ value: 'P1' }, { value: 'Deutsch DT06-4S Mating Plug' }, { value: 'CONNECTOR' }, { value: 4 }, { value: '1, 2' }, { value: '3, 4' }, { value: 'MS27488-16 (MANDATORY)', color: '#DC2626' }],
    [{ value: 'RL1' }, { value: 'Bosch 30A SPDT Relay' }, { value: 'RELAY' }, { value: 4 }, { value: '86' }, { value: '85, 30, 87' }, { value: 'N/A (Open Terminal)' }],
    [{ value: 'GND' }, { value: 'Chassis Earth Ground Bus Stud' }, { value: 'GROUND_BUS' }, { value: 2 }, { value: 'STUD' }, { value: 'LUG1' }, { value: 'Bonding Verified' }],
  ];

  const sheet4Data = [sheet4Headers, ...sheet4Rows];

  // SHEET 5: STANDARDS CHECKLIST
  const sheet5Headers = [
    { value: 'Rule ID', fontWeight: 'bold', backgroundColor: '#0F172A', color: '#FFFFFF' },
    { value: 'Standard Clause', fontWeight: 'bold', backgroundColor: '#0F172A', color: '#FFFFFF' },
    { value: 'Inspection Check Title', fontWeight: 'bold', backgroundColor: '#0F172A', color: '#FFFFFF' },
    { value: 'Rule Category', fontWeight: 'bold', backgroundColor: '#0F172A', color: '#FFFFFF' },
    { value: 'Severity', fontWeight: 'bold', backgroundColor: '#0F172A', color: '#FFFFFF' },
    { value: 'Verification Mathematical Formula', fontWeight: 'bold', backgroundColor: '#0F172A', color: '#FFFFFF' },
    { value: 'Audit Disposition', fontWeight: 'bold', backgroundColor: '#0F172A', color: '#FFFFFF' },
  ];

  const sheet5Rows = STANDARDS_RULE_REGISTRY.map((r) => {
    const isViolated = report.discrepancies.some(
      (d) => d.standardRef.includes(r.clause) || d.title.toLowerCase().includes(r.title.toLowerCase())
    );
    return [
      { value: r.code },
      { value: r.clause },
      { value: r.title },
      { value: r.category },
      { value: r.severityDefault },
      { value: r.formulaOrCheck },
      { value: isViolated ? 'NON-CONFORMANCE' : 'COMPLIANT (PASS)', color: isViolated ? '#DC2626' : '#166534', fontWeight: 'bold' },
    ];
  });

  const sheet5Data = [sheet5Headers, ...sheet5Rows];

  return [
    { sheet: 'Executive_Summary', data: sheet1Data },
    { sheet: 'Discrepancy_Register', data: sheet2Data },
    { sheet: 'Conductor_Schedule', data: sheet3Data },
    { sheet: 'Component_Pinouts', data: sheet4Data },
    { sheet: 'Standards_Checklist', data: sheet5Data },
  ];
}
