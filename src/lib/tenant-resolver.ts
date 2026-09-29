import { NextRequest } from 'next/server';
import { requireTenantMember, TenantContext } from './auth-guard';

/**
 * Server-Authoritative Tenant Resolution.
 * Derives tenant strictly from authenticated session and verified database membership.
 * Never trusts unauthenticated client headers, cookies, or body parameters.
 */
export async function resolveTenant(req: NextRequest): Promise<TenantContext> {
  const ctx = await requireTenantMember(req);
  return ctx.tenant;
}
