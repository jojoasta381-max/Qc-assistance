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
    return apiError('PROJECT_FETCH_FAILED', err.message || 'Failed to fetch project', 500);
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const tenant = await resolveTenant(req);
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const { name, description, status } = body;

    const project = await prisma.project.findFirst({
      where: { id, tenantId: tenant.id },
    });
    if (!project) {
      return apiError('PROJECT_NOT_FOUND', `Project "${id}" not found.`, 404);
    }

    const updated = await prisma.project.update({
      where: { id },
      data: {
        ...(name ? { name } : {}),
        ...(description !== undefined ? { description } : {}),
        ...(status ? { status } : {}),
      },
    });

    return apiSuccess({ project: updated });
  } catch (err: any) {
    return apiError('PROJECT_UPDATE_FAILED', err.message || 'Failed to update project', 400);
  }
}
