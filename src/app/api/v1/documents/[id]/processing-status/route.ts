import { NextRequest } from 'next/server';
import { requirePermission, handleAuthError } from '@/lib/auth-guard';
import { prisma } from '@/lib/prisma';
import { apiSuccess, apiError } from '@/lib/api-v1-response';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authCtx = await requirePermission(req, 'document:read');
    const tenant = authCtx.tenant;
    const { id } = await params;
    const jobId = req.nextUrl.searchParams.get('job_id');

    const document = await prisma.document.findFirst({
      where: { id, tenantId: tenant.id },
      include: {
        versions: {
          orderBy: { version: 'desc' },
          take: 1,
          include: {
            _count: { select: { findings: true, components: true, pages: true } },
            extractionArtifacts: {
              select: { id: true, artifactType: true, sha256: true, sizeBytes: true, createdAt: true },
            },
          },
        },
      },
    });

    if (!document) {
      return apiError('DOCUMENT_NOT_FOUND', `Document "${id}" was not found in current organization.`, 404);
    }

    const version = document.versions[0];
    let job: any = null;

    if (version) {
      if (jobId) {
        job = await prisma.processingJob.findFirst({
          where: { id: jobId, tenantId: tenant.id, documentVersionId: version.id },
        });
      } else {
        job = await prisma.processingJob.findFirst({
          where: { tenantId: tenant.id, documentVersionId: version.id },
          orderBy: { createdAt: 'desc' },
        });
      }
    }

    const status = job ? job.status : version ? version.processingStatus : document.status;

    return apiSuccess({
      document_id: document.id,
      version_id: version?.id,
      version_number: version?.version || 1,
      status: document.status,
      processing_status: status,
      job: job
        ? {
            id: job.id,
            status: job.status,
            stage: job.stage,
            progress: job.progress,
            error_code: job.errorCode,
            error_message: job.errorMessage,
            started_at: job.startedAt,
            completed_at: job.completedAt,
          }
        : null,
      stats: {
        pages_count: version?._count.pages || 0,
        findings_count: version?._count.findings || 0,
        components_count: version?._count.components || 0,
      },
      artifacts: version?.extractionArtifacts || [],
      updated_at: document.updatedAt,
    });
  } catch (err: any) {
    const authResp = handleAuthError(err);
    if (authResp) return authResp;
    return apiError('STATUS_FETCH_FAILED', err.message || 'Failed to fetch processing status', 500);
  }
}
