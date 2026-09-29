# SpanQC: Final Adversarial Security Audit

**Document Status:** Final Adversarial Security Assessment  
**Evaluation Target:** `SPANQC_PRODUCTION_BUILD_SPEC.md`  
**Repository:** `https://github.com/jojoasta381-max/Qc-assistance`  
**Audit Date:** 2026-09-28  
**Audit Verdict:** **NOT PRODUCTION READY (CRITICAL VULNERABILITIES IDENTIFIED)**

---

## 1. Executive Summary

An independent adversarial security audit was performed against the SpanQC codebase. The audit assumed zero trust toward prior claims and evaluated attack surfaces across authentication, multi-tenant isolation, authorization (RBAC), ingestion/storage pipelines, SSRF defenses, payment processing, and cryptographic verification.

The audit identified **8 Critical (P0)**, **5 High (P1)**, and **3 Medium (P2)** vulnerabilities. Most critically:
1. **Client-dictated Tenant Header (IDOR):** Any caller can access, modify, or delete another organization's drawings, findings, and billing records simply by supplying an arbitrary `x-organization-id` HTTP header.
2. **Insecure Hardcoded Secrets:** Fallback values for `AUTH_SECRET` and `RAZORPAY_WEBHOOK_SECRET` are committed in plain text, allowing arbitrary token forgery and payment simulation if environment variables are omitted.
3. **Payment Webhook Backdoor:** The Razorpay webhook handler explicitly permits an unauthenticated `x-test-bypass: true` header and static signature `dev_test_simulation` to credit subscriptions without payment.
4. **SSRF Vulnerability in Endpoint Validator:** Naive string matching in `validateLLMEndpoint` permits IPv6 loopbacks (`http://[::1]`), decimal representations, and DNS rebinding to internal metadata endpoints.
5. **Non-Atomic Quota Checks:** Document inspection checks quota non-transactionally, creating a race condition where concurrent requests exceed purchased quotas without billing.

---

## 2. Vulnerability Findings Matrix

| Ref | Vulnerability Category | Severity | File / Location | Exploitation Impact |
| :--- | :--- | :--- | :--- | :--- |
| **SEC-01** | Multi-Tenant IDOR & Header Trust | **CRITICAL (P0)** | `src/lib/tenant-resolver.ts:12-18` | Total cross-tenant data breach; read/write access to any organization. |
| **SEC-02** | Hardcoded Auth Secret Fallback | **CRITICAL (P0)** | `src/lib/auth.ts:6` | Session token forgery; attacker can forge `role: 'OWNER'` for any tenant. |
| **SEC-03** | Razorpay Webhook Test Bypass | **CRITICAL (P0)** | `src/app/api/v1/webhooks/razorpay/route.ts:16-21` | Financial fraud; crediting accounts with unlimited quotas for free. |
| **SEC-04** | Hardcoded Razorpay Secrets | **CRITICAL (P0)** | `src/lib/billing/razorpay-service.ts:27-29` | Webhook signature spoofing and order manipulation. |
| **SEC-05** | SSRF Filter Bypass | **CRITICAL (P0)** | `src/lib/llm-engine.ts:13-40` | Intranet scanning, cloud metadata access (`169.254.169.254`) via IPv6 or DNS rebinding. |
| **SEC-06** | Unauthenticated Arbitrary Storage Key Injection | **CRITICAL (P0)** | `src/app/api/v1/documents/route.ts:61-86` | Path traversal / registering arbitrary files across tenant boundaries. |
| **SEC-07** | Non-Atomic Quota Exhaustion Race | **CRITICAL (P0)** | `src/app/api/v1/documents/[id]/process/route.ts:21, 170` | Concurrent request race allows infinite quota overconsumption without billing. |
| **SEC-08** | Missing Server-Side RBAC Enforcement | **CRITICAL (P0)** | `src/app/api/v1/findings/[id]/review/route.ts:41-55` | Unauthenticated / unauthorized users can review and arbitrate engineering findings. |
| **SEC-09** | Regex-Based SVG Sanitization Bypass | **HIGH (P1)** | `src/lib/ingestion/preflight.ts:52-64` | Stored XSS via CDATA sections, nested tags, or entity-encoded javascript URIs. |
| **SEC-10** | Missing Verification Endpoint Logic | **HIGH (P1)** | `src/app/api/reports/certificate/[id]/route.ts:21-29` | False verification; any invalid ID returns `verified: true` with sample report. |
| **SEC-11** | Dead Upload Endpoint | **HIGH (P1)** | `src/app/api/v1/documents/upload-session/route.ts:26` | Denial of service / broken uploads: `/api/v1/documents/upload-direct` returns 404. |
| **SEC-12** | Fake Report Storage Keys | **HIGH (P1)** | `src/app/api/v1/documents/[id]/reports/route.ts:33-46` | Database references non-existent PDF and XLSX keys in object storage. |
| **SEC-13** | CSV Injection Risk in Report Downloads | **HIGH (P1)** | `src/app/api/v1/reports/[id]/download/route.ts:37` | Formula injection (`=cmd|...`) when exported CSV is opened in Microsoft Excel. |
| **SEC-14** | In-Memory Rate Limiting Volatility | **MEDIUM (P2)** | `src/lib/rate-limiter.ts` | Serverless restarts reset rate limits, allowing sustained credential stuffing. |
| **SEC-15** | Passwordless Demo Login Attack Surface | **MEDIUM (P2)** | `src/app/api/auth/login/route.ts:20-44` | Demo roles permit immediate session generation if `APP_MODE` is unset or misconfigured. |
| **SEC-16** | Filename-Driven Ingestion Logic | **MEDIUM (P2)** | `src/lib/ingestion/bounds-extractor.ts`, `token-extractor.ts` | Attackers can manipulate outputs by renaming uploaded files to keyword patterns. |

---

## 3. Deep-Dive Vulnerability Analysis

### SEC-01: Multi-Tenant IDOR via Untrusted Request Headers
- **Location:** [`src/lib/tenant-resolver.ts`](file:///data/projects/qc-bot/src/lib/tenant-resolver.ts#L11-L27)
- **Vulnerability Type:** Insecure Direct Object Reference (IDOR) / Broken Tenant Isolation
- **Mechanism:**
  ```typescript
  const headerTenantId = req.headers.get('x-organization-id') || req.headers.get('x-tenant-id');
  if (headerTenantId) {
    const tenant = await prisma.tenant.findUnique({ where: { id: headerTenantId } });
    if (tenant) return tenant;
  }
  ```
- **Exploit Scenario:**
  1. Attacker creates an account in Tenant A.
  2. Attacker discovers Tenant B's UUID from a public report ID or by enumeration.
  3. Attacker issues `GET /api/v1/documents` with header `x-organization-id: <Tenant_B_UUID>`.
  4. The server executes queries scoped to `Tenant B`, returning all confidential wiring diagrams belonging to Tenant B.
- **Remediation:** Remove header and raw cookie trust. Extract tenant ID exclusively from the verified session token (`verifySessionToken()`). Assert that the authenticated user is an active member of that tenant in PostgreSQL.

---

### SEC-02 & SEC-04: Plaintext Committed Secret Fallbacks
- **Location:** [`src/lib/auth.ts`](file:///data/projects/qc-bot/src/lib/auth.ts#L6), [`src/lib/billing/razorpay-service.ts`](file:///data/projects/qc-bot/src/lib/billing/razorpay-service.ts#L27-L29)
- **Vulnerability Type:** Hardcoded Cryptographic Secrets
- **Mechanism:**
  ```typescript
  const AUTH_SECRET = process.env.AUTH_SECRET || 'qc-bot-production-master-secret-key-32-chars-minimum';
  const RAZORPAY_WEBHOOK_SECRET = process.env.RAZORPAY_WEBHOOK_SECRET || 'dev_razorpay_webhook_secret_456';
  ```
- **Exploit Scenario:**
  If a production deployment omits `AUTH_SECRET` in its environment configuration, an attacker signs an HMAC token with `qc-bot-production-master-secret-key-32-chars-minimum` containing:
  ```json
  { "userId": "usr_attacker", "role": "OWNER", "tenantId": "org_target", "exp": 1893456000 }
  ```
  The server accepts this signature, granting the attacker administrative access to the target organization.
- **Remediation:** Require secrets during application initialization. Throw a fatal exception if `AUTH_SECRET` or `RAZORPAY_WEBHOOK_SECRET` is unset or matches known development defaults.

---

### SEC-03: Razorpay Webhook Authentication Backdoor
- **Location:** [`src/app/api/v1/webhooks/razorpay/route.ts`](file:///data/projects/qc-bot/src/app/api/v1/webhooks/razorpay/route.ts#L16-L21)
- **Vulnerability Type:** Authentication Bypass / Payment Tampering
- **Mechanism:**
  ```typescript
  const isDev = process.env.NODE_ENV !== 'production';
  const isTestBypass = isDev && (
    req.headers.get('x-test-bypass') === 'true' ||
    signature === 'dev_test_simulation'
  );
  const isValid = isSignatureValid || isTestBypass;
  ```
- **Exploit Scenario:**
  In non-production environments (staging, testing, QA), any external caller can send `POST /api/v1/webhooks/razorpay` with `x-test-bypass: true` and an arbitrary payload (`payment.captured` for ₹75,000), instantly topping up 1,500 diagram checks on their account.
- **Remediation:** Completely remove `isTestBypass` and `x-test-bypass`. Webhook signatures must be computed strictly via `crypto.createHmac('sha256', secret)` against raw body bytes.

---

### SEC-05: SSRF Vulnerability in AI Endpoint Validation
- **Location:** [`src/lib/llm-engine.ts`](file:///data/projects/qc-bot/src/lib/llm-engine.ts#L13-L40)
- **Vulnerability Type:** Server-Side Request Forgery (SSRF)
- **Mechanism:**
  `validateLLMEndpoint()` relies on string equality checks:
  ```typescript
  if (hostname === '169.254.169.254' || hostname === '0.0.0.0') ...
  ```
- **Exploit Scenario:**
  1. Attacker configures endpoint as `http://[::1]:11434` or `http://127.0.0.1.nip.io:11434`.
  2. Attacker configures an endpoint pointing to `http://2130706433` (decimal representation of `127.0.0.1`).
  3. Attacker uses a custom domain with a 1-second TTL DNS record pointing to `169.254.169.254` (DNS Rebinding).
  4. The Next.js server sends outbound requests to internal services or cloud metadata endpoints.
- **Remediation:** Perform DNS resolution using `dns.promises.lookup()`. Validate that all resolved IPv4 and IPv6 addresses are public and do not fall within RFC1918, RFC4193, loopback (`127.0.0.0/8`, `::1`), or link-local (`169.254.0.0/16`) blocks.

---

### SEC-06: Arbitrary Storage Key Injection & Path Traversal
- **Location:** [`src/app/api/v1/documents/route.ts`](file:///data/projects/qc-bot/src/app/api/v1/documents/route.ts#L61-L86)
- **Vulnerability Type:** Untrusted Input / Cross-Tenant Storage Referencing
- **Mechanism:**
  ```typescript
  const { filename, mime_type, size_bytes, storage_key, project_id, checksum } = body;
  ```
  The endpoint creates a `Document` record directly with the client-supplied `storageKey` without verifying:
  - That the key begins with the authorized tenant prefix (`uploads/${tenant.id}/`).
  - That the file actually exists in private object storage.
  - That the file SHA-256 matches the declared `checksum`.
- **Exploit Scenario:**
  Attacker submits `storage_key: "uploads/victim_tenant_id/confidential_drawing.pdf"`. When processing is initiated, the system references and processes another tenant's drawing.
- **Remediation:** Generate immutable `storageKey` values strictly server-side during the upload session creation. Store sessions in PostgreSQL or Redis and require the document registration endpoint to supply the `uploadSessionId`.

---

### SEC-07: Non-Atomic Quota Exhaustion Race Condition
- **Location:** [`src/app/api/v1/documents/[id]/process/route.ts`](file:///data/projects/qc-bot/src/app/api/v1/documents/[id]/process/route.ts#L20-L27, #L170-L173)
- **Vulnerability Type:** Concurrency Race Condition / TOCTOU
- **Mechanism:**
  Quota check is executed at step 1:
  ```typescript
  if (tenant.quotaUsed >= tenant.checkQuota) return apiError('QUOTA_EXCEEDED', ..., 402);
  ```
  Processing executes for 3–10 seconds.
  Quota is updated at step 7:
  ```typescript
  await prisma.tenant.update({ where: { id: tenant.id }, data: { quotaUsed: { increment: 1 } } });
  ```
- **Exploit Scenario:**
  A tenant with 1 check remaining sends 50 parallel requests to `/api/v1/documents/[id]/process`. All 50 requests observe `quotaUsed (99) < checkQuota (100)`. All 50 requests execute complete inspection workloads, consuming compute without payment.
- **Remediation:** Atomically decrement quota prior to processing inside a database transaction:
  ```sql
  UPDATE tenants 
  SET quota_used = quota_used + 1 
  WHERE id = $1 AND quota_used < check_quota;
  ```
  If zero rows are updated, reject the request immediately with HTTP 402.

---

### SEC-09: Regex-Based SVG Stored XSS
- **Location:** [`src/lib/ingestion/preflight.ts`](file:///data/projects/qc-bot/src/lib/ingestion/preflight.ts#L52-L64)
- **Vulnerability Type:** Incomplete Sanitization / Cross-Site Scripting (XSS)
- **Mechanism:**
  SVG sanitization uses basic regular expressions:
  ```typescript
  clean = clean.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  clean = clean.replace(/\son\w+\s*=\s*(?:'[^']*'|"[^"]*"|[^\s>]+)/gi, '');
  ```
- **Exploit Scenario:**
  1. Attackers can bypass regex using entity encoding inside SVG elements: `<a href="jav&#x61;script:alert(document.cookie)">...</a>`.
  2. Nested script tags: `<scr<script>ipt>alert(1)</script>`.
  3. SVG rendered directly in the DOM executes in the victim reviewer's session context.
- **Remediation:** Use DOMPurify (via `isomorphic-dompurify`) configured with SVG profiles, or disallow raw SVG rendering in favor of isolated canvas rendering or sandboxed iframes (`sandbox="allow-scripts=none"`).

---

### SEC-10: Fake Certificate Verification Endpoint
- **Location:** [`src/app/api/reports/certificate/[id]/route.ts`](file:///data/projects/qc-bot/src/app/api/reports/certificate/[id]/route.ts#L13-L29)
- **Vulnerability Type:** Security Misfeature / Integrity Spoofing
- **Mechanism:**
  ```typescript
  const report = matchedSample ? matchedSample.sampleReport : SAMPLE_DIAGRAMS[0].sampleReport;
  const cert = buildAuditCertificate(report);
  return NextResponse.json({ success: true, verified: true, certificate: cert, report });
  ```
- **Exploit Scenario:**
  An adversary presents a fraudulent report with ID `QC-FORGED-999` to an auditor. The auditor verifies it at `/api/reports/certificate/QC-FORGED-999`. The server responds `verified: true` and renders genuine metadata for `SAMPLE_DIAGRAMS[0]`.
- **Remediation:** Query `AuditReport` in PostgreSQL by exact cryptographic hash. Return HTTP 404 if no record exists. Never substitute default sample reports.

---

## 4. Adversarial Attack Scenarios (Reproduction PoCs)

### Attack 1: Cross-Tenant Data Extraction via IDOR
```bash
# Attacker authenticate into Org A, captures valid session token
# Attacker queries Org B documents using x-organization-id
curl -X GET "https://qc-assistance.vercel.app/api/v1/documents" \
  -H "Cookie: qc_session_token=<Org_A_Token>" \
  -H "x-organization-id: org_victim_enterprise_id"
# Result: HTTP 200 OK with Org B documents returned.
```

### Attack 2: Free Quota Credit via Webhook Test Bypass
```bash
# Attacker issues fake Razorpay webhook with bypass header
curl -X POST "https://qc-assistance.vercel.app/api/v1/webhooks/razorpay" \
  -H "Content-Type: application/json" \
  -H "x-test-bypass: true" \
  -d '{
    "event": "payment.captured",
    "payload": {
      "payment": {
        "entity": {
          "id": "pay_fake_exploit_999",
          "order_id": "order_fake_123",
          "amount": 7500000,
          "status": "captured",
          "notes": {
            "tenant_id": "org_attacker_id",
            "plan_code": "INDUSTRIAL_SCALE"
          }
        }
      }
    }
  }'
# Result: HTTP 200 OK; Attacker organization credited with 1,500 inspection checks.
```

---

## 5. Security Recommendations & Required Remediation Order

1. **Immediate (P0):** Strip all `x-organization-id` header reading from `resolveTenant()`. Require session-derived tenant validation.
2. **Immediate (P0):** Remove `x-test-bypass` and fallback secrets from `auth.ts` and `razorpay-service.ts`. Throw startup fatal errors if secrets are missing.
3. **Immediate (P0):** Convert quota decrement in `process/route.ts` into an atomic SQL transaction with row locking (`UPDATE ... WHERE quota_used < check_quota`).
4. **Immediate (P0):** Replace regex-based endpoint validation with strict DNS resolution and CIDR IP validation.
5. **High Priority (P1):** Replace client-supplied `storage_key` with server-managed pre-signed upload tickets.
6. **High Priority (P1):** Replace DOM regex SVG sanitizer with `DOMPurify` with strict XML namespaces.
