import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ensureDefaultTenantData } from '@/lib/db-service';
import {
  hashPassword,
  verifyPassword,
  createSessionToken,
  setSessionCookie,
} from '@/lib/auth';
import { isProduction } from '@/lib/config/app-mode';
import { recordAuditEvent } from '@/lib/audit/audit-logger';

export async function POST(req: NextRequest) {
  try {
    if (!isProduction()) {
      await ensureDefaultTenantData();
    }

    const body = await req.json().catch(() => ({}));
    const { email, password, demoRole, isGoogleAuth } = body;
    const clientIp = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';

    // 1. Check for Demo Login attempt
    if (demoRole) {
      if (isProduction()) {
        return NextResponse.json(
          { error: 'Demo passwordless login is strictly disabled in PRODUCTION mode.' },
          { status: 403 }
        );
      }

      // Allowed only in DEMO or TEST mode
      let targetUser = null;
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
          where: { email: 'anand.k@demo-engineering.com' },
          include: { tenant: true },
        });
      }

      if (!targetUser) {
        targetUser = await prisma.user.findFirst({
          include: { tenant: true },
        });
      }

      if (!targetUser || !targetUser.tenant) {
        return NextResponse.json(
          { error: 'No demo user found in database.' },
          { status: 404 }
        );
      }

      const token = createSessionToken({
        userId: targetUser.id,
        email: targetUser.email,
        name: targetUser.name,
        role: targetUser.role,
        tenantId: targetUser.tenant.id,
        tenantSlug: targetUser.tenant.slug,
      });

      await setSessionCookie(token);

      await recordAuditEvent({
        tenantId: targetUser.tenant.id,
        actorId: targetUser.id,
        action: 'AUTH_LOGIN_DEMO',
        entityType: 'USER',
        entityId: targetUser.id,
        ipAddress: clientIp,
        metadata: { demoRole },
      });

      return NextResponse.json({
        success: true,
        user: {
          id: targetUser.id,
          name: targetUser.name,
          email: targetUser.email,
          role: targetUser.role,
        },
        tenant: {
          id: targetUser.tenant.id,
          name: targetUser.tenant.name,
          slug: targetUser.tenant.slug,
        },
      });
    }

    // 2. Google OAuth / SSO
    if (isGoogleAuth) {
      // In production, unverified Google SSO is strictly disabled
      if (isProduction()) {
        return NextResponse.json(
          { error: 'Cryptographic Google OIDC verification is not configured for production. Please log in with email and password.' },
          { status: 400 }
        );
      }

      // Non-production test fallback only if email provided
      if (!email) {
        return NextResponse.json(
          { error: 'Email is required for Google SSO authentication.' },
          { status: 400 }
        );
      }

      const existingUser = await prisma.user.findUnique({
        where: { email: email.toLowerCase().trim() },
        include: { tenant: true },
      });

      if (!existingUser || !existingUser.tenant) {
        return NextResponse.json(
          { error: 'No existing account associated with this Google email.' },
          { status: 404 }
        );
      }

      const token = createSessionToken({
        userId: existingUser.id,
        email: existingUser.email,
        name: existingUser.name,
        role: existingUser.role,
        tenantId: existingUser.tenant.id,
        tenantSlug: existingUser.tenant.slug,
      });

      await setSessionCookie(token);

      return NextResponse.json({
        success: true,
        user: {
          id: existingUser.id,
          name: existingUser.name,
          email: existingUser.email,
          role: existingUser.role,
        },
        tenant: {
          id: existingUser.tenant.id,
          name: existingUser.tenant.name,
          slug: existingUser.tenant.slug,
        },
      });
    }

    // 3. Standard Email + Password
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required.' },
        { status: 400 }
      );
    }

    const cleanEmail = email.toLowerCase().trim();
    const user = await prisma.user.findUnique({
      where: { email: cleanEmail },
      include: { tenant: true },
    });

    if (!user || !user.tenant) {
      // Return generic 401 to prevent user enumeration
      return NextResponse.json(
        { error: 'Invalid email or password.' },
        { status: 401 }
      );
    }

    if (user.status !== 'ACTIVE') {
      return NextResponse.json(
        { error: 'Account is suspended or deactivated. Please contact support.' },
        { status: 403 }
      );
    }

    // Check password
    if (user.passwordHash) {
      const isValid = verifyPassword(password, user.passwordHash);
      if (!isValid) {
        await recordAuditEvent({
          tenantId: user.tenant.id,
          actorId: user.id,
          action: 'AUTH_LOGIN_FAILED',
          entityType: 'USER',
          entityId: user.id,
          ipAddress: clientIp,
          metadata: { reason: 'INVALID_PASSWORD' },
        });

        return NextResponse.json(
          { error: 'Invalid email or password.' },
          { status: 401 }
        );
      }
    } else {
      // Pre-seeded user without password in non-production
      if (isProduction()) {
        return NextResponse.json(
          { error: 'Password authentication required. Please reset password.' },
          { status: 401 }
        );
      }
      // In dev/test, set password on first login
      await prisma.user.update({
        where: { id: user.id },
        data: { passwordHash: hashPassword(password) },
      });
    }

    // Issue signed session token
    const token = createSessionToken({
      userId: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      tenantId: user.tenant.id,
      tenantSlug: user.tenant.slug,
    });

    await setSessionCookie(token);

    await recordAuditEvent({
      tenantId: user.tenant.id,
      actorId: user.id,
      action: 'AUTH_LOGIN_SUCCESS',
      entityType: 'USER',
      entityId: user.id,
      ipAddress: clientIp,
    });

    return NextResponse.json({
      success: true,
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
      },
    });
  } catch (error: any) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Authentication processing error.' },
      { status: 500 }
    );
  }
}
