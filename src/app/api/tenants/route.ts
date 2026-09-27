import { NextRequest, NextResponse } from 'next/server';
import { listAllTenants, getTenantBySlug } from '@/lib/db-service';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const slug = searchParams.get('slug');

    if (slug) {
      const tenant = await getTenantBySlug(slug);
      if (!tenant) {
        return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
      }
      return NextResponse.json(tenant);
    }

    const tenants = await listAllTenants();
    return NextResponse.json(tenants);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Database query error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, slug, plan } = body;

    if (!name || !slug) {
      return NextResponse.json({ error: 'Name and slug are required.' }, { status: 400 });
    }

    const newTenant = await prisma.tenant.create({
      data: {
        name,
        slug: slug.toLowerCase().replace(/[^a-z0-9-]/g, '-'),
        plan: plan || 'NORMAL_1',
        checkQuota: plan === 'MAX_10' ? 500 : plan === 'MID_5' ? 100 : 10,
        quotaUsed: 0,
      },
    });

    return NextResponse.json(newTenant);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Tenant creation failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
