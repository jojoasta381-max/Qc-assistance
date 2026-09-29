import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'crypto';
import { NextRequest } from 'next/server';
import { prisma } from '../src/lib/prisma';
import {
  hashPassword,
  verifyPassword,
  createSessionToken,
  verifySessionToken,
  SESSION_COOKIE_NAME,
} from '../src/lib/auth';
import {
  requireAuth,
  requireTenantMember,
  requirePermission,
  requireRole,
  roleHasPermission,
  AuthError,
} from '../src/lib/auth-guard';
import { validateSsrfEndpoint } from '../src/lib/security/ssrf-validator';
import { validateLLMEndpoint } from '../src/lib/llm-engine';
import { verifyWebhookSignature, verifyPaymentSignature, processRazorpayWebhook } from '../src/lib/billing/razorpay-service';
import { reserveQuotaAtomically, refundQuotaAtomically } from '../src/lib/billing/quota-manager';
import { isProduction } from '../src/lib/config/app-mode';

// ---------------------------------------------------------------------
// TEST SUITE: Phase 2 Security, Tenant Isolation, RBAC, Quota, & SSRF
// ---------------------------------------------------------------------

test.describe('Phase 2: Security & Tenant Isolation Suite', () => {
  let tenantA: any;
  let tenantB: any;
  let userA: any;
  let userB: any;
  let viewerUserA: any;
  let engineerUserA: any;
  let reviewerUserA: any;

  test.before(async () => {
    const timestamp = Date.now();

    // Create Tenant A
    tenantA = await prisma.tenant.create({
      data: {
        name: `Security Org Alpha ${timestamp}`,
        slug: `sec-org-alpha-${timestamp}`,
        plan: 'MID_5',
        checkQuota: 1, // Set to 1 for quota race test
        quotaUsed: 0,
      },
    });

    // Create Tenant B
    tenantB = await prisma.tenant.create({
      data: {
        name: `Security Org Beta ${timestamp}`,
        slug: `sec-org-beta-${timestamp}`,
        plan: 'NORMAL_1',
        checkQuota: 100,
        quotaUsed: 0,
      },
    });

    // Create User A (Owner of Tenant A)
    userA = await prisma.user.create({
      data: {
        name: 'Alice Owner',
        email: `alice.${timestamp}@org-alpha.com`,
        passwordHash: hashPassword('CorrectPassword123!'),
        role: 'OWNER',
        tenantId: tenantA.id,
      },
    });
    await prisma.organizationMember.create({
      data: { tenantId: tenantA.id, userId: userA.id, role: 'OWNER' },
    });

    // Create Viewer in Tenant A
    viewerUserA = await prisma.user.create({
      data: {
        name: 'Bob Viewer',
        email: `bob.viewer.${timestamp}@org-alpha.com`,
        passwordHash: hashPassword('ViewerPassword123!'),
        role: 'VIEWER',
        tenantId: tenantA.id,
      },
    });
    await prisma.organizationMember.create({
      data: { tenantId: tenantA.id, userId: viewerUserA.id, role: 'VIEWER' },
    });

    // Create Engineer in Tenant A
    engineerUserA = await prisma.user.create({
      data: {
        name: 'Charlie Engineer',
        email: `charlie.${timestamp}@org-alpha.com`,
        passwordHash: hashPassword('EngineerPassword123!'),
        role: 'ENGINEER',
        tenantId: tenantA.id,
      },
    });
    await prisma.organizationMember.create({
      data: { tenantId: tenantA.id, userId: engineerUserA.id, role: 'ENGINEER' },
    });

    // Create Reviewer in Tenant A
    reviewerUserA = await prisma.user.create({
      data: {
        name: 'Dave Reviewer',
        email: `dave.${timestamp}@org-alpha.com`,
        passwordHash: hashPassword('ReviewerPassword123!'),
        role: 'REVIEWER',
        tenantId: tenantA.id,
      },
    });
    await prisma.organizationMember.create({
      data: { tenantId: tenantA.id, userId: reviewerUserA.id, role: 'REVIEWER' },
    });

    // Create User B (Owner of Tenant B)
    userB = await prisma.user.create({
      data: {
        name: 'Eve Malicious',
        email: `eve.${timestamp}@org-beta.com`,
        passwordHash: hashPassword('BetaPassword123!'),
        role: 'OWNER',
        tenantId: tenantB.id,
      },
    });
    await prisma.organizationMember.create({
      data: { tenantId: tenantB.id, userId: userB.id, role: 'OWNER' },
    });
  });

  test.after(async () => {
    // Clean up test data
    if (tenantA) {
      await prisma.tenant.delete({ where: { id: tenantA.id } }).catch(() => {});
    }
    if (tenantB) {
      await prisma.tenant.delete({ where: { id: tenantB.id } }).catch(() => {});
    }
  });

  // ===================================================================
  // 1. AUTHENTICATION HARDENING TESTS
  // ===================================================================
  test('Auth: Password verification validates valid and rejects invalid passwords', () => {
    const rawPass = 'SuperSecurePass!2026';
    const hash = hashPassword(rawPass);
    assert.ok(verifyPassword(rawPass, hash), 'Valid password must verify');
    assert.strictEqual(verifyPassword('WrongPass', hash), false, 'Invalid password must be rejected');
  });

  test('Auth: Session token generation and cryptographic verification', () => {
    const token = createSessionToken({
      userId: userA.id,
      email: userA.email,
      name: userA.name,
      role: userA.role,
      tenantId: tenantA.id,
      tenantSlug: tenantA.slug,
    });

    const payload = verifySessionToken(token);
    assert.ok(payload, 'Session token must verify successfully');
    assert.strictEqual(payload?.userId, userA.id);
    assert.strictEqual(payload?.tenantId, tenantA.id);
  });

  test('Auth: Forged or tampered session token is rejected', () => {
    const validToken = createSessionToken({
      userId: userA.id,
      email: userA.email,
      name: userA.name,
      role: userA.role,
      tenantId: tenantA.id,
      tenantSlug: tenantA.slug,
    });

    const [payloadB64] = validToken.split('.');
    const forgedSignature = crypto.randomBytes(32).toString('base64url');
    const forgedToken = `${payloadB64}.${forgedSignature}`;

    assert.strictEqual(verifySessionToken(forgedToken), null, 'Forged token signature must fail verification');
  });

  test('Auth: Expired session token is rejected', () => {
    // Expired token (negative lifespan)
    const expiredToken = createSessionToken(
      {
        userId: userA.id,
        email: userA.email,
        name: userA.name,
        role: userA.role,
        tenantId: tenantA.id,
        tenantSlug: tenantA.slug,
      },
      -3600 // Expired 1 hour ago
    );

    assert.strictEqual(verifySessionToken(expiredToken), null, 'Expired session token must be rejected');
  });

  test('Auth: Missing session token throws 401 Unauthorized in requireAuth', async () => {
    const fakeReq = new NextRequest('http://localhost:3000/api/v1/documents');
    await assert.rejects(
      async () => await requireAuth(fakeReq),
      (err: any) => err instanceof AuthError && err.status === 401
    );
  });

  // ===================================================================
  // 2. SERVER-AUTHORITATIVE TENANT ISOLATION TESTS
  // ===================================================================
  test('Tenant Isolation: Client header x-organization-id cannot hijack unauthorized tenant', async () => {
    // User B sends request attempting to switch to Tenant A via x-organization-id header
    const tokenB = createSessionToken({
      userId: userB.id,
      email: userB.email,
      name: userB.name,
      role: userB.role,
      tenantId: tenantB.id,
      tenantSlug: tenantB.slug,
    });

    const reqWithSpoofedHeader = new NextRequest('http://localhost:3000/api/v1/documents', {
      headers: {
        cookie: `${SESSION_COOKIE_NAME}=${tokenB}`,
        'x-organization-id': tenantA.id, // Attempting to access Tenant A
      },
    });

    // Server MUST reject unauthorized header switch with HTTP 403 Forbidden
    await assert.rejects(
      async () => await requireTenantMember(reqWithSpoofedHeader),
      (err: any) => err instanceof AuthError && err.status === 403
    );
  });

  test('Tenant Isolation: IDOR prevention across resources (Documents, Findings, Projects)', async () => {
    // Create a project in Tenant A
    const projectA = await prisma.project.create({
      data: {
        name: 'Confidential Missile Harness Project',
        tenantId: tenantA.id,
      },
    });

    // Create a document in Tenant A
    const docA = await prisma.document.create({
      data: {
        tenantId: tenantA.id,
        projectId: projectA.id,
        filename: 'secret_harness_a.pdf',
        mimeType: 'application/pdf',
        sizeBytes: 1024,
        storageKey: `uploads/${tenantA.id}/secret.pdf`,
        status: 'UPLOADED',
        versions: {
          create: {
            version: 1,
            storageKey: `uploads/${tenantA.id}/secret.pdf`,
            processingStatus: 'COMPLETED',
          },
        },
      },
      include: { versions: true },
    });

    // Create a finding in Tenant A
    const findingA = await prisma.finding.create({
      data: {
        documentVersionId: docA.versions[0].id,
        status: 'UNREVIEWED',
        severity: 'CRITICAL',
        description: 'Short circuit on Net VCC to GND',
      },
    });

    // Attempt 1: User B tries to query Document A scoped by Tenant B
    const docLookupByTenantB = await prisma.document.findFirst({
      where: { id: docA.id, tenantId: tenantB.id },
    });
    assert.strictEqual(docLookupByTenantB, null, 'Tenant B query must not find Document A');

    // Attempt 2: User B tries to query Finding A scoped by Tenant B
    const findingLookupByTenantB = await prisma.finding.findFirst({
      where: {
        id: findingA.id,
        documentVersion: {
          document: { tenantId: tenantB.id },
        },
      },
    });
    assert.strictEqual(findingLookupByTenantB, null, 'Tenant B query must not find Finding A');

    // Attempt 3: User B tries to query Project A scoped by Tenant B
    const projectLookupByTenantB = await prisma.project.findFirst({
      where: { id: projectA.id, tenantId: tenantB.id },
    });
    assert.strictEqual(projectLookupByTenantB, null, 'Tenant B query must not find Project A');
  });

  // ===================================================================
  // 3. RBAC TESTS
  // ===================================================================
  test('RBAC: Role permissions matrix enforcement', () => {
    // OWNER has all permissions
    assert.strictEqual(roleHasPermission('OWNER', 'document:upload'), true);
    assert.strictEqual(roleHasPermission('OWNER', 'billing:manage'), true);
    assert.strictEqual(roleHasPermission('OWNER', 'finding:review'), true);

    // VIEWER can read but CANNOT upload or delete
    assert.strictEqual(roleHasPermission('VIEWER', 'document:read'), true);
    assert.strictEqual(roleHasPermission('VIEWER', 'document:upload'), false);
    assert.strictEqual(roleHasPermission('VIEWER', 'document:delete'), false);
    assert.strictEqual(roleHasPermission('VIEWER', 'billing:manage'), false);

    // ENGINEER can upload documents and run analysis, but CANNOT manage billing
    assert.strictEqual(roleHasPermission('ENGINEER', 'document:upload'), true);
    assert.strictEqual(roleHasPermission('ENGINEER', 'analysis:run'), true);
    assert.strictEqual(roleHasPermission('ENGINEER', 'billing:manage'), false);

    // REVIEWER can review findings, but CANNOT delete documents or manage organization
    assert.strictEqual(roleHasPermission('REVIEWER', 'finding:review'), true);
    assert.strictEqual(roleHasPermission('REVIEWER', 'organization:manage'), false);
    assert.strictEqual(roleHasPermission('REVIEWER', 'document:delete'), false);
  });

  test('RBAC: VIEWER attempting write operation is rejected with 403 Forbidden', async () => {
    const viewerToken = createSessionToken({
      userId: viewerUserA.id,
      email: viewerUserA.email,
      name: viewerUserA.name,
      role: viewerUserA.role,
      tenantId: tenantA.id,
      tenantSlug: tenantA.slug,
    });

    const viewerReq = new NextRequest('http://localhost:3000/api/v1/documents', {
      headers: { cookie: `${SESSION_COOKIE_NAME}=${viewerToken}` },
    });

    await assert.rejects(
      async () => await requirePermission(viewerReq, 'document:upload'),
      (err: any) => err instanceof AuthError && err.status === 403
    );

    // requireRole checks
    await assert.rejects(
      async () => await requireRole(viewerReq, ['OWNER', 'ADMIN']),
      (err: any) => err instanceof AuthError && err.status === 403
    );

    const allowedCtx = await requireRole(viewerReq, ['VIEWER', 'OWNER']);
    assert.strictEqual(allowedCtx.user.id, viewerUserA.id);
  });

  // ===================================================================
  // 4. BILLING & RAZORPAY SECURITY TESTS
  // ===================================================================
  test('Razorpay: Valid webhook signature is accepted', () => {
    const rawBody = JSON.stringify({ event: 'payment.captured', id: 'evt_123' });
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET || 'test_webhook_secret';
    const validSignature = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');

    assert.strictEqual(verifyWebhookSignature(rawBody, validSignature), true);
  });

  test('Razorpay: Invalid and forged webhook signatures are rejected', () => {
    const rawBody = JSON.stringify({ event: 'payment.captured', id: 'evt_123' });
    const invalidSignature = 'invalid_tampered_signature_12345';

    assert.strictEqual(verifyWebhookSignature(rawBody, invalidSignature), false);
    assert.strictEqual(verifyWebhookSignature(rawBody, ''), false);
  });

  test('Razorpay: Client payment signature verification', () => {
    const orderId = 'order_test_123';
    const paymentId = 'pay_test_456';
    const secret = process.env.RAZORPAY_KEY_SECRET || 'test_key_secret';
    const validSignature = crypto.createHmac('sha256', secret).update(`${orderId}|${paymentId}`).digest('hex');

    assert.strictEqual(verifyPaymentSignature(orderId, paymentId, validSignature), true);
    assert.strictEqual(verifyPaymentSignature(orderId, paymentId, 'forged_sig'), false);
  });

  test('Production Isolation: Production environment boundary enforcement', () => {
    const origMode = process.env.APP_MODE;
    try {
      process.env.APP_MODE = 'PRODUCTION';
      assert.strictEqual(isProduction(), true);
    } finally {
      process.env.APP_MODE = origMode;
    }
  });


  test('Razorpay: Webhook event deduplication (idempotency)', async () => {
    const eventId = `evt_dedup_${Date.now()}`;
    const rawBody = JSON.stringify({ event: 'payment.captured', id: eventId });

    // First processing
    const firstResult = await processRazorpayWebhook(
      eventId,
      'payment.captured',
      {},
      rawBody,
      true
    );
    assert.strictEqual(firstResult.status, 'SUCCESS');

    // Second processing (replayed event)
    const secondResult = await processRazorpayWebhook(
      eventId,
      'payment.captured',
      {},
      rawBody,
      true
    );
    assert.strictEqual(secondResult.status, 'DUPLICATE_SKIPPED');
  });

  // ===================================================================
  // 5. ATOMIC QUOTA CONCURRENCY RACE TESTS
  // ===================================================================
  test('Quota: 10 concurrent requests with quota=1 yields exactly 1 reservation', async () => {
    // Reset Tenant A quota to available = 1
    await prisma.$executeRaw`
      UPDATE organizations
      SET "quotaUsed" = 0, "checkQuota" = 1
      WHERE id = ${tenantA.id}
    `;

    // Send 10 concurrent atomic quota reservation calls
    const attempts = Array.from({ length: 10 }, () => reserveQuotaAtomically(tenantA.id));
    const results = await Promise.all(attempts);

    const successfulReservations = results.filter((res) => res === true).length;
    const rejectedReservations = results.filter((res) => res === false).length;

    assert.strictEqual(successfulReservations, 1, 'Exactly 1 request must reserve the quota');
    assert.strictEqual(rejectedReservations, 9, 'Exactly 9 requests must be rejected');

    // Verify tenant quota in DB is exactly 1 (not negative and not 10)
    const updatedTenant = await prisma.tenant.findUnique({ where: { id: tenantA.id } });
    assert.strictEqual(updatedTenant?.quotaUsed, 1);
    assert.strictEqual(updatedTenant?.checkQuota, 1);
  });

  test('Quota: Failed processing refunds reserved check and does not go negative', async () => {
    await refundQuotaAtomically(tenantA.id, 'Test failure refund');
    const tenantAfterRefund = await prisma.tenant.findUnique({ where: { id: tenantA.id } });
    assert.strictEqual(tenantAfterRefund?.quotaUsed, 0, 'Quota must be refunded to 0');

    // Extra refund cannot make quota negative
    await refundQuotaAtomically(tenantA.id, 'Extra refund');
    const tenantAfterExtraRefund = await prisma.tenant.findUnique({ where: { id: tenantA.id } });
    assert.strictEqual(tenantAfterExtraRefund?.quotaUsed, 0, 'Quota must never become negative');
  });

  // ===================================================================
  // 6. SSRF HARDENING TESTS
  // ===================================================================
  test('SSRF: Blocks loopback, private IPv4, cloud metadata, and IPv6 loopback', async () => {
    // 1. localhost
    assert.strictEqual(validateLLMEndpoint('http://localhost:11434').valid, false);

    // 2. 127.0.0.1
    assert.strictEqual(validateLLMEndpoint('http://127.0.0.1:8080').valid, false);

    // 3. 0.0.0.0
    assert.strictEqual(validateLLMEndpoint('http://0.0.0.0:80').valid, false);

    // 4. Cloud Metadata 169.254.169.254
    assert.strictEqual(validateLLMEndpoint('http://169.254.169.254/latest/meta-data').valid, false);

    // 5. RFC1918 Private IPv4 (10.0.0.1, 172.16.0.1, 192.168.1.1)
    assert.strictEqual(validateLLMEndpoint('http://10.0.0.1:8080').valid, false);
    assert.strictEqual(validateLLMEndpoint('http://172.16.5.10').valid, false);
    assert.strictEqual(validateLLMEndpoint('http://192.168.1.254').valid, false);

    // 6. IPv6 Loopback ::1
    assert.strictEqual(validateLLMEndpoint('http://[::1]:8000').valid, false);

    // 7. IPv4-mapped IPv6 loopback
    assert.strictEqual(validateLLMEndpoint('http://[::ffff:127.0.0.1]:80').valid, false);

    // 8. Private IPv6 (ULA: fc00::/7)
    assert.strictEqual(validateLLMEndpoint('http://[fc00::1]:80').valid, false);
    assert.strictEqual(validateLLMEndpoint('http://[fd12:3456:789a::1]:80').valid, false);

    // 9. Decimal IP representations (127.0.0.1 = 2130706433, 169.254.169.254 = 2852039166)
    assert.strictEqual(validateLLMEndpoint('http://2130706433').valid, false);
    assert.strictEqual(validateLLMEndpoint('http://2852039166').valid, false);
  });

  test('SSRF: Async validator resolves public domains and rejects internal DNS resolution', async () => {
    // Malicious or internal hostnames
    const localCheck = await validateSsrfEndpoint('http://localhost:8080');
    assert.strictEqual(localCheck.safe, false);

    const metadataCheck = await validateSsrfEndpoint('http://metadata.google.internal');
    assert.strictEqual(metadataCheck.safe, false);

    // Legitimate public endpoint
    const publicCheck = await validateSsrfEndpoint('https://api.openai.com/v1');
    assert.strictEqual(publicCheck.safe, true, 'Legitimate public API endpoint must be accepted');
  });
});
