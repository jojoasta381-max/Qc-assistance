import { NextRequest } from 'next/server';
import { requirePermission, handleAuthError } from '@/lib/auth-guard';
import { prisma } from '@/lib/prisma';
import { apiSuccess, apiError } from '@/lib/api-v1-response';
import { recordAuditEvent } from '@/lib/audit/audit-logger';

export async function GET(req: NextRequest) {
  try {
    const authCtx = await requirePermission(req, 'project:read');
    const tenant = authCtx.tenant;

    const projects = await prisma.project.findMany({
      where: { tenantId: tenant.id },
      include: {
        _count: { select: { documents: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });

    return apiSuccess({
      projects: projects.map((p) => ({
        id: p.id,
        name: p.name,
        description: p.description,
        status: p.status,
        created_at: p.createdAt,
        updated_at: p.updatedAt,
        document_count: p._count.documents,
      })),
    });
  } catch (err: any) {
    const authResp = handleAuthError(err);
    if (authResp) return authResp;
    return apiError('PROJECTS_FETCH_FAILED', err.message || 'Failed to list projects', 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const authCtx = await requirePermission(req, 'project:create');
    const tenant = authCtx.tenant;
    const user = authCtx.user;

    const body = await req.json().catch(() => ({}));
    const { name, description } = body;

    if (!name || typeof name !== 'string' || !name.trim()) {
      return apiError('VALIDATION_ERROR', 'Project name is required and cannot be empty.', 400);
    }

    const trimmedName = name.trim();
    if (trimmedName.length > 100) {
      return apiError('VALIDATION_ERROR', 'Project name must be 100 characters or fewer.', 400);
    }

    // Check for duplicate project name in same tenant
    const existing = await prisma.project.findFirst({
      where: { tenantId: tenant.id, name: trimmedName },
    });
    if (existing) {
      return apiError('CONFLICT', `A project named "${trimmedName}" already exists in this organization.`, 409);
    }

    const project = await prisma.project.create({
      data: {
        tenantId: tenant.id,
        name: trimmedName,
        description: description ? String(description).slice(0, 500) : null,
        status: 'ACTIVE',
      },
    });

    await recordAuditEvent({
      tenantId: tenant.id,
      actorId: user.id,
      action: 'PROJECT_CREATED',
      entityType: 'PROJECT',
      entityId: project.id,
      metadata: { name: project.name },
    });

    return apiSuccess({ project }, 201);
  } catch (err: any) {
    const authResp = handleAuthError(err);
    if (authResp) return authResp;
    return apiError('PROJECT_CREATION_FAILED', err.message || 'Failed to create project', 400);
  }
}
