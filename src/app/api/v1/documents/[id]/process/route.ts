import { NextRequest } from 'next/server';
import { requirePermission, handleAuthError } from '@/lib/auth-guard';
import { prisma } from '@/lib/prisma';
import { apiSuccess, apiError } from '@/lib/api-v1-response';
import { reserveQuotaAtomically, refundQuotaAtomically } from '@/lib/billing/quota-manager';
import { recordAuditEvent } from '@/lib/audit/audit-logger';
import { runDocumentProcessingPipeline } from '@/lib/pipeline/document-processor';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let reserved = false;
  let activeTenantId: string | null = null;
  let docId: string | null = null;

  try {
    // 1. Authorize: requires authenticated member with 'analysis:run' permission
    const authCtx = await requirePermission(req, 'analysis:run');
    const tenant = authCtx.tenant;
    const user = authCtx.user;
    activeTenantId = tenant.id;

    const { id } = await params;
    docId = id;
    const body = await req.json().catch(() => ({}));
    const standardName = body.standard || 'IPC-WHMA-A-620';
    const isSync = req.nextUrl.searchParams.get('sync') === 'true' || body.sync === true;

    // 2. Fetch document verifying strict tenant ownership
    const document = await prisma.document.findFirst({
      where: { id, tenantId: tenant.id },
      include: {
        versions: { orderBy: { version: 'desc' }, take: 1 },
      },
    });

    if (!document) {
      return apiError('DOCUMENT_NOT_FOUND', `Document "${id}" was not found in current organization.`, 404);
    }

    let version = document.versions[0];
    if (!version) {
      version = await prisma.documentVersion.create({
        data: {
          documentId: document.id,
          version: 1,
          storageKey: document.storageKey,
          processingStatus: 'QUEUED',
        },
      });
    }

    // 3. Quota Enforcement: ATOMIC reservation before expensive processing
    const hasQuota = await reserveQuotaAtomically(tenant.id);
    if (!hasQuota) {
      return apiError(
        'QUOTA_EXCEEDED',
        `Quota of ${tenant.checkQuota} checks exhausted. Please upgrade plan or buy pay-per-check top-up.`,
        402
      );
    }
    reserved = true;

    // Record usage in ledger
    await prisma.usageLedger.create({
      data: {
        tenantId: tenant.id,
        eventType: 'DIAGRAM_INSPECTED',
        quantity: -1,
        referenceType: 'DOCUMENT',
        referenceId: document.id,
      },
    });

    // Record audit event
    await recordAuditEvent({
      tenantId: tenant.id,
      actorId: user.id,
      action: 'ANALYSIS_STARTED',
      entityType: 'DOCUMENT',
      entityId: document.id,
      metadata: { standardName },
    });

    // 4. Create ProcessingJob tracking truthful states
    const job = await prisma.processingJob.create({
      data: {
        tenantId: tenant.id,
        documentVersionId: version.id,
        status: 'QUEUED',
        stage: 'QUEUED',
        progress: 0,
        metadata: JSON.stringify({ standardName }),
      },
    });

    // 5. Run genuine processing pipeline on real bytes
    const pipelinePromise = runDocumentProcessingPipeline({
      jobId: job.id,
      tenantId: tenant.id,
      documentId: document.id,
      versionId: version.id,
      userId: user.id,
    });

    // If synchronous execution requested (for test suites or direct workflows)
    if (isSync) {
      await pipelinePromise;
      const updatedJob = await prisma.processingJob.findUnique({ where: { id: job.id } });
      const updatedDoc = await prisma.document.findUnique({ where: { id: document.id } });

      return apiSuccess({
        job: {
          id: job.id,
          document_id: document.id,
          version_id: version.id,
          status: updatedJob?.status || 'COMPLETED',
          stage: updatedJob?.stage || 'READY_FOR_GRAPH',
          progress: updatedJob?.progress || 100,
          document_status: updatedDoc?.status || 'READY_FOR_GRAPH',
        },
      });
    }

    // Otherwise return asynchronous job reference immediately to prevent serverless timeout
    return apiSuccess(
      {
        job: {
          id: job.id,
          document_id: document.id,
          version_id: version.id,
          status: 'QUEUED',
          stage: 'QUEUED',
          progress: 0,
          status_url: `/api/v1/documents/${document.id}/processing-status?job_id=${job.id}`,
        },
      },
      202
    );
  } catch (err: any) {
    const authResp = handleAuthError(err);
    if (authResp) return authResp;

    if (reserved && activeTenantId) {
      await refundQuotaAtomically(activeTenantId, err.message || 'Processing error', docId || undefined);
    }

    return apiError('PROCESSING_FAILED', err.message || 'Diagram processing failed', 500);
  }
}
