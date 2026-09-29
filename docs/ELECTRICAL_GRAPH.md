# SpanQC Electrical Graph Architecture (Phase 4)

## 1. Overview & Objective

The SpanQC Electrical Graph is an auditable, deterministic topological representation of an electrical schematic or harness drawing. It is constructed strictly from:
- Real extracted text tokens and bounding boxes
- Real vector line geometry and coordinate streams
- Real raster/OCR evidence
- Real page dimensions

Under no circumstances is any graph element derived from:
- Filenames or file paths
- Template IDs (`WH-402`, `CAD_DIAGRAM_TEMPLATES`, `MCC-VFD`)
- Hardcoded component lists or synthetic coordinates
- Static fixture selection

The core invariant of the pipeline is:
$$\text{SOURCE BYTES} \longrightarrow \text{EXTRACTION} \longrightarrow \text{ELECTRICAL GRAPH} \longrightarrow \text{QC}$$

---

## 2. Normalized Coordinate System

To ensure geometric operations remain deterministic and independent of arbitrary PDF DPI or display scaling, all coordinates are projected onto a canonical normalized grid:

- **Origin**: Top-Left `(0, 0)`
- **X Direction**: Positive rightward `[0, 1000]`
- **Y Direction**: Positive downward `[0, 1000]`
- **Dimensions**: Both axes scale from `0` to `1000` regardless of the page's original physical dimensions or aspect ratio.

### Conversion Formulas

Given original page dimensions $W_{\text{orig}}$ and $H_{\text{orig}}$, a point $(x, y)$ in original page units is converted to normalized point $(x_n, y_n)$ by:
$$x_n = \text{round}\left(\frac{x}{W_{\text{orig}}} \times 1000\right)$$
$$y_n = \text{round}\left(\frac{y}{H_{\text{orig}}} \times 1000\right)$$

Bounding boxes are represented as `{ x, y, width, height }` where $(x, y)$ defines the top-left corner on the normalized grid.

### Geometric Tolerances
- **Snap Radius (`SNAP_TOLERANCE`)**: `80` normalized units. Endpoints within this radius of a terminal snap to establish a connection.
- **Collinear Tolerance**: `5` normalized units for line segment alignment.
- **Perpendicular Tolerance**: `5` normalized units for crossing analysis.

---

## 3. Graph Data Model

The graph structure is defined in `src/lib/graph/electrical-graph-models.ts`:

```
ElectricalGraph
 ├── documentId
 ├── versionId
 ├── graphVersion ("1.0.0")
 ├── graphSha256 (Canonical SHA-256 fingerprint)
 ├── pages: GraphPage[]
 ├── components: GraphComponent[]
 ├── terminals: GraphTerminal[]
 ├── wires: GraphWire[]
 ├── connectors: GraphConnector[]
 ├── nets: GraphNet[]
 └── diagnostics: GraphDiagnostic[]
```

### Entity Specifications

1. **`GraphComponent`**
   - `id`: Stable deterministic identifier (e.g. `comp-<hash>-<page>-<refDes>`).
   - `type`: Classified component type (`FUSE`, `RELAY`, `SWITCH`, `RESISTOR`, `DIODE`, `LED`, `MOTOR`, `BATTERY`, `GROUND`, `POWER_SOURCE`, `SENSOR`, `ECU_MODULE`, `CONNECTOR`, `SPLICE`, `UNKNOWN_COMPONENT`).
   - `referenceDesignator`: Extracted ref-des (e.g. `F1`, `K1`, `R12`, `J1`, `BAT1`).
   - `valueRating`: Optional extracted value (e.g. `15A`, `12V`, `100R`).
   - `pageNumber`: Document page index (1-based).
   - `boundingBox`: Normalized bounding box.
   - `confidence`: Confidence score (`0.0` to `1.0`).
   - `status`: Certainty state (`CONFIRMED`, `PROBABLE`, `UNCERTAIN`, `UNRESOLVED`).
   - `sourceEvidenceId`: Direct reference to underlying `ExtractedWord` or `ExtractedVectorPath`.

2. **`GraphTerminal`**
   - `id`: Deterministic terminal ID (e.g. `term-<compId>-<terminalName>`).
   - `componentId`: Parent component ID.
   - `terminalName`: Pin number or terminal identifier (e.g. `1`, `2`, `P1`, `A1`, or `UNKNOWN`).
   - `position`: Normalized `Point2D` coordinate.
   - `pageNumber`: Document page index.
   - `status`: Certainty state (`CONFIRMED`, `PROBABLE`, `UNCERTAIN`, `UNRESOLVED`).
   - `evidence`: Source evidence reference.

3. **`GraphWire`**
   - `id`: Deterministic wire ID (e.g. `wire-<hash>-<page>-<idx>`).
   - `pageNumber`: Document page index.
   - `geometry`: Path coordinates (`start`, `end`, and optional `intermediatePoints`).
   - `connectedTerminalIds`: Array of snapped terminal IDs.
   - `confidence`: Geometric confidence score.
   - `status`: Certainty state.
   - `sourceEvidenceId`: Source vector path ID.

4. **`GraphConnector`**
   - Specialized projection of multi-pin `CONNECTOR` components, tracking pin lists and mating types.

5. **`GraphNet`**
   - `id`: Deterministic net ID (e.g. `net-<hash>-<idx>`).
   - `name`: Auto-assigned or text-derived net name (e.g. `NET_BAT1_P1`, `NET_GND`).
   - `netType`: Net classification (`POWER`, `GROUND`, `SIGNAL`, `UNKNOWN`).
   - `memberTerminalIds`: All terminals topologically connected to this net.
   - `memberComponentIds`: All components connected to this net.
   - `wireIds`: All wire segments forming this net.
   - `pageNumbers`: All pages traversed by this net.
   - `confidence`: Connectivity confidence.

6. **`GraphDiagnostic`**
   - Pre-QC graph sanity diagnostics (`DANGLING_WIRE`, `DISCONNECTED_TERMINAL`, `DUPLICATE_DESIGNATOR`, `CROSSING_AMBIGUITY`, `UNRESOLVED_SYMBOL`).

---

## 4. Component & Terminal Detection Pipeline

Implemented in `src/lib/graph/component-detector.ts`:

1. **Reference Designator Recognition**:
   - Evaluates extracted words against standard reference-designator patterns (e.g. J, P, TB, F, K, S, R, D, LED, M, BAT, GND, POWER_SOURCE, SEN, ECU, SPL). Note: this operates strictly via text token pattern matching, NOT optical symbol recognition of graphical glyphs:
     - Connectors: `J\d+`, `P\d+`, `TB\d+`, `CONN\d+`
     - Fuses: `F\d+`, `FUSE\d+`
     - Relays: `K\d+`, `RL\d+`, `RELAY\d+`
     - Switches: `S\d+`, `SW\d+`
     - Resistors: `R\d+`
     - Diodes & LEDs: `D\d+`, `LED\d+`
     - Motors: `M\d+`, `MOT\d+`
     - Batteries & Power: `BAT\d+`, `BATT\d+`, `VCC`, `VDD`, `\+12V`, `\+24V`, `\+5V`, `\+48V`
     - Ground: `GND`, `GROUND`, `EARTH`, `CHASSIS`
     - Sensors & ECUs: `SEN\d+`, `ECU\d+`, `MOD\d+`
     - Splices: `SPL\d+`, `SPLICE\d+`

2. **Deterministic Spatial Association**:
   - **Values & Ratings**: Nearby value tokens (e.g. `15A`, `12V`, `10k`) within 180 normalized units are associated with components, prioritizing same-line tokens. Claimed value tokens are tracked to prevent duplicate assignment across adjacent components.
   - **Pin Numbers**: Nearby numeric or alphanumeric pin labels within 60 normalized units are attached as confirmed terminals.
   - **Default Terminals**: When explicit pin numbers are not labeled on discrete two-terminal components (e.g. `FUSE`, `RESISTOR`), default terminals `1` and `2` are generated at calculated bounding box boundary positions.
   - **Self-Short Prevention**: Terminals belonging to the same component are explicitly barred from being bridged by synthetic or inferred wires.

---

## 5. Wire Extraction & Geometric Connectivity Engine

Implemented in `src/lib/graph/wire-connectivity-engine.ts`:

1. **Vector Wire Extraction**:
   - Extracts vector paths from PDF/SVG geometry (`line`, `path`, or `poly`).
   - Evaluates start and end coordinates, normalizing to the canonical `[0, 1000]` grid.

2. **Endpoint-to-Terminal Snapping**:
   - Computes Euclidean distance $d = \sqrt{(x_1 - x_2)^2 + (y_1 - y_2)^2}$.
   - If $d \le \text{SNAP\_TOLERANCE}$ (80 units), the wire endpoint is connected to the terminal.

3. **Crossing vs. Junction Rule (CRITICAL)**:
   - A geometric crossing of two wires is **NEVER** automatically treated as an electrical connection.
   - An electrical connection requires either:
     - An explicit junction marker (e.g. dot or junction evidence)
     - Coincident endpoints
   - Perpendicular intersections without junction evidence are classified as crossings and flagged as `CROSSING_AMBIGUITY` diagnostics for inspection.

4. **Net Construction via Disjoint-Set Union (Union-Find)**:
   - Initializes a disjoint-set forest over all terminals and wire segments.
   - For every connected wire-terminal and wire-wire junction, performs `union(a, b)`.
   - Collates connected components into `GraphNet` instances with stable content-derived IDs.
   - Classifies net types as `POWER` (contains power/battery/VCC terminals), `GROUND` (contains ground terminals), or `SIGNAL`.

---

## 6. Graph Determinism & Canonical Fingerprinting

Same source bytes **MUST** produce:
- Identical graph IDs (derived from `sourceSha256`, page numbers, and entity tokens)
- Identical topology and connectivity
- Identical net memberships
- Identical SHA-256 fingerprint

### Fingerprint Calculation
The graph is serialized into a canonical JSON representation (keys sorted alphabetically, arrays sorted deterministically) and hashed:
$$\text{graphSha256} = \text{SHA-256}(\text{canonicalJson(ElectricalGraph)})$$

This hash is stored in the database alongside `sourceSha256`, guaranteeing end-to-end auditability and reproducibility.

---

## 7. Graph Quality Gates

Before an `ElectricalGraph` is admitted to downstream deterministic rule evaluation, it must satisfy minimum quality gates (`checkQualityGates` in `src/lib/qc/rule-evaluator.ts`):

1. **Source Integrity**: Authoritative source SHA-256 exists.
2. **Extraction Validity**: Document extraction succeeded with at least 1 valid page.
3. **Graph Integrity**: Graph version and cryptographic `graphSha256` exist.
4. **No Fatal Diagnostics**: Graph does not contain fatal corruption or unresolvable parser errors.

If quality gates fail, downstream rules that depend on the missing prerequisites evaluate to `NOT_EVALUABLE` instead of manufacturing false PASS or FAIL verdicts.

---

## 8. Rule Prerequisites

Each QC rule declares required graph prerequisites via `rule.prerequisites`:

- `WIRE_GEOMETRY`: Requires vector line segments. Missing in scanned/raster drawings.
- `TERMINAL_DETECTION`: Requires extracted or inferred component pin positions.
- `COMPONENT_CLASSIFICATION`: Requires classified reference designators.
- `NET_CONSTRUCTION`: Requires topological netlist assembly via Disjoint-Set Union.
- `POWER_CLASSIFICATION`: Requires power rail / VCC identification.
- `GROUND_CLASSIFICATION`: Requires ground / chassis reference identification.
- `CROSSING_DETECTION`: Requires line crossing analysis and intersection detection.
- `TEXT_TOKENS`: Requires extracted OCR or vector text tokens and bounding boxes.

If any prerequisite is missing from the graph, the rule evaluator returns `NOT_EVALUABLE` with an explicit reason explanation. As of Phase 5, all 20 production rules strictly declare their prerequisites and fail closed if they are missing.

---

## 9. Raster & Scanned Drawing Limitations

Pure raster and scanned blueprints lack vector command streams:
- `document-extractor.ts` detects raster pages without vector paths and routes them through the OCR engine for text extraction.
- In `electrical-graph-builder.ts`, if OCR is used and no vector wire paths are found, a diagnostic `WIRE_GEOMETRY_UNAVAILABLE` is recorded.
- Rules requiring `WIRE_GEOMETRY` (such as `RULE-001 Dangling Wire`) return `NOT_EVALUABLE`.
- SpanQC never invents or hallucinates synthetic wire geometry on raster drawings.

---

## 10. Confidence Semantics (Engineering Heuristics)

Confidence scores (e.g. `0.95`, `0.75`, `0.40`) and certainty states:
- `CONFIRMED`: Geometric snapping or explicit token association succeeded within nominal tolerance.
- `PROBABLE`: Entity was inferred through standard discrete component heuristics (e.g. default 2-pin assumption).
- `UNCERTAIN`: Proximity association is ambiguous or multiple candidates exist.
- `UNRESOLVED`: Entity is referenced but disconnected or unverified.

**Important Note**: These confidence values are deterministic engineering heuristics, not externally validated Bayesian or statistical probabilities. No statistical calibration is claimed.
