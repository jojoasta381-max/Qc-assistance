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
    const authCtx = await requirePermission(req, 'project:read');
    const tenant = authCtx.tenant;
    const { id } = await params;

    const project = await prisma.project.findFirst({
      where: { id, tenantId: tenant.id },
      include: {
        documents: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!project) {
      return apiError('PROJECT_NOT_FOUND', `Project "${id}" not found in current organization.`, 404);
    }

    return apiSuccess({ project });
  } catch (err: any) {
    const authResp = handleAuthError(err);
    if (authResp) return authResp;
    return apiError('PROJECT_FETCH_FAILED', err.message || 'Failed to fetch project', 500);
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authCtx = await requirePermission(req, 'project:update');
    const tenant = authCtx.tenant;
    const user = authCtx.user;
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const { name, description, status } = body;

    const project = await prisma.project.findFirst({
      where: { id, tenantId: tenant.id },
    });
    if (!project) {
      return apiError('PROJECT_NOT_FOUND', `Project "${id}" not found in current organization.`, 404);
    }

    const updated = await prisma.project.update({
      where: { id: project.id },
      data: {
        ...(name ? { name } : {}),
        ...(description !== undefined ? { description } : {}),
        ...(status ? { status } : {}),
      },
    });

    await recordAuditEvent({
      tenantId: tenant.id,
      actorId: user.id,
      action: 'PROJECT_UPDATED',
      entityType: 'PROJECT',
      entityId: project.id,
      metadata: { name, status },
    });

    return apiSuccess({ project: updated });
  } catch (err: any) {
    const authResp = handleAuthError(err);
    if (authResp) return authResp;
    return apiError('PROJECT_UPDATE_FAILED', err.message || 'Failed to update project', 400);
  }
}
