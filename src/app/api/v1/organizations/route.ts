import { NextRequest } from 'next/server';
import { requireAuth, handleAuthError } from '@/lib/auth-guard';
import { prisma } from '@/lib/prisma';
import { apiSuccess, apiError } from '@/lib/api-v1-response';
import { recordAuditEvent } from '@/lib/audit/audit-logger';

export async function GET(req: NextRequest) {
  try {
    const { user } = await requireAuth(req);

    // Find all memberships for authenticated user
    const memberships = await prisma.organizationMember.findMany({
      where: { userId: user.id },
      select: { tenantId: true },
    });

    const tenantIds = Array.from(new Set([user.tenantId, ...memberships.map((m) => m.tenantId)]));

    const organizations = await prisma.tenant.findMany({
      where: { id: { in: tenantIds } },
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
    const authResp = handleAuthError(err);
    if (authResp) return authResp;
    return apiError('ORGANIZATIONS_FETCH_FAILED', err.message || 'Failed to list organizations', 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const { user } = await requireAuth(req);
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

    // Transactionally create tenant and add user as OWNER member
    const newOrg = await prisma.$transaction(async (tx) => {
      const createdOrg = await tx.tenant.create({
        data: {
          name,
          slug: orgSlug,
          plan: 'NORMAL_1',
          checkQuota: 100,
          quotaUsed: 0,
        },
      });

      await tx.organizationMember.create({
        data: {
          tenantId: createdOrg.id,
          userId: user.id,
          role: 'OWNER',
        },
      });

      return createdOrg;
    });

    await recordAuditEvent({
      tenantId: newOrg.id,
      actorId: user.id,
      action: 'ORGANIZATION_CREATED',
      entityType: 'TENANT',
      entityId: newOrg.id,
      metadata: { name: newOrg.name, slug: newOrg.slug },
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
    const authResp = handleAuthError(err);
    if (authResp) return authResp;
    return apiError('ORGANIZATION_CREATION_FAILED', err.message || 'Failed to create organization', 400);
  }
}
