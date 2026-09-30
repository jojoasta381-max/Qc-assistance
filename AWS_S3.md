# AWS S3 Private Document Storage Specification
**Project:** SpanQC / Wiring Diagram QC Assistant  
**Bucket Name:** `spanqc-staging-documents-905418293374`  
**AWS Account ID:** `905418293374`  
**AWS Region:** `ap-south-1` (Mumbai)  

---

## 1. Bucket Security & Configuration

| Parameter | Configuration | Security Purpose |
| :--- | :--- | :--- |
| **Public Access Block** | Enabled (`BlockPublicAcls`, `IgnorePublicAcls`, `BlockPublicPolicy`, `RestrictPublicBuckets`) | Complete isolation from public internet |
| **Server-Side Encryption** | SSE-S3 (`AES256`) | Cryptographic encryption at rest |
| **Versioning** | Enabled (`Status=Enabled`) | Tamper evidence, accidental deletion recovery |
| **CORS Policy** | Allowed Methods: `GET`, `PUT`, `HEAD`; Origins: Web application domains | Secure direct presigned uploads from browser |

---

## 2. Object Key Taxonomy & Multi-Tenant Boundary

All object keys are generated authoritatively on the server inside `src/lib/storage/storage-provider.ts` via `generateAuthoritativeStorageKey`.

```
organizations/{organizationId}/projects/{projectId}/documents/{documentId}/versions/{versionId}/source/{randomId}.pdf
```

### Strict Rules:
1. **No Client Discretion:** Clients NEVER specify storage keys.
2. **Directory Traversal Defense:** `verifyTenantStorageKeyAccess` rejects `..`, `\`, leading `/`, and keys outside `organizations/{authenticatedOrgId}/`.
3. **Presigned Expiration:** Short-lived presigned URLs (900 seconds / 15 minutes max).
4. **Verification Gate:** Uploaded objects must be cryptographically verified (`upload-complete` checks SHA-256 against actual S3 bytes) before entering the processing pipeline.

---

## 3. Storage Provider Integration

`src/lib/storage/storage-provider.ts` natively supports AWS ECS Task Role authentication.

When deployed in ECS Fargate:
- `AWS_REGION = "ap-south-1"`
- `AWS_S3_BUCKET = "spanqc-staging-documents-905418293374"`
- `STORAGE_PROVIDER = "s3"`

The `@aws-sdk/client-s3` automatically consumes credentials provided by `spanqc-staging-ecs-task-role` via `AWS_CONTAINER_CREDENTIALS_RELATIVE_URI`. No static AWS access keys are required or stored in environment variables.

---

## 4. Gate 3 (S3 Sub-Gate) Verdict

**STATUS: S3 PROVISIONED & VERIFIED.**
