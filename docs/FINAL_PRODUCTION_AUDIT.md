# SpanQC: Final Production-Readiness Audit

**Document Status:** Definitive Production-Readiness Assessment  
**Evaluation Target:** `SPANQC_PRODUCTION_BUILD_SPEC.md`  
**Repository:** `https://github.com/jojoasta381-max/Qc-assistance`  
**Auditor:** Antigravity Adversarial Verification Agent  
**Audit Date:** 2026-09-28  

---

## 1. Definitive Verdict

# **NOT PRODUCTION READY**

While initial foundational improvements were made in Phase 1 (runtime mode framework, removal of `Math.random()` in analysis routines, elimination of prohibited certification wording in UI/exports, alignment of validated pricing tiers, and canonical SHA-256 report hashing), the repository remains **NOT PRODUCTION READY**.

The core operational pipeline—from real document binary upload and vector/raster parsing to topological electrical graph synthesis and asynchronous background processing—is currently simulated or routed to hardcoded templates and dead endpoints.

---

## 2. End-to-End Production Path Audit

The table below audits the complete required production chain specified in Section 69 of `SPANQC_PRODUCTION_BUILD_SPEC.md`:

$$\text{User} \to \text{Org} \to \text{Project} \to \text{Upload} \to \text{Storage} \to \text{Preflight} \to \text{Extraction} \to \text{Graph} \to \text{Rules} \to \text{AI} \to \text{Findings} \to \text{Review} \to \text{Report} \to \text{Hash} \to \text{Audit} \to \text{Billing}$$

| Step | Required Production Behavior | Audited Code Reality | Stage Status |
| :--- | :--- | :--- | :--- |
| **1. Authenticated User** | Secure session with hashed password, session expiry, and CSRF protection. | `src/lib/auth.ts` uses HMAC with hardcoded fallback secret. `src/app/api/auth/login` contains demo login branches. | `PARTIALLY_IMPLEMENTED` |
| **2. Organization / Tenant** | Strict server-side membership verification. No header or cookie trust. | `src/lib/tenant-resolver.ts` trusts `x-organization-id` and unsigned cookies; falls back to demo tenant `spandsons`. | `INSECURE` |
| **3. Authorized Project** | Project verified against active tenant organization. | Project ownership check exists in `POST /api/v1/documents`, but tenant resolution itself is spoofable. | `PARTIALLY_IMPLEMENTED` |
| **4. Real Document Upload** | Pre-signed upload to private storage with magic byte validation and size enforcement. | `upload-session/route.ts` generates upload URL to `/api/v1/documents/upload-direct` which returns HTTP 404. | `BROKEN` |
| **5. Private Storage** | S3-compatible private object storage with signed short-lived URLs. | File bytes are never stored in S3 or local persistent storage. Database receives fake `storageKey` strings. | `MISSING` |
| **6. Real Preflight** | Vector/raster validation, page counting, and strict SVG DOMPurify sanitization. | Preflight regex checks magic bytes, but page counts and dimensions are driven by filenames (`wh-402`, `mcc-vfd`). | `DEMO_ONLY` |
| **7. Real Extraction** | OCR / vector segmentation extracting components, pins, wire tags from raw document pixels/PDF streams. | `src/lib/ingestion/token-extractor.ts` checks `fileName.toLowerCase()` and returns static mock token arrays. | `MOCKED` |
| **8. Real Electrical Graph** | Topological graph constructed dynamically from extracted text tokens, lines, and connectivity. | `process/route.ts` discards the uploaded file and loads hardcoded CAD templates (`CAD_DIAGRAM_TEMPLATES['WH-402']`). | `MOCKED` |
| **9. Deterministic QC Rules** | Evaluates electrical and safety formulas (ampacity, spacing, grounding) against graph. | Physical rule calculations exist, but consume hardcoded template nodes rather than real document data. | `PARTIALLY_IMPLEMENTED` |
| **10. Production AI** | Multimodal reasoning for contextual explanations; fail-closed on outage; no synthetic findings. | Fail-closed guard added to `router.ts` in Phase 1, but cloud provider integration (OpenAI/Anthropic/AWS Bedrock) is missing. | `PARTIALLY_IMPLEMENTED` |
| **11. Evidence-Backed Findings** | Findings linked to exact page number, bounding box coordinates, and source tokens. | Findings contain bounding box fields, but coordinates originate from hardcoded CAD templates, not uploaded files. | `MOCKED` |
| **12. Human Review** | Reviewer confirms/rejects/modifies findings; audit log records transition. | `POST /api/v1/findings/[id]/review` fabricates a reviewer named "Lead QC Inspector" if user context is missing; no RBAC. | `INSECURE` |
| **13. Real QC Report** | Compiled from authoritative findings, generated to durable PDF and multi-sheet XLSX. | `GET /api/v1/reports/[id]/download` returns CSV for `xlsx` requests and JSON for `pdf` requests. Files are not persisted. | `BROKEN` |
| **14. Integrity Hash** | Canonical JSON representation hashed with SHA-256 (`crypto.createHash`). | Implemented in Phase 1 (`generateReportChecksum` uses canonical SHA-256). | `IMPLEMENTED` |
| **15. Audit Trail** | Immutable security and operational audit event log in PostgreSQL. | `AuditEvent` table exists and records events, but events can be triggered unauthenticated due to IDOR. | `PARTIALLY_IMPLEMENTED` |
| **16. Usage Metering** | Atomic transactional decrement preventing concurrent quota races. | Quota check in `process/route.ts` is non-transactional (read then update), allowing quota overrun races. | `INSECURE` |
| **17. Billing & Entitlements** | Verified Razorpay orders, HMAC webhook validation, and plan enforcement. | Webhook route contains test-bypass backdoor (`x-test-bypass: true`); fallback secrets committed in code. | `INSECURE` |
| **18. Tenant Isolation** | Zero cross-tenant data leakage across all operations. | Complete IDOR breakdown via `x-organization-id` header across all `/api/v1/` routes. | `INSECURE` |

---

## 3. Adversarial Search Findings Across Repository

A comprehensive keyword scan was executed across the codebase. Key forensic discoveries:

### 3.1. `mock` / `demo` / `sample`
- `src/lib/cad/cad-graph-bridge.ts`: Contains hardcoded templates `WH-402` and `MCC-VFD-01`. Document processing route (`src/app/api/v1/documents/[id]/process/route.ts:62-65`) uses these templates for all document processing.
- `src/lib/ingestion/token-extractor.ts`: Inspects `fileName.includes('wh-402')` and returns static token tables.
- `src/app/api/reports/certificate/[id]/route.ts`: Verification endpoint ignores requested ID and returns `SAMPLE_DIAGRAMS[0]` with `verified: true`.
- `src/components/EasySchematicEditor.tsx`: Operates completely in-memory on sample template state; disconnected from real CAD/DWG/PDF ingestion.

### 3.2. `Math.random`
- `src/app/api/v1/documents/[id]/reports/route.ts:32`: Generates report IDs using `Math.random().toString(36)`.
- `src/lib/api-v1-response.ts:13`: Generates request IDs using `Math.random().toString(36)`.
- `src/components/PricingView.tsx:55`: `generateSandboxPaymentId` uses `Math.random()`.
- `src/app/api/ingest/parse/route.ts:65`: Generates document IDs using `Math.random()`.

### 3.3. `bypass` / `fallback`
- `src/app/api/v1/webhooks/razorpay/route.ts:18`: Accepts `x-test-bypass: true` and `signature: dev_test_simulation` to skip webhook signature verification.
- `src/lib/tenant-resolver.ts:30-48`: Falls back to default demo tenant `spandsons` with `MID_5` plan when no credentials are provided.
- `src/lib/auth.ts:6`: Falls back to hardcoded string `'qc-bot-production-master-secret-key-32-chars-minimum'`.
- `src/lib/billing/razorpay-service.ts:27-29`: Falls back to hardcoded secrets `'dev_razorpay_secret_qc_bot_123'` and `'dev_razorpay_webhook_secret_456'`.

### 3.4. `certificate` / `certified` / `compliance certificate`
- Prohibited certification phrasing was cleaned from reports and landing page in Phase 1, but isolated marketing/UI occurrences remain in:
  - `src/app/how-it-works/page.tsx:77` ("compliance certificates")
  - `src/app/app/inspections/page.tsx:48` ("Drawing certified")
  - `src/components/InspectionWizard.tsx:239` ("Certified QC Audit")
  - `src/components/app/AppHeader.tsx:27` ("Certified Audit Reports")

### 3.5. `156` / `142` / `88%`
- `src/lib/calibration/regression-runner.ts:123`: Uses `const tn = Math.max(0, 142 - (tp + fp + fn));` to artificially manufacture true negatives.
- `src/lib/calibration/regression-runner.ts:172`: Hardcodes `zeroHallucinationRate: 100.0`.
- `src/data/samples.ts:24, 35, 147, 341`: References `156 automated checks` and `156 executed` in sample fixtures.

---

## 4. Production Blockers & Exact Remediation Specifications

The following 9 blockers currently prevent SpanQC from being certified production-ready.

---

### [BLOCKER 1] Tenant Isolation & IDOR Vulnerability
- **Severity:** **CRITICAL (P0)**
- **Files:** [`src/lib/tenant-resolver.ts`](file:///data/projects/qc-bot/src/lib/tenant-resolver.ts), all files in [`src/app/api/v1/`](file:///data/projects/qc-bot/src/app/api/v1/)
- **Current Behavior:** Server trusts `x-organization-id` header or `active_tenant` cookie without validating user session membership.
- **Remediation:**
  1. Remove all header and cookie checks in `resolveTenant()`.
  2. Extract session token from HTTP-only cookie `qc_session_token`.
  3. Validate token signature against `process.env.AUTH_SECRET`.
  4. Query `OrganizationMember` in PostgreSQL to ensure the authenticated user belongs to the target organization.
  5. Return HTTP 401 Unauthorized or HTTP 403 Forbidden if unauthenticated or unauthorized.

---

### [BLOCKER 2] Hardcoded Fallback Secrets & Webhook Bypass
- **Severity:** **CRITICAL (P0)**
- **Files:** [`src/lib/auth.ts`](file:///data/projects/qc-bot/src/lib/auth.ts), [`src/lib/billing/razorpay-service.ts`](file:///data/projects/qc-bot/src/lib/billing/razorpay-service.ts), [`src/app/api/v1/webhooks/razorpay/route.ts`](file:///data/projects/qc-bot/src/app/api/v1/webhooks/razorpay/route.ts)
- **Current Behavior:** Fallback secrets are embedded in code; webhook handler allows `x-test-bypass: true`.
- **Remediation:**
  1. Fail application startup if `AUTH_SECRET`, `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, or `RAZORPAY_WEBHOOK_SECRET` is missing.
  2. Remove `x-test-bypass` and `dev_test_simulation` logic entirely.
  3. Verify Razorpay webhook signature strictly using `crypto.createHmac('sha256', secret)`.

---

### [BLOCKER 3] Non-Atomic Quota Exhaustion Race Condition
- **Severity:** **CRITICAL (P0)**
- **Files:** [`src/app/api/v1/documents/[id]/process/route.ts`](file:///data/projects/qc-bot/src/app/api/v1/documents/[id]/process/route.ts)
- **Current Behavior:** Quota check and quota increment are separated by asynchronous document processing, permitting concurrent overages.
- **Remediation:**
  Implement atomic quota reservation in PostgreSQL:
  ```typescript
  const updated = await prisma.$executeRaw`
    UPDATE tenants 
    SET quota_used = quota_used + 1 
    WHERE id = ${tenant.id} AND quota_used < check_quota;
  `;
  if (updated === 0) {
    return apiError('QUOTA_EXCEEDED', 'Insufficient check quota.', 402);
  }
  ```

---

### [BLOCKER 4] Broken Ingestion Pipeline & Dead Upload Route
- **Severity:** **CRITICAL (P0)**
- **Files:** [`src/app/api/v1/documents/upload-session/route.ts`](file:///data/projects/qc-bot/src/app/api/v1/documents/upload-session/route.ts), [`src/app/api/v1/documents/route.ts`](file:///data/projects/qc-bot/src/app/api/v1/documents/route.ts)
- **Current Behavior:** `/api/v1/documents/upload-direct` returns 404; clients supply arbitrary `storageKey` strings without file persistence.
- **Remediation:**
  1. Integrate AWS S3 or Cloudflare R2 SDK to generate authentic pre-signed PUT URLs.
  2. Require client to upload file directly to private bucket.
  3. Validate file existence and SHA-256 digest on document creation before queuing for processing.

---

### [BLOCKER 5] Template-Driven Processing & Mock Graph Extraction
- **Severity:** **CRITICAL (P0)**
- **Files:** [`src/app/api/v1/documents/[id]/process/route.ts`](file:///data/projects/qc-bot/src/app/api/v1/documents/[id]/process/route.ts), [`src/lib/ingestion/token-extractor.ts`](file:///data/projects/qc-bot/src/lib/ingestion/token-extractor.ts)
- **Current Behavior:** Discards uploaded document binary and executes inspection rules on hardcoded CAD templates (`CAD_DIAGRAM_TEMPLATES['WH-402']`).
- **Remediation:**
  1. Implement authentic PDF vector extraction / OCR rasterization.
  2. Parse components, connection nets, and wire tags directly from raw document streams.
  3. Construct dynamic `ElectricalGraph` using parsed tokens.
  4. Pass dynamic graph into `evaluateIpc620Rules` and `evaluateUl508aRules`.

---

### [BLOCKER 6] SSRF Vulnerability in Endpoint Validator
- **Severity:** **HIGH (P1)**
- **Files:** [`src/lib/llm-engine.ts`](file:///data/projects/qc-bot/src/lib/llm-engine.ts)
- **Current Behavior:** String matching fails to block IPv6 loopback (`::1`), decimal IPs, or DNS rebinding to metadata services.
- **Remediation:**
  Resolve DNS hostname using Node.js `dns.promises.lookup()`. Verify all resolved IPs are public and not within private (RFC1918), loopback (`127.0.0.0/8`, `::1`), link-local (`169.254.0.0/16`), or broadcast ranges.

---

### [BLOCKER 7] Fake Public Verification Endpoint
- **Severity:** **HIGH (P1)**
- **Files:** [`src/app/api/reports/certificate/[id]/route.ts`](file:///data/projects/qc-bot/src/app/api/reports/certificate/[id]/route.ts)
- **Current Behavior:** Returns `verified: true` and `SAMPLE_DIAGRAMS[0]` for any arbitrary or forged report ID.
- **Remediation:**
  Query PostgreSQL `AuditReport` by cryptographic SHA-256 hash or report ID. If not found, return HTTP 404. Verify hash integrity against report contents.

---

### [BLOCKER 8] Broken Report Exports & Storage Links
- **Severity:** **HIGH (P1)**
- **Files:** [`src/app/api/v1/reports/[id]/download/route.ts`](file:///data/projects/qc-bot/src/app/api/v1/reports/[id]/download/route.ts), [`src/app/api/v1/documents/[id]/reports/route.ts`](file:///data/projects/qc-bot/src/app/api/v1/documents/[id]/reports/route.ts)
- **Current Behavior:** Reports link to non-existent storage keys; XLSX export returns CSV text; PDF export returns JSON.
- **Remediation:**
  1. Implement server-side multi-sheet Excel generation using `write-excel-file` writing to private storage.
  2. Implement headless PDF generation (or pre-rendered SVG/HTML canvas rasterization).
  3. Return authentic file streams with proper `Content-Type` headers (`application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` and `application/pdf`).

---

### [BLOCKER 9] Synthetic Regression Benchmark
- **Severity:** **MEDIUM (P2)**
- **Files:** [`src/lib/calibration/regression-runner.ts`](file:///data/projects/qc-bot/src/lib/calibration/regression-runner.ts)
- **Current Behavior:** Tests 3 filename strings against filename-based mocks; hardcodes `142` checks to invent true negatives and claim 100% zero-hallucination rate.
- **Remediation:**
  Create an annotated golden test suite with real engineering drawings, true ground truth coordinates, component counts, and verified rule violations. Compute true precision, recall, and F1 metrics from real extraction outputs.

---

## 5. Next Implementation Priorities

To bring SpanQC from **NOT PRODUCTION READY** to **PRODUCTION READY**, work must proceed in strict dependency order:

1. **Phase 2 (Immediate Security):** Fix Blocker 1 (Tenant IDOR), Blocker 2 (Secrets & Webhook Bypass), Blocker 3 (Atomic Quotas), and Blocker 6 (SSRF Defense).
2. **Phase 3 (Ingestion & Storage):** Fix Blocker 4 (Private S3/R2 Uploads) and Blocker 5 (Real Document Vector/Raster Extraction & Topological Graph).
3. **Phase 4 (Rules & AI):** Bind deterministic QC rules to dynamic graph and connect production AI provider with fail-closed telemetry.
4. **Phase 5 (Reporting & Verification):** Fix Blocker 7 (Authentic Hash Verification) and Blocker 8 (Genuine PDF/XLSX generation).
5. **Phase 6 (Benchmark Quality):** Fix Blocker 9 (Real Annotated Benchmark Suite).
