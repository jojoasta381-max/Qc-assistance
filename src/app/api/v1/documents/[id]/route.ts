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
        project: true,
        versions: {
          orderBy: { version: 'desc' },
          include: {
            findings: {
              include: { rule: true },
            },
            components: true,
            connections: true,
          },
        },
      },
    });

    if (!document) {
      return apiError('DOCUMENT_NOT_FOUND', `Document "${id}" was not found.`, 404);
    }

    return apiSuccess({ document });
  } catch (err: any) {
    return apiError('DOCUMENT_FETCH_FAILED', err.message || 'Failed to fetch document', 500);
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const tenant = await resolveTenant(req);
    const { id } = await params;

    const document = await prisma.document.findFirst({
      where: { id, tenantId: tenant.id },
    });

    if (!document) {
      return apiError('DOCUMENT_NOT_FOUND', `Document "${id}" was not found.`, 404);
    }

    await prisma.document.delete({ where: { id } });

    await prisma.auditEvent.create({
      data: {
        tenantId: tenant.id,
        action: 'DOCUMENT_DELETED',
        entityType: 'DOCUMENT',
        entityId: id,
        metadata: JSON.stringify({ filename: document.filename }),
      },
    });

    return apiSuccess({ message: 'Document deleted successfully.', id });
  } catch (err: any) {
    return apiError('DOCUMENT_DELETE_FAILED', err.message || 'Failed to delete document', 400);
  }
}
