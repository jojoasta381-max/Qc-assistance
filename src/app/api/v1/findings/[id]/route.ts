import { NextRequest } from 'next/server';
import { resolveTenant } from '@/lib/tenant-resolver';
import { prisma } from '@/lib/prisma';
import { apiSuccess, apiError } from '@/lib/api-v1-response';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const tenant = await resolveTenant(req);
    const { id } = await params;

    const finding = await prisma.finding.findFirst({
      where: {
        id,
        documentVersion: {
          document: { tenantId: tenant.id },
        },
      },
      include: {
        rule: true,
        reviews: {
          include: { reviewer: { select: { id: true, name: true, role: true } } },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!finding) {
      return apiError('FINDING_NOT_FOUND', `Finding "${id}" not found.`, 404);
    }

    return apiSuccess({
      finding: {
        id: finding.id,
        status: finding.status,
        severity: finding.severity,
        description: finding.description,
        confidence: finding.confidence,
        evidence: finding.evidence ? JSON.parse(finding.evidence) : null,
        rule: finding.rule,
        reviews: finding.reviews,
        created_at: finding.createdAt,
      },
    });
  } catch (err: any) {
    return apiError('FINDING_FETCH_FAILED', err.message || 'Failed to fetch finding', 500);
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const tenant = await resolveTenant(req);
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const { status, severity, description } = body;

    const finding = await prisma.finding.findFirst({
      where: {
        id,
        documentVersion: {
          document: { tenantId: tenant.id },
        },
      },
    });

    if (!finding) {
      return apiError('FINDING_NOT_FOUND', `Finding "${id}" not found.`, 404);
    }

    const updated = await prisma.finding.update({
      where: { id },
      data: {
        ...(status ? { status } : {}),
        ...(severity ? { severity } : {}),
        ...(description ? { description } : {}),
      },
    });

    return apiSuccess({ finding: updated });
  } catch (err: any) {
    return apiError('FINDING_UPDATE_FAILED', err.message || 'Failed to update finding', 400);
  }
}
