import { NextRequest } from 'next/server';
import { resolveTenant } from '@/lib/tenant-resolver';
import { prisma } from '@/lib/prisma';
import { apiSuccess, apiError } from '@/lib/api-v1-response';

export async function POST(req: NextRequest) {
  try {
    const tenant = await resolveTenant(req);

    const subscription = await prisma.subscription.findFirst({
      where: {
        tenantId: tenant.id,
        status: 'ACTIVE',
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!subscription) {
      return apiError('NO_ACTIVE_SUBSCRIPTION', 'No active subscription found to cancel.', 404);
    }

    const updated = await prisma.subscription.update({
      where: { id: subscription.id },
      data: { cancelAtPeriodEnd: true },
    });

    await prisma.auditEvent.create({
      data: {
        tenantId: tenant.id,
        action: 'SUBSCRIPTION_CANCEL_SCHEDULED',
        entityType: 'SUBSCRIPTION',
        entityId: subscription.id,
        metadata: JSON.stringify({ currentPeriodEnd: subscription.currentPeriodEnd }),
      },
    });

    return apiSuccess({
      message: 'Subscription will cancel at the end of the current billing cycle.',
      subscription: {
        id: updated.id,
        status: updated.status,
        cancel_at_period_end: updated.cancelAtPeriodEnd,
        current_period_end: updated.currentPeriodEnd,
      },
    });
  } catch (err: any) {
    return apiError('SUBSCRIPTION_CANCEL_FAILED', err.message || 'Failed to cancel subscription', 500);
  }
}
