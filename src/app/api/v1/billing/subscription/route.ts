import { NextRequest } from 'next/server';
import { resolveTenant } from '@/lib/tenant-resolver';
import { prisma } from '@/lib/prisma';
import { apiSuccess, apiError } from '@/lib/api-v1-response';

export async function GET(req: NextRequest) {
  try {
    const tenant = await resolveTenant(req);

    const subscription = await prisma.subscription.findFirst({
      where: { tenantId: tenant.id },
      include: { plan: true },
      orderBy: { createdAt: 'desc' },
    });

    const recentOrders = await prisma.paymentOrder.findMany({
      where: { tenantId: tenant.id },
      include: { plan: true, payments: true },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    const entitlements = await prisma.entitlement.findMany({
      where: { tenantId: tenant.id },
    });

    return apiSuccess({
      organization: {
        id: tenant.id,
        name: tenant.name,
        plan: tenant.plan,
      },
      quota: {
        total_allowed: tenant.checkQuota,
        used: tenant.quotaUsed,
        remaining: Math.max(0, tenant.checkQuota - tenant.quotaUsed),
      },
      subscription: subscription
        ? {
            id: subscription.id,
            status: subscription.status,
            plan: subscription.plan.name,
            plan_code: subscription.plan.code,
            price_minor: subscription.plan.priceMinor,
            currency: subscription.plan.currency,
            current_period_start: subscription.currentPeriodStart,
            current_period_end: subscription.currentPeriodEnd,
            cancel_at_period_end: subscription.cancelAtPeriodEnd,
          }
        : null,
      entitlements: entitlements.map((e) => ({
        feature_code: e.featureCode,
        quantity: e.quantity,
        consumed: e.consumed,
      })),
      recent_orders: recentOrders.map((o) => ({
        id: o.id,
        provider_order_id: o.providerOrderId,
        plan: o.plan.name,
        amount_minor: o.amountMinor,
        currency: o.currency,
        status: o.status,
        created_at: o.createdAt,
      })),
    });
  } catch (err: any) {
    return apiError('SUBSCRIPTION_FETCH_FAILED', err.message || 'Failed to retrieve subscription', 500);
  }
}
