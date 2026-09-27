import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ensureDefaultTenantData } from '@/lib/db-service';
import { apiSuccess, apiError } from '@/lib/api-v1-response';

export async function GET(req: NextRequest) {
  try {
    await ensureDefaultTenantData();
    const organizations = await prisma.tenant.findMany({
      include: {
        _count: {
          select: { users: true, projects: true, documents: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return apiSuccess({
      organizations: organizations.map((o) => ({
        id: o.id,
        name: o.name,
        slug: o.slug,
        status: o.status,
        plan: o.plan,
        check_quota: o.checkQuota,
        quota_used: o.quotaUsed,
        created_at: o.createdAt,
        counts: o._count,
      })),
    });
  } catch (err: any) {
    return apiError('ORGANIZATIONS_FETCH_FAILED', err.message || 'Failed to list organizations', 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { name, slug } = body;

    if (!name) {
      return apiError('VALIDATION_ERROR', 'Organization name is required.', 400);
    }

    const orgSlug = slug || name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

    const existing = await prisma.tenant.findUnique({
      where: { slug: orgSlug },
    });
    if (existing) {
      return apiError('CONFLICT', `Organization with slug "${orgSlug}" already exists.`, 409);
    }

    const newOrg = await prisma.tenant.create({
      data: {
        name,
        slug: orgSlug,
        plan: 'NORMAL_1',
        checkQuota: 100,
        quotaUsed: 0,
      },
    });

    return apiSuccess({
      organization: {
        id: newOrg.id,
        name: newOrg.name,
        slug: newOrg.slug,
        status: newOrg.status,
        plan: newOrg.plan,
        created_at: newOrg.createdAt,
      },
    }, 201);
  } catch (err: any) {
    return apiError('ORGANIZATION_CREATION_FAILED', err.message || 'Failed to create organization', 400);
  }
}
