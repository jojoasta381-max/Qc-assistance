import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  hashPassword,
  createSessionToken,
  setSessionCookie,
} from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, email, password, organizationName, phone, role } = body;

    if (!name || !email || !password || !organizationName) {
      return NextResponse.json(
        { error: 'Name, work email, password, and organization name are required.' },
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

    const randomSuffix = Math.floor(100 + Math.random() * 900);
    const tenantSlug = `${baseSlug}-${randomSuffix}`;

    // Create Tenant + Default Workspace + User in transaction
    const newTenant = await prisma.tenant.create({
      data: {
        name: organizationName.trim(),
        slug: tenantSlug,
        plan: 'MID_5', // Default 14-day free trial on Mid tier with 100 checks
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

    const hashedPassword = hashPassword(password);

    const newUser = await prisma.user.create({
      data: {
        name: name.trim(),
        email: cleanEmail,
        phone: phone ? phone.trim() : null,
        passwordHash: hashedPassword,
        role: role || 'OWNER',
        tenantId: newTenant.id,
      },
    });

    // Issue session token
    const token = createSessionToken({
      userId: newUser.id,
      email: newUser.email,
      name: newUser.name,
      role: newUser.role,
      tenantId: newTenant.id,
      tenantSlug: newTenant.slug,
    });

    await setSessionCookie(token);

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
    });
  } catch (error: any) {
    console.error('Signup error:', error);
    return NextResponse.json(
      { error: error?.message || 'Organization registration failed.' },
      { status: 500 }
    );
  }
}
