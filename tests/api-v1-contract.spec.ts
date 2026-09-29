import { test, expect } from '@playwright/test';
import crypto from 'crypto';

test.describe.serial('API v1 Contract & Razorpay Billing Architecture', () => {
  let createdOrgId: string;
  let createdDocId: string;
  let createdFindingId: string;
  let razorpayOrderId: string;

  test('GET /api/v1/billing/plans returns active plans with integer minor units', async ({ request }) => {
    const res = await request.get('/api/v1/billing/plans');
    expect(res.status()).toBe(200);

    const body = await res.json();
    expect(body.plans).toBeDefined();
    expect(body.plans.length).toBeGreaterThanOrEqual(3);

    // Verify integer minor units and currency
    const proPlan = body.plans.find((p: any) => p.code === 'PRO_MONTHLY');
    expect(proPlan).toBeDefined();
    expect(proPlan.price_minor).toBe(49900); // ₹499 in paise
    expect(proPlan.currency).toBe('INR');
  });

  test('POST /api/v1/organizations creates organization with slug', async ({ request }) => {
    const orgName = `Test OEM Corp ${Date.now()}`;
    const res = await request.post('/api/v1/organizations', {
      data: { name: orgName },
    });
    expect(res.status()).toBe(201);

    const body = await res.json();
    expect(body.organization).toBeDefined();
    expect(body.organization.name).toBe(orgName);
    expect(body.organization.slug).toBeDefined();
    createdOrgId = body.organization.id;
  });

  test('POST /api/v1/billing/checkout initiates server-authoritative Razorpay order', async ({ request }) => {
    const res = await request.post('/api/v1/billing/checkout', {
      headers: {
        'x-organization-id': createdOrgId,
        'idempotency-key': `idem_${Date.now()}`,
      },
      data: {
        plan_code: 'PAY_PER_CHECK',
      },
    });
    expect(res.status()).toBe(201);

    const body = await res.json();
    expect(body.checkout).toBeDefined();
    expect(body.checkout.order_id).toMatch(/^order_/);
    expect(body.checkout.amount_minor).toBe(9900); // ₹99 in paise
    expect(body.checkout.currency).toBe('INR');

    razorpayOrderId = body.checkout.order_id;
  });

  test('POST /api/v1/webhooks/razorpay processes signed webhook and provisions quota', async ({ request }) => {
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || 'test_webhook_secret';
    const eventId = `evt_${Date.now()}`;
    const paymentId = `pay_${Date.now()}`;

    const payload = {
      event: 'payment.captured',
      event_id: eventId,
      entity: 'event',
      payload: {
        payment: {
          entity: {
            id: paymentId,
            order_id: razorpayOrderId,
            amount: 9900,
            currency: 'INR',
            status: 'captured',
            method: 'upi',
          },
        },
      },
    };

    const rawBody = JSON.stringify(payload);
    const signature = crypto.createHmac('sha256', webhookSecret).update(rawBody).digest('hex');

    const res = await request.post('/api/v1/webhooks/razorpay', {
      headers: {
        'Content-Type': 'application/json',
        'x-razorpay-signature': signature,
      },
      data: rawBody,
    });
    expect(res.status()).toBe(200);

    const body = await res.json();
    expect(body.status).toBe('ok');

    // Test deduplication: re-sending the same webhook should skip processing
    const duplicateRes = await request.post('/api/v1/webhooks/razorpay', {
      headers: {
        'Content-Type': 'application/json',
        'x-razorpay-signature': signature,
      },
      data: rawBody,
    });
    expect(duplicateRes.status()).toBe(200);
    const dupBody = await duplicateRes.json();
    expect(dupBody.result.status).toBe('DUPLICATE_SKIPPED');
  });

  test('POST /api/v1/documents/upload-session generates pre-signed upload URL', async ({ request }) => {
    const res = await request.post('/api/v1/documents/upload-session', {
      headers: { 'x-organization-id': createdOrgId },
      data: {
        filename: 'Chassis_Wiring_WH402.pdf',
        mime_type: 'application/pdf',
        size_bytes: 1420580,
      },
    });
    expect(res.status()).toBe(201);

    const body = await res.json();
    expect(body.upload_session).toBeDefined();
    expect(body.upload_session.storage_key).toContain('organizations/');
    expect(body.upload_session.upload_url).toBeDefined();
  });

  test('POST /api/v1/documents registers document in organization', async ({ request }) => {
    const res = await request.post('/api/v1/documents', {
      headers: { 'x-organization-id': createdOrgId },
      data: {
        filename: 'WH-402_Aerospace_Harness.pdf',
        mime_type: 'application/pdf',
        size_bytes: 852000,
        storage_key: `organizations/${createdOrgId}/wh402_clean.pdf`,
      },
    });
    expect(res.status()).toBe(201);

    const body = await res.json();
    expect(body.document).toBeDefined();
    expect(body.document.id).toBeDefined();
    expect(body.document.status).toBe('UPLOADED');
    createdDocId = body.document.id;
  });

  test('POST /api/v1/documents/:id/process runs rules engine and extracts findings', async ({ request }) => {
    const res = await request.post(`/api/v1/documents/${createdDocId}/process`, {
      headers: { 'x-organization-id': createdOrgId },
      data: { standard: 'IPC-WHMA-A-620' },
    });
    expect(res.status()).toBe(200);

    const body = await res.json();
    expect(body.processing).toBeDefined();
    expect(body.processing.status).toBe('REVIEW_REQUIRED');
    expect(body.processing.findings_count).toBeGreaterThan(0);
    expect(body.processing.ai_run_id).toBeDefined();
  });

  test('GET /api/v1/documents/:id/findings lists evidence-backed findings', async ({ request }) => {
    const res = await request.get(`/api/v1/documents/${createdDocId}/findings`, {
      headers: { 'x-organization-id': createdOrgId },
    });
    expect(res.status()).toBe(200);

    const body = await res.json();
    expect(body.findings).toBeDefined();
    expect(body.findings.length).toBeGreaterThan(0);

    const firstFinding = body.findings[0];
    expect(firstFinding.evidence).toBeDefined();
    expect(firstFinding.severity).toBeDefined();
    createdFindingId = firstFinding.id;
  });

  test('POST /api/v1/findings/:id/review registers human review decision', async ({ request }) => {
    const res = await request.post(`/api/v1/findings/${createdFindingId}/review`, {
      headers: { 'x-organization-id': createdOrgId },
      data: {
        decision: 'CONFIRMED',
        comment: 'Verified wire gauge mismatch against WH-402 pin connector drawing.',
      },
    });
    expect(res.status()).toBe(201);

    const body = await res.json();
    expect(body.review).toBeDefined();
    expect(body.review.decision).toBe('CONFIRMED');
    expect(body.finding_status).toBe('CONFIRMED');
  });

  test('POST /api/v1/documents/:id/reports generates certificate and supports download', async ({ request }) => {
    const reportRes = await request.post(`/api/v1/documents/${createdDocId}/reports`, {
      headers: { 'x-organization-id': createdOrgId },
    });
    expect(reportRes.status()).toBe(201);

    const reportBody = await reportRes.json();
    expect(reportBody.report).toBeDefined();
    const reportId = reportBody.report.id;

    // Test download endpoint
    const downloadRes = await request.get(`/api/v1/reports/${reportId}/download?format=csv`, {
      headers: { 'x-organization-id': createdOrgId },
    });
    expect(downloadRes.status()).toBe(200);
    expect(downloadRes.headers()['content-type']).toContain('text/csv');
    const text = await downloadRes.text();
    expect(text).toContain('Finding ID,Severity,Status');
  });

  test('POST /api/v1/billing/razorpay/callback validates timing-safe HMAC signature', async ({ request }) => {
    const keySecret = process.env.RAZORPAY_KEY_SECRET || 'test_key_secret';
    const fakePaymentId = `pay_${Date.now()}`;
    const validSignature = crypto
      .createHmac('sha256', keySecret)
      .update(`${razorpayOrderId}|${fakePaymentId}`)
      .digest('hex');

    // Valid signature
    const validRes = await request.post('/api/v1/billing/razorpay/callback', {
      data: {
        razorpay_order_id: razorpayOrderId,
        razorpay_payment_id: fakePaymentId,
        razorpay_signature: validSignature,
      },
    });
    expect(validRes.status()).toBe(200);
    const validBody = await validRes.json();
    expect(validBody.verified).toBe(true);
    expect(validBody.status).toBe('PAYMENT_VERIFIED');

    // Tampered signature
    const invalidRes = await request.post('/api/v1/billing/razorpay/callback', {
      data: {
        razorpay_order_id: razorpayOrderId,
        razorpay_payment_id: fakePaymentId,
        razorpay_signature: 'tampered_signature_payload_123',
      },
    });
    expect(invalidRes.status()).toBe(200);
    const invalidBody = await invalidRes.json();
    expect(invalidBody.verified).toBe(false);
    expect(invalidBody.status).toBe('SIGNATURE_MISMATCH');
  });
});

