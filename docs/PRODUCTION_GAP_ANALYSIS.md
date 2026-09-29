# SpanQC: Production Gap Analysis & Forensic Readiness Audit

**Document Status:** Complete Audit Baseline  
**Target Specification:** `SPANQC_PRODUCTION_BUILD_SPEC.md`  
**Audited Repository:** `https://github.com/jojoasta381-max/Qc-assistance`  
**Target Deployment:** `https://qc-assistance.vercel.app/`  
**Audit Date:** 2026-09-28  

---

## 1. Executive Summary

A comprehensive, code-level forensic audit of the **SpanQC / Wiring Diagram QC Assistant** codebase was conducted to evaluate readiness against the `SPANQC_PRODUCTION_BUILD_SPEC.md`. 

While the repository contains foundational infrastructure—including Next.js 15+ App Router, Prisma ORM with PostgreSQL (Neon), Lucide iconography, and initial database models—the functional core of the application relies heavily on **synthetic mock data, filename-based template routing, hardcoded identities, simulated AI fallbacks, and non-cryptographic checksums**.

Furthermore, critical security vulnerabilities exist around **tenant isolation, authentication bypasses, non-atomic billing quotas, and lack of server-side authorization**.

This document outlines the classification of every requirement, provides deep-dive assessments of all critical findings with exact file/line references, and establishes the dependency graph and roadmap for achieving a truthful, secure, production-ready SaaS product.

---

## 2. Master Requirements Classification Matrix

Each requirement from `SPANQC_PRODUCTION_BUILD_SPEC.md` is classified into one of eight strict categories:
- `IMPLEMENTED`: Fully functional, verified, backed by tests, adhering to production standards.
- `PARTIALLY_IMPLEMENTED`: Architectural structure exists, but lacks edge-case handling, full test coverage, or complete capability.
- `DEMO_ONLY`: Built solely for visual presentation; disconnected from persistent state or genuine user workflows.
- `MOCKED`: Simulates external or internal services with hardcoded fixtures or synthetic returns.
- `BROKEN`: Code is non-functional, points to nonexistent routes, or causes runtime failures under realistic usage.
- `MISSING`: Required feature or architectural component is completely absent from the codebase.
- `INSECURE`: Contains exploitable vulnerabilities (IDOR, auth bypass, injection, plaintext secrets, or race conditions).
- `UNVERIFIED`: Code exists but lacks tests proving correctness or behavioral integrity.

| # | Spec Requirement Area | Status | Summary of Current State |
| :--- | :--- | :--- | :--- |
| **1** | **Product Positioning & Language** | `DEMO_ONLY` | Claims "156+ automated checks", "88% compliance", and uses prohibited "Compliance Certificate" language throughout UI and PDF exports. |
| **2** | **Business Truthfulness** | `DEMO_ONLY` | Hardcodes unverified customer names (e.g. "Tata AutoComp Systems Ltd.", "Spandsons Horizon Engineering") across UI, login, database seeds, and title blocks. |
| **3** | **Pricing Model Alignment** | `BROKEN` | Uses prototype pricing (₹99 / ₹499 / ₹4,999) instead of validated SaaS positioning (₹9,999 / ₹24,999 / ₹75,000+). |
| **4** | **Explicit Runtime Modes (PROD/DEMO/TEST)** | `MISSING` | No runtime separation between `PRODUCTION`, `DEMO`, and `TEST`. Mock providers and template lookups execute indiscriminately in production. |
| **5** | **Real Document Ingestion** | `MOCKED` | File binary is inspected for magic bytes in preflight but never parsed or stored. Ingestion is driven by filename patterns (`wh-402`, `mcc`, `tb-200`). |
| **6** | **Private Object Storage** | `MISSING` | Files are not uploaded to S3/R2. `upload-session` returns a dead route (`/api/v1/documents/upload-direct`) that returns 404. |
| **7** | **Asynchronous Worker & Queue Pipeline** | `MISSING` | No Redis, BullMQ, or background worker exists. Document processing runs synchronously inside Next.js HTTP requests, prone to serverless timeouts. |
| **8** | **Topological Electrical Graph** | `PARTIALLY_IMPLEMENTED` | `ElectricalGraph` and `netlist-graph.ts` models exist, but graphs are constructed from hardcoded CAD templates or mock token tables, not real document extractions. |
| **9** | **Extraction Quality & Uncertainty Flags** | `MISSING` | No distinction between detected, inferred, uncertain, or corrected tokens. Confidence scores are hardcoded numbers (e.g. 0.98, 0.95). |
| **10** | **Deterministic QC Rule Engine** | `PARTIALLY_IMPLEMENTED` | Physical calculation logic for IPC-620 and UL 508A exists, but registry contains only 12 rules while claiming 156+. Rule evaluator hardcodes total checks executed to 142. |
| **11** | **AI Provider Architecture** | `INSECURE` | When primary provider (Ollama) is unavailable or fails, `AIProviderRouter` silently falls back to `MockAIProvider`, returning manufactured findings. |
| **12** | **Randomized Analysis Behavior** | `MOCKED` | `src/lib/llm-engine.ts` uses `Math.random() > 0.65` to arbitrarily decide pass/fail, and randomly generates execution latencies and check counts. |
| **13** | **Cryptographic Report Fingerprint** | `MOCKED` | `generateReportChecksum()` uses a non-cryptographic 32-bit loop and appends it to a hardcoded string (`sha256:e3b0c442...`). |
| **14** | **Authoritative Report Metadata** | `DEMO_ONLY` | Reports hardcode auditor "Pravin R.", approver "Gogulnath S.", and organization "Spandsons Horizon Engineering Pvt. Ltd.". |
| **15** | **Public Report Verification** | `BROKEN` | Generates fake verification URLs (`https://qc.spandsons.com/verify/...`) on an unhosted external domain. API endpoint `/api/reports/certificate/[id]` returns sample data for any ID. |
| **16** | **Human Review Lifecycle** | `PARTIALLY_IMPLEMENTED` | Database models for `FindingReview` exist, but review route resolves reviewer by arbitrarily selecting the first user in tenant or creating a fake user. |
| **17** | **Interactive Schematic / CAD Viewer** | `DEMO_ONLY` | `EasySchematicEditor` is an in-memory toy canvas operating on synthetic templates; it cannot parse, render, or save real engineering CAD files (DWG/DXF). |
| **18** | **Reporting & Export Engines** | `PARTIALLY_IMPLEMENTED` | Excel export works via client library. PDF export is a browser `window.print()` pop-up with hardcoded letterheads, not a server-generated audit document. |
| **19** | **Authentication & Password Security** | `INSECURE` | Scrypt password hashing is implemented, but login allows passwordless bypass for demo roles and unverified Google login without OAuth token exchange. |
| **20** | **Tenant Isolation & IDOR Protection** | `INSECURE` | `resolveTenant` blindly trusts client-supplied `x-organization-id` header or `active_tenant` cookie, falling back to default tenant. Any user can access any tenant's data. |
| **21** | **Role-Based Access Control (RBAC)** | `MISSING` | Roles exist in schema (`OWNER`, `QC_INSPECTOR`, etc.), but API endpoints never verify permissions before performing sensitive mutations (e.g. document deletion). |
| **22** | **Upload Security & File Validation** | `PARTIALLY_IMPLEMENTED` | Magic byte detection and SVG sanitization exist in preflight, but file size decompression limits, malware scanning, and true vector parsing are absent. |
| **23** | **SSRF Protection on AI Endpoints** | `INSECURE` | `validateLLMEndpoint` blocks metadata IPs but permits `localhost`, `127.0.0.1`, and internal RFC1918 private subnets, exposing internal services. |
| **24** | **Razorpay Billing & Webhooks** | `INSECURE` | Webhook verification contains a development bypass (`x-test-bypass` or `dev_test_simulation`) that permits forging payments in non-production. Defaults to test keys. |
| **25** | **Usage Metering & Quotas** | `INSECURE` | Quota checks and increments are non-transactional, leading to race conditions where concurrent checks can exceed customer entitlements. |
| **26** | **Database & Migrations** | `IMPLEMENTED` | PostgreSQL (Neon) schema is synchronized with 25+ models, foreign keys, and indexes. Prisma client is properly configured. |
| **27** | **Rate Limiting** | `MISSING` | No rate limiting exists across authentication, uploads, analysis runs, reports, or billing endpoints. |
| **28** | **Observability (Logs, Metrics, Traces)** | `MISSING` | No structured JSON logging, Prometheus metrics, or OpenTelemetry distributed tracing. Only console logs. |
| **29** | **Regression Benchmark Suite** | `DEMO_ONLY` | Suite tests only 3 string filenames (`WH-402`, `MCC-VFD-01`, `TB-200`) against hardcoded template rules. True negatives and zero-hallucination rate are hardcoded. |
| **30** | **Environment & Secret Management** | `PARTIALLY_IMPLEMENTED` | Production environment variables are deployed on Vercel, but fallback defaults exist in code (`AUTH_SECRET`, `RAZORPAY_KEY_SECRET`), risking silent compromise. |

---

## 3. Deep-Dive Critical Findings

### Finding 1: Filename-Driven Ingestion & Hardcoded Token Extraction
- **Exact File:** [`src/lib/ingestion/bounds-extractor.ts`](file:///data/projects/qc-bot/src/lib/ingestion/bounds-extractor.ts) (Lines 37–98) & [`src/lib/ingestion/token-extractor.ts`](file:///data/projects/qc-bot/src/lib/ingestion/token-extractor.ts) (Lines 44–137)
- **Function/Component:** `extractDrawingZones()` and `extractElectricalTokens()`
- **Current Behavior:** Inspects `fileName.toLowerCase()`. If the filename contains substrings like `'wh-402'`, `'harness'`, `'mcc'`, `'panel'`, `'508'`, or `'tb-200'`, the functions return pre-fabricated bounding boxes, title block metadata, and hardcoded electrical tokens/wire schedules. If no match is found, a generic mock terminal block is returned.
- **Risk:** Completely fraudulent analysis. Any document uploaded by a customer—regardless of its actual electrical contents—is analyzed as either a pre-baked WH-402 harness or an MCC motor control panel based entirely on its filename.
- **Recommended Fix:** Remove filename-based matching. Implement true PDF text extraction (e.g. via `pdf-parse`, `pdfjs-dist`, or vector geometry extraction) and image OCR (Tesseract / Cloud Vision) that extracts real coordinates, text tokens, and connection lines from document streams.
- **Test Required:** Upload two distinct PDF files with arbitrary names (e.g. `test_drawing_alpha.pdf` and `test_drawing_beta.pdf`) and assert that extracted tokens and bounding boxes match the actual binary content of the PDFs rather than hardcoded presets.
- **Priority:** **P0 (Blocker)**

---

### Finding 2: Template-Driven Processing in API v1
- **Exact File:** [`src/app/api/v1/documents/[id]/process/route.ts`](file:///data/projects/qc-bot/src/app/api/v1/documents/[id]/process/route.ts) (Lines 60–65)
- **Function/Component:** `POST /api/v1/documents/[id]/process`
- **Current Behavior:** The route completely ignores the uploaded document file data and determines the electrical graph using:
  ```typescript
  const templateKey = standardName.includes('508') ? 'MCC-VFD-01' : 'WH-402';
  const tmpl = CAD_DIAGRAM_TEMPLATES[templateKey];
  const graph = convertCadToElectricalGraph(tmpl.nodes, tmpl.wires);
  ```
  It then persists the template's nodes as the document's components in PostgreSQL.
- **Risk:** The core SaaS value proposition is entirely simulated. Customers uploading schematics will receive findings for components (`VFD1`, `CB1`, `J1`) that do not exist in their drawings.
- **Recommended Fix:** Refactor processing pipeline to load the document version's stored file, execute preflight and optical/vector extraction on the actual pages, construct the graph from real extractions, and evaluate rules against that real graph.
- **Test Required:** End-to-end integration test asserting that components created in PostgreSQL match elements present in the uploaded drawing, not `CAD_DIAGRAM_TEMPLATES`.
- **Priority:** **P0 (Blocker)**

---

### Finding 3: Silent Mock AI Fallback in Production
- **Exact File:** [`src/lib/ai/router.ts`](file:///data/projects/qc-bot/src/lib/ai/router.ts) (Lines 46–61)
- **Function/Component:** `AIProviderRouter.routeVisionInspection()`
- **Current Behavior:** If the preferred provider (e.g. Ollama) is unreachable or throws an exception, the router silently catches the error, sets `activeProvider = this.mockProvider`, and calls `mockProvider.analyzeVision()`. `MockAIProvider` immediately returns static synthetic findings.
- **Risk:** Fabricated findings in production. When the local AI model times out or goes offline, the customer is presented with fake violations rather than an explicit error state, violating core engineering integrity.
- **Recommended Fix:** Implement fail-closed architecture in production mode. If production AI fails, record the provider failure in `AiRun`, mark the analysis state as `FAILED` or `NEEDS_REVIEW`, and display actionable error states without inventing findings. Allow mock provider strictly under `NODE_ENV === 'test'` or explicit `DEMO` mode.
- **Test Required:** Integration test where Ollama endpoint is down; assert that API returns HTTP 503 / `AI_UNAVAILABLE` error and records a failed run, rather than returning synthetic findings with `fallbackUsed: true`.
- **Priority:** **P0 (Blocker)**

---

### Finding 4: Randomized Analysis & Coin-Flip Pass/Fail
- **Exact File:** [`src/lib/llm-engine.ts`](file:///data/projects/qc-bot/src/lib/llm-engine.ts) (Lines 145–218)
- **Function/Component:** `runAIQualityInspection()`
- **Current Behavior:** When a custom drawing is uploaded without an exact sample match, the engine determines the result using:
  ```typescript
  const isPass = Math.random() > 0.65;
  ```
  If false, it returns 3 hardcoded discrepancies (`D-301`, `D-302`, `D-303`) and generates random execution times and executed check counts:
  ```typescript
  const executed = 120 + Math.floor(Math.random() * 40);
  ```
- **Risk:** Total lack of reproducibility. Uploading the exact same document twice can yield a pass or a fail at random.
- **Recommended Fix:** Eliminate `Math.random()` completely from all analysis and rule evaluation pathways. Analysis must be 100% deterministic based on extracted graph data and configured rule versions.
- **Test Required:** Unit test running the inspection engine on the same input 20 consecutive times; assert identical findings, scores, and check counts across every execution.
- **Priority:** **P0 (Blocker)**

---

### Finding 5: Fake Cryptographic Checksum Generation
- **Exact File:** [`src/lib/reports/audit-report-generator.ts`](file:///data/projects/qc-bot/src/lib/reports/audit-report-generator.ts) (Lines 22–32)
- **Function/Component:** `generateReportChecksum()`
- **Current Behavior:** Computes a simple bit-shift hash (`(hash << 5) - hash + char`) and prepends a hardcoded empty-string SHA-256 prefix:
  ```typescript
  return `sha256:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852${hexPart}`;
  ```
- **Risk:** False security and audit misrepresentation. The checksum is claimed to be a cryptographic seal, but is easily manipulated and collides trivially.
- **Recommended Fix:** Use Node's built-in `crypto.createHash('sha256')`. Create a canonical, deterministic JSON string representation of the report content (document version, findings list, executed rules, reviewer signatures) and compute the authentic SHA-256 digest.
- **Test Required:** Unit test verifying that altering any field in the report produces an entirely different cryptographic digest, and that the digest matches `crypto.createHash('sha256')`.
- **Priority:** **P0 (Blocker)**

---

### Finding 6: Hardcoded Report Identities & Prohibited Certification Wording
- **Exact File:** [`src/lib/reports/audit-report-generator.ts`](file:///data/projects/qc-bot/src/lib/reports/audit-report-generator.ts) (Lines 48–55) & [`src/lib/export-utils.ts`](file:///data/projects/qc-bot/src/lib/export-utils.ts) (Lines 66–70, 285–300)
- **Function/Component:** `buildAuditCertificate()` and `exportQCReportToPrintablePDF()`
- **Current Behavior:** Every generated report and certificate hardcodes:
  - Lead Auditor: `"Pravin R., Senior Quality Architect"`
  - Approver: `"Gogulnath S., Director of Engineering QA"`
  - Organization: `"Spandsons Horizon Engineering Pvt. Ltd."`
  - Title: `"FORMAL ENGINEERING COMPLIANCE CERTIFICATE"` / `"DISPOSITION: CERTIFIED PASS"`
- **Risk:** Legal liability and false representation. The system issues documents claiming to be "Certified Compliance Certificates" signed by real individuals who never inspected the drawing, for organizations other than the customer's.
- **Recommended Fix:** Replace all hardcoded identities with authenticated user data from the active session (`user.name`, `tenant.name`, reviewer decision). Replace prohibited certification language with truthful terminology: `"Quality Review Report"`, `"AI-Assisted Engineering Review"`, `"Inspection Disposition: REVIEW_PASSED"`.
- **Test Required:** Generate report for a newly registered tenant (e.g. "Apex Aerospace"); assert that report metadata displays "Apex Aerospace" and the logged-in reviewer, with zero occurrences of "Spandsons", "Pravin", or "Compliance Certificate".
- **Priority:** **P0 (Blocker)**

---

### Finding 7: Fake Verification URLs
- **Exact File:** [`src/lib/reports/audit-report-generator.ts`](file:///data/projects/qc-bot/src/lib/reports/audit-report-generator.ts) (Line 54) & [`src/app/api/reports/certificate/[id]/route.ts`](file:///data/projects/qc-bot/src/app/api/reports/certificate/[id]/route.ts) (Lines 20–29)
- **Function/Component:** `buildAuditCertificate()` and `GET /api/reports/certificate/[id]`
- **Current Behavior:** Reports print a verification URL: `https://qc.spandsons.com/verify/${certId}`. When `/api/reports/certificate/[id]` is queried, it searches `SAMPLE_DIAGRAMS` and falls back to returning `SAMPLE_DIAGRAMS[0].sampleReport`, claiming `verified: true` for any arbitrary identifier requested.
- **Risk:** Broken links for customers and security vulnerability where arbitrary report requests are confirmed as "verified" without checking PostgreSQL records or tenant authorization.
- **Recommended Fix:** Build an authoritative `/verify/[hashOrId]` endpoint that queries the `Report` table in PostgreSQL, validates the SHA-256 fingerprint, checks tenant visibility, and displays authentic generation metadata. If not verified, return HTTP 404 / `REPORT_NOT_FOUND`.
- **Test Required:** Query verification endpoint with a valid report hash (assert verified metadata returned) and an invalid hash (assert HTTP 404 with verification failure).
- **Priority:** **P1**

---

### Finding 8: Complete Tenant Isolation & IDOR Bypass
- **Exact File:** [`src/lib/tenant-resolver.ts`](file:///data/projects/qc-bot/src/lib/tenant-resolver.ts) (Lines 11–50) & All [`src/app/api/v1/...`](file:///data/projects/qc-bot/src/app/api/v1) routes
- **Function/Component:** `resolveTenant()`
- **Current Behavior:** `resolveTenant` inspects the incoming request headers:
  ```typescript
  const headerTenantId = req.headers.get('x-organization-id') || req.headers.get('x-tenant-id');
  if (headerTenantId) {
    const tenant = await prisma.tenant.findUnique({ where: { id: headerTenantId } });
    if (tenant) return tenant;
  }
  ```
  If no header is passed, it checks the `active_tenant` cookie, and finally falls back to the default demo tenant `'spandsons'`.
- **Risk:** **Critical Insecure Direct Object Reference (IDOR)**. Any unauthenticated external client can send `x-organization-id: <victim_tenant_id>` to view, modify, or delete any customer's documents, projects, findings, or payment records.
- **Recommended Fix:** Completely deprecate `resolveTenant()`. Require server-authoritative session resolution via `getCurrentSession()`. Derive the user's tenant membership from the cryptographically signed session cookie and database relation (`user.tenantId`). Enforce that all queries scope to `user.tenantId`.
- **Test Required:** Security test where User A from Tenant A attempts to access or delete a Document belonging to Tenant B by setting `x-organization-id: tenant_b`; assert HTTP 401/403 Forbidden.
- **Priority:** **P0 (Blocker)**

---

### Finding 9: Authentication & RBAC Bypass
- **Exact File:** [`src/app/api/auth/login/route.ts`](file:///data/projects/qc-bot/src/app/api/auth/login/route.ts) (Lines 20–75)
- **Function/Component:** `POST /api/auth/login`
- **Current Behavior:** 
  1. If `demoRole` is provided, the API logs in as `pravin@spandsons.com`, `gogulnath@spandsons.com`, or `anand.k@tataautocomp.com` without verifying any password.
  2. If `isGoogleAuth` is true, the client can pass any arbitrary email address and the API immediately issues an authenticated session token for that account without performing any OAuth exchange or verifying ID tokens.
- **Risk:** Account takeover. Anyone can log into any customer's account simply by sending `{ "email": "victim@customer.com", "isGoogleAuth": true }`.
- **Recommended Fix:** Remove `demoRole` passwordless login from production. Implement genuine OAuth 2.0 / OpenID Connect token verification (verifying Google RSA signatures via Google's certs) before issuing sessions. Reject unverified SSO requests.
- **Test Required:** Attempt to log into an existing user account with `isGoogleAuth: true` without a valid Google ID token; assert request is rejected with HTTP 401.
- **Priority:** **P0 (Blocker)**

---

### Finding 10: Missing Direct Upload Endpoint & File Persistence
- **Exact File:** [`src/app/api/v1/documents/upload-session/route.ts`](file:///data/projects/qc-bot/src/app/api/v1/documents/upload-session/route.ts) (Line 26) & [`src/app/api/v1/documents/route.ts`](file:///data/projects/qc-bot/src/app/api/v1/documents/route.ts) (Lines 61–85)
- **Function/Component:** `POST /api/v1/documents/upload-session` and `POST /api/v1/documents`
- **Current Behavior:** `upload-session` generates an upload URL pointing to `/api/v1/documents/upload-direct`, which does not exist in the repository (returns 404). When `POST /api/v1/documents` is called, it accepts whatever string the client passes as `storage_key` and saves it to the database, without storing the file contents anywhere.
- **Risk:** Broken document pipeline. Real document files cannot be uploaded or persisted.
- **Recommended Fix:** Implement secure private object storage integration (AWS S3, Cloudflare R2, or Supabase Storage). `upload-session` must generate genuine pre-signed S3 PUT URLs with short expirations (e.g. 15 minutes), strict Content-Type headers, and SHA-256 checksum requirements.
- **Test Required:** Integration test requesting an upload session, uploading a sample PDF to the pre-signed URL, and verifying that the object exists in private storage and matches the uploaded SHA-256 hash.
- **Priority:** **P0 (Blocker)**

---

### Finding 11: Razorpay Webhook Development Bypass in Production Code
- **Exact File:** [`src/app/api/v1/webhooks/razorpay/route.ts`](file:///data/projects/qc-bot/src/app/api/v1/webhooks/razorpay/route.ts) (Lines 16–21)
- **Function/Component:** `POST /api/v1/webhooks/razorpay`
- **Current Behavior:** Webhook verification contains backdoor logic:
  ```typescript
  const isDev = process.env.NODE_ENV !== 'production';
  const isTestBypass = isDev && (
    req.headers.get('x-test-bypass') === 'true' ||
    signature === 'dev_test_simulation'
  );
  const isValid = isSignatureValid || isTestBypass;
  ```
- **Risk:** If `NODE_ENV` is accidentally misconfigured or in staging environments, malicious actors can send forged webhook payloads with `x-test-bypass: true` and provision unlimited quota and subscriptions without payment.
- **Recommended Fix:** Remove all bypass logic from the webhook endpoint. Webhook verification must strictly require HMAC SHA-256 validation against `process.env.RAZORPAY_WEBHOOK_SECRET`. In automated tests, use genuine HMAC signatures generated with the test secret.
- **Test Required:** Send webhook with `signature: 'dev_test_simulation'`; assert HTTP 401 Unauthorized in all environments.
- **Priority:** **P0 (Blocker)**

---

### Finding 12: Non-Transactional Quota Metering & Race Conditions
- **Exact File:** [`src/app/api/v1/documents/[id]/process/route.ts`](file:///data/projects/qc-bot/src/app/api/v1/documents/[id]/process/route.ts) (Lines 21–26, 170–173)
- **Function/Component:** `POST /api/v1/documents/[id]/process`
- **Current Behavior:** Quota check is separated from increment:
  ```typescript
  if (tenant.quotaUsed >= tenant.checkQuota) { return apiError('QUOTA_EXCEEDED', ...); }
  // ... runs 5-10 seconds of processing ...
  await prisma.tenant.update({ where: { id: tenant.id }, data: { quotaUsed: { increment: 1 } } });
  ```
- **Risk:** Race condition. A customer with 1 remaining check can issue 50 simultaneous API requests; all 50 pass the check before any increment occurs, allowing 49 free checks and quota exhaustion abuse.
- **Recommended Fix:** Use atomic database transactions with conditional locking or Postgres row-level locks:
  ```sql
  UPDATE organizations SET quota_used = quota_used + 1 WHERE id = $1 AND quota_used < check_quota RETURNING id;
  ```
  If zero rows are updated, reject immediately with HTTP 402 Payment Required.
- **Test Required:** Concurrency test sending 10 simultaneous analysis requests for a tenant with `checkQuota: 1`; assert exactly 1 request succeeds and 9 fail with `QUOTA_EXCEEDED`.
- **Priority:** **P1**

---

### Finding 13: SSRF Vulnerability in AI Endpoint Validation
- **Exact File:** [`src/lib/llm-engine.ts`](file:///data/projects/qc-bot/src/lib/llm-engine.ts) (Lines 13–40)
- **Function/Component:** `validateLLMEndpoint()`
- **Current Behavior:** Only blocks exact hostnames `169.254.169.254`, `metadata.google.internal`, `instance-data`, `0.0.0.0`, and `255.255.255.255`. It allows `127.0.0.1`, `localhost`, and internal RFC1918 private subnets (`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`).
- **Risk:** Server-Side Request Forgery. Users can configure model endpoints pointing to internal VPC databases (Postgres on 5432, Redis on 6379, Kubernetes APIs on 6443) and trigger port scanning or credential leakage.
- **Recommended Fix:** Implement strict IP resolution and address checking: resolve DNS, verify resolved IP does not belong to private, loopback, or link-local ranges, or restrict AI provider URLs to an explicit administrator-managed allowlist.
- **Test Required:** Pass `http://127.0.0.1:5432` and `http://10.0.0.5:8080` to `validateLLMEndpoint()`; assert both return `valid: false`.
- **Priority:** **P1**

---

### Finding 14: Inconsistent Rule Counts (12 Actual vs 156 Claimed)
- **Exact File:** [`src/lib/rules/standards-registry.ts`](file:///data/projects/qc-bot/src/lib/rules/standards-registry.ts) vs [`src/lib/rules/rule-evaluator.ts`](file:///data/projects/qc-bot/src/lib/rules/rule-evaluator.ts) (Line 79) vs Landing Page
- **Function/Component:** `STANDARDS_RULE_REGISTRY` and `runDeterministicQcInspection()`
- **Current Behavior:** `STANDARDS_RULE_REGISTRY` contains exactly 12 rule definitions. However, `rule-evaluator.ts` hardcodes `const totalChecksExecuted = 142;`, and marketing pages/samples claim "156+ automated checks".
- **Risk:** Deceptive product claims and audit inconsistency. Reports state that 142 checks were executed when only 12 rules exist in the registry.
- **Recommended Fix:** Make `STANDARDS_RULE_REGISTRY` the single source of truth. Derive all UI badges, executed check counters, and report summaries dynamically from the count of active rules in the registry (`STANDARDS_RULE_REGISTRY.length`).
- **Test Required:** Unit test asserting that `report.summary.executed` precisely equals the count of rules registered and evaluated in `STANDARDS_RULE_REGISTRY`.
- **Priority:** **P1**

---

### Finding 15: In-Memory Toy CAD Editor Disconnected from Document Storage
- **Exact File:** [`src/components/EasySchematicEditor.tsx`](file:///data/projects/qc-bot/src/components/EasySchematicEditor.tsx)
- **Function/Component:** `EasySchematicEditor`
- **Current Behavior:** Renders a 2D drag-and-drop canvas for synthetic preloaded templates (`CAD_DIAGRAM_TEMPLATES`). It does not load customer documents, does not parse vector CAD files, and does not save modifications back to any PostgreSQL document version.
- **Risk:** Deceptive UX. The interface suggests engineers can visually modify wiring diagrams and auto-remediate, but no changes persist to customer records.
- **Recommended Fix:** Isolate or disable the schematic editor behind a feature flag (`ENABLE_SCHEMATIC_EDITOR=false`). In the primary review interface, replace it with an authentic Evidence Viewer that highlights extracted bounding boxes on rendered PDF page images.
- **Test Required:** When feature flag is disabled, verify that the editor route is hidden or clearly labeled as an experimental sandbox.
- **Priority:** **P2**

---

### Finding 16: Absence of Asynchronous Processing & Job Queues
- **Exact File:** [`src/app/api/v1/documents/[id]/process/route.ts`](file:///data/projects/qc-bot/src/app/api/v1/documents/[id]/process/route.ts)
- **Function/Component:** `POST /api/v1/documents/[id]/process`
- **Current Behavior:** Document processing is executed synchronously within the Next.js API route handler.
- **Risk:** Production failures under load. Processing multi-page engineering PDFs through OCR, vector extraction, graph construction, and AI vision requires 15–90 seconds, causing immediate HTTP 504 Gateway Timeouts on Vercel and serverless reverse proxies.
- **Recommended Fix:** Decouple request intake from processing. The API route sets `processingStatus = 'QUEUED'` and enqueues a background job (via BullMQ/Redis, Inngest, or SQS). A dedicated worker processes the document and updates status to `COMPLETED` or `FAILED`. The frontend polls `/api/v1/documents/[id]/processing-status` or consumes SSE events.
- **Test Required:** Integration test submitting a document for processing; assert API returns HTTP 202 Accepted immediately with a job ID, and document version status transitions from `QUEUED` -> `PROCESSING` -> `COMPLETED`.
- **Priority:** **P1**

---

## 4. Production Blockers & Risk Assessment

Before SpanQC can be designated as **Production Ready**, the following critical blockers must be resolved:

```
[BLOCKER 1: Real Extraction Pipeline]
  └── Ingestion is driven by filename templates, not actual PDF content.

[BLOCKER 2: Fail-Closed AI Architecture]
  └── AI silently falls back to MockAIProvider, inventing fake findings.

[BLOCKER 3: Random Analysis Logic]
  └── Math.random() determines pass/fail and check metrics.

[BLOCKER 4: Insecure Tenant Isolation]
  └── resolveTenant trusts client x-organization-id headers (Critical IDOR).

[BLOCKER 5: Authentication & RBAC Bypass]
  └── Passwordless demo login and unverified Google SSO in production.

[BLOCKER 6: Fake Cryptography & Certification Claims]
  └── Non-cryptographic report checksums and illegal compliance certificates.

[BLOCKER 7: Missing Private Object Storage]
  └── Document uploads are not saved to durable object storage.

[BLOCKER 8: Non-Transactional Quota Metering]
  └── Race conditions in concurrent document analysis quota deductions.
```

---

## 5. Blocker Dependency Graph

```
┌────────────────────────────────────────────────────────┐
│ Phase 1: Product Truthfulness & Mode Separation        │
│ • Remove Math.random()                                 │
│ • Remove hardcoded customer identities (Tata, Spandsons)│
│ • Replace "Compliance Certificate" with Truthful Terms │
│ • Single Source of Truth for Rule Registry             │
└──────────────────────────┬─────────────────────────────┘
                           │
                           ▼
┌────────────────────────────────────────────────────────┐
│ Phase 2: Security, Authentication & Tenant Isolation   │
│ • Remove x-organization-id header trust                │
│ • Enforce session-derived organization membership      │
│ • Remove demo passwordless login & verify OAuth tokens │
│ • Implement strict SSRF IP validator                   │
└──────────────────────────┬─────────────────────────────┘
                           │
                           ▼
┌────────────────────────────────────────────────────────┐
│ Phase 3: Private Storage & Real Ingestion Pipeline     │
│ • Pre-signed S3/R2 direct upload integration           │
│ • Real PDF page extraction & layout segmentation       │
│ • Real OCR & text token extraction                     │
│ • Real electrical graph generation from document tokens│
└──────────────────────────┬─────────────────────────────┘
                           │
                           ▼
┌────────────────────────────────────────────────────────┐
│ Phase 4: Deterministic Rules & Fail-Closed AI          │
│ • Execute 12+ real rules against extracted graph       │
│ • Connect production AI (Ollama / Cloud Vision)        │
│ • Fail-closed error handling (no mock fallback in PROD)│
│ • Real SHA-256 cryptographic report fingerprints       │
└──────────────────────────┬─────────────────────────────┘
                           │
                           ▼
┌────────────────────────────────────────────────────────┐
│ Phase 5: Billing, Review Lifecycle & Infrastructure    │
│ • Transactional atomic quota deduction                 │
│ • Strict Razorpay webhook HMAC verification            │
│ • Evidence-backed review workflow & verified reports   │
│ • Asynchronous job processing (BullMQ / Inngest)       │
└────────────────────────────────────────────────────────┘
```

---

## 6. Recommended Phased Implementation Order

1. **Phase 1: Truthfulness & Runtime Mode Separation (Immediate)**
   - Introduce `APP_MODE`: `PRODUCTION`, `DEMO`, `TEST`.
   - Strip all `Math.random()` simulation logic.
   - Clean out fabricated customer names ("Tata AutoComp", "Spandsons Horizon Engineering").
   - Eliminate illegal "Certified Compliance" wording; establish standard "QC Review Report" terminology.
   - Align pricing to validated tiers (₹9,999 / ₹24,999 / ₹75,000+).

2. **Phase 2: Security & Tenant Isolation Hardening**
   - Eliminate `resolveTenant()` header and cookie trust. Require session-derived organization resolution.
   - Remove demo passwordless login. Implement true authentication boundaries.
   - Harden `validateLLMEndpoint` against all private/loopback/rebinding SSRF vectors.
   - Remove Razorpay test bypass headers (`x-test-bypass`).

3. **Phase 3: Real Ingestion & Private Object Storage**
   - Connect private S3-compatible object storage (AWS S3 or Cloudflare R2).
   - Implement authentic pre-signed upload session flow.
   - Integrate PDF parser and rasterizer to extract real text tokens and page coordinates.
   - Build topological `ElectricalGraph` dynamically from real extracted tokens.

4. **Phase 4: Rule Engine Realism & Fail-Closed AI**
   - Bind deterministic rules directly to the dynamic graph.
   - Enforce fail-closed AI policy: record failures in `AiRun`, never silently fallback to mock findings in production.
   - Implement true SHA-256 report hashing using canonical JSON serialization.
   - Build authentic verification endpoint `/verify/[hash]` reading authoritative PostgreSQL records.

5. **Phase 5: Billing Transactionality & Asynchronous Pipeline**
   - Enforce atomic database transactions on quota deductions (`UPDATE ... WHERE quota_used < check_quota`).
   - Implement background queue/worker architecture to prevent HTTP request timeouts during PDF processing.
   - Replace in-memory CAD editor with genuine Evidence Viewer linked to extracted document coordinates.
