import { NextRequest } from 'next/server';
import { resolveTenant } from '@/lib/tenant-resolver';
import { prisma } from '@/lib/prisma';
import { apiSuccess, apiError } from '@/lib/api-v1-response';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const tenant = await resolveTenant(req);
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

    // Resolve reviewer user
    let reviewer = await prisma.user.findFirst({
      where: { tenantId: tenant.id },
    });
    if (!reviewer) {
      reviewer = await prisma.user.create({
        data: {
          name: 'Lead QC Inspector',
          email: `inspector@${tenant.slug}.com`,
          role: 'LEAD_QC_INSPECTOR',
          tenantId: tenant.id,
        },
      });
    }

    // Transactionally create review and update finding status
    const [review, updatedFinding] = await prisma.$transaction([
      prisma.findingReview.create({
        data: {
          findingId: finding.id,
          reviewerId: reviewer.id,
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
    await prisma.auditEvent.create({
      data: {
        tenantId: tenant.id,
        actorId: reviewer.id,
        action: 'FINDING_REVIEWED',
        entityType: 'FINDING',
        entityId: finding.id,
        metadata: JSON.stringify({ decision, comment }),
      },
    });

    return apiSuccess({
      review: {
        id: review.id,
        finding_id: finding.id,
        decision: review.decision,
        comment: review.comment,
        reviewer: reviewer.name,
        created_at: review.createdAt,
      },
      finding_status: updatedFinding.status,
    }, 201);
  } catch (err: any) {
    return apiError('REVIEW_SUBMISSION_FAILED', err.message || 'Failed to submit review', 400);
  }
}
