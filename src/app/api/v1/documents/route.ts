import { NextRequest } from 'next/server';
import { requirePermission, handleAuthError } from '@/lib/auth-guard';
import { prisma } from '@/lib/prisma';
import { apiSuccess, apiError } from '@/lib/api-v1-response';
import { recordAuditEvent } from '@/lib/audit/audit-logger';
import { verifyTenantStorageKeyAccess } from '@/lib/storage/storage-provider';

export async function GET(req: NextRequest) {
  try {
    const authCtx = await requirePermission(req, 'document:read');
    const tenant = authCtx.tenant;

    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get('project_id');
    const status = searchParams.get('status');
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)));

    const documents = await prisma.document.findMany({
      where: {
        tenantId: tenant.id,
        ...(projectId ? { projectId } : {}),
        ...(status ? { status } : {}),
      },
      include: {
        versions: {
          orderBy: { version: 'desc' },
          take: 1,
          include: {
            _count: { select: { findings: true } },
          },
        },
        project: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return apiSuccess({
      documents: documents.map((d) => ({
        id: d.id,
        filename: d.filename,
        mime_type: d.mimeType,
        size_bytes: d.sizeBytes,
        status: d.status,
        project: d.project,
        created_at: d.createdAt,
        latest_version: d.versions[0]
          ? {
              version: d.versions[0].version,
              processing_status: d.versions[0].processingStatus,
              findings_count: d.versions[0]._count.findings,
            }
          : null,
      })),
    });
  } catch (err: any) {
    const authResp = handleAuthError(err);
    if (authResp) return authResp;
    return apiError('DOCUMENTS_FETCH_FAILED', err.message || 'Failed to list documents', 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const authCtx = await requirePermission(req, 'document:upload');
    const tenant = authCtx.tenant;
    const user = authCtx.user;

    const body = await req.json().catch(() => ({}));
    const { filename, mime_type, size_bytes, storage_key, project_id, checksum } = body;

    if (!filename || !storage_key) {
      return apiError('VALIDATION_ERROR', 'filename and storage_key are required.', 400);
    }

    if (!verifyTenantStorageKeyAccess(storage_key, tenant.id)) {
      return apiError('FORBIDDEN', 'Invalid storage_key: must be within organization storage namespace.', 403);
    }

    // Verify project belongs to tenant if provided
    if (project_id) {
      const proj = await prisma.project.findFirst({
        where: { id: project_id, tenantId: tenant.id },
      });
      if (!proj) {
        return apiError('PROJECT_NOT_FOUND', `Project ${project_id} not found in organization.`, 404);
      }
    }

    const document = await prisma.document.create({
      data: {
        tenantId: tenant.id,
        projectId: project_id || null,
        filename,
        mimeType: mime_type || 'application/pdf',
        sizeBytes: size_bytes || 0,
        storageKey: storage_key,
        status: 'UPLOADED',
        checksum: checksum || null,
        createdBy: user.id,
        versions: {
          create: {
            version: 1,
            storageKey: storage_key,
            processingStatus: 'QUEUED',
            parserVersion: '1.0.0',
          },
        },
      },
      include: {
        versions: true,
      },
    });

    // Record audit event
    await recordAuditEvent({
      tenantId: tenant.id,
      actorId: user.id,
      action: 'DOCUMENT_UPLOADED',
      entityType: 'DOCUMENT',
      entityId: document.id,
      metadata: { filename, sizeBytes: size_bytes },
    });

    return apiSuccess({
      document: {
        id: document.id,
        filename: document.filename,
        mime_type: document.mimeType,
        size_bytes: document.sizeBytes,
        status: document.status,
        version: document.versions[0]?.version || 1,
        created_at: document.createdAt,
      },
    }, 201);
  } catch (err: any) {
    const authResp = handleAuthError(err);
    if (authResp) return authResp;
    return apiError('DOCUMENT_CREATION_FAILED', err.message || 'Failed to record document', 400);
  }
}
