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
    const { searchParams } = new URL(req.url);
    const severity = searchParams.get('severity');
    const status = searchParams.get('status');

    const document = await prisma.document.findFirst({
      where: { id, tenantId: tenant.id },
      include: {
        versions: { orderBy: { version: 'desc' }, take: 1 },
      },
    });

    if (!document) {
      return apiError('DOCUMENT_NOT_FOUND', `Document "${id}" was not found.`, 404);
    }

    const version = document.versions[0];
    if (!version) {
      return apiSuccess({ findings: [] });
    }

    const findings = await prisma.finding.findMany({
      where: {
        documentVersionId: version.id,
        ...(severity ? { severity } : {}),
        ...(status ? { status } : {}),
      },
      include: {
        rule: true,
        reviews: { orderBy: { createdAt: 'desc' } },
      },
      orderBy: { severity: 'asc' },
    });

    return apiSuccess({
      document_id: document.id,
      version: version.version,
      findings: findings.map((f) => ({
        id: f.id,
        status: f.status,
        severity: f.severity,
        description: f.description,
        confidence: f.confidence,
        evidence: f.evidence ? JSON.parse(f.evidence) : null,
        rule: f.rule
          ? {
              code: f.rule.code,
              name: f.rule.name,
              standard_ref: f.rule.version,
            }
          : null,
        reviews_count: f.reviews.length,
        created_at: f.createdAt,
      })),
    });
  } catch (err: any) {
    return apiError('FINDINGS_FETCH_FAILED', err.message || 'Failed to list findings', 500);
  }
}
