import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  hashPassword,
  createSessionToken,
  setSessionCookie,
} from '@/lib/auth';
import { recordAuditEvent } from '@/lib/audit/audit-logger';
import crypto from 'crypto';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { name, email, password, organizationName, phone, role } = body;
    const clientIp = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';

    if (!name || !email || !password || !organizationName) {
      return NextResponse.json(
        { error: 'Name, work email, password, and organization name are required.' },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters in length.' },
        { status: 400 }
      );
    }

    const cleanEmail = email.toLowerCase().trim();

    // Check if email already registered
    const existingUser = await prisma.user.findUnique({
      where: { email: cleanEmail },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'An account with this email address already exists. Please log in.' },
        { status: 409 }
      );
    }

    // Generate unique slug for tenant
    const baseSlug = organizationName
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 30) || 'organization';

    const randomSuffix = crypto.randomInt(100, 1000);
    const tenantSlug = `${baseSlug}-${randomSuffix}`;
    const hashedPassword = hashPassword(password);
    const userRole = role || 'OWNER';

    // Create Tenant + Default Workspace + User + OrganizationMember in a single atomic transaction
    const { newTenant, newUser } = await prisma.$transaction(async (tx) => {
      const tenant = await tx.tenant.create({
        data: {
          name: organizationName.trim(),
          slug: tenantSlug,
          plan: 'NORMAL_1',
          checkQuota: 100,
          quotaUsed: 0,
          workspaces: {
            create: [
              {
                name: 'Main Plant Harness Audits',
              },
            ],
          },
        },
      });

      const user = await tx.user.create({
        data: {
          name: name.trim(),
          email: cleanEmail,
          phone: phone ? phone.trim() : null,
          passwordHash: hashedPassword,
          role: userRole,
          tenantId: tenant.id,
        },
      });

      await tx.organizationMember.create({
        data: {
          tenantId: tenant.id,
          userId: user.id,
          role: 'OWNER',
        },
      });

      return { newTenant: tenant, newUser: user };
    });

    // Issue signed session token
    const token = createSessionToken({
      userId: newUser.id,
      email: newUser.email,
      name: newUser.name,
      role: newUser.role,
      tenantId: newTenant.id,
      tenantSlug: newTenant.slug,
    });

    await setSessionCookie(token);

    await recordAuditEvent({
      tenantId: newTenant.id,
      actorId: newUser.id,
      action: 'AUTH_SIGNUP',
      entityType: 'USER',
      entityId: newUser.id,
      ipAddress: clientIp,
      metadata: { organizationName: newTenant.name },
    });

    return NextResponse.json({
      success: true,
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        phone: newUser.phone,
        role: newUser.role,
      },
      tenant: {
        id: newTenant.id,
        name: newTenant.name,
        slug: newTenant.slug,
        plan: newTenant.plan,
        checkQuota: newTenant.checkQuota,
        quotaUsed: newTenant.quotaUsed,
      },
    }, { status: 201 });
  } catch (error: any) {
    console.error('Signup error:', error);
    return NextResponse.json(
      { error: error?.message || 'Organization registration failed.' },
      { status: 500 }
    );
  }
}
