import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { apiSuccess, apiError } from '@/lib/api-v1-response';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const org = await prisma.tenant.findUnique({
      where: { id },
      include: {
        users: { select: { id: true, name: true, email: true, role: true } },
        projects: true,
        subscriptions: { where: { status: 'ACTIVE' }, include: { plan: true } },
      },
    });

    if (!org) {
      return apiError('ORGANIZATION_NOT_FOUND', `Organization with id "${id}" was not found.`, 404);
    }

    return apiSuccess({ organization: org });
  } catch (err: any) {
    return apiError('ORGANIZATION_FETCH_FAILED', err.message || 'Failed to fetch organization', 500);
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const { name, status } = body;

    const org = await prisma.tenant.findUnique({ where: { id } });
    if (!org) {
      return apiError('ORGANIZATION_NOT_FOUND', `Organization with id "${id}" was not found.`, 404);
    }

    const updated = await prisma.tenant.update({
      where: { id },
      data: {
        ...(name ? { name } : {}),
        ...(status ? { status } : {}),
      },
    });

    return apiSuccess({ organization: updated });
  } catch (err: any) {
    return apiError('ORGANIZATION_UPDATE_FAILED', err.message || 'Failed to update organization', 400);
  }
}
