# SpanQC Findings & Evidence Traceability (Phase 4)

## 1. Finding Data Model & Lifecycle

Every QC finding produced by the deterministic engine is stored in the PostgreSQL `Finding` table and strictly scoped to its owning `tenantId`.

```
Finding
 ├── id: UUID
 ├── documentId: Foreign key to Document
 ├── tenantId: Foreign key to Tenant (mandatory isolation)
 ├── ruleId: Rule code (e.g. "RULE-001")
 ├── ruleVersion: Rule version string ("1.0.0")
 ├── category: "TOPOLOGY" | "TERMINATION" | "DESIGNATION" | "POWER_INTEGRITY"
 ├── severity: "CRITICAL" | "MAJOR" | "MINOR" | "INFO"
 ├── title: Short human-readable summary
 ├── description: Detailed forensic finding description
 ├── pageNumber: 1-based page number where the finding resides
 ├── boundingBox: JSON object { x, y, width, height } in [0, 1000] grid
 ├── status: "OPEN" | "CONFIRMED" | "REJECTED" | "FALSE_POSITIVE" | "WAIVED"
 ├── evidence: Array of FindingEvidence items
 ├── fingerprint: Deterministic SHA-256 fingerprint
 ├── reviewNotes: Optional engineer comments
 ├── reviewedBy: User ID of reviewer
 ├── reviewedAt: Timestamp of human review
 └── createdAt: Timestamp of generation
```

---

## 2. Evidence Traceability Chain

A finding cannot exist without direct traceability back to the underlying source document evidence.

```
Finding
  └── Evidence Reference
        ├── Source Type: TEXT | VECTOR | OCR | DIAGNOSTIC
        ├── Source ID: Word ID / Vector Path ID / Component ID
        ├── Page Number: 1-based page index
        ├── Coordinates: Normalized bounding box or point
        └── Snippet / Description: Raw extracted text token or geometry
```

### Example Evidence Chain for `RULE-002` (Unconnected Fuse Terminal):
1. **Finding**: `Unconnected terminal '2' on FUSE 'F1'`.
2. **Component Evidence**: `comp-3f2a-1-F1`, bounding box `[200, 300, 60, 20]`, source token `F1` from PDF text stream `page 1`.
3. **Terminal Evidence**: `term-comp-3f2a-1-F1-2`, position `(260, 310)`.
4. **Wire Topography**: No connected wire found within `SNAP_TOLERANCE` (80 units).
5. **Raw PDF Source**: Stream operator `(F1) Tj` at PDF coordinates `(144.0, 520.0)`.

---

## 3. Deterministic Fingerprint Integrity

Each finding computes an authoritative fingerprint:
$$\text{fingerprint} = \text{SHA-256}(\text{ruleCode} + ":" + \text{sortedEntityIds})$$

- When a document is reprocessed with identical bytes, duplicate findings are matched by their fingerprint.
- If a human engineer reviewed a finding as `CONFIRMED` or `WAIVED`, the review status can be preserved across reprocessing runs without re-flagging.

---

## 4. Multi-Tenant Review & Authorization

- Access to findings is guarded by `GET /api/v1/documents/[id]/findings`.
- Review state changes are guarded by `POST /api/v1/findings/[id]/review`.
- Only users belonging to the document's tenant organization with `QC_ENGINEER` or `ADMIN` roles can transition finding statuses.
- Cross-tenant requests to view or review findings return HTTP `404 Not Found` or `403 Forbidden`.
