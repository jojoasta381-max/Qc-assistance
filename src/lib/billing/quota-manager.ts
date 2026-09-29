import { prisma } from '@/lib/prisma';
import { recordAuditEvent } from '@/lib/audit/audit-logger';

/**
 * Atomically reserve 1 inspection quota check.
 * Uses conditional SQL update on the PostgreSQL organizations table.
 * If quotaUsed >= checkQuota, 0 rows are updated and false is returned.
 * If quotaUsed < checkQuota, 1 row is updated, incrementing quotaUsed by 1, and true is returned.
 */
export async function reserveQuotaAtomically(tenantId: string): Promise<boolean> {
  const updatedCount = await prisma.$executeRaw`
    UPDATE organizations
    SET "quotaUsed" = "quotaUsed" + 1
    WHERE id = ${tenantId} AND "quotaUsed" < "checkQuota"
  `;

  return updatedCount > 0;
}

/**
 * Refund a reserved check if processing permanently failed.
 * Decrements quotaUsed atomically without letting it drop below 0.
 */
export async function refundQuotaAtomically(
  tenantId: string,
  reason: string,
  referenceId?: string
): Promise<void> {
  await prisma.$executeRaw`
    UPDATE organizations
    SET "quotaUsed" = GREATEST("quotaUsed" - 1, 0)
    WHERE id = ${tenantId}
  `;

  try {
    await prisma.usageLedger.create({
      data: {
        tenantId,
        eventType: 'PROCESSING_FAILED_REFUND',
        quantity: 1,
        referenceType: 'DOCUMENT',
        referenceId: referenceId || null,
      },
    });

    await recordAuditEvent({
      tenantId,
      action: 'QUOTA_REFUNDED',
      entityType: 'TENANT',
      entityId: tenantId,
      metadata: { reason, referenceId },
    });
  } catch (err) {
    console.error('Failed to log quota refund ledger entry:', err);
  }
}
