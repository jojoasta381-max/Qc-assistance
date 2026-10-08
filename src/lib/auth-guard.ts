import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { SESSION_COOKIE_NAME, verifySessionToken, SessionPayload } from '@/lib/auth';
import { apiError } from '@/lib/api-v1-response';

export type SystemRole =
  | 'OWNER'
  | 'ADMIN'
  | 'ENGINEER'
  | 'HARNESS_ENGINEER'
  | 'QC_MANAGER'
  | 'REVIEWER'
  | 'QC_INSPECTOR'
  | 'LEAD_QC_INSPECTOR'
  | 'VIEWER'
  | 'BILLING_ADMIN'
  | 'MEMBER';

export type Permission =
  | 'document:read'
  | 'document:upload'
  | 'document:delete'
  | 'analysis:run'
  | 'finding:read'
  | 'finding:review'
  | 'report:read'
  | 'report:generate'
  | 'report:download'
  | 'billing:read'
  | 'billing:manage'
  | 'member:manage'
  | 'organization:manage'
  | 'organization:read'
  | 'audit:read'
  | 'project:read'
  | 'project:create'
  | 'project:update'
  | 'project:delete';

const ROLE_PERMISSIONS: Record<string, Set<Permission>> = {
  OWNER: new Set<Permission>([
    'document:read', 'document:upload', 'document:delete',
    'analysis:run',
    'finding:read', 'finding:review',
    'report:read', 'report:generate', 'report:download',
    'billing:read', 'billing:manage',
    'member:manage',
    'organization:manage', 'organization:read',
    'audit:read',
    'project:read', 'project:create', 'project:update', 'project:delete',
  ]),
  ADMIN: new Set<Permission>([
    'document:read', 'document:upload', 'document:delete',
    'analysis:run',
    'finding:read', 'finding:review',
    'report:read', 'report:generate', 'report:download',
    'billing:read', 'billing:manage',
    'member:manage',
    'organization:read',
    'audit:read',
    'project:read', 'project:create', 'project:update', 'project:delete',
  ]),
  BILLING_ADMIN: new Set<Permission>([
    'billing:read', 'billing:manage',
    'organization:read',
    'document:read',
    'report:read', 'report:download',
    'audit:read',
  ]),
  ENGINEER: new Set<Permission>([
    'document:read', 'document:upload',
    'analysis:run',
    'finding:read', 'finding:review',
    'report:read', 'report:generate', 'report:download',
    'organization:read',
    'audit:read',
    'project:read', 'project:create', 'project:update',
  ]),
  HARNESS_ENGINEER: new Set<Permission>([
    'document:read', 'document:upload',
    'analysis:run',
    'finding:read', 'finding:review',
    'report:read', 'report:generate', 'report:download',
    'organization:read',
    'audit:read',
    'project:read', 'project:create', 'project:update',
  ]),
  QC_MANAGER: new Set<Permission>([
    'document:read', 'document:upload', 'document:delete',
    'analysis:run',
    'finding:read', 'finding:review',
    'report:read', 'report:generate', 'report:download',
    'organization:read',
    'audit:read',
    'project:read', 'project:create', 'project:update',
  ]),
  REVIEWER: new Set<Permission>([
    'document:read',
    'analysis:run',
    'finding:read', 'finding:review',
    'report:read', 'report:generate', 'report:download',
    'organization:read',
    'project:read',
  ]),
  QC_INSPECTOR: new Set<Permission>([
    'document:read', 'document:upload',
    'analysis:run',
    'finding:read', 'finding:review',
    'report:read', 'report:generate', 'report:download',
    'organization:read',
    'project:read',
  ]),
  LEAD_QC_INSPECTOR: new Set<Permission>([
    'document:read', 'document:upload',
    'analysis:run',
    'finding:read', 'finding:review',
    'report:read', 'report:generate', 'report:download',
    'organization:read',
    'project:read',
  ]),
  VIEWER: new Set<Permission>([
    'document:read',
    'finding:read',
    'report:read', 'report:download',
    'project:read',
    'organization:read',
  ]),
  MEMBER: new Set<Permission>([
    'document:read',
    'finding:read',
    'report:read', 'report:download',
    'project:read',
    'organization:read',
  ]),
};

export class AuthError extends Error {
  public code: string;
  public status: number;

  constructor(code: string, message: string, status = 401) {
    super(message);
    this.code = code;
    this.status = status;
    Object.setPrototypeOf(this, AuthError.prototype);
  }
}

export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
  role: string;
  tenantId: string;
  status: string;
}

export interface TenantContext {
  id: string;
  name: string;
  slug: string;
  status: string;
  plan: string;
  checkQuota: number;
  quotaUsed: number;
}

export interface AuthContext {
  user: AuthenticatedUser;
  tenant: TenantContext;
  memberRole: string;
  hasPermission: (permission: Permission) => boolean;
}

/**
 * Check if a role has a given permission
 */
export function roleHasPermission(role: string, permission: Permission): boolean {
  const normalized = role.toUpperCase();
  const perms = ROLE_PERMISSIONS[normalized];
  if (!perms) return false;
  return perms.has(permission);
}

/**
 * Extracts and verifies session from request cookie or Authorization header.
 * Fails with 401 if missing, invalid, or user inactive.
 */
export async function requireAuth(req: NextRequest): Promise<{ user: AuthenticatedUser; session: SessionPayload }> {
  let token = req.cookies.get(SESSION_COOKIE_NAME)?.value;

  // Support Bearer token header for automated APIs/tests
  if (!token) {
    const authHeader = req.headers.get('authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7).trim();
    }
  }

  if (!token) {
    throw new AuthError('UNAUTHORIZED', 'Authentication session required. Please log in.', 401);
  }

  const session = verifySessionToken(token);
  if (!session) {
    throw new AuthError('UNAUTHORIZED', 'Invalid or expired session. Please log in again.', 401);
  }

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      tenantId: true,
      status: true,
    },
  });

  if (!user) {
    throw new AuthError('UNAUTHORIZED', 'User account not found.', 401);
  }

  if (user.status !== 'ACTIVE') {
    throw new AuthError('FORBIDDEN', 'User account is suspended or inactive.', 403);
  }

  return { user, session };
}

/**
 * Server-Authoritative Tenant Resolution.
 * Derives tenant strictly from authenticated user and verified database membership.
 * Never blindly trusts headers or cookies for tenant switching.
 */
export async function requireTenantMember(
  req: NextRequest,
  userOverride?: AuthenticatedUser
): Promise<AuthContext> {
  const user = userOverride || (await requireAuth(req)).user;

  // Check if an explicit organization switch was requested
  const requestedOrgId = req.headers.get('x-organization-id') || req.headers.get('x-tenant-id');

  let activeTenantId = user.tenantId;
  let activeRole = user.role;

  if (requestedOrgId && requestedOrgId !== user.tenantId) {
    // Verify membership in requested tenant
    const membership = await prisma.organizationMember.findUnique({
      where: {
        tenantId_userId: {
          tenantId: requestedOrgId,
          userId: user.id,
        },
      },
    });

    if (!membership) {
      throw new AuthError(
        'FORBIDDEN',
        `Access denied: You are not a verified member of organization "${requestedOrgId}".`,
        403
      );
    }

    activeTenantId = requestedOrgId;
    activeRole = membership.role;
  }

  const tenant = await prisma.tenant.findUnique({
    where: { id: activeTenantId },
    select: {
      id: true,
      name: true,
      slug: true,
      status: true,
      plan: true,
      checkQuota: true,
      quotaUsed: true,
    },
  });

  if (!tenant) {
    throw new AuthError('FORBIDDEN', 'Organization not found.', 403);
  }

  if (tenant.status !== 'ACTIVE') {
    throw new AuthError('FORBIDDEN', 'Organization is suspended or deactivated.', 403);
  }

  return {
    user,
    tenant,
    memberRole: activeRole,
    hasPermission: (perm: Permission) => roleHasPermission(activeRole, perm),
  };
}

/**
 * Enforces both authenticated tenant membership and explicit RBAC permission.
 */
export async function requirePermission(
  req: NextRequest,
  permission: Permission
): Promise<AuthContext> {
  const ctx = await requireTenantMember(req);

  if (!ctx.hasPermission(permission)) {
    throw new AuthError(
      'FORBIDDEN',
      `You do not have permission "${permission}" required to perform this action.`,
      403
    );
  }

  return ctx;
}

/**
 * Enforces role membership from a list of allowed roles.
 */
export async function requireRole(
  req: NextRequest,
  allowedRoles: SystemRole[]
): Promise<AuthContext> {
  const ctx = await requireTenantMember(req);
  const normalizedUserRole = ctx.memberRole.toUpperCase();

  const isAllowed = allowedRoles.some((r) => r.toUpperCase() === normalizedUserRole);
  if (!isAllowed) {
    throw new AuthError(
      'FORBIDDEN',
      `Access denied: Role "${ctx.memberRole}" is not authorized for this resource.`,
      403
    );
  }

  return ctx;
}

/**
 * Handle AuthError by returning standard API error response, or null if not an AuthError
 */
export function handleAuthError(err: unknown): NextResponse | null {
  if (err instanceof AuthError) {
    return apiError(err.code, err.message, err.status);
  }
  return null;
}

