import { prisma } from '@/lib/prisma';
import crypto from 'crypto';

export interface AuditLogParams {
  tenantId: string;
  actorId?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  metadata?: Record<string, unknown> | null;
  ipAddress?: string | null;
}

/**
 * Standard server-authoritative audit logging
 */
export async function recordAuditEvent(params: AuditLogParams) {
  try {
    const ipHash = params.ipAddress
      ? crypto.createHash('sha256').update(params.ipAddress).digest('hex').slice(0, 16)
      : null;

    return await prisma.auditEvent.create({
      data: {
        tenantId: params.tenantId,
        actorId: params.actorId || null,
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId || null,
        metadata: params.metadata ? JSON.stringify(params.metadata) : null,
        ipHash,
      },
    });
  } catch (err) {
    // Non-blocking log failure but log to console
    console.error('[AuditLogger Error] Failed to write audit event:', err);
    return null;
  }
}
