import { NextRequest } from 'next/server';
import { requirePermission, handleAuthError } from '@/lib/auth-guard';
import { prisma } from '@/lib/prisma';
import { apiSuccess, apiError } from '@/lib/api-v1-response';
import { getStorageProvider, computeBufferSha256 } from '@/lib/storage/storage-provider';
import { detectMagicBytes } from '@/lib/ingestion/preflight';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authCtx = await requirePermission(req, 'document:upload');
    const tenant = authCtx.tenant;
    const { id } = await params;

    // 1. Locate Document strictly within authenticated tenant
    const document = await prisma.document.findFirst({
      where: { id, tenantId: tenant.id },
      include: {
        versions: { orderBy: { version: 'desc' }, take: 1 },
      },
    });

    if (!document) {
      return apiError('DOCUMENT_NOT_FOUND', `Document "${id}" was not found in current organization.`, 404);
    }

    const version = document.versions[0];
    if (!version) {
      return apiError('VERSION_NOT_FOUND', `Document "${id}" has no active version records.`, 404);
    }

    // 2. Authoritative Object Verification in Private Storage
    const storageProvider = getStorageProvider();
    const objectMetadata = await storageProvider.getObjectMetadata(document.storageKey);

    if (!objectMetadata) {
      return apiError(
        'OBJECT_NOT_FOUND',
        `No uploaded file was found at storage key "${document.storageKey}". Please ensure the upload finished before verifying.`,
        422
      );
    }

    // 3. Fetch stored bytes to verify integrity & true MIME type
    const { buffer } = await storageProvider.getObject(document.storageKey);

    if (!buffer || buffer.length === 0) {
      return apiError('EMPTY_OBJECT', 'Uploaded object is 0 bytes.', 422);
    }

    const authoritativeSha256 = computeBufferSha256(buffer);
    const authoritativeSize = buffer.length;

    // 4. Validate magic bytes
    const detected = detectMagicBytes(buffer);
    if (detected.type === 'UNKNOWN') {
      await prisma.document.update({
        where: { id: document.id },
        data: {
          status: 'FAILED',
          uploadStatus: 'FAILED',
        },
      });
      return apiError(
        'UNRECOGNIZED_FORMAT',
        'Uploaded file failed magic-byte inspection. Must be a valid PDF, PNG, JPEG, or SVG.',
        422
      );
    }

    // 5. Update Document & Version to READY_FOR_PREFLIGHT
    const now = new Date();
    const updatedDoc = await prisma.document.update({
      where: { id: document.id },
      data: {
        status: 'READY_FOR_PREFLIGHT',
        uploadStatus: 'VERIFIED',
        checksum: authoritativeSha256,
        sourceSha256: authoritativeSha256,
        sizeBytes: authoritativeSize,
        sourceSizeBytes: authoritativeSize,
        mimeType: detected.mime,
        sourceMimeType: detected.mime,
        uploadedAt: now,
      },
    });

    await prisma.documentVersion.update({
      where: { id: version.id },
      data: {
        processingStatus: 'READY_FOR_PREFLIGHT',
        sha256: authoritativeSha256,
        sizeBytes: authoritativeSize,
      },
    });

    return apiSuccess({
      verification: {
        document_id: updatedDoc.id,
        version_id: version.id,
        status: 'READY_FOR_PREFLIGHT',
        upload_status: 'VERIFIED',
        source_sha256: authoritativeSha256,
        source_size_bytes: authoritativeSize,
        detected_mime_type: detected.mime,
        storage_key: document.storageKey,
        verified_at: now.toISOString(),
      },
    });
  } catch (err: any) {
    const authResp = handleAuthError(err);
    if (authResp) return authResp;
    return apiError('VERIFICATION_FAILED', err.message || 'Failed to verify uploaded document', 500);
  }
}
