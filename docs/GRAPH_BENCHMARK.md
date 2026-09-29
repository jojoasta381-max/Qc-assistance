# SPANQC Benchmark Corpus Architecture & Evaluation Specification

## 1. Executive Summary & Benchmark Status

```
REAL_BENCHMARK_STATUS = INSUFFICIENT_DATA
```

SpanQC enforces strict terminology truthfulness and rigorous scientific benchmarking standards. Real-world proprietary engineering drawings are governed by confidentiality agreements and cannot be fabricated or simulated to claim real-world production metrics.

- **Automated Synthetic Suite**: Demonstrates 100% deterministic graph creation, crossing vs. junction topology, tolerance snapping, quality gating, rule prerequisite checking, and tenant isolation.
- **Real Customer Corpus**: As authorized customer drawings are ingested, they are registered into the benchmark corpus catalog. Until sufficient authorized samples are annotated across all 10 categories, the real benchmark status is reported authoritatively as `INSUFFICIENT_DATA`.

---

## 2. Benchmark Corpus Taxonomy (10 Categories)

The benchmark corpus architecture organizes drawings into 10 explicit categories covering vector, raster, and topological edge cases:

| ID | Category | Drawing Type | Status | Description |
|---|---|---|---|---|
| `CAT-01` | Simple Wiring Diagram | Vector PDF | TESTED | Basic DC power loop, single fuse, discrete load, chassis ground |
| `CAT-02` | Connector-Heavy Harness | Vector PDF | NOT_TESTED | Multi-pin aviation/automotive connectors (J1, P1, TB1) with pin arrays |
| `CAT-03` | Relay / Fuse Circuit | Vector PDF | NOT_TESTED | Multi-pole relays (K1, 85/86/30/87/87A) with fused branch circuits |
| `CAT-04` | Multi-Page Wiring Diagram | Vector PDF | NOT_TESTED | Schematic spanning 5+ pages with off-sheet net references |
| `CAT-05` | Wire Crossings Without Junction | Vector PDF | TESTED | Perpendicular wire crossings without junction markers (must remain separate nets) |
| `CAT-06` | Wire Crossings With Junctions | Vector PDF | TESTED | 4-way crossings with explicit junction dots and 3-way T-junctions (must merge nets) |
| `CAT-07` | Duplicate References | Vector PDF | TESTED | Intentional reference designator duplicates triggering ambiguity / collision rules |
| `CAT-08` | Ambiguous Symbols | Mixed / Vector | NOT_TESTED | Non-standard or vendor-specific schematic symbols requiring disambiguation |
| `CAT-09` | Complex Industrial Control | Vector PDF | NOT_TESTED | PLC ladder logic and 3-phase industrial control schematics |
| `CAT-10` | Scanned / Raster Drawing | Pure Raster (PNG/TIFF) | TESTED | Scanned blueprints and legacy drawings lacking vector geometry paths |

---

## 3. Machine-Readable Annotation Schema

All ground-truth benchmark targets are stored as JSON files under `benchmark/annotations/` validated against `benchmark/annotations/schema.json`.

```
benchmark/
├── annotations/
│   ├── schema.json
│   ├── simple_wiring_bench.json
│   ├── crossing_no_junction_bench.json
│   ├── crossing_with_junction_bench.json
│   ├── duplicate_ref_bench.json
│   └── raster_scanned_bench.json
├── drawings/
└── manifests/
    └── manifest.json
```

### Key Schema Elements

Each annotation document captures:
- `document`: id, filename, sourceSha256, pageCount, drawingType (`VECTOR_PDF`, `RASTER_IMAGE`, `MIXED_VECTOR_RASTER`)
- `expectedComponents`: pageNumber, type, referenceDesignator, valueRating, boundingBox { x, y, width, height }
- `expectedTerminals`: id, componentId, terminalName, position { x, y }, pageNumber
- `expectedWires`: id, pageNumber, geometry { start, end }, connectedTerminalIds
- `expectedJunctions`: point { x, y }, pageNumber, connectedWireIds
- `expectedNets`: id, name, netType, memberTerminalIds, wireIds, pageNumbers
- `expectedFindings`: id, ruleCode, pageNumber, severity, targetEntityId
- `expectedAmbiguities`: id, ambiguityType, pageNumber, entityIds

---

## 4. Benchmark Precision & Recall Metrics

Evaluation against ground-truth annotations computes:

1. **Component Detection**: Precision, Recall, F1 Score
2. **Terminal Detection**: Precision, Recall, F1 Score
3. **Wire Detection**: Precision, Recall, F1 Score
4. **Connectivity Detection**: Precision, Recall, F1 Score (snapped terminal pairs)
5. **Net Construction**: Precision, Recall, F1 Score (voltage domains & disjoint sets)
6. **Finding Detection**: Precision, Recall, F1 Score (true violations vs false alarms)
7. **System Rates**:
   - `falsePositiveRate`: $\frac{\text{FP}_{\text{comp}} + \text{FP}_{\text{term}} + \text{FP}_{\text{wire}} + \text{FP}_{\text{find}}}{\text{Total Predictions}}$
   - `falseNegativeRate`: $\frac{\text{FN}_{\text{comp}} + \text{FN}_{\text{term}} + \text{FN}_{\text{wire}} + \text{FN}_{\text{find}}}{\text{Total Expected}}$
   - `notEvaluableRate`: $\frac{\text{Findings with NOT\_EVALUABLE}}{\text{Total Findings}}$

If an annotation file is missing or a drawing category has no ground-truth data, the benchmark evaluator returns `status: "INSUFFICIENT_DATA"` rather than fabricating synthetic accuracy numbers.

---

## 5. Raster & Scanned Drawing Limitations

SpanQC explicitly tests scanned and pure raster drawings (`CAT-10`).
- When a document contains only raster images and no vector paths (`source: "ocr"`):
  - **Text tokens** are extracted via OCR provider.
  - **Vector paths** cannot be derived reliably without specialized computer-vision segmentation models.
  - SpanQC records a diagnostic `WIRE_GEOMETRY_UNAVAILABLE`.
  - Rules requiring `WIRE_GEOMETRY` (such as `RULE-001 Dangling Wire`) return status `NOT_EVALUABLE`.
  - The system **never fabricates a wire graph** on raster images.
