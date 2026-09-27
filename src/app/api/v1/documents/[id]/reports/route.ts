import { NextRequest } from 'next/server';
import { resolveTenant } from '@/lib/tenant-resolver';
import { prisma } from '@/lib/prisma';
import { apiSuccess, apiError } from '@/lib/api-v1-response';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const tenant = await resolveTenant(req);
    const { id } = await params;

    const document = await prisma.document.findFirst({
      where: { id, tenantId: tenant.id },
      include: {
        versions: {
          orderBy: { version: 'desc' },
          take: 1,
          include: {
            findings: true,
          },
        },
      },
    });

    if (!document) {
      return apiError('DOCUMENT_NOT_FOUND', `Document "${id}" was not found.`, 404);
    }

    const version = document.versions[0];
    const reportId = `rep_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 6)}`;
    const pdfKey = `reports/${tenant.id}/${reportId}_certificate.pdf`;
    const xlsxKey = `reports/${tenant.id}/${reportId}_netlist_bom.xlsx`;

    const report = await prisma.report.create({
      data: {
        id: reportId,
        tenantId: tenant.id,
        documentVersionId: version?.id || null,
        reportVersion: '1.0.0',
        pdfStorageKey: pdfKey,
        xlsxStorageKey: xlsxKey,
        generatedBy: 'Lead QC Inspector',
      },
    });

    return apiSuccess({
      report: {
        id: report.id,
        document_id: document.id,
        version: report.reportVersion,
        pdf_download_url: `/api/v1/reports/${report.id}/download?format=pdf`,
        xlsx_download_url: `/api/v1/reports/${report.id}/download?format=xlsx`,
        findings_included: version?.findings.length || 0,
        created_at: report.createdAt,
      },
    }, 201);
  } catch (err: any) {
    return apiError('REPORT_GENERATION_FAILED', err.message || 'Failed to generate report', 500);
  }
}
