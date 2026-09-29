import crypto from 'crypto';
import path from 'path';
import fs from 'fs/promises';
import { existsSync } from 'fs';
import { S3Client, PutObjectCommand, GetObjectCommand, HeadObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

export interface StorageObjectMetadata {
  key: string;
  sizeBytes: number;
  sha256: string;
  mimeType: string;
  uploadedAt: Date;
  customMetadata?: Record<string, string>;
}

export interface PresignedUploadDetails {
  url: string;
  method: 'PUT' | 'POST';
  headers: Record<string, string>;
  expiresInSeconds: number;
}

export interface StorageProvider {
  putObject(
    key: string,
    data: Buffer | Uint8Array,
    mimeType: string,
    metadata?: Record<string, string>
  ): Promise<StorageObjectMetadata>;

  getObject(key: string): Promise<{ buffer: Buffer; metadata: StorageObjectMetadata }>;

  getObjectMetadata(key: string): Promise<StorageObjectMetadata | null>;

  getPresignedUploadUrl(
    key: string,
    mimeType: string,
    expiresInSeconds?: number
  ): Promise<PresignedUploadDetails>;

  getPresignedDownloadUrl(
    key: string,
    expiresInSeconds?: number,
    downloadFilename?: string
  ): Promise<string>;

  deleteObject(key: string): Promise<void>;
}

/**
 * Validates whether an object key is safe and belongs strictly to the given organization.
 * Prevents directory traversal and multi-tenant cross-boundary contamination.
 */
export function verifyTenantStorageKeyAccess(storageKey: string, organizationId: string): boolean {
  if (!storageKey || typeof storageKey !== 'string') return false;
  if (storageKey.includes('..') || storageKey.includes('\\') || storageKey.startsWith('/')) {
    return false; // Path traversal attempt
  }
  const prefix = `organizations/${organizationId}/`;
  return storageKey.startsWith(prefix);
}

/**
 * Generates an authoritative, tamper-proof, tenant-scoped object storage key.
 * Never allows the client to dictate the storage key or use raw user-provided filenames.
 */
export function generateAuthoritativeStorageKey(params: {
  organizationId: string;
  projectId?: string | null;
  documentId: string;
  versionId: string;
  extension?: string;
}): string {
  const { organizationId, projectId, documentId, versionId, extension } = params;
  const safeProj = (projectId || 'default-project').replace(/[^a-zA-Z0-9_-]/g, '');
  const safeOrg = organizationId.replace(/[^a-zA-Z0-9_-]/g, '');
  const safeDoc = documentId.replace(/[^a-zA-Z0-9_-]/g, '');
  const safeVer = versionId.replace(/[^a-zA-Z0-9_-]/g, '');
  const cleanExt = (extension || 'bin').toLowerCase().replace(/[^a-z0-9]/g, '');
  const randomId = crypto.randomBytes(12).toString('hex');

  return `organizations/${safeOrg}/projects/${safeProj}/documents/${safeDoc}/versions/${safeVer}/source/${randomId}.${cleanExt}`;
}

/**
 * Helper to compute SHA-256 fingerprint for buffer
 */
export function computeBufferSha256(buf: Buffer): string {
  return crypto.createHash('sha256').update(buf).digest('hex');
}

/**
 * Private local disk storage provider for development, test, and on-premises environments.
 * Stores objects in a private directory outside web root with cryptographic signed URL simulator.
 */
export class PrivateLocalStorageProvider implements StorageProvider {
  private baseDir: string;
  private signingSecret: string;

  constructor(baseDir?: string, signingSecret?: string) {
    this.baseDir = baseDir || process.env.PRIVATE_STORAGE_PATH || path.join(process.cwd(), '.private_storage');
    this.signingSecret = signingSecret || process.env.AUTH_SECRET || 'local-storage-private-signing-key';
  }

  private resolveSafePath(key: string): string {
    const normalized = path.normalize(key);
    if (normalized.startsWith('..') || path.isAbsolute(normalized)) {
      throw new Error('Access denied: Illegal path traversal in storage key.');
    }
    return path.join(this.baseDir, normalized);
  }

  async putObject(
    key: string,
    data: Buffer | Uint8Array,
    mimeType: string,
    metadata?: Record<string, string>
  ): Promise<StorageObjectMetadata> {
    const fullPath = this.resolveSafePath(key);
    await fs.mkdir(path.dirname(fullPath), { recursive: true });

    const buf = Buffer.isBuffer(data) ? data : Buffer.from(data);
    await fs.writeFile(fullPath, buf);

    const sha256 = computeBufferSha256(buf);
    const meta: StorageObjectMetadata = {
      key,
      sizeBytes: buf.length,
      sha256,
      mimeType: mimeType || 'application/octet-stream',
      uploadedAt: new Date(),
      customMetadata: metadata,
    };

    // Store metadata sidecar file
    await fs.writeFile(`${fullPath}.meta.json`, JSON.stringify(meta, null, 2), 'utf8');
    return meta;
  }

  async getObject(key: string): Promise<{ buffer: Buffer; metadata: StorageObjectMetadata }> {
    const fullPath = this.resolveSafePath(key);
    if (!existsSync(fullPath)) {
      throw new Error(`Storage object not found: ${key}`);
    }

    const buffer = await fs.readFile(fullPath);
    let metadata = await this.getObjectMetadata(key);
    if (!metadata) {
      metadata = {
        key,
        sizeBytes: buffer.length,
        sha256: computeBufferSha256(buffer),
        mimeType: 'application/octet-stream',
        uploadedAt: new Date(),
      };
    }

    return { buffer, metadata };
  }

  async getObjectMetadata(key: string): Promise<StorageObjectMetadata | null> {
    const fullPath = this.resolveSafePath(key);
    if (!existsSync(fullPath)) {
      return null;
    }

    const metaPath = `${fullPath}.meta.json`;
    if (existsSync(metaPath)) {
      try {
        const raw = await fs.readFile(metaPath, 'utf8');
        const parsed = JSON.parse(raw);
        return {
          ...parsed,
          uploadedAt: new Date(parsed.uploadedAt),
        };
      } catch {
        // Fall back to stat
      }
    }

    const stat = await fs.stat(fullPath);
    const buf = await fs.readFile(fullPath);
    return {
      key,
      sizeBytes: stat.size,
      sha256: computeBufferSha256(buf),
      mimeType: 'application/octet-stream',
      uploadedAt: stat.mtime,
    };
  }

  async getPresignedUploadUrl(
    key: string,
    mimeType: string,
    expiresInSeconds: number = 900
  ): Promise<PresignedUploadDetails> {
    const expiresAt = Math.floor(Date.now() / 1000) + expiresInSeconds;
    const payload = `${key}:${mimeType}:${expiresAt}`;
    const token = crypto.createHmac('sha256', this.signingSecret).update(payload).digest('hex');

    const queryParams = new URLSearchParams({
      key,
      mime: mimeType,
      exp: expiresAt.toString(),
      token,
    });

    return {
      url: `/api/v1/documents/upload-direct?${queryParams.toString()}`,
      method: 'PUT',
      headers: {
        'Content-Type': mimeType,
      },
      expiresInSeconds,
    };
  }

  async getPresignedDownloadUrl(
    key: string,
    expiresInSeconds: number = 900,
    downloadFilename?: string
  ): Promise<string> {
    const expiresAt = Math.floor(Date.now() / 1000) + expiresInSeconds;
    const payload = `DOWNLOAD:${key}:${expiresAt}`;
    const token = crypto.createHmac('sha256', this.signingSecret).update(payload).digest('hex');

    const queryParams = new URLSearchParams({
      key,
      exp: expiresAt.toString(),
      token,
      ...(downloadFilename ? { filename: downloadFilename } : {}),
    });

    return `/api/v1/storage/download?${queryParams.toString()}`;
  }

  async deleteObject(key: string): Promise<void> {
    const fullPath = this.resolveSafePath(key);
    if (existsSync(fullPath)) {
      await fs.unlink(fullPath);
    }
    const metaPath = `${fullPath}.meta.json`;
    if (existsSync(metaPath)) {
      await fs.unlink(metaPath);
    }
  }

  verifyPresignedToken(key: string, mime: string, exp: number, token: string): boolean {
    if (Date.now() / 1000 > exp) return false;
    const payload = `${key}:${mime}:${exp}`;
    const expected = crypto.createHmac('sha256', this.signingSecret).update(payload).digest('hex');
    const tokenBuf = Buffer.from(token, 'hex');
    const expBuf = Buffer.from(expected, 'hex');
    return tokenBuf.length === expBuf.length && crypto.timingSafeEqual(tokenBuf, expBuf);
  }

  verifyDownloadToken(key: string, exp: number, token: string): boolean {
    if (Date.now() / 1000 > exp) return false;
    const payload = `DOWNLOAD:${key}:${exp}`;
    const expected = crypto.createHmac('sha256', this.signingSecret).update(payload).digest('hex');
    const tokenBuf = Buffer.from(token, 'hex');
    const expBuf = Buffer.from(expected, 'hex');
    return tokenBuf.length === expBuf.length && crypto.timingSafeEqual(tokenBuf, expBuf);
  }
}

/**
 * Production AWS S3-compatible private object storage provider (e.g. AWS S3, Cloudflare R2, MinIO).
 */
export class S3StorageProvider implements StorageProvider {
  private client: S3Client;
  private bucket: string;

  constructor(bucket?: string, region?: string, endpoint?: string) {
    this.bucket = bucket || process.env.AWS_S3_BUCKET || process.env.S3_BUCKET || 'spanqc-private-documents';
    const s3Region = region || process.env.AWS_REGION || 'us-east-1';

    const s3Config: any = {
      region: s3Region,
    };

    if (endpoint || process.env.AWS_S3_ENDPOINT || process.env.S3_ENDPOINT) {
      s3Config.endpoint = endpoint || process.env.AWS_S3_ENDPOINT || process.env.S3_ENDPOINT;
      s3Config.forcePathStyle = true;
    }

    if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
      s3Config.credentials = {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      };
    }

    this.client = new S3Client(s3Config);
  }

  async putObject(
    key: string,
    data: Buffer | Uint8Array,
    mimeType: string,
    metadata?: Record<string, string>
  ): Promise<StorageObjectMetadata> {
    const buf = Buffer.isBuffer(data) ? data : Buffer.from(data);
    const sha256 = computeBufferSha256(buf);

    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: buf,
        ContentType: mimeType,
        Metadata: {
          ...metadata,
          'x-sha256': sha256,
        },
      })
    );

    return {
      key,
      sizeBytes: buf.length,
      sha256,
      mimeType,
      uploadedAt: new Date(),
      customMetadata: metadata,
    };
  }

  async getObject(key: string): Promise<{ buffer: Buffer; metadata: StorageObjectMetadata }> {
    const resp = await this.client.send(
      new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
      })
    );

    if (!resp.Body) {
      throw new Error(`S3 object has no body: ${key}`);
    }

    const byteArray = await resp.Body.transformToByteArray();
    const buffer = Buffer.from(byteArray);
    const sha256 = resp.Metadata?.['x-sha256'] || computeBufferSha256(buffer);

    return {
      buffer,
      metadata: {
        key,
        sizeBytes: buffer.length,
        sha256,
        mimeType: resp.ContentType || 'application/octet-stream',
        uploadedAt: resp.LastModified || new Date(),
        customMetadata: resp.Metadata,
      },
    };
  }

  async getObjectMetadata(key: string): Promise<StorageObjectMetadata | null> {
    try {
      const head = await this.client.send(
        new HeadObjectCommand({
          Bucket: this.bucket,
          Key: key,
        })
      );

      return {
        key,
        sizeBytes: head.ContentLength || 0,
        sha256: head.Metadata?.['x-sha256'] || '',
        mimeType: head.ContentType || 'application/octet-stream',
        uploadedAt: head.LastModified || new Date(),
        customMetadata: head.Metadata,
      };
    } catch (err: any) {
      if (err.name === 'NotFound' || err.$metadata?.httpStatusCode === 404) {
        return null;
      }
      throw err;
    }
  }

  async getPresignedUploadUrl(
    key: string,
    mimeType: string,
    expiresInSeconds: number = 900
  ): Promise<PresignedUploadDetails> {
    const cmd = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      ContentType: mimeType,
    });

    const url = await getSignedUrl(this.client, cmd, { expiresIn: expiresInSeconds });

    return {
      url,
      method: 'PUT',
      headers: {
        'Content-Type': mimeType,
      },
      expiresInSeconds,
    };
  }

  async getPresignedDownloadUrl(
    key: string,
    expiresInSeconds: number = 900,
    downloadFilename?: string
  ): Promise<string> {
    const cmd = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
      ResponseContentDisposition: downloadFilename
        ? `attachment; filename="${downloadFilename.replace(/"/g, '')}"`
        : 'attachment',
    });

    return await getSignedUrl(this.client, cmd, { expiresIn: expiresInSeconds });
  }

  async deleteObject(key: string): Promise<void> {
    await this.client.send(
      new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: key,
      })
    );
  }
}

// Global singleton instance
let defaultStorageProvider: StorageProvider | null = null;

export function getStorageProvider(): StorageProvider {
  if (defaultStorageProvider) {
    return defaultStorageProvider;
  }

  // If AWS S3 credentials and bucket are provided, use S3StorageProvider
  if (
    (process.env.AWS_S3_BUCKET || process.env.S3_BUCKET) &&
    process.env.AWS_ACCESS_KEY_ID &&
    process.env.AWS_SECRET_ACCESS_KEY
  ) {
    defaultStorageProvider = new S3StorageProvider();
  } else {
    // Default to private local disk storage with cryptographic signed URL tokens
    defaultStorageProvider = new PrivateLocalStorageProvider();
  }

  return defaultStorageProvider;
}

export function setStorageProviderForTest(provider: StorageProvider | null) {
  defaultStorageProvider = provider;
}
