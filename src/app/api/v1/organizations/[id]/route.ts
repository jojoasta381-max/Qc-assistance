import { NextRequest } from 'next/server';
import { requireAuth, handleAuthError, AuthError } from '@/lib/auth-guard';
import { prisma } from '@/lib/prisma';
import { apiSuccess, apiError } from '@/lib/api-v1-response';
import { recordAuditEvent } from '@/lib/audit/audit-logger';

/**
 * Helper to verify that authenticated user is a member of the target organization
 */
async function verifyOrgMembership(userId: string, userPrimaryTenantId: string, targetOrgId: string) {
  if (userPrimaryTenantId === targetOrgId) {
    return { isMember: true, role: 'OWNER' };
  }

  const membership = await prisma.organizationMember.findUnique({
    where: {
      tenantId_userId: {
        tenantId: targetOrgId,
        userId,
      },
    },
  });

  if (!membership) {
    return { isMember: false, role: null };
  }

  return { isMember: true, role: membership.role };
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user } = await requireAuth(req);
    const { id } = await params;

    // Strict membership check to prevent IDOR
    const { isMember } = await verifyOrgMembership(user.id, user.tenantId, id);
    if (!isMember) {
      throw new AuthError(
        'FORBIDDEN',
        `Access denied: You are not a verified member of organization "${id}".`,
        403
      );
    }

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
    const authResp = handleAuthError(err);
    if (authResp) return authResp;
    return apiError('ORGANIZATION_FETCH_FAILED', err.message || 'Failed to fetch organization', 500);
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user } = await requireAuth(req);
    const { id } = await params;

    // Enforce administrative role for organization modification
    const { isMember, role } = await verifyOrgMembership(user.id, user.tenantId, id);
    if (!isMember) {
      throw new AuthError(
        'FORBIDDEN',
        `Access denied: You are not a verified member of organization "${id}".`,
        403
      );
    }

    const normalizedRole = (role || user.role).toUpperCase();
    if (normalizedRole !== 'OWNER' && normalizedRole !== 'ADMIN') {
      throw new AuthError(
        'FORBIDDEN',
        'Only Organization Owners or Admins are permitted to modify organization settings.',
        403
      );
    }

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

    await recordAuditEvent({
      tenantId: id,
      actorId: user.id,
      action: 'ORGANIZATION_UPDATED',
      entityType: 'TENANT',
      entityId: id,
      metadata: { name, status },
    });

    return apiSuccess({ organization: updated });
  } catch (err: any) {
    const authResp = handleAuthError(err);
    if (authResp) return authResp;
    return apiError('ORGANIZATION_UPDATE_FAILED', err.message || 'Failed to update organization', 400);
  }
}
