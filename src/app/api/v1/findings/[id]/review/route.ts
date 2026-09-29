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

    // Support both canonical and human review action verbs
    const decisionMapping: Record<string, string> = {
      ACCEPT: 'CONFIRMED',
      CONFIRMED: 'CONFIRMED',
      REJECT: 'REJECTED',
      REJECTED: 'REJECTED',
      FALSE_POSITIVE: 'FALSE_POSITIVE',
      WAIVED: 'WAIVED',
      MODIFIED: 'MODIFIED',
      NEEDS_MORE_EVIDENCE: 'NEEDS_MORE_EVIDENCE',
    };

    const normalizedDecision = decisionMapping[String(decision || '').toUpperCase()];
    if (!normalizedDecision) {
      return apiError(
        'INVALID_DECISION',
        `Decision must be one of: ACCEPT, REJECT, FALSE_POSITIVE, WAIVED, CONFIRMED, REJECTED, MODIFIED, NEEDS_MORE_EVIDENCE`,
        400
      );
    }

    // Require non-empty engineering rationale for FALSE_POSITIVE and WAIVED
    if (
      (normalizedDecision === 'FALSE_POSITIVE' || normalizedDecision === 'WAIVED') &&
      (!comment || typeof comment !== 'string' || !comment.trim())
    ) {
      return apiError(
        'REASON_REQUIRED',
        `An explicit engineering reason or comment is required when marking a finding as ${normalizedDecision}.`,
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
      return apiError('FINDING_NOT_FOUND', `Finding "${id}" not found in current organization.`, 404);
    }

    const previousStatus = finding.status;
    const reviewerId = user.id;

    // Transactionally create review and update finding status
    const [review, updatedFinding] = await prisma.$transaction([
      prisma.findingReview.create({
        data: {
          findingId: finding.id,
          reviewerId,
          decision: normalizedDecision,
          comment: comment ? comment.trim() : null,
        },
      }),
      prisma.finding.update({
        where: { id: finding.id },
        data: { status: normalizedDecision },
      }),
    ]);

    // Record immutable audit event
    await recordAuditEvent({
      tenantId: tenant.id,
      actorId: user.id,
      action: 'FINDING_REVIEWED',
      entityType: 'FINDING',
      entityId: finding.id,
      metadata: {
        previousStatus,
        newStatus: normalizedDecision,
        decision: normalizedDecision,
        comment: comment ? comment.trim() : null,
        reviewerName: user.name,
        reviewerEmail: user.email,
      },
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
