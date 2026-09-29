import { NextRequest, NextResponse } from 'next/server';
import { requirePermission, handleAuthError } from '@/lib/auth-guard';
import { prisma } from '@/lib/prisma';
import { apiError, apiSuccess } from '@/lib/api-v1-response';
import { getStorageProvider, verifyTenantStorageKeyAccess } from '@/lib/storage/storage-provider';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authCtx = await requirePermission(req, 'document:read');
    const tenant = authCtx.tenant;
    const { id } = await params;

    // Strict tenant boundary lookup
    const document = await prisma.document.findFirst({
      where: { id, tenantId: tenant.id },
      include: {
        versions: { orderBy: { version: 'desc' }, take: 1 },
      },
    });

    if (!document) {
      return apiError('DOCUMENT_NOT_FOUND', `Document "${id}" was not found in your organization.`, 404);
    }

    if (!verifyTenantStorageKeyAccess(document.storageKey, tenant.id)) {
      return apiError('FORBIDDEN', 'Access to storage object outside tenant boundary is denied.', 403);
    }

    const storageProvider = getStorageProvider();
    const downloadUrl = await storageProvider.getPresignedDownloadUrl(
      document.storageKey,
      900, // 15 minutes
      document.filename
    );

    const format = req.nextUrl.searchParams.get('format');
    if (format === 'stream') {
      // Direct stream response
      const { buffer, metadata } = await storageProvider.getObject(document.storageKey);
      return new NextResponse(new Uint8Array(buffer), {
        status: 200,
        headers: {
          'Content-Type': metadata.mimeType || 'application/octet-stream',
          'Content-Length': buffer.length.toString(),
          'Content-Disposition': `attachment; filename="${document.filename.replace(/"/g, '')}"`,
          'x-sha256': metadata.sha256,
          'Cache-Control': 'private, no-cache, no-store, must-revalidate',
        },
      });
    }

    return apiSuccess({
      download: {
        document_id: document.id,
        filename: document.filename,
        download_url: downloadUrl,
        expires_in_seconds: 900,
        size_bytes: document.sizeBytes,
        mime_type: document.mimeType,
        sha256: document.sourceSha256 || document.checksum,
      },
    });
  } catch (err: any) {
    const authResp = handleAuthError(err);
    if (authResp) return authResp;
    return apiError('DOWNLOAD_FAILED', err.message || 'Failed to generate download URL', 500);
  }
}
