import { NextRequest } from 'next/server';
import { requirePermission, handleAuthError } from '@/lib/auth-guard';
import { prisma } from '@/lib/prisma';
import { apiSuccess, apiError } from '@/lib/api-v1-response';
import { recordAuditEvent } from '@/lib/audit/audit-logger';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authCtx = await requirePermission(req, 'finding:review');
    const tenant = authCtx.tenant;
    const user = authCtx.user;

    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const { decision, comment } = body;

    const validDecisions = ['CONFIRMED', 'REJECTED', 'MODIFIED', 'NEEDS_MORE_EVIDENCE'];
    if (!decision || !validDecisions.includes(decision)) {
      return apiError(
        'INVALID_DECISION',
        `Decision must be one of: ${validDecisions.join(', ')}`,
        400
      );
    }

    const finding = await prisma.finding.findFirst({
      where: {
        id,
        documentVersion: {
          document: { tenantId: tenant.id },
        },
      },
      include: {
        documentVersion: { select: { documentId: true } },
      },
    });

    if (!finding) {
      return apiError('FINDING_NOT_FOUND', `Finding "${id}" not found.`, 404);
    }

    // Reviewer is strictly the authenticated user
    const reviewerId = user.id;

    // Transactionally create review and update finding status
    const [review, updatedFinding] = await prisma.$transaction([
      prisma.findingReview.create({
        data: {
          findingId: finding.id,
          reviewerId,
          decision,
          comment: comment || null,
        },
      }),
      prisma.finding.update({
        where: { id: finding.id },
        data: { status: decision },
      }),
    ]);

    // Record audit event
    await recordAuditEvent({
      tenantId: tenant.id,
      actorId: user.id,
      action: 'FINDING_REVIEWED',
      entityType: 'FINDING',
      entityId: finding.id,
      metadata: { decision, comment },
    });

    return apiSuccess({
      review: {
        id: review.id,
        finding_id: finding.id,
        decision: review.decision,
        comment: review.comment,
        reviewer: user.name,
        created_at: review.createdAt,
      },
      finding_status: updatedFinding.status,
    }, 201);
  } catch (err: any) {
    const authResp = handleAuthError(err);
    if (authResp) return authResp;
    return apiError('REVIEW_SUBMISSION_FAILED', err.message || 'Failed to submit review', 400);
  }
}
