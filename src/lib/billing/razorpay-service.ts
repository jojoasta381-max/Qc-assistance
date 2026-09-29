import crypto from 'crypto';
import { prisma } from '@/lib/prisma';
import { ensureDefaultTenantData } from '@/lib/db-service';

export interface CheckoutOptions {
  tenantId: string;
  planCode: string;
  idempotencyKey?: string;
  customer?: {
    name?: string;
    email?: string;
    phone?: string;
  };
}

export interface RazorpayOrderResponse {
  id: string;
  amount: number; // in integer minor units (paise)
  currency: string;
  receipt: string;
  status: string;
  key_id: string;
  notes: Record<string, string>;
}

import { isProduction } from '@/lib/config/app-mode';

export function getRazorpayConfig() {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

  if (isProduction()) {
    if (!keyId || !keySecret || !webhookSecret) {
      throw new Error('[Security Fatal] Razorpay credentials not configured in PRODUCTION mode.');
    }
  }

  return {
    keyId: keyId || '',
    keySecret: keySecret || '',
    webhookSecret: webhookSecret || '',
  };
}

/**
 * Creates a server-authoritative Razorpay Order
 */
export async function createCheckoutOrder(options: CheckoutOptions) {
  await ensureDefaultTenantData();
  const { keyId } = getRazorpayConfig();

  // 1. Resolve tenant
  const tenant = await prisma.tenant.findUnique({
    where: { id: options.tenantId },
  });
  if (!tenant) {
    throw new Error('Tenant organization not found.');
  }

  // 2. Resolve selected plan from database
  const plan = await prisma.plan.findUnique({
    where: { code: options.planCode },
  });
  if (!plan || !plan.active) {
    throw new Error(`Plan ${options.planCode} is inactive or not found.`);
  }

  // 3. Idempotency Check: if key provided and order exists, return existing order
  if (options.idempotencyKey) {
    const existingOrder = await prisma.paymentOrder.findUnique({
      where: { idempotencyKey: options.idempotencyKey },
      include: { plan: true },
    });
    if (existingOrder && existingOrder.providerOrderId) {
      return {
        orderId: existingOrder.providerOrderId,
        internalOrderId: existingOrder.id,
        amountMinor: existingOrder.amountMinor,
        currency: existingOrder.currency,
        keyId,
        planName: existingOrder.plan.name,
        planCode: existingOrder.plan.code,
      };
    }
  }

  // 4. Calculate server-authoritative amount in integer minor units
  const amountMinor = plan.priceMinor;
  const currency = plan.currency;

  // 5. Generate internal payment_order record
  const internalOrder = await prisma.paymentOrder.create({
    data: {
      tenantId: tenant.id,
      planId: plan.id,
      amountMinor,
      currency,
      status: 'CREATED',
      idempotencyKey: options.idempotencyKey,
    },
  });

  // 6. Generate Razorpay Provider Order ID
  // If live credentials provided, invoke Razorpay API. Otherwise generate compliant test Order ID.
  let providerOrderId = `order_${Date.now().toString(36)}_${crypto.randomBytes(6).toString('hex')}`;

  if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) {
    try {
      const authHeader = Buffer.from(
        `${process.env.RAZORPAY_KEY_ID}:${process.env.RAZORPAY_KEY_SECRET}`
      ).toString('base64');

      const response = await fetch('https://api.razorpay.com/v1/orders', {
        method: 'POST',
        headers: {
          Authorization: `Basic ${authHeader}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: amountMinor,
          currency,
          receipt: internalOrder.id.slice(0, 40),
          notes: {
            tenantId: tenant.id,
            planCode: plan.code,
            internalOrderId: internalOrder.id,
          },
        }),
      });

      if (response.ok) {
        const rzpData = await response.json();
        if (rzpData.id) providerOrderId = rzpData.id;
      }
    } catch (err) {
      console.warn('Razorpay API call failed, falling back to secure internal order ID:', err);
    }
  }

  // 7. Update internal order with provider ID
  await prisma.paymentOrder.update({
    where: { id: internalOrder.id },
    data: { providerOrderId },
  });

  return {
    orderId: providerOrderId,
    internalOrderId: internalOrder.id,
    amountMinor,
    currency,
    keyId,
    planName: plan.name,
    planCode: plan.code,
  };
}

/**
 * Verifies Razorpay payment signature from client callback
 */
export function verifyPaymentSignature(
  orderId: string,
  paymentId: string,
  signature: string
): boolean {
  try {
    const { keySecret } = getRazorpayConfig();
    if (!keySecret || !signature) return false;

    const generated = crypto
      .createHmac('sha256', keySecret)
      .update(`${orderId}|${paymentId}`)
      .digest('hex');

    const expectedBuffer = Buffer.from(generated, 'utf8');
    const actualBuffer = Buffer.from(signature, 'utf8');

    if (expectedBuffer.length !== actualBuffer.length) {
      return false;
    }

    return crypto.timingSafeEqual(expectedBuffer, actualBuffer);
  } catch {
    return false;
  }
}

/**
 * Verifies Razorpay Webhook signature
 */
export function verifyWebhookSignature(rawBody: string, signature: string): boolean {
  try {
    const { webhookSecret } = getRazorpayConfig();
    if (!webhookSecret || !signature) return false;

    const expected = crypto
      .createHmac('sha256', webhookSecret)
      .update(rawBody)
      .digest('hex');

    const expectedBuffer = Buffer.from(expected, 'utf8');
    const actualBuffer = Buffer.from(signature, 'utf8');

    if (expectedBuffer.length !== actualBuffer.length) {
      return false;
    }

    return crypto.timingSafeEqual(expectedBuffer, actualBuffer);
  } catch {
    return false;
  }
}

/**
 * Handles Webhook Events transactionally with Deduplication & Entitlement Provisioning
 */
export async function processRazorpayWebhook(
  eventId: string,
  eventType: string,
  payload: any,
  rawBody: string,
  signatureValid: boolean
) {
  // 1. Check event deduplication
  const payloadHash = crypto.createHash('sha256').update(rawBody).digest('hex');

  const existingWebhook = await prisma.paymentWebhook.findUnique({
    where: {
      provider_eventId: {
        provider: 'razorpay',
        eventId,
      },
    },
  });

  if (existingWebhook) {
    return { status: 'DUPLICATE_SKIPPED', message: 'Webhook already processed.' };
  }

  // Record webhook entry
  await prisma.paymentWebhook.create({
    data: {
      provider: 'razorpay',
      eventId,
      eventType,
      signatureValid,
      payloadHash,
      status: signatureValid ? 'PROCESSED' : 'INVALID_SIGNATURE',
    },
  });

  if (!signatureValid) {
    throw new Error('Invalid Razorpay webhook signature');
  }

  // 2. Transactionally process events
  if (eventType === 'order.paid' || eventType === 'payment.captured') {
    const paymentEntity = payload.payment?.entity || payload.entity;
    const providerOrderId = paymentEntity?.order_id;
    const providerPaymentId = paymentEntity?.id || `pay_${Date.now()}`;
    const method = paymentEntity?.method?.toUpperCase() || 'UPI';
    const amountMinor = paymentEntity?.amount || 0;

    if (providerOrderId) {
      const order = await prisma.paymentOrder.findUnique({
        where: { providerOrderId },
        include: { plan: true, tenant: true },
      });

      if (order) {
        await prisma.$transaction(async (tx) => {
          // Update Order to PAID
          await tx.paymentOrder.update({
            where: { id: order.id },
            data: { status: 'PAID' },
          });

          // Persist Payment Record
          await tx.payment.upsert({
            where: { providerPaymentId },
            update: { status: 'CAPTURED', amountMinor },
            create: {
              paymentOrderId: order.id,
              providerPaymentId,
              method,
              status: 'CAPTURED',
              amountMinor: order.amountMinor,
              capturedAt: new Date(),
              rawReference: JSON.stringify(paymentEntity),
            },
          });

          // Provision Entitlements
          const checksToAdd = order.plan.includedChecks || 100;
          await tx.tenant.update({
            where: { id: order.tenantId },
            data: {
              checkQuota: { increment: checksToAdd },
              plan: order.plan.code,
            },
          });

          // Record in Usage Ledger
          await tx.usageLedger.create({
            data: {
              tenantId: order.tenantId,
              eventType: 'CHECKS_PROVISIONED',
              quantity: checksToAdd,
              referenceType: 'PAYMENT',
              referenceId: providerPaymentId,
            },
          });

          // Record Audit Event
          await tx.auditEvent.create({
            data: {
              tenantId: order.tenantId,
              action: 'PAYMENT_CAPTURE',
              entityType: 'PAYMENT',
              entityId: providerPaymentId,
              metadata: JSON.stringify({
                orderId: order.id,
                amountMinor: order.amountMinor,
                plan: order.plan.code,
              }),
            },
          });
        });
      }
    }
  }

  return { status: 'SUCCESS' };
}

