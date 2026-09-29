# SpanQC Customer Journey Map (Phase 5.5 Audit)

## 1. Executive Summary

This document forensically audits the end-to-end customer journey for an electrical systems engineer using SpanQC. Each stage is classified into one of six factual states:
- `WORKING`: Fully implemented, secure, verified by automated tests and production routes.
- `PARTIALLY_WORKING`: Implemented in backend or frontend, but requires integration hardening or contains legacy template fallbacks.
- `BROKEN`: Code exists but fails under real customer conditions or incorrect configuration.
- `MISSING`: Capability is not yet implemented in the application.
- `UNSAFE`: Bypasses authorization, leaks data, or permits cross-tenant manipulation.
- `UNVERIFIED`: Not backed by automated tests or live environment validation.

---

## 2. 12-Stage Customer Journey Matrix

| Stage | Step Name | Classification | Current State Summary |
|---|---|---|---|
| **01** | Account Registration | `WORKING` | Signup API creates `User`, assigns hashed password, creates `Tenant`, and grants `OWNER` membership in an atomic transaction. |
| **02** | Authentication & Session | `WORKING` | Session cookies and cryptographic tokens verified with expiration; demo bypass disabled in production. |
| **03** | Organization Management | `WORKING` | Tenant boundaries enforced; multi-organization memberships supported with strict RBAC. |
| **04** | Project Creation | `PARTIALLY_WORKING` | Backend API `/api/v1/projects` exists and enforces tenant isolation; frontend UI dashboard relies on legacy sample mock lists. |
| **05** | Document Upload | `PARTIALLY_WORKING` | Backend storage APIs (`upload-session`, `upload-direct`, `upload-complete`, `verify`) are robust; frontend `InspectionWizard` historically passed filenames without streaming real binary bytes. |
| **06** | Processing Status Tracking | `WORKING` | `ProcessingJob` state machine tracks real stages (`QUEUED`, `PREFLIGHT`, `EXTRACTING`, `BUILDING_GRAPH`, `RULE_EVALUATION`, `COMPLETED`, `FAILED`). |
| **07** | QC Rule Analysis | `WORKING` | Authoritative `RuleRegistry` executes 20 deterministic rules against `ElectricalGraph` without mock fallbacks or AI overrides. |
| **08** | Results Dashboard & Findings | `PARTIALLY_WORKING` | Backend `/api/v1/documents/[id]/findings` returns evidence-backed findings; frontend was partially tied to preloaded sample diagram models. |
| **09** | Visual Evidence Pinpointing | `PARTIALLY_WORKING` | Normalized `[0, 1000]` coordinates persisted; `SchematicViewer` needs consistent coordinate handling and graceful fallback when spatial bounding boxes are absent. |
| **10** | Human Review Disposition | `WORKING` | `/api/v1/findings/[id]/review` supports `CONFIRMED`, `REJECTED`, `FALSE_POSITIVE`, `WAIVED`, and `MODIFIED` with mandatory reason audit logs. |
| **11** | Report Generation & Export | `WORKING` | Cryptographic SHA-256 seal generated from canonical finding data; multi-sheet Excel and printable PDF exports available. |
| **12** | Quota & Usage Metering | `WORKING` | Atomic serializable check reservation in PostgreSQL, failure refunding, usage ledger recording; live billing explicitly marked `NOT_LIVE`. |

---

## 3. Detailed Audit by Stage

### Stage 1: Registration (`WORKING`)
- **Route**: `POST /api/auth/signup`
- **Validation**: Minimum 8-char password, valid email, required organization name.
- **Tenant Isolation**: Atomic transaction creates Tenant with random numeric slug suffix, User, and OrganizationMember with `OWNER` role.
- **No Privileged Bypass**: New registrations cannot escalate privileges or claim existing organizations without explicit membership invitation.

### Stage 2: Authentication (`WORKING`)
- **Route**: `POST /api/auth/login`, `GET /api/auth/me`, `POST /api/auth/logout`
- **Session**: Cryptographic HMAC-SHA256 session token stored in `HttpOnly`, `SameSite=lax` cookie.
- **Demo Mode Safety**: Passwordless demo logins (`demoRole`) are blocked in production mode (`isProduction()`).

### Stage 3: Organization / Multi-Tenancy (`WORKING`)
- **Route**: `GET /api/v1/organizations`, `POST /api/v1/organizations`, `GET /api/v1/organizations/[id]`
- **Isolation**: Every database query is scoped to `tenantId`. Cross-tenant IDOR access attempts return `403 FORBIDDEN` or `404 NOT_FOUND`.

### Stage 4: Project Management (`PARTIALLY_WORKING`)
- **Backend**: `GET /api/v1/projects` and `POST /api/v1/projects` exist with audit logging and tenant isolation.
- **Identified Gap**: Name validation needs hardening against whitespace-only names and excessive string lengths. The main frontend overview dashboard was showing static sample data instead of dynamically listing real tenant projects.

### Stage 5: Document Upload Experience (`PARTIALLY_WORKING`)
- **Backend**: S3/Local vault private storage, presigned URLs, direct upload streaming, and SHA-256 integrity verification.
- **Identified Gap**: In `src/components/InspectionWizard.tsx`, file drag-and-drop previously called `upload-session` with a hardcoded tenant slug (`spandsons`) and did not stream the file binary into the storage vault before invoking `/process`.

### Stage 6: Processing Lifecycle (`WORKING`)
- **Backend**: `runDocumentProcessingPipeline` transitions jobs through truthful states:
  $$\text{QUEUED} \longrightarrow \text{PREFLIGHT} \longrightarrow \text{EXTRACTING} \longrightarrow \text{BUILDING\_GRAPH} \longrightarrow \text{RULE\_EVALUATION} \longrightarrow \text{COMPLETED}$$
- **Error Handling**: Failures update `job.status = 'FAILED'`, store `errorCode` and safe `errorMessage`, and refund reserved quota atomically.

### Stage 7: QC Rule Analysis (`WORKING`)
- **Authoritative Engine**: `ProductionRuleEvaluator` consumes `RuleRegistry` (20 active rules) directly on the validated `ElectricalGraph`.
- **Safety**: Quality gates fail closed; missing prerequisites emit `NOT_EVALUABLE`.

### Stage 8: Findings Interface (`PARTIALLY_WORKING`)
- **Backend**: `/api/v1/documents/[id]/findings` returns findings with rule version, severity, status, and JSON evidence.
- **Identified Gap**: Frontend UI needs to seamlessly render server findings, provide filtering by severity and status, and display latest reviewer annotations.

### Stage 9: Visual Evidence Overlay (`PARTIALLY_WORKING`)
- **Coordinate System**: Normalized `[0, 1000]` grid across all pages.
- **Identified Gap**: `SchematicViewer` expected percentage coordinates `[0, 100]` in legacy mock diagrams. Must be updated to normalize `[0, 1000]` coordinates consistently and display "Visual evidence unavailable" when spatial coordinates are absent.

### Stage 10: Human Review Workflow (`WORKING`)
- **Route**: `POST /api/v1/findings/[id]/review`
- **Supported Dispositions**: `CONFIRMED` / `ACCEPT`, `REJECTED` / `REJECT`, `FALSE_POSITIVE`, `WAIVED`, `NEEDS_MORE_EVIDENCE`.
- **Reason Mandate**: Mandates non-empty comments for `FALSE_POSITIVE` and `WAIVED` reviews.
- **Audit**: Writes immutable `FINDING_REVIEWED` audit log with previous status, new status, reviewer ID, and timestamp.

### Stage 11: Reporting & Export (`WORKING`)
- **Route**: `POST /api/v1/documents/[id]/reports`, `GET /api/v1/reports/[id]/download`
- **Integrity**: Computes canonical SHA-256 fingerprint over report data.
- **Truthfulness**: Removes unverified certification and regulatory claims.

### Stage 12: Quota & Billing (`WORKING` / `NOT_LIVE`)
- **Quota**: Serializable atomic check reservation prevents race conditions.
- **Commercial Billing**: Razorpay integration is architecturally complete but live payment processing is marked:
  ```text
  BILLING_STATUS = NOT_LIVE
  ```
