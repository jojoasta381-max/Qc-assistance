import { NextRequest } from 'next/server';
import { requirePermission, handleAuthError } from '@/lib/auth-guard';
import { prisma } from '@/lib/prisma';
import { apiSuccess, apiError } from '@/lib/api-v1-response';
import path from 'path';
import { getStorageProvider, generateAuthoritativeStorageKey } from '@/lib/storage/storage-provider';

const MAX_UPLOAD_BYTES = 50 * 1024 * 1024; // 50MB enterprise limit
const ALLOWED_MIME_TYPES = ['application/pdf', 'image/png', 'image/jpeg', 'image/svg+xml'];

export async function POST(req: NextRequest) {
  try {
    const authCtx = await requirePermission(req, 'document:upload');
    const tenant = authCtx.tenant;
    const user = authCtx.user;

    const body = await req.json().catch(() => ({}));
    const { filename, mime_type, size_bytes, project_id } = body;

    if (!filename || !mime_type) {
      return apiError('VALIDATION_ERROR', 'filename and mime_type are required.', 400);
    }

    if (!ALLOWED_MIME_TYPES.includes(mime_type)) {
      return apiError(
        'UNSUPPORTED_MEDIA_TYPE',
        `Unsupported format "${mime_type}". Allowed: PDF, PNG, JPEG, SVG.`,
        415
      );
    }

    if (size_bytes && (typeof size_bytes !== 'number' || size_bytes > MAX_UPLOAD_BYTES)) {
      return apiError(
        'FILE_TOO_LARGE',
        `File size (${((size_bytes || 0) / (1024 * 1024)).toFixed(1)} MB) exceeds 50MB enterprise limit.`,
        400
      );
    }

    // Verify project belongs strictly to this tenant
    let targetProjectId: string | null = null;
    if (project_id) {
      const proj = await prisma.project.findFirst({
        where: { id: project_id, tenantId: tenant.id },
      });
      if (!proj) {
        return apiError('PROJECT_NOT_FOUND', `Project "${project_id}" not found in current organization.`, 404);
      }
      targetProjectId = proj.id;
    }

    const ext = path.extname(filename).replace('.', '') || (mime_type === 'application/pdf' ? 'pdf' : 'bin');

    // 1. Create Document with UPLOADING status
    const doc = await prisma.document.create({
      data: {
        tenantId: tenant.id,
        projectId: targetProjectId,
        filename: path.basename(filename),
        sourceOriginalFilename: filename,
        mimeType: mime_type,
        sizeBytes: size_bytes || 0,
        storageKey: 'pending',
        status: 'UPLOADING',
        uploadStatus: 'PENDING',
        createdBy: user.id,
      },
    });

    // 2. Create initial DocumentVersion
    const version = await prisma.documentVersion.create({
      data: {
        documentId: doc.id,
        version: 1,
        storageKey: 'pending',
        processingStatus: 'QUEUED',
      },
    });

    // 3. Generate authoritative server-side storage key
    const authoritativeStorageKey = generateAuthoritativeStorageKey({
      organizationId: tenant.id,
      projectId: targetProjectId,
      documentId: doc.id,
      versionId: version.id,
      extension: ext,
    });

    // 4. Update Document and Version with authoritative storage key
    await prisma.document.update({
      where: { id: doc.id },
      data: { storageKey: authoritativeStorageKey },
    });

    await prisma.documentVersion.update({
      where: { id: version.id },
      data: { storageKey: authoritativeStorageKey },
    });

    // 5. Generate presigned upload URL from storage provider
    const storageProvider = getStorageProvider();
    const presigned = await storageProvider.getPresignedUploadUrl(
      authoritativeStorageKey,
      mime_type,
      900 // 15 minutes expiration
    );

    return apiSuccess(
      {
        upload_session: {
          document_id: doc.id,
          version_id: version.id,
          storage_key: authoritativeStorageKey,
          upload_url: presigned.url,
          method: presigned.method,
          headers: presigned.headers,
          expires_in_seconds: presigned.expiresInSeconds,
          verification_url: `/api/v1/documents/${doc.id}/upload-complete`,
          metadata: {
            filename: path.basename(filename),
            mime_type,
            size_bytes: size_bytes || 0,
            project_id: targetProjectId,
            organization_id: tenant.id,
          },
        },
      },
      201
    );
  } catch (err: any) {
    const authResp = handleAuthError(err);
    if (authResp) return authResp;
    return apiError('UPLOAD_SESSION_FAILED', err.message || 'Failed to initiate upload session', 400);
  }
}
