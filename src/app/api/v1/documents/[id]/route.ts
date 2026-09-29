import { NextRequest } from 'next/server';
import { requirePermission, handleAuthError } from '@/lib/auth-guard';
import { prisma } from '@/lib/prisma';
import { apiSuccess, apiError } from '@/lib/api-v1-response';
import { recordAuditEvent } from '@/lib/audit/audit-logger';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authCtx = await requirePermission(req, 'document:read');
    const tenant = authCtx.tenant;
    const { id } = await params;

    const document = await prisma.document.findFirst({
      where: { id, tenantId: tenant.id },
      include: {
        project: true,
        versions: {
          orderBy: { version: 'desc' },
          include: {
            findings: {
              include: { rule: true },
            },
            components: true,
            connections: true,
          },
        },
      },
    });

    if (!document) {
      return apiError('DOCUMENT_NOT_FOUND', `Document "${id}" was not found.`, 404);
    }

    return apiSuccess({ document });
  } catch (err: any) {
    const authResp = handleAuthError(err);
    if (authResp) return authResp;
    return apiError('DOCUMENT_FETCH_FAILED', err.message || 'Failed to fetch document', 500);
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authCtx = await requirePermission(req, 'document:delete');
    const tenant = authCtx.tenant;
    const user = authCtx.user;
    const { id } = await params;

    const document = await prisma.document.findFirst({
      where: { id, tenantId: tenant.id },
    });

    if (!document) {
      return apiError('DOCUMENT_NOT_FOUND', `Document "${id}" was not found.`, 404);
    }

    await prisma.document.delete({ where: { id: document.id } });

    await recordAuditEvent({
      tenantId: tenant.id,
      actorId: user.id,
      action: 'DOCUMENT_DELETED',
      entityType: 'DOCUMENT',
      entityId: id,
      metadata: { filename: document.filename },
    });

    return apiSuccess({ message: 'Document deleted successfully.', id });
  } catch (err: any) {
    const authResp = handleAuthError(err);
    if (authResp) return authResp;
    return apiError('DOCUMENT_DELETE_FAILED', err.message || 'Failed to delete document', 400);
  }
}
