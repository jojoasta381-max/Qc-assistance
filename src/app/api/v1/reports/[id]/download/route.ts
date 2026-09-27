import { NextRequest, NextResponse } from 'next/server';
import { resolveTenant } from '@/lib/tenant-resolver';
import { prisma } from '@/lib/prisma';
import { apiError } from '@/lib/api-v1-response';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const tenant = await resolveTenant(req);
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

    // Default JSON report certificate
    return NextResponse.json({
      report_id: report.id,
      organization: tenant.name,
      document: report.documentVersion?.document?.filename,
      findings: report.documentVersion?.findings,
      issued_at: report.createdAt,
    });
  } catch (err: any) {
    return apiError('REPORT_DOWNLOAD_FAILED', err.message || 'Failed to download report', 500);
  }
}
