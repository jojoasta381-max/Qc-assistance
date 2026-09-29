# SpanQC Customer Pilot Specification & Operating Boundary

## 1. Pilot Purpose & Scope

SpanQC is an **AI-assisted quality checking system** designed to help electrical and harness engineers review wiring diagrams more efficiently while keeping engineers firmly in control.

The customer pilot provides a controlled evaluation environment for engineering teams to validate automated schematic quality checking on supported drawings.

```
REAL_BENCHMARK_STATUS = INSUFFICIENT_DATA
```
*SpanQC does not claim formal third-party certification, regulatory compliance guarantees, or autonomous engineering sign-off. Human engineering review of all findings remains mandatory.*

---

## 2. Supported Document Scope

The customer pilot supports engineering diagrams satisfying the following technical profile:

| Parameter | Supported Scope |
|---|---|
| **File Format** | Vector PDF (`application/pdf`) with extractable vector path geometry and text streams |
| **Page Count** | 1 to 5 pages per document |
| **Max File Size** | Up to 50 MB per file |
| **Drawing Standards** | Orthogonal wiring schematics, harness interconnect diagrams, point-to-point pinout sheets |
| **Coordinate System** | Scaled to canonical normalized `[0, 1000]` grid |
| **Reference Designators** | Standard IEEE/ANSI/ASME Y14.44 ref-des prefixes: `J`, `P`, `TB`, `F`, `K`, `S`, `R`, `D`, `LED`, `M`, `BAT`, `GND`, `SEN`, `ECU`, `SPL` |
| **Terminal Identifiers** | Numbered or alphanumeric pin numbers adjacent to component bounding boxes |

---

## 3. Unsupported Document Scope

The following document types are explicitly **out of scope** for the Phase 5.5 pilot:

1. **Pure Scanned / Raster Blueprints**: Bitmaps without vector line geometry (`PNG`, `JPEG`, scanned legacy paper drawings). Text is extracted via OCR, but vector wire geometry returns `NOT_EVALUABLE` (`WIRE_GEOMETRY_UNAVAILABLE`).
2. **Encrypted or Password-Protected PDFs**: Rejected at preflight with safe error notification.
3. **Hand-Drawn Field Sketches**: Unstructured informal sketches without machine-readable text or vector commands.
4. **Unlabelled Visual Glyphs**: Schematic symbols lacking text labels or ref-des annotations (optical glyph recognition without text is not supported in Phase 5.5).
5. **Complex 3D CAD Models**: SolidWorks, CATIA, or STEP files (drawings must be exported to 2D vector PDF format).

---

## 4. Supported QC Rules (Active 20-Rule Catalog)

All pilot evaluations execute through the central `RuleRegistry`:

1. `RULE-001`: Dangling Wire Endpoint (`HIGH`)
2. `RULE-002`: Unconnected Required Terminal (`HIGH`)
3. `RULE-003`: Duplicate Connector Reference (`CRITICAL`)
4. `RULE-004`: Duplicate Component Reference (`CRITICAL`)
5. `RULE-005`: Direct Power-to-Ground Short Circuit (`CRITICAL`)
6. `RULE-006`: Unresolved Terminal Connection (`MEDIUM`)
7. `RULE-007`: Conflicting Voltage Power Sources (`CRITICAL`)
8. `RULE-008`: Crossing Wire Ambiguity Without Junction Marker (`MEDIUM`)
9. `RULE-009`: Isolated Unconnected Discrete Component (`HIGH`)
10. `RULE-010`: Single-Terminal Stub Net (`MEDIUM`)
11. `RULE-011`: Incompatible Voltage Domain Bridging (`CRITICAL`)
12. `RULE-012`: Fuse Missing In-Line Load / Dead-to-Ground (`CRITICAL`)
13. `RULE-013`: Missing or Malformed Reference Designator (`LOW`)
14. `RULE-014`: Inconsistent Conductor Gauge Continuity (`MEDIUM`)
15. `RULE-015`: Isolated Floating Wire Segment (`MEDIUM`)
16. `RULE-016`: Duplicate Terminal Identifier on Component (`HIGH`)
17. `RULE-017`: Half-Wired Relay Coil or Contact Set (`HIGH`)
18. `RULE-018`: Multi-Point Ground Regime Coupling (`CRITICAL`)
19. `RULE-019`: Missing Overcurrent Protection Rating (`MEDIUM`)
20. `RULE-020`: Connector Lacking Mating Harness Reference (`LOW`)

---

## 5. Mandatory Human Review Requirement

SpanQC is designed to augment, not replace, professional engineering judgement:
- Every finding is delivered in state `UNREVIEWED` (or `NEEDS_MORE_EVIDENCE` if graph prerequisites were incomplete).
- A qualified engineer must review and dispose each finding:
  - `CONFIRMED` / `ACCEPT`: Engineer confirms the finding represents a genuine schematic issue.
  - `REJECTED` / `REJECT`: Engineer determines the flagged condition is acceptable for design intent.
  - `FALSE_POSITIVE`: Engineer flags the detection as an algorithmic false positive (mandatory reason required).
  - `WAIVED`: Engineer grants an approved engineering variance or waiver (mandatory reason required).
- All dispositions are immutably logged with user identity and timestamp.

---

## 6. Data Confidentiality & Tenant Protection

1. **Private Object Storage**: Drawings are stored in isolated private object storage buckets under tenant-partitioned namespaces (`organizations/<tenantId>/...`).
2. **Zero Cross-Tenant Leakage**: All database queries enforce tenant isolation at the SQL level.
3. **No Model Training on Customer Data**: Customer drawings and schematics are never used to train or fine-tune external machine learning models.
4. **Cryptographic Provenance**: Every generated report includes SHA-256 fingerprints linking the source drawing, graph, rule execution, and review decisions.

---

## 7. Pilot Success Criteria

The pilot is considered successful when the customer verifies:
1. Seamless project creation and document upload without technical errors.
2. Accurate extraction of component reference designators and pin connections on supported vector drawings.
3. Rapid deterministic QC rule execution ($< 2$ seconds per page).
4. Direct visual pinpointing of detected discrepancies on the schematic canvas.
5. Frictionless human review and disposition logging.
6. Export of verifiable, cryptographically sealed inspection reports (Excel and PDF).
