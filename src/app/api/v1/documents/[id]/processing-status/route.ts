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

    const document = await prisma.document.findFirst({
      where: { id, tenantId: tenant.id },
      include: {
        versions: {
          orderBy: { version: 'desc' },
          take: 1,
          include: {
            _count: { select: { findings: true, components: true } },
          },
        },
      },
    });

    if (!document) {
      return apiError('DOCUMENT_NOT_FOUND', `Document "${id}" was not found.`, 404);
    }

    const version = document.versions[0];
    const status = version ? version.processingStatus : document.status;

    return apiSuccess({
      document_id: document.id,
      status,
      version: version?.version || 1,
      stats: {
        findings_count: version?._count.findings || 0,
        components_count: version?._count.components || 0,
      },
      updated_at: document.updatedAt,
    });
  } catch (err: any) {
    return apiError('STATUS_FETCH_FAILED', err.message || 'Failed to fetch processing status', 500);
  }
}
