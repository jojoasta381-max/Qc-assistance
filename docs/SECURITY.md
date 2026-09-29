# SpanQC Security Architecture & Controls

## Core Security Controls (Phases 1, 2, and 3)

### 1. Authentication & Session Management
- **Token Mechanism**: Cryptographic HMAC-SHA256 session tokens.
- **Cookie Security**: `HttpOnly`, `SameSite=Lax`, `Secure` (in production).
- **Expiration**: 24-hour absolute session expiration.
- **Bearer Auth**: Standard `Authorization: Bearer <token>` supported for API v1 consumers.

### 2. Tenant Isolation & IDOR Protection
- **No Client Tenant Injection**: The active tenant is extracted strictly from the validated session token; headers such as `x-tenant-id` cannot override session identity.
- **Database Boundary**: Every relational lookup verifies `tenantId`. Attempting to access an entity belonging to another tenant yields `404 Not Found` or `403 Forbidden`.
- **Storage Isolation**: Object storage keys begin with `organizations/{tenantId}/`. The storage access verifier (`verifyTenantStorageKeyAccess`) blocks cross-tenant reads or downloads before disk or S3 queries execute.

### 3. Role-Based Access Control (RBAC)
| Role | Upload Documents | Process Documents | View Findings | Review/Approve | Manage Users | Manage Billing |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| `ADMIN` | Yes | Yes | Yes | Yes | Yes | Yes |
| `QC_ENGINEER` | Yes | Yes | Yes | Yes | No | No |
| `QC_INSPECTOR` | Yes | Yes | Yes | No | No | No |
| `VIEWER` | No | No | Yes | No | No | No |

### 4. Storage & Ingestion Security
- **No Public Buckets**: Private object storage only.
- **Server-Generated Keys**: Clients cannot specify storage keys; path traversal (`../`) is impossible.
- **Short-Lived Presigned URLs**: 15 minutes for uploads, 5 minutes for downloads.
- **File Validation**:
  - Max file size: 50 MB (`MAX_FILE_SIZE_BYTES`).
  - Supported MIME types: `application/pdf`, `image/png`, `image/jpeg`, `image/tiff`, `image/svg+xml`.
  - Header & magic byte inspection: Rejects disguised executables, corrupt streams, and encrypted PDFs.

### 5. Server-Side Request Forgery (SSRF) Defense
- Implemented in `src/lib/security/ssrf-validator.ts`.
- Blocks:
  - IPv4 loopback (`127.0.0.0/8`, `0.0.0.0/8`)
  - Private subnets (RFC 1918: `10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`)
  - Link-local & cloud metadata endpoints (`169.254.169.254`, AWS, Azure, GCP metadata services)
  - IPv6 loopback (`::1`, `fe80::/10`)
  - Internal DNS resolutions via asynchronous DNS lookups.

### 6. Atomic Billing & Quota Protection
- Quotas are decremented inside PostgreSQL transactions using optimistic locking / serializable checks.
- Concurrent requests cannot exceed quota limits.
- Failed document processing jobs automatically refund reserved checks.
- Razorpay webhook validation verifies cryptographic signatures (`x-razorpay-signature`) with timestamp validation and replay protection.
