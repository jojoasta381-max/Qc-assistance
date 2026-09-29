import { NextRequest } from 'next/server';
import { requirePermission, handleAuthError } from '@/lib/auth-guard';
import { createCheckoutOrder } from '@/lib/billing/razorpay-service';
import { apiSuccess, apiError } from '@/lib/api-v1-response';
import { recordAuditEvent } from '@/lib/audit/audit-logger';

export async function POST(req: NextRequest) {
  try {
    const authCtx = await requirePermission(req, 'billing:manage');
    const tenant = authCtx.tenant;
    const user = authCtx.user;

    const body = await req.json().catch(() => ({}));
    const { plan_code, idempotency_key, customer } = body;

    if (!plan_code) {
      return apiError('INVALID_PLAN', 'plan_code is required (e.g. ENGINEERING_TEAM, ENTERPRISE_TEAM, INDUSTRIAL_SCALE)', 400);
    }

    const orderData = await createCheckoutOrder({
      tenantId: tenant.id,
      planCode: plan_code,
      idempotencyKey: idempotency_key || req.headers.get('idempotency-key') || undefined,
      customer: {
        name: customer?.name || user.name,
        email: customer?.email || user.email,
        phone: customer?.phone || undefined,
      },
    });

    await recordAuditEvent({
      tenantId: tenant.id,
      actorId: user.id,
      action: 'CHECKOUT_ORDER_CREATED',
      entityType: 'PAYMENT_ORDER',
      entityId: orderData.internalOrderId,
      metadata: { planCode: plan_code, providerOrderId: orderData.orderId },
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
    const authResp = handleAuthError(err);
    if (authResp) return authResp;
    return apiError('CHECKOUT_CREATION_FAILED', err.message || 'Failed to initiate checkout', 400);
  }
}
