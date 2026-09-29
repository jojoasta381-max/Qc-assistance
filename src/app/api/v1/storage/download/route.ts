import { NextRequest, NextResponse } from 'next/server';
import { apiError } from '@/lib/api-v1-response';
import { getStorageProvider, PrivateLocalStorageProvider } from '@/lib/storage/storage-provider';

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const key = url.searchParams.get('key');
  const expStr = url.searchParams.get('exp');
  const token = url.searchParams.get('token');
  const filename = url.searchParams.get('filename') || 'document';

  if (!key || !expStr || !token) {
    return apiError('UNAUTHORIZED', 'Missing download authorization token parameters.', 401);
  }

  const exp = parseInt(expStr, 10);
  const storage = getStorageProvider();

  if (storage instanceof PrivateLocalStorageProvider) {
    const isValid = storage.verifyDownloadToken(key, exp, token);
    if (!isValid) {
      return apiError('FORBIDDEN', 'Download authorization signature is invalid or expired.', 403);
    }
  }

  try {
    const { buffer, metadata } = await storage.getObject(key);

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type': metadata.mimeType || 'application/octet-stream',
        'Content-Length': buffer.length.toString(),
        'Content-Disposition': `attachment; filename="${filename.replace(/"/g, '')}"`,
        'x-sha256': metadata.sha256,
        'Cache-Control': 'private, no-cache, no-store, must-revalidate',
      },
    });
  } catch (err: any) {
    return apiError('NOT_FOUND', err.message || 'Object not found in storage.', 404);
  }
}
