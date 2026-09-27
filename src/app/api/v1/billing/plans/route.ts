import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ensureDefaultTenantData } from '@/lib/db-service';
import { apiSuccess, apiError } from '@/lib/api-v1-response';

export async function GET(req: NextRequest) {
  try {
    await ensureDefaultTenantData();
    const plans = await prisma.plan.findMany({
      where: { active: true },
      orderBy: { priceMinor: 'asc' },
    });

    const formattedPlans = plans.map((p) => ({
      id: p.id,
      code: p.code,
      name: p.name,
      billing_interval: p.billingInterval,
      price_minor: p.priceMinor,
      currency: p.currency,
      price_formatted: `₹${(p.priceMinor / 100).toFixed(2)}`,
      included_checks: p.includedChecks,
      features: p.features ? JSON.parse(p.features) : [],
    }));

    return apiSuccess({ plans: formattedPlans });
  } catch (err: any) {
    return apiError('PLANS_FETCH_FAILED', err.message || 'Failed to retrieve plans', 500);
  }
}
