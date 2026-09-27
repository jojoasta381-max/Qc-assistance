import { NextRequest } from 'next/server';
import { resolveTenant } from '@/lib/tenant-resolver';
import { prisma } from '@/lib/prisma';
import { apiSuccess, apiError } from '@/lib/api-v1-response';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const tenant = await resolveTenant(req);
    const { id } = await params;

    const report = await prisma.report.findFirst({
      where: { id, tenantId: tenant.id },
      include: {
        documentVersion: {
          include: {
            document: { select: { id: true, filename: true } },
            findings: true,
          },
        },
      },
    });

    if (!report) {
      return apiError('REPORT_NOT_FOUND', `Report "${id}" was not found.`, 404);
    }

    return apiSuccess({
      report: {
        id: report.id,
        version: report.reportVersion,
        document: report.documentVersion?.document,
        findings_count: report.documentVersion?.findings.length || 0,
        pdf_storage_key: report.pdfStorageKey,
        xlsx_storage_key: report.xlsxStorageKey,
        generated_by: report.generatedBy,
        created_at: report.createdAt,
      },
    });
  } catch (err: any) {
    return apiError('REPORT_FETCH_FAILED', err.message || 'Failed to fetch report', 500);
  }
}
