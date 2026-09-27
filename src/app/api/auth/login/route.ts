import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ensureDefaultTenantData } from '@/lib/db-service';
import {
  hashPassword,
  verifyPassword,
  createSessionToken,
  setSessionCookie,
} from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    await ensureDefaultTenantData();
    const body = await req.json();
    const { email, password, demoRole, isGoogleAuth, name } = body;

    let targetUser: any = null;

    // Mode 1: Quick Demo Login
    if (demoRole) {
      if (demoRole === 'qc_lead') {
        targetUser = await prisma.user.findFirst({
          where: { email: 'pravin@spandsons.com' },
          include: { tenant: true },
        });
      } else if (demoRole === 'ems_builder') {
        targetUser = await prisma.user.findFirst({
          where: { email: 'gogulnath@spandsons.com' },
          include: { tenant: true },
        });
      } else if (demoRole === 'compliance_head') {
        targetUser = await prisma.user.findFirst({
          where: { email: 'anand.k@tataautocomp.com' },
          include: { tenant: true },
        });
      }

      if (!targetUser) {
        // Fallback: pick first user in database
        targetUser = await prisma.user.findFirst({
          include: { tenant: true },
        });
      }
    }
    // Mode 2: Google SSO Simulation
    else if (isGoogleAuth && email) {
      const existing = await prisma.user.findUnique({
        where: { email },
        include: { tenant: true },
      });

      if (existing) {
        targetUser = existing;
      } else {
        // Find default tenant or create one
        let defaultTenant = await prisma.tenant.findUnique({
          where: { slug: 'spandsons' },
        });

        if (!defaultTenant) {
          defaultTenant = await prisma.tenant.create({
            data: {
              name: 'Spandsons Horizon Engineering Pvt. Ltd.',
              slug: 'spandsons',
              plan: 'MID_5',
              checkQuota: 100,
            },
          });
        }

        targetUser = await prisma.user.create({
          data: {
            email,
            name: name || email.split('@')[0],
            role: 'QC_INSPECTOR',
            tenantId: defaultTenant.id,
          },
          include: { tenant: true },
        });
      }
    }
    // Mode 3: Standard Email + Password
    else if (email) {
      targetUser = await prisma.user.findUnique({
        where: { email: email.toLowerCase().trim() },
        include: { tenant: true },
      });

      if (!targetUser) {
        return NextResponse.json(
          { error: 'No account found with this email address.' },
          { status: 401 }
        );
      }

      // If user has a password set, verify it
      if (targetUser.passwordHash && password) {
        const isValid = verifyPassword(password, targetUser.passwordHash);
        if (!isValid) {
          return NextResponse.json(
            { error: 'Invalid password. Please check your credentials.' },
            { status: 401 }
          );
        }
      } else if (!targetUser.passwordHash && password) {
        // First-time password assignment for pre-seeded user
        await prisma.user.update({
          where: { id: targetUser.id },
          data: { passwordHash: hashPassword(password) },
        });
      }
    } else {
      return NextResponse.json(
        { error: 'Email or demo role is required.' },
        { status: 400 }
      );
    }

    if (!targetUser || !targetUser.tenant) {
      return NextResponse.json(
        { error: 'Authentication failed. Account not properly provisioned.' },
        { status: 401 }
      );
    }

    // Issue signed session token
    const token = createSessionToken({
      userId: targetUser.id,
      email: targetUser.email,
      name: targetUser.name,
      role: targetUser.role,
      tenantId: targetUser.tenant.id,
      tenantSlug: targetUser.tenant.slug,
    });

    await setSessionCookie(token);

    return NextResponse.json({
      success: true,
      user: {
        id: targetUser.id,
        name: targetUser.name,
        email: targetUser.email,
        phone: targetUser.phone,
        role: targetUser.role,
      },
      tenant: {
        id: targetUser.tenant.id,
        name: targetUser.tenant.name,
        slug: targetUser.tenant.slug,
        plan: targetUser.tenant.plan,
        checkQuota: targetUser.tenant.checkQuota,
        quotaUsed: targetUser.tenant.quotaUsed,
      },
    });
  } catch (error: any) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: error?.message || 'Authentication processing error.' },
      { status: 500 }
    );
  }
}
