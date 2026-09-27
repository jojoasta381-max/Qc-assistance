import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentSession } from '@/lib/auth';
import { ensureDefaultTenantData } from '@/lib/db-service';

export async function GET(req: NextRequest) {
  try {
    await ensureDefaultTenantData();
    const session = await getCurrentSession();

    if (!session) {
      return NextResponse.json({ authenticated: false }, { status: 200 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      include: {
        tenant: {
          include: {
            workspaces: true,
          },
        },
      },
    });

    if (!user || !user.tenant) {
      return NextResponse.json({ authenticated: false }, { status: 200 });
    }

    return NextResponse.json({
      authenticated: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
      },
      tenant: {
        id: user.tenant.id,
        name: user.tenant.name,
        slug: user.tenant.slug,
        plan: user.tenant.plan,
        checkQuota: user.tenant.checkQuota,
        quotaUsed: user.tenant.quotaUsed,
        workspaces: user.tenant.workspaces,
      },
    });
  } catch (error) {
    console.error('Session verification error:', error);
    return NextResponse.json({ authenticated: false }, { status: 200 });
  }
}
