# SpanQC Database Schema & Multi-Tenancy (Phase 4)

## Database Engine
- **Engine**: PostgreSQL 16 (Hosted on Neon Serverless)
- **ORM**: Prisma ORM v6
- **Connection Mode**: Pooled connection via `DATABASE_URL` with SSL (`sslmode=require`)

---

## Entity Relationship Model

```
Tenant (Organization)
  ├── User (Members with RBAC Roles: ADMIN, QC_ENGINEER, QC_INSPECTOR, VIEWER)
  ├── Project (Isolated workspace for drawings)
  │     └── Document (Engineering drawing)
  │           ├── DocumentVersion (Immutably hashed revision)
  │           │     ├── Component (Detected electrical components)
  │           │     │     └── Terminal (Pins / terminals on component)
  │           │     └── Connection (Wire connections between terminals)
  │           ├── DocumentPage (Per-page dimensions, text snippets, page numbers)
  │           ├── ExtractionArtifact (Raw normalized extraction, ELECTRICAL_GRAPH, QC_RULE_EXECUTION)
  │           ├── ProcessingJob (Pipeline execution log, stage, and progress)
  │           └── Finding (QC issues discovered in drawing with source evidence)
  ├── Quota (Total allowed, used, and active reservations)
  ├── Subscription (Razorpay subscription status & plan)
  └── AuditLog (Tamper-evident security and pipeline events)
```

---

## Key Phase 4 Schema Usage & Additions

### 1. `Component` Table
- `id`: UUID identifier.
- `versionId`: Foreign key to `DocumentVersion`.
- `name`: Reference designator (e.g. `J1`, `F1`, `BAT1`, `GND`).
- `type`: Classified component type (`FUSE`, `CONNECTOR`, `BATTERY`, `RELAY`, `SWITCH`, etc.).
- `partNumber`: Value rating or part code where extracted (e.g. `15A`, `12V`).
- `metadata`: JSON payload containing normalized bounding box, page number, confidence, status, and source evidence.

### 2. `Terminal` Table
- `id`: UUID identifier.
- `componentId`: Foreign key to parent `Component`.
- `name`: Terminal identifier or pin number (e.g. `1`, `2`, `P1`, or `UNKNOWN`).
- `metadata`: JSON payload containing normalized coordinates `(x, y)` and source evidence.

### 3. `Connection` Table
- `id`: UUID identifier.
- `versionId`: Foreign key to `DocumentVersion`.
- `fromTerminalId`: Foreign key to source `Terminal`.
- `toTerminalId`: Foreign key to destination `Terminal`.
- `netName`: Topological net identifier (e.g. `NET_BAT1_P1`).
- `metadata`: JSON payload containing wire geometry, net type, and confidence.

### 4. `Finding` Table
- `id`: UUID identifier.
- `documentId`: Foreign key to `Document`.
- `tenantId`: Tenant isolation foreign key.
- `ruleId`: Rule code (e.g. `RULE-001`, `RULE-002`, `RULE-005`).
- `ruleVersion`: Version of rule used (`1.0.0`).
- `category`: Category (`TOPOLOGY`, `TERMINATION`, `DESIGNATION`, `POWER_INTEGRITY`).
- `severity`: Severity level (`CRITICAL`, `MAJOR`, `MINOR`, `INFO`).
- `title` / `description`: Truthful description of the quality violation.
- `pageNumber`: 1-based page number.
- `boundingBox`: Normalized coordinates where the violation occurred.
- `status`: Lifecycle state (`OPEN`, `CONFIRMED`, `REJECTED`, `FALSE_POSITIVE`, `WAIVED`).
- `evidence`: JSON array of source evidence objects (component, terminal, wire, token references).
- `fingerprint`: Deterministic SHA-256 fingerprint.

### 5. `ExtractionArtifact` Table Extensions
- `artifactType`:
  - `PREFLIGHT_METADATA`: Page count, MediaBox, encryption status.
  - `NORMALIZED_PAGES`: Raw extracted text words, bounding boxes, vector paths.
  - `ELECTRICAL_GRAPH`: Complete canonical electrical graph JSON with `graphSha256`.
  - `QC_RULE_EXECUTION`: Rule execution audit log with timestamps, versions, and counts.

### 6. `Document.status` State Machine
Transitions from:
`READY_FOR_PREFLIGHT` $\longrightarrow$ `PREFLIGHT` $\longrightarrow$ `EXTRACTING` $\longrightarrow$ `GRAPH_BUILDING` $\longrightarrow$ `RULE_EVALUATION` $\longrightarrow$ `QC_COMPLETE` (or `FAILED`).

---

## Multi-Tenant Security Guarantee
Every query involving `Document`, `Component`, `Terminal`, `Connection`, `Finding`, `ExtractionArtifact`, and `ProcessingJob` is explicitly constrained by `where: { tenantId }` or linked directly to an authorized document version within the tenant boundary. Cross-tenant data leaks are structurally prevented at the database query layer.
