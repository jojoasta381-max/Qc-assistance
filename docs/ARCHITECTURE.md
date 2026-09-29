# SpanQC Architecture Overview (Phase 4 Completed)

## System Overview

SpanQC is an enterprise-grade automated Quality Control platform for electrical schematics, harness drawings, and CAD diagrams.

```
┌─────────────────────────────────────────────────────────────┐
│                    Web Frontend (Next.js 16)                │
│       React Components • Dashboard • Document Upload UI     │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                       Next.js App Router                    │
│   • Auth Guards (`requireAuth`, `requireTenant`, `requireRole`)│
│   • Tenant Isolation Layer                                  │
│   • Atomic Quota & Billing Service                          │
│   • Ingestion & Pipeline Controllers                        │
└──────────────┬──────────────────────────────┬───────────────┘
               │                              │
               ▼                              ▼
┌──────────────────────────────┐ ┌────────────────────────────┐
│      Storage Subsystem       │ │   Ingestion & Processing   │
│ • S3 Provider / Local Vault  │ │ • Real Preflight (PDF/Img) │
│ • HMAC Signed Presigned URLs │ │ • Document Extractor       │
│ • Key Namespace Partitioning │ │ • Async Pipeline Worker    │
└──────────────┬───────────────┘ └────────────┬───────────────┘
               │                              │
               │                              ▼
               │                 ┌────────────────────────────┐
               │                 │  Electrical Graph Engine   │
               │                 │ • Ref-Des Pattern Recogn.  │
               │                 │ • Geometric Snapping       │
               │                 │ • Disjoint-Set Nets        │
               │                 │ • Deterministic QC Rules   │
               │                 └────────────┬───────────────┘
               │                              │
               ▼                              ▼
┌─────────────────────────────────────────────────────────────┐
│             Neon Serverless PostgreSQL (Prisma ORM)         │
│  Tenant • User • Project • Document • DocumentVersion       │
│  DocumentPage • ExtractionArtifact • ProcessingJob          │
│  Component • Terminal • Connection • Finding                │
│  Quota • Subscription • AuditLog                            │
└─────────────────────────────────────────────────────────────┘
```

---

## Completed Phases

### Phase 1: Product Truthfulness & Reality-Based UI
- Replaced synthetic claims, fake customer logos, and hardcoded certificates.
- Updated pricing to match INR Razorpay models (Starter: ₹4,999/mo, Professional: ₹14,999/mo, Enterprise: Custom).
- Truthful report integrity via FIPS-compliant SHA-256 fingerprints.

### Phase 2: Security & Tenant Isolation
- Cryptographic session cookies & JWT verification.
- Mandatory tenant boundary enforcement across all database queries (`tenantId`).
- RBAC permissions matrix (`ADMIN`, `QC_ENGINEER`, `QC_INSPECTOR`, `VIEWER`).
- Razorpay webhook signature validation with timestamp & replay protection.
- Atomic document check quota reservation via PostgreSQL serializable transactions.
- Defense-in-depth SSRF validator blocking loopback, RFC1918 private ranges, AWS/GCP/Azure link-local metadata endpoints (`169.254.169.254`), and internal DNS resolution.

### Phase 3: Real Document Ingestion & Private Object Storage
- Zero template fallback: removed all synthetic processing paths (`WH-402`, `CAD_DIAGRAM_TEMPLATES`, `MCC-VFD`).
- S3-compatible private object storage with HMAC-signed expiring URLs.
- Real PDF/image preflight: detects page count, MediaBox dimensions, encryption, vector/text ratio.
- Production text stream & geometry extraction normalized to `[0, 1000]` coordinate grid.
- Truthful processing state machine: `UPLOADING` -> `READY_FOR_PREFLIGHT` -> `QUEUED` -> `PREFLIGHT` -> `EXTRACTING` -> `READY_FOR_GRAPH`.
- Asynchronous processing pipeline with `ProcessingJob` tracking and error code propagation.

### Phase 4: Electrical Graph & Deterministic QC Engine
- **Normalized Coordinate System**: Canonical `[0, 1000]` top-left grid across all document pages with strict geometric tolerances (`SNAP_TOLERANCE = 80`).
- **Evidence-Backed Component Detection**: Deterministic reference-designator pattern recognition (`J`, `P`, `TB`, `F`, `K`, `S`, `R`, `D`, `LED`, `M`, `BAT`, `GND`, `POWER_SOURCE`, `SEN`, `ECU`, `SPL`) with stable content-derived IDs (`sourceSha256`). Note: symbol classification is based on text tokens, not visual symbol classification.
- **Wire Extraction & Geometric Connectivity**: Vector path extraction, endpoint-to-terminal snapping, and strict crossing ambiguity enforcement (crossings without junction markers are never connected).
- **Topological Net Construction**: Deterministic Union-Find disjoint-set clustering classifying nets as `POWER`, `GROUND`, or `SIGNAL`.
- **Deterministic Graph Fingerprinting**: Canonical JSON serialization with SHA-256 graph hashing.
- **Deterministic QC Rule Engine**: Implemented `RULE-001` through `RULE-008` (Dangling Wire, Unconnected Terminal, Duplicate Connector, Duplicate Component, Power-to-Ground Short, Unresolved Terminal, Conflicting Power Sources, Crossing Wire Ambiguity).
- **False-Positive Safety**: Evaluator prefers `NOT_EVALUABLE` over false PASS or false FAIL.
- **Persistence & Human Review**: Graph components, terminals, connections, and findings stored in PostgreSQL with complete source evidence linkage and tenant isolation. Status reaches `QC_COMPLETE`.

### Phase 4.5: Electrical Graph Validation & Real-Drawing Benchmark
- **Terminology Truthfulness**: Removed overclaiming of IEEE/ANSI graphic symbol recognition. Precisely positioned component classification as text-token pattern recognition.
- **Benchmark Corpus Taxonomy**: Established 10 standardized categories (`CAT-01` through `CAT-10`) with machine-readable annotation schema (`benchmark/annotations/schema.json`).
- **Differential Evaluation**: Mathematical calculation of Precision, Recall, and F1 for components, terminals, wires, connectivity, nets, and findings.
- **Ground-Truth Crossing/Junction Verification**: Verified behavior across non-junction crossings, junction markers, T-junctions, and snapping tolerances.
- **Scanned Blueprint Support**: Documented raster limitations; issues `WIRE_GEOMETRY_UNAVAILABLE` and returns `NOT_EVALUABLE` without hallucinating wire geometry.
- **Honest Benchmark Status**: Preserved `REAL_BENCHMARK_STATUS = INSUFFICIENT_DATA` until sufficient authorized real customer drawings are ingested across all categories.

### Phase 5: Production Deterministic QC Rule Expansion & Engineering Validation
- **Authoritative Central Rule Registry**: Single source of truth (`src/lib/qc/rule-registry.ts`) for all production QC rules. Exposes dynamic rule count (20 active rules) without hardcoded constants. All endpoints and evaluators invoke rules strictly through the registry.
- **20 Production QC Rules**: Expanded from 8 to 20 deterministic rules covering connectivity, reference integrity, net consistency, component consistency, wiring topology, and connector/harness consistency:
  - Preserved & hardened: `RULE-001` (Dangling Wire), `RULE-002` (Unconnected Terminal), `RULE-003` (Duplicate Connector), `RULE-004` (Duplicate Component), `RULE-005` (Power-to-Ground Short), `RULE-006` (Unresolved Terminal), `RULE-007` (Conflicting Power Sources), `RULE-008` (Crossing Wire Ambiguity).
  - New production rules: `RULE-009` (Isolated Component), `RULE-010` (Single-Terminal Stub Net), `RULE-011` (Incompatible Voltage Domain Bridging), `RULE-012` (Fuse Missing In-Line Load / Dead-to-Ground), `RULE-013` (Missing/Malformed Ref-Des), `RULE-014` (Inconsistent Conductor Gauge Continuity), `RULE-015` (Isolated Floating Wire Segment), `RULE-016` (Duplicate Terminal Identifier on Component), `RULE-017` (Half-Wired Relay Coil or Contact Set), `RULE-018` (Multi-Point Ground Regime Coupling), `RULE-019` (Missing Overcurrent Protection Rating), `RULE-020` (Connector Lacking Mating Harness Reference).
- **Semantics & False-Positive Prevention**: Every rule declares strict prerequisite capabilities (`WIRE_GEOMETRY`, `TERMINAL_DETECTION`, `COMPONENT_CLASSIFICATION`, `NET_CONSTRUCTION`, `POWER_CLASSIFICATION`, `GROUND_CLASSIFICATION`, etc.). If prerequisites are unmet, rules evaluate to `NOT_EVALUABLE` with clear engineering rationale rather than silent false passes or false alarms.
- **Complete Finding Evidence Linkage**: Findings identify exact graph object IDs (`componentId`, `terminalId`, `wireId`, `netId`), normalized bounding boxes, page numbers, and structured diagnostic context.
- **Cryptographic Provenance**: End-to-end chain from Document SHA-256 -> Extraction -> Canonical Graph Hash -> Rule Version -> Finding Fingerprint (`SHA-256(ruleId + version + targetIds + page)`).
- **Quality Gates & Fail-Closed Safety**: Incomplete graphs or missing extraction artifacts fail closed; rules never evaluate on unverified structures.
- **Full Persistence Lifecycle**: Unverifiable findings persist with status `NEEDS_MORE_EVIDENCE` for engineering review; verified violations persist as `OPEN`. All database operations enforce strict tenant isolation (`tenantId`).
- **Comprehensive Test Matrix**: 104 automated tests passing across the entire repository (30 tests dedicated to Phase 5 covering positive, negative, boundary, edge cases, invariants, scaled performance, and security regressions).
