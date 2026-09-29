import { NextRequest, NextResponse } from 'next/server';
import { requirePermission, handleAuthError } from '@/lib/auth-guard';
import { prisma } from '@/lib/prisma';
import { apiError } from '@/lib/api-v1-response';
import { recordAuditEvent } from '@/lib/audit/audit-logger';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authCtx = await requirePermission(req, 'report:download');
    const tenant = authCtx.tenant;
    const user = authCtx.user;

    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const format = searchParams.get('format') || 'csv';

    const report = await prisma.report.findFirst({
      where: { id, tenantId: tenant.id },
      include: {
        documentVersion: {
          include: {
            document: true,
            findings: true,
          },
        },
      },
    });

    if (!report) {
      return apiError('REPORT_NOT_FOUND', `Report "${id}" was not found.`, 404);
    }

    await recordAuditEvent({
      tenantId: tenant.id,
      actorId: user.id,
      action: 'REPORT_DOWNLOADED',
      entityType: 'REPORT',
      entityId: report.id,
      metadata: { format },
    });

    if (format === 'csv' || format === 'xlsx') {
      const csvContent = [
        'Finding ID,Severity,Status,Standard Ref,Description,Confidence',
        ...(report.documentVersion?.findings || []).map((f) => {
          const ev = f.evidence ? JSON.parse(f.evidence) : {};
          return `"${f.id}","${f.severity}","${f.status}","${ev.standardRef || 'IPC-620'}","${f.description.replace(/"/g, '""')}","${f.confidence * 100}%"`;
        }),
      ].join('\n');

      return new NextResponse(csvContent, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="QC_Report_${id}.csv"`,
        },
      });
    }

    if (format === 'pdf' || format === 'html') {
      const findings = report.documentVersion?.findings || [];
      const criticalCount = findings.filter((f) => f.severity === 'CRITICAL').length;
      const highCount = findings.filter((f) => f.severity === 'HIGH').length;
      const mediumCount = findings.filter((f) => f.severity === 'MEDIUM').length;
      const lowCount = findings.filter((f) => f.severity === 'LOW').length;

      const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <title>SpanQC Engineering Inspection Report - ${report.documentVersion?.document?.filename || id}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #0F172A; padding: 40px; margin: 0; background: #fff; }
    .header { border-bottom: 2px solid #0284C7; padding-bottom: 16px; margin-bottom: 24px; display: flex; justify-content: space-between; align-items: flex-start; }
    .title { font-size: 20px; font-weight: 800; color: #0A1120; }
    .sub { font-size: 12px; color: #0284C7; font-weight: 600; text-transform: uppercase; margin-top: 4px; }
    .meta-box { background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 14px; margin-bottom: 20px; font-size: 12px; }
    .meta-row { display: flex; justify-content: space-between; margin-bottom: 6px; }
    .meta-label { color: #64748B; font-weight: 600; }
    .meta-val { font-family: monospace; font-weight: 700; color: #0F172A; }
    .summary-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 24px; }
    .summary-card { background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 12px; text-align: center; }
    .summary-num { font-size: 22px; font-weight: 800; font-family: monospace; }
    .summary-title { font-size: 10px; color: #64748B; text-transform: uppercase; font-weight: 700; }
    table { width: 100%; border-collapse: collapse; margin-top: 12px; font-size: 11px; }
    th { background: #0F172A; color: #fff; padding: 8px 10px; text-align: left; font-size: 10px; text-transform: uppercase; }
    td { padding: 8px 10px; border-bottom: 1px solid #E2E8F0; }
    .sev-CRITICAL { color: #DC2626; font-weight: 700; }
    .sev-HIGH { color: #EA580C; font-weight: 700; }
    .sev-MEDIUM { color: #D97706; font-weight: 700; }
    .sev-LOW { color: #0284C7; font-weight: 700; }
    .footer { margin-top: 36px; padding-top: 16px; border-top: 1px solid #E2E8F0; font-size: 10px; color: #94A3B8; text-align: center; }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="title">${tenant.name}</div>
      <div class="sub">AI-Assisted Wiring Diagram Inspection Report</div>
    </div>
    <div style="text-align: right; font-size: 11px; color: #64748B;">
      <div>Report ID: <span style="font-family: monospace; font-weight: bold; color: #0F172A;">${report.id}</span></div>
      <div>Date: ${new Date(report.createdAt).toLocaleString()}</div>
    </div>
  </div>

  <div class="meta-box">
    <div class="meta-row"><span class="meta-label">Document Filename:</span><span class="meta-val">${report.documentVersion?.document?.filename || 'Unknown'}</span></div>
    <div class="meta-row"><span class="meta-label">Document Version:</span><span class="meta-val">v${report.documentVersion?.version || 1}</span></div>
    <div class="meta-row"><span class="meta-label">Source Drawing SHA-256:</span><span class="meta-val">${report.documentVersion?.document?.sourceSha256 || 'Calculated at ingestion'}</span></div>
    <div class="meta-row"><span class="meta-label">Generated By:</span><span class="meta-val">${report.generatedBy || 'Engineering Lead'}</span></div>
  </div>

  <div class="summary-grid">
    <div class="summary-card"><div class="summary-num" style="color: #DC2626;">${criticalCount}</div><div class="summary-title">Critical Non-Conformances</div></div>
    <div class="summary-card"><div class="summary-num" style="color: #EA580C;">${highCount}</div><div class="summary-title">High Priority</div></div>
    <div class="summary-card"><div class="summary-num" style="color: #D97706;">${mediumCount}</div><div class="summary-title">Medium Priority</div></div>
    <div class="summary-card"><div class="summary-num" style="color: #0284C7;">${lowCount}</div><div class="summary-title">Low / Advisory</div></div>
  </div>

  <h3 style="font-size: 13px; text-transform: uppercase; color: #0F172A; margin-bottom: 8px;">Engineering Findings Register (${findings.length} Total)</h3>
  <table>
    <thead>
      <tr>
        <th style="width: 15%;">Finding ID</th>
        <th style="width: 12%;">Severity</th>
        <th style="width: 15%;">Status</th>
        <th style="width: 43%;">Description & Evidence</th>
        <th style="width: 15%;">Confidence</th>
      </tr>
    </thead>
    <tbody>
      ${findings.map((f) => `
        <tr>
          <td style="font-family: monospace; font-weight: bold;">${f.id.slice(0, 12)}</td>
          <td class="sev-${f.severity}">${f.severity}</td>
          <td style="font-family: monospace; font-weight: 600;">${f.status}</td>
          <td>${f.description}</td>
          <td style="font-family: monospace;">${Math.round(f.confidence * 100)}%</td>
        </tr>
      `).join('')}
    </tbody>
  </table>

  <div class="footer">
    Generated by SpanQC AI-Assisted Quality Checking System. This report assists engineering teams in reviewing wiring diagrams; final design approval remains with certified engineering personnel.
  </div>
</body>
</html>`;

      return new NextResponse(htmlContent, {
        status: 200,
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'Content-Disposition': `inline; filename="QC_Report_${id}.html"`,
        },
      });
    }

    // Default JSON report
    return NextResponse.json({
      report_id: report.id,
      organization: tenant.name,
      document: report.documentVersion?.document?.filename,
      findings: report.documentVersion?.findings,
      issued_at: report.createdAt,
    });
  } catch (err: any) {
    const authResp = handleAuthError(err);
    if (authResp) return authResp;
    return apiError('REPORT_DOWNLOAD_FAILED', err.message || 'Failed to download report', 500);
  }
}
