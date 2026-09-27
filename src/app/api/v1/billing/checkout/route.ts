import { NextRequest } from 'next/server';
import { resolveTenant } from '@/lib/tenant-resolver';
import { createCheckoutOrder } from '@/lib/billing/razorpay-service';
import { apiSuccess, apiError } from '@/lib/api-v1-response';

export async function POST(req: NextRequest) {
  try {
    const tenant = await resolveTenant(req);
    const body = await req.json().catch(() => ({}));

    const { plan_code, idempotency_key, customer } = body;
    if (!plan_code) {
      return apiError('INVALID_PLAN', 'plan_code is required (e.g. PAY_PER_CHECK, PRO_MONTHLY, PRO_ANNUAL)', 400);
    }

    const orderData = await createCheckoutOrder({
      tenantId: tenant.id,
      planCode: plan_code,
      idempotencyKey: idempotency_key || req.headers.get('idempotency-key') || undefined,
      customer,
    });

    return apiSuccess({
      checkout: {
        order_id: orderData.orderId,
        internal_order_id: orderData.internalOrderId,
        amount_minor: orderData.amountMinor,
        currency: orderData.currency,
        key_id: orderData.keyId,
        plan_name: orderData.planName,
        plan_code: orderData.planCode,
        organization: {
          id: tenant.id,
          name: tenant.name,
        },
      },
    }, 201);
  } catch (err: any) {
    return apiError('CHECKOUT_CREATION_FAILED', err.message || 'Failed to initiate checkout', 400);
  }
}
