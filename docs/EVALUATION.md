# SPANQC Benchmark Evaluation & Differential Testing Specification

## 1. Differential Testing Pipeline

The evaluation harness implements an automated, differential testing loop that tests each document from raw source bytes through the entire graph pipeline down to rule evaluation and ground-truth comparison:

```
Source Bytes
    │
    ▼
Document Extractor (PDF Text, Vector Paths, OCR)
    │
    ▼
ElectricalGraph Builder (Component, Terminal, Wire, Net construction)
    │
    ▼
Graph Quality Gates Check (Fatal diagnostics, minimum entity counts)
    │
    ▼
Production Rule Evaluator (Prerequisite checking, deterministic rules)
    │
    ▼
Benchmark Evaluator (Comparison against BenchmarkAnnotation)
    │
    ▼
Machine-Readable BenchmarkResult (P/R/F1, FPR, FNR, NOT_EVALUABLE Rate)
```

---

## 2. Mathematical Metric Definitions

For each entity class $C \in \{\text{Components}, \text{Terminals}, \text{Wires}, \text{Nets}, \text{Findings}\}$:

$$\text{Precision} = \frac{\text{TP}}{\text{TP} + \text{FP}} \quad (\text{1.0 if } \text{TP} + \text{FP} = 0)$$

$$\text{Recall} = \frac{\text{TP}}{\text{TP} + \text{FN}} \quad (\text{1.0 if } \text{TP} + \text{FN} = 0)$$

$$\text{F1 Score} = \frac{2 \cdot \text{Precision} \cdot \text{Recall}}{\text{Precision} + \text{Recall}} \quad (\text{0.0 if } \text{Precision} + \text{Recall} = 0)$$

### Error Rates

- **False Positive Rate (FPR)**:
  $$\text{FPR} = \frac{\sum \text{FP}}{\text{Total Predicted Entities}}$$

- **False Negative Rate (FNR)**:
  $$\text{FNR} = \frac{\sum \text{FN}}{\text{Total Expected Entities}}$$

- **NOT_EVALUABLE Rate**:
  $$\text{NER} = \frac{\text{Count of findings with status NOT\_EVALUABLE}}{\text{Total findings evaluated}}$$

---

## 3. Crossing vs. Junction Ground-Truth Validation

The benchmark defines 5 explicit topological test cases:

### Case A: Wire Crossing Without Junction Marker
- **Input**: Two vector lines intersecting at $(x, y)$ with no junction dot or marker.
- **Expected Graph**: Two separate nets. Neither wire connects to the other.
- **Expected Finding**: `RULE-008` ambiguity warning recorded for review.

### Case B: Wire Crossing With Explicit Junction Marker
- **Input**: Two vector lines intersecting at $(x, y)$ with an explicit junction dot or marker ($\le 25$ units from intersection).
- **Expected Graph**: Both crossing wires are merged into the same electrical net (`dsu.union(w1, w2)`).
- **Expected Finding**: No ambiguity finding; legitimate node connection.

### Case C: Wire Endpoint Touching Another Wire (T-Junction)
- **Input**: Wire 2 terminates with an endpoint on Wire 1's line segment ($\le 5$ units).
- **Expected Graph**: Connected according to defined topology. Both wires merge into the same electrical net.

### Case D: Small Geometric Gap (Tolerance Snapping)
- **Input**: Wire endpoint is located near a terminal.
- **Specification**:
  - Distance $\le 80$ normalized units (8% of page dimension): wire endpoint snaps to terminal.
  - Distance $> 80$ normalized units: wire remains open and disconnected.

### Case E: Ambiguous Crossing / Missing Geometry
- **Input**: Scanned raster drawing or corrupt vector paths where crossing topology cannot be determined.
- **Specification**: Graph issues `WIRE_GEOMETRY_UNAVAILABLE`. Rules requiring wire geometry return `NOT_EVALUABLE`.

---

## 4. Quality Gates & Failure Modes

Before running deterministic QC rules, the graph must pass minimum quality gates:

1. **Source Hash Match**: The input document SHA-256 is authoritative.
2. **Extraction Success**: At least one page extracted with non-zero dimensions.
3. **No Fatal Graph Diagnostics**: No fatal errors encountered during parsing.
4. **Canonical Graph Hash**: Content-derived cryptographic SHA-256 generated.

If quality gates fail:
- Rules requiring missing prerequisites return `NOT_EVALUABLE`.
- The engine never fabricates a PASS or FAIL result.
