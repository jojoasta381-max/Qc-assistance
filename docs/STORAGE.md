# SpanQC Private Object Storage Architecture (Phase 3)

## Storage Philosophy

SpanQC operates under a zero-trust storage model:
1. **Private by Default**: Storage buckets and directories have zero public access. Permanent public URLs do not exist.
2. **Tenant Namespace Isolation**: All object keys are partitioned by organization ID.
3. **Server-Generated Authoritative Keys**: Clients never provide or choose object keys.
4. **Authoritative Hash Verification**: File identity is established solely via SHA-256 computed on verified bytes.

---

## 1. Object Key Schema

Every uploaded artifact receives an immutable, server-generated key conforming to:

```
organizations/{organizationId}/projects/{projectId}/documents/{documentId}/versions/{versionId}/source/{randomObjectId}.{extension}
```

Example:
`organizations/563c4aa0-e72c-4358-ad0b-df14f692d2e1/projects/209a8741-32b7-4aa3-ba26-42c85bd4e9a6/documents/8bd0e0a0-e9e3-406c-b6ed-fc536b4ae217/versions/ff99a8de-dac8-4285-a635-a315970805f8/source/03dcdecc4371f0afa917843e.pdf`

### Rules Enforced:
- **No Path Traversal**: Rejects `..`, `\`, leading slashes, and control characters.
- **Tenant Scope Check**: Before any read, write, or download, `verifyTenantStorageKeyAccess(userTenantId, storageKey)` ensures the key's organization segment matches the user's active tenant.
- **Original Filename Sanitization**: The original user-provided filename is stored strictly in database metadata (`Document.sourceOriginalFilename`) and is never used in the filesystem/S3 path.

---

## 2. Storage Providers

SpanQC uses an abstracted `StorageProvider` interface (`src/lib/storage/storage-provider.ts`):

### A. AWS S3 Provider (`S3StorageProvider`)
- Active when `AWS_S3_BUCKET` is configured.
- Uses `@aws-sdk/client-s3` and `@aws-sdk/s3-request-presigner`.
- Presigned `PutObjectCommand` URLs for direct uploads (15-minute expiration).
- Presigned `GetObjectCommand` URLs for temporary authorized downloads (5-minute expiration).
- Server-side AES-256 encryption (`ServerSideEncryption: 'AES256'`).

### B. Private Local Storage Provider (`PrivateLocalStorageProvider`)
- Active in local/development or self-hosted air-gapped environments.
- Stores files inside `.private_storage/` with strict directory permissions.
- Direct upload streaming endpoint: `/api/v1/documents/upload-direct`.
- Upload tokens are cryptographically signed using HMAC-SHA256 with timestamp expiration (`exp`) and key binding (`token=HMAC(key + mime + exp, SECRET)`).
- Download endpoint: `/api/v1/storage/download` with HMAC verification.

---

## 3. Upload & Download Security Verification

### Direct Upload Validation
1. Validates HMAC signature and timestamp expiry.
2. Validates `Content-Length` <= 50 MB (`MAX_FILE_SIZE_BYTES`).
3. Streams bytes directly to private disk/S3.
4. Computes SHA-256 hash incrementally during upload stream.

### Server-Authorized Download (`GET /api/v1/documents/[id]/download`)
1. User presents bearer session token.
2. Resolves tenant and RBAC (`document:read`).
3. Fetches `Document` with `where: { id, tenantId }` (IDOR defense).
4. Verifies `storageKey` prefix matches tenant.
5. If S3: Generates temporary presigned GET URL (300s TTL).
6. If Local: Returns HMAC-signed download URL or streams bytes with headers:
   - `Content-Type: application/pdf`
   - `Content-Disposition: attachment; filename="sanitized-filename.pdf"`
   - `X-Content-Type-Options: nosniff`
