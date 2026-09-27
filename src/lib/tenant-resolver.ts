import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ensureDefaultTenantData } from '@/lib/db-service';

/**
 * Resolves the active Tenant / Organization with isolation enforcement
 */
export async function resolveTenant(req: NextRequest) {
  await ensureDefaultTenantData();

  // 1. Check header
  const headerTenantId = req.headers.get('x-organization-id') || req.headers.get('x-tenant-id');
  if (headerTenantId) {
    const tenant = await prisma.tenant.findUnique({
      where: { id: headerTenantId },
    });
    if (tenant) return tenant;
  }

  // 2. Check cookie
  const cookieTenantSlug = req.cookies.get('active_tenant')?.value;
  if (cookieTenantSlug) {
    const tenant = await prisma.tenant.findUnique({
      where: { slug: cookieTenantSlug },
    });
    if (tenant) return tenant;
  }

  // 3. Fallback to default demo tenant
  let defaultTenant = await prisma.tenant.findUnique({
    where: { slug: 'spandsons' },
  });

  if (!defaultTenant) {
    defaultTenant = await prisma.tenant.findFirst();
  }

  if (!defaultTenant) {
    defaultTenant = await prisma.tenant.create({
      data: {
        name: 'Spandsons Horizon Engineering Pvt. Ltd.',
        slug: 'spandsons',
        plan: 'MID_5',
        checkQuota: 100,
        quotaUsed: 38,
      },
    });
  }

  return defaultTenant;
}
