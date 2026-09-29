import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, handleAuthError } from '@/lib/auth-guard';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const { user } = await requireAuth(req);

    // Only return tenants that user belongs to
    const memberships = await prisma.organizationMember.findMany({
      where: { userId: user.id },
      select: { tenantId: true },
    });

    const tenantIds = Array.from(new Set([user.tenantId, ...memberships.map((m) => m.tenantId)]));

    const tenants = await prisma.tenant.findMany({
      where: { id: { in: tenantIds } },
    });

    return NextResponse.json(tenants);
  } catch (err: unknown) {
    const authResp = handleAuthError(err);
    if (authResp) return authResp;
    const msg = err instanceof Error ? err.message : 'Database query error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { user } = await requireAuth(req);
    const body = await req.json();
    const { name, slug, plan } = body;

    if (!name || !slug) {
      return NextResponse.json({ error: 'Name and slug are required.' }, { status: 400 });
    }

    const cleanSlug = slug.toLowerCase().replace(/[^a-z0-9-]/g, '-');

    const newTenant = await prisma.$transaction(async (tx) => {
      const created = await tx.tenant.create({
        data: {
          name,
          slug: cleanSlug,
          plan: plan || 'NORMAL_1',
          checkQuota: plan === 'MAX_10' ? 500 : plan === 'MID_5' ? 100 : 10,
          quotaUsed: 0,
        },
      });

      await tx.organizationMember.create({
        data: {
          tenantId: created.id,
          userId: user.id,
          role: 'OWNER',
        },
      });

      return created;
    });

    return NextResponse.json(newTenant, { status: 201 });
  } catch (err: unknown) {
    const authResp = handleAuthError(err);
    if (authResp) return authResp;
    const msg = err instanceof Error ? err.message : 'Tenant creation failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
