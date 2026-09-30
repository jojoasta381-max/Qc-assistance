import { NextRequest } from 'next/server';
import { apiSuccess, apiError } from '@/lib/api-v1-response';
import { getStorageProvider, PrivateLocalStorageProvider, verifyTenantStorageKeyAccess } from '@/lib/storage/storage-provider';
import { requirePermission, handleAuthError } from '@/lib/auth-guard';

const MAX_UPLOAD_BYTES = 50 * 1024 * 1024; // 50MB

async function handleUpload(req: NextRequest) {
  const url = new URL(req.url);
  const key = url.searchParams.get('key');
  const mime = url.searchParams.get('mime') || req.headers.get('content-type') || 'application/octet-stream';
  const expStr = url.searchParams.get('exp');
  const token = url.searchParams.get('token');

  if (!key) {
    return apiError('MISSING_STORAGE_KEY', 'Query parameter "key" is required.', 400);
  }

  // 1. Verify access authorization: either via valid signed upload token OR active user session
  let isAuthorized = false;
  if (token && expStr) {
    const exp = parseInt(expStr, 10);
    const storage = getStorageProvider();
    if (storage instanceof PrivateLocalStorageProvider) {
      isAuthorized = storage.verifyPresignedToken(key, mime, exp, token);
    } else {
      // In S3 mode, presigned uploads are handled directly by the S3 gateway.
      // Direct proxy upload with HMAC token is not authorized.
      isAuthorized = false;
    }
    if (!isAuthorized) {
      return apiError('FORBIDDEN', 'Invalid or expired upload signature token.', 403);
    }
  } else {
    // Session-based authorization
    try {
      const authCtx = await requirePermission(req, 'document:upload');
      if (!verifyTenantStorageKeyAccess(key, authCtx.tenant.id)) {
        return apiError('FORBIDDEN', 'Cannot upload to storage key outside organization namespace.', 403);
      }
      isAuthorized = true;
    } catch (err: any) {
      const authResp = handleAuthError(err);
      if (authResp) return authResp;
      return apiError('UNAUTHORIZED', 'Authentication or valid upload signature required.', 401);
    }
  }

  // 2. Read uploaded bytes
  let buffer: Buffer;
  const contentType = req.headers.get('content-type') || '';

  if (contentType.includes('multipart/form-data')) {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    if (!file) {
      return apiError('VALIDATION_ERROR', 'No file found in multipart upload.', 400);
    }
    const arrayBuffer = await file.arrayBuffer();
    buffer = Buffer.from(arrayBuffer);
  } else {
    const arrayBuffer = await req.arrayBuffer();
    buffer = Buffer.from(arrayBuffer);
  }

  if (buffer.length === 0) {
    return apiError('EMPTY_FILE', 'Uploaded file payload is empty.', 400);
  }

  if (buffer.length > MAX_UPLOAD_BYTES) {
    return apiError('FILE_TOO_LARGE', `Uploaded file exceeds 50MB limit (${(buffer.length / (1024 * 1024)).toFixed(1)} MB).`, 400);
  }

  // 3. Persist to authoritative storage provider
  const storageProvider = getStorageProvider();
  const meta = await storageProvider.putObject(key, buffer, mime);

  return apiSuccess({
    uploaded: {
      storage_key: meta.key,
      size_bytes: meta.sizeBytes,
      sha256: meta.sha256,
      mime_type: meta.mimeType,
      uploaded_at: meta.uploadedAt.toISOString(),
    },
  });
}

export async function PUT(req: NextRequest) {
  return handleUpload(req);
}

export async function POST(req: NextRequest) {
  return handleUpload(req);
}
