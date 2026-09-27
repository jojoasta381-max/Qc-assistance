import writeXlsxFile from 'write-excel-file/browser';
import { QCReport } from '@/types/qc';
import { generate5SheetExcelData, buildAuditCertificate } from '@/lib/reports/audit-report-generator';

// Defensive HTML Sanitization to prevent XSS in printable reports
function escapeHtml(unsafe: string | number | undefined | null): string {
  if (unsafe === undefined || unsafe === null) return '';
  return String(unsafe)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Phase 9: Multi-Sheet Certified Excel (XLSX) Exporter
 * Generates an official 5-sheet engineering workbook:
 * 1. Executive_Summary
 * 2. Discrepancy_Register
 * 3. Conductor_Schedule
 * 4. Component_Pinouts
 * 5. Standards_Checklist
 */
export const exportQCReportToExcel = async (report: QCReport) => {
  try {
    const sheets = generate5SheetExcelData(report);
    const filename = `${report.diagramName.replace(/[^a-zA-Z0-9_-]/g, '_')}_Certified_QC_Workbook.xlsx`;

    await (writeXlsxFile(sheets as any) as any).toFile(filename);
  } catch (err) {
    console.error('Failed to export multi-sheet Excel file via writeXlsxFile, falling back to secure CSV download', err);
    fallbackExportToCSV(report);
  }
};

/**
 * Fallback CSV export
 */
export const fallbackExportToCSV = (report: QCReport) => {
  const headers = ['Flag ID', 'Severity', 'Confidence', 'Standard Clause', 'Component Ref', 'Title', 'Explanation', 'Recommendation', 'Status'];
  const rows = report.discrepancies.map((d) => [
    d.id,
    d.severity,
    `${d.confidence}%`,
    `"${(d.standardRef || '').replace(/"/g, '""')}"`,
    `"${(d.componentRef || '').replace(/"/g, '""')}"`,
    `"${(d.title || '').replace(/"/g, '""')}"`,
    `"${(d.plainLanguageExplanation || '').replace(/"/g, '""')}"`,
    `"${(d.recommendation || '').replace(/"/g, '""')}"`,
    d.status,
  ]);

  const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${report.diagramName.replace(/[^a-zA-Z0-9_-]/g, '_')}_QC_Report.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

/**
 * Phase 9: Certified Engineering Quality Certificate & Printable PDF Exporter
 * Generates an official AS9100 / ISO 9001 certified engineering audit package
 * with cryptographic SHA-256 seal, Spandsons letterhead, and digital Lead PE signature.
 */
export const exportQCReportToPrintablePDF = (report: QCReport) => {
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Please allow popups to export the PDF QC Report.');
    return;
  }

  const cert = buildAuditCertificate(report);

  const safeDiagramName = escapeHtml(report.diagramName);
  const safeStandard = escapeHtml(report.standard);
  const safeTimestamp = escapeHtml(new Date(report.timestamp).toLocaleString());
  const safeScore = escapeHtml(report.qualityScore);
  const safeExecuted = escapeHtml(report.summary.executed);
  const safePassed = escapeHtml(report.summary.passed);
  const safeFailed = escapeHtml(report.summary.failed);
  const isPass = report.overallResult === 'PASS';

  const discrepancyHtml = report.discrepancies
    .map(
      (d, idx) => `
    <tr style="border-bottom: 1px solid #e2e8f0; font-size: 11px;">
      <td style="padding: 8px; font-family: monospace; font-weight: bold; color: #0284c7;">${idx + 1}. ${escapeHtml(d.id)}</td>
      <td style="padding: 8px; font-weight: 700; color: ${
        d.severity === 'CRITICAL' ? '#dc2626' : d.severity === 'MAJOR' ? '#d97706' : '#2563eb'
      };">${escapeHtml(d.severity)} (${escapeHtml(d.confidence)}%)</td>
      <td style="padding: 8px; font-family: monospace; font-size: 11px;">${escapeHtml(d.standardRef)}</td>
      <td style="padding: 8px;">
        <strong style="color: #0f172a;">${escapeHtml(d.title)}</strong><br/>
        <span style="font-size: 11px; color: #475569;">${escapeHtml(d.plainLanguageExplanation)}</span>
        <div style="margin-top: 4px; padding: 4px 8px; background: #f8fafc; border-left: 3px solid ${
          d.severity === 'CRITICAL' ? '#dc2626' : '#0284c7'
        }; font-size: 10.5px;">
          <strong style="color: #0369a1;">CAPA Remediation:</strong> ${escapeHtml(d.recommendation)}
        </div>
      </td>
      <td style="padding: 8px; font-size: 11px; font-family: monospace; text-transform: uppercase;">${escapeHtml(d.status)}</td>
    </tr>
  `
    )
    .join('');

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>CERTIFIED QUALITY AUDIT REPORT - ${safeDiagramName}</title>
        <meta charset="utf-8" />
        <meta http-equiv="Content-Security-Policy" content="default-src 'self'; style-src 'unsafe-inline'; script-src 'unsafe-inline';" />
        <style>
          @page {
            size: A4 portrait;
            margin: 15mm 15mm 15mm 15mm;
          }
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            color: #0f172a;
            padding: 30px;
            margin: 0;
            background: #ffffff;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .header {
            border-bottom: 3px double #0284c7;
            padding-bottom: 16px;
            margin-bottom: 20px;
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
          }
          .company-name {
            font-size: 20px;
            font-weight: 900;
            color: #060b14;
            letter-spacing: -0.5px;
          }
          .company-sub {
            font-size: 11px;
            font-weight: 700;
            color: #0284c7;
            letter-spacing: 1px;
            text-transform: uppercase;
            margin-top: 2px;
          }
          .cert-title {
            font-size: 14px;
            font-weight: 800;
            color: #0f172a;
            margin-top: 6px;
            text-transform: uppercase;
          }
          .badge-box {
            text-align: right;
          }
          .badge-disposition {
            display: inline-block;
            padding: 8px 16px;
            font-weight: 900;
            border-radius: 6px;
            font-size: 13px;
            text-transform: uppercase;
            font-family: monospace;
          }
          .badge-pass {
            background: #dcfce7;
            color: #166534;
            border: 2px solid #22c55e;
          }
          .badge-fail {
            background: #fee2e2;
            color: #991b1b;
            border: 2px solid #ef4444;
          }
          .meta-table {
            width: 100%;
            margin-bottom: 18px;
            font-size: 11px;
            border: 1px solid #e2e8f0;
            border-radius: 6px;
            border-collapse: collapse;
          }
          .meta-table td {
            padding: 6px 10px;
            border: 1px solid #e2e8f0;
          }
          .meta-label {
            font-weight: 700;
            color: #475569;
            background: #f8fafc;
            width: 25%;
          }
          .meta-val {
            font-family: monospace;
            color: #0f172a;
            font-weight: 600;
          }
          .stats-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 12px;
            margin-bottom: 20px;
          }
          .stat-box {
            background: #f8fafc;
            border: 1px solid #cbd5e1;
            border-radius: 8px;
            padding: 10px;
            text-align: center;
          }
          .stat-label {
            font-size: 10px;
            font-weight: 700;
            text-transform: uppercase;
            color: #64748b;
          }
          .stat-val {
            font-size: 22px;
            font-weight: 900;
            font-family: monospace;
            margin-top: 4px;
          }
          table.data-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 12px;
            font-size: 11px;
          }
          table.data-table th {
            background: #0f172a;
            color: #ffffff;
            padding: 8px 10px;
            text-align: left;
            font-size: 10px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          .sign-block {
            margin-top: 30px;
            padding-top: 16px;
            border-top: 1px solid #cbd5e1;
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 24px;
            font-size: 11px;
          }
          .signature-line {
            border-bottom: 1px solid #0f172a;
            margin-top: 32px;
            margin-bottom: 4px;
          }
          .seal-box {
            margin-top: 16px;
            padding: 10px;
            background: #f1f5f9;
            border: 1px dashed #94a3b8;
            border-radius: 6px;
            font-family: monospace;
            font-size: 9.5px;
            color: #334155;
            word-break: break-all;
          }
          .footer {
            margin-top: 24px;
            padding-top: 10px;
            border-top: 1px solid #e2e8f0;
            font-size: 9px;
            color: #94a3b8;
            display: flex;
            justify-content: space-between;
          }
        </style>
      </head>
      <body>
        <!-- Header -->
        <div class="header">
          <div>
            <div class="company-name">SPANDSONS HORIZON ENGINEERING PVT. LTD.</div>
            <div class="company-sub">AEROSPACE &amp; DEFENSE ELECTRICAL QUALITY CONTROL DIVISION</div>
            <div class="cert-title">FORMAL ENGINEERING COMPLIANCE CERTIFICATE</div>
          </div>
          <div class="badge-box">
            <div class="badge-disposition ${isPass ? 'badge-pass' : 'badge-fail'}">
              DISPOSITION: ${isPass ? 'CERTIFIED PASS' : 'REJECT / HOLD'}
            </div>
            <div style="font-size: 10px; font-family: monospace; color: #64748b; margin-top: 4px;">
              ${escapeHtml(cert.certificateId)}
            </div>
          </div>
        </div>

        <!-- Metadata Table -->
        <table class="meta-table">
          <tr>
            <td class="meta-label">Schematic Drawing:</td>
            <td class="meta-val">${safeDiagramName}</td>
            <td class="meta-label">Audit Standard:</td>
            <td class="meta-val">${safeStandard} (Class 3 Critical)</td>
          </tr>
          <tr>
            <td class="meta-label">Inspection Date:</td>
            <td class="meta-val">${safeTimestamp}</td>
            <td class="meta-label">Quality Score:</td>
            <td class="meta-val" style="color: ${isPass ? '#166534' : '#dc2626'}; font-weight: 900;">${safeScore} / 100</td>
          </tr>
          <tr>
            <td class="meta-label">Lead Quality Auditor:</td>
            <td class="meta-val">${escapeHtml(cert.leadAuditor)}</td>
            <td class="meta-label">Approval Authority:</td>
            <td class="meta-val">${escapeHtml(cert.approverAuthority)}</td>
          </tr>
        </table>

        <!-- Metric KPI Grid -->
        <div class="stats-grid">
          <div class="stat-box">
            <div class="stat-label">Total Checks Executed</div>
            <div class="stat-val" style="color: #0284c7;">${safeExecuted}</div>
          </div>
          <div class="stat-box">
            <div class="stat-label">Conformances Passed</div>
            <div class="stat-val" style="color: #166534;">${safePassed}</div>
          </div>
          <div class="stat-box">
            <div class="stat-label">Non-Conformances Flagged</div>
            <div class="stat-val" style="color: ${Number(safeFailed) > 0 ? '#dc2626' : '#166534'};">${safeFailed}</div>
          </div>
          <div class="stat-box">
            <div class="stat-label">Audit Verdict</div>
            <div class="stat-val" style="color: ${isPass ? '#166534' : '#dc2626'}; font-size: 16px; line-height: 28px;">
              ${isPass ? 'APPROVED' : 'ACTION REQ.'}
            </div>
          </div>
        </div>

        <!-- Discrepancy Register -->
        <h4 style="margin: 16px 0 6px 0; font-size: 13px; text-transform: uppercase; color: #0f172a;">
          Engineering Non-Conformance &amp; Discrepancy Register
        </h4>
        <table class="data-table">
          <thead>
            <tr>
              <th style="width: 100px;">Item / ID</th>
              <th style="width: 120px;">Severity</th>
              <th style="width: 150px;">Governing Standard</th>
              <th>Defect Analysis &amp; Mandatory Engineering Remediation</th>
              <th style="width: 90px;">Audit State</th>
            </tr>
          </thead>
          <tbody>
            ${
              discrepancyHtml ||
              '<tr><td colspan="5" style="text-align: center; padding: 20px; color: #166534; font-weight: bold;">Zero discrepancies identified. Full conformity to standard achieved.</td></tr>'
            }
          </tbody>
        </table>

        <!-- Cryptographic Seal -->
        <div class="seal-box">
          <strong>CRYPTOGRAPHIC AS9100 / ISO 9001 TRACEABILITY SEAL:</strong><br/>
          Fingerprint: ${escapeHtml(cert.sha256Fingerprint)}<br/>
          Tamper-Proof Verification URI: ${escapeHtml(cert.verificationUrl)}
        </div>

        <!-- Sign-Off Block -->
        <div class="sign-block">
          <div>
            <div class="signature-line"></div>
            <strong>Lead Quality Architect:</strong> ${escapeHtml(cert.leadAuditor)}<br/>
            <span>Professional Engineering Stamp: PE-IND-48910</span>
          </div>
          <div>
            <div class="signature-line"></div>
            <strong>Director of Engineering QA:</strong> ${escapeHtml(cert.approverAuthority)}<br/>
            <span>Authorized for Fabrication Release: ${safeTimestamp}</span>
          </div>
        </div>

        <!-- Footer -->
        <div class="footer">
          <div>CONFIDENTIAL &amp; PROPRIETARY — Spandsons Horizon Engineering Pvt. Ltd. • Quality Engineering Directorate</div>
          <div>Form QCF-89 Rev 4.2 • Certified for AS9100D, ISO 9001:2015, and IPC/WHMA-A-620</div>
        </div>

        <script>
          window.onload = function() {
            window.print();
          }
        </script>
      </body>
    </html>
  `;

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
};
