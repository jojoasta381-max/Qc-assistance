# SpanQC Automated & Manual Testing Guide

## Test Suite Overview

SpanQC features comprehensive automated test suites covering all implemented phases:

1. **`tests/truthfulness.test.ts` (Phase 1)**
   - Pricing structure and INR currency alignment.
   - Cryptographic report fingerprint integrity (SHA-256).
   - Deterministic rule evaluator derivation from standards registry.
   - Truthful terminology validation (no fake certifications).
   - AI provider router failing closed on mock provider requests in production mode.

2. **`tests/security-phase2.test.ts` (Phase 2)**
   - Authentication, password hashing, session expiration, and tampering.
   - Tenant isolation & cross-tenant header hijacking defense.
   - IDOR prevention across Documents, Findings, and Projects.
   - RBAC permissions matrix and Viewer write rejection.
   - Razorpay webhook HMAC signature validation and event deduplication.
   - Atomic quota reservation concurrency test (10 concurrent requests for 1 quota).
   - Quota refunding on processing failure.
   - SSRF protection against loopback, private IPs, cloud metadata (`169.254.169.254`), and internal DNS resolution.

3. **`tests/ingestion-phase3.test.ts` (Phase 3)**
   - Upload security: Unauthenticated, unauthorized org/project, arbitrary storage key, oversized file, unsupported MIME type.
   - Object verification: Missing object rejection, direct upload hashing, upload-complete status transition.
   - PDF preflight: True page count, MediaBox dimensions, malformed PDF rejection, encrypted PDF rejection.
   - PDF extraction: Genuine text stream extraction from actual bytes.
   - Image preflight: Sharp dimension detection, corrupt image rejection.
   - Anti-template verification: Different filenames with identical bytes yield identical results; changing bytes changes results; WH-402 is not required; synthetic templates never consulted.
   - Tenant isolation: Cross-tenant download and processing rejection.
   - End-to-end integration: Full upload -> verify -> preflight -> extract -> persist pipeline.

4. **`tests/graph-qc-phase4.test.ts` (Phase 4)**
   - Component Detection: Recognizes standard reference designators (`J1`, `F1`, `K1`, `R1`, `BAT1`, `GND`) and pin labels without templates.
   - Wire Extraction: Extracts vector lines and connects endpoints to terminals within `SNAP_TOLERANCE` (80 units).
   - Connectivity: Crossing wires without junction marker do not connect.
   - Graph Determinism: Same source bytes produce identical graph hash and topology.
   - QC Rule 001: Flags dangling wire endpoints with source evidence.
   - QC Rule 002: Flags unconnected required terminals on Fuse/Power.
   - QC Rule 003: Flags duplicate connector reference designators.
   - QC Rule 004: Flags duplicate discrete component designators.
   - QC Rule 005: Flags direct power-to-ground short circuit.
   - QC Rule 007: Flags conflicting voltage power sources on same net.
   - Anti-Template Regression: Different filenames with same bytes yield identical graph and findings.
   - Anti-Template Regression: Different bytes with same filename yield different graphs.
   - Tenant Isolation: Organization B cannot read Organization A findings.
   - End-to-End Pipeline: Real PDF uploads, builds graph, evaluates QC, persists findings.

5. **`tests/benchmark-evaluation.test.ts` (Phase 4.5)**
   - Benchmark Corpus Integrity: Truthfully reports `INSUFFICIENT_DATA` when real customer drawing corpus is incomplete; zero manufactured accuracy scores.
   - Benchmark Differential Pipeline: Evaluates simple DC loop against ground truth computing Component, Terminal, Wire, Connectivity, Net, and Finding P/R/F1.
   - Crossing/Junction Validation:
     - Case A: Wire crossing without junction maintains separate electrical nets and issues `RULE-008` ambiguity warning.
     - Case B: Wire crossing with explicit junction marker merges both wires into single electrical net.
     - Case C: Wire endpoint touching another wire (T-junction) merges according to topology.
     - Case D: Geometric snapping tolerance (snaps within 80 units; remains open beyond 80 units).
   - Raster Scanned Limitations: Pure scanned images yield `WIRE_GEOMETRY_UNAVAILABLE` diagnostic and `NOT_EVALUABLE` for wire geometry rules.
   - Quality Gates: Incomplete graph halts evaluation and prevents running rules that lack required prerequisites.
   - Bit-Identical Determinism: 3 consecutive benchmark evaluations on identical bytes yield bit-identical graph hash and findings fingerprints.
   - Tenant Isolation: Organization B cannot access Organization A benchmark findings.

6. **`tests/rule-engine-phase5.test.ts` (Phase 5)**
   - **Central Rule Registry**: Verifies dynamic registry instantiation, rule count (`20`), metadata indexing, and fail-safe retrieval.
   - **Rule Coverage (RULE-001 through RULE-020)**:
     - `RULE-001` (Dangling Wire Endpoint): Validates positive detection of floating wire ends, negative compliance on fully terminated nets, and `NOT_EVALUABLE` on missing `WIRE_GEOMETRY`.
     - `RULE-002` (Unconnected Required Terminal): Positive on unconnected fuse/power terminals, negative when wired.
     - `RULE-003` (Duplicate Connector Reference): Positive on duplicate connector designations (`J1` repeated), negative when unique.
     - `RULE-004` (Duplicate Component Reference): Positive on duplicate discrete component designations (`R1` repeated), negative when unique.
     - `RULE-005` (Direct Power-to-Ground Short): Positive when battery/VCC and chassis ground share a net, negative when separated.
     - `RULE-006` (Unresolved Terminal Connection): Positive on uncertain/unresolved terminal status.
     - `RULE-007` (Conflicting Voltage Sources): Positive on +12V and +24V sharing a net, negative on matching voltages.
     - `RULE-008` (Crossing Wire Ambiguity): Positive on 4-way crossing without junction marker, negative when junction dot exists.
     - `RULE-009` (Isolated Component): Positive on completely unwired discrete components, negative when at least one pin is wired.
     - `RULE-010` (Single-Terminal Stub Net): Positive on nets terminating at only one terminal, negative on complete nets.
     - `RULE-011` (Incompatible Voltage Domain Bridging): Positive on bridge between +12V and +5V domain components.
     - `RULE-012` (Fuse Missing In-Line Load / Dead-to-Ground): Positive on fuse tied directly to ground without a load.
     - `RULE-013` (Missing/Malformed Ref-Des): Positive on non-standard designators (`XYZ#99`), negative on standard designators (`K1`, `R1`).
     - `RULE-014` (Inconsistent Conductor Gauge Continuity): Positive on mismatched wire gauges (`12AWG` spliced to `22AWG`).
     - `RULE-015` (Isolated Floating Wire Segment): Positive on wire with neither end connected to a terminal.
     - `RULE-016` (Duplicate Terminal Identifier): Positive on duplicate terminal numbers on same component (`pin 1` repeated).
     - `RULE-017` (Half-Wired Relay Coil or Contact Set): Positive on relay with only one coil terminal wired.
     - `RULE-018` (Multi-Point Ground Regime Coupling): Positive on direct short between distinct ground regimes (`DIGITAL_GND` to `CHASSIS_GND`).
     - `RULE-019` (Missing Overcurrent Protection Rating): Positive on fuse lacking rating token, negative when rated (`15A`).
     - `RULE-020` (Connector Lacking Mating Harness Reference): Positive on unmapped connector, negative when mated.
   - **Property Invariants**:
     - *Determinism*: Identical graph yields bit-identical graph hash, finding count, rule results, and fingerprints across multiple runs.
     - *Symmetry*: Reordering component or wire arrays in the graph does not alter finding count, rule violation IDs, or severity.
     - *No Phantom Findings*: Adding unrelated, valid components does not create phantom findings on existing components.
     - *Fail-Closed Quality Gates*: Removing source hash or corrupting graph causes evaluator to return `NOT_EVALUABLE` without executing rules.
   - **Scaled Performance**:
     - Evaluates 20 rules against 50 components, 100 wires, and 25 nets in < 10ms (actual runtime ~1.5ms).
   - **Tenant Isolation Regression**:
     - Verifies findings generated for Tenant A cannot be associated with or accessed by Tenant B.

---

## Running the Automated Tests

### 1. Execute All Test Suites
```bash
npm test
```
All 104 automated tests will execute in sequence against the connected database and local storage provider.

### 2. Run TypeScript Compilation Check
```bash
npx tsc --noEmit
```

### 3. Run Linter
```bash
npm run lint
```

---

## Manual Acceptance Procedure (Novel Engineering Drawing)

To prove that SpanQC ingests completely novel engineering drawings with zero reliance on filename heuristics or hardcoded templates, run the manual acceptance test:

```bash
npx tsx scripts/manual_acceptance_phase3.ts
```

### Verification Criteria:
1. **Filename**: Uses a dynamically generated filename (`spacecraft_subsystem_schematic_<random-nonce>.pdf`) that contains no template names (`WH-402`, `MCC-VFD`, etc.).
2. **Byte Truth**: Generates a novel 861-byte PDF drawing with randomized node identifiers and dimensions.
3. **Upload Flow**: Obtains upload session, streams binary to private storage, verifies authoritative SHA-256.
4. **Preflight**: Accurately detects genuine page count (2 pages) and dimensions (1100x850pt) from PDF structure.
5. **Extraction**: Parses text streams directly from bytes into normalized coordinates (`[0, 1000]`).
6. **Persistence**: Saves `DocumentPage` and `ExtractionArtifact` records with correct SHA-256 hashes.
7. **Zero Template Consulting**: Confirms 100% genuine extraction from uploaded bytes.
