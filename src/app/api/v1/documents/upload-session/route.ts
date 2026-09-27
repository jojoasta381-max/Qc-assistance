import { NextRequest } from 'next/server';
import { resolveTenant } from '@/lib/tenant-resolver';
import { apiSuccess, apiError } from '@/lib/api-v1-response';
import crypto from 'crypto';

export async function POST(req: NextRequest) {
  try {
    const tenant = await resolveTenant(req);
    const body = await req.json().catch(() => ({}));
    const { filename, mime_type, size_bytes, project_id } = body;

    if (!filename || !mime_type) {
      return apiError('VALIDATION_ERROR', 'filename and mime_type are required.', 400);
    }

    // Supported MIME types: PDF, PNG, JPEG, SVG
    const allowedMime = ['application/pdf', 'image/png', 'image/jpeg', 'image/svg+xml'];
    if (!allowedMime.includes(mime_type)) {
      return apiError('UNSUPPORTED_MEDIA_TYPE', `Unsupported format ${mime_type}. Allowed: PDF, PNG, JPEG, SVG.`, 415);
    }

    const storageKey = `uploads/${tenant.id}/${Date.now()}_${crypto.randomBytes(4).toString('hex')}_${filename.replace(/[^a-zA-Z0-9._-]/g, '')}`;
    const uploadSessionId = `ups_${Date.now().toString(36)}_${crypto.randomBytes(6).toString('hex')}`;

    // S3 or storage direct upload payload
    const uploadUrl = `/api/v1/documents/upload-direct?session=${uploadSessionId}`;

    return apiSuccess({
      upload_session: {
        id: uploadSessionId,
        storage_key: storageKey,
        upload_url: uploadUrl,
        expires_in_seconds: 3600,
        metadata: {
          filename,
          mime_type,
          size_bytes: size_bytes || 0,
          project_id: project_id || null,
          organization_id: tenant.id,
        },
      },
    }, 201);
  } catch (err: any) {
    return apiError('UPLOAD_SESSION_FAILED', err.message || 'Failed to initiate upload session', 400);
  }
}
