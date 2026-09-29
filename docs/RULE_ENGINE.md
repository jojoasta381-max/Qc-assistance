# SpanQC Production Deterministic QC Rule Engine (Phase 5)

## 1. Overview & Architectural Principles

The SpanQC Deterministic QC Rule Engine evaluates quality rules directly and exclusively against the normalized, auditable `ElectricalGraph` and its validated derived data structures.

### Strict Operational Principles
1. **Authoritative Graph Sole Input**: Rules NEVER consume raw PDF byte streams directly, re-parse PDF syntax independently, parse arbitrary document text outside graph models, or create competing graph representations.
2. **False-Positive Safety & `NOT_EVALUABLE`**: In accordance with aerospace and automotive electrical engineering QC practices, rules fail closed. When input evidence or declared graph prerequisites are missing, the system emits `NOT_EVALUABLE` with an explicit reason rather than converting uncertainty into a fabricated `PASS`.
3. **Evidence Traceability**: Every finding references concrete graph entity IDs (`componentIds`, `terminalIds`, `wireIds`, `netIds`), source evidence references, and normalized bounding boxes. Generic or unfalsifiable findings are forbidden.
4. **Deterministic Fingerprints**: Every finding carries a cryptographically reproducible SHA-256 fingerprint:
   $$\text{fingerprint} = \text{SHA-256}(\text{ruleCode} + ":" + \text{sortedEntityIds})$$
   Evaluating identical graph representations produces bit-identical findings, severities, and fingerprints across multiple runs.
5. **Central Rule Registry**: All production rules are registered in a single authoritative central registry (`src/lib/qc/rule-registry.ts`). No hidden rules exist outside this registry, and rule counts in APIs, UIs, and documentation are dynamically derived.
6. **Strict AI Boundary**: AI, LLMs, and computer vision models are strictly prohibited from deciding rule outcomes, overriding graph topology, or inventing findings. All QC evaluations remain 100% deterministic.

---

## 2. Central Rule Registry & Dynamic Derivation

Production rules are managed through `src/lib/qc/rule-registry.ts`:

- **Dynamic Count**: Derived via `getRuleRegistry().getRuleCount()` (currently **20 active rules**).
- **Execution Endpoint**: `/api/qc/rules?type=deterministic` provides complete metadata, prerequisites, and documentation references for all registered rules.
- **Fail-Closed Gatekeeper**: The evaluator enforces minimum graph quality gates (`sourceVerified`, `extractionSuccessful`, `graphCreated`, `!hasFatalDiagnostics`, `requiredEvidenceAvailable`, `graphHashGenerated`) before executing any rule.

---

## 3. Prerequisite Matrix & Quality Gates

Each rule declares its required graph capabilities from the set:
- `WIRE_GEOMETRY`: Vector wire paths with orthogonal segments and snapped endpoints.
- `TERMINAL_DETECTION`: Extracted pins, studs, or component connection nodes.
- `COMPONENT_CLASSIFICATION`: Reference designator extraction and component classification.
- `NET_CONSTRUCTION`: Union-Find electrical net connectivity.
- `POWER_CLASSIFICATION`: Identified power supplies, batteries, or voltage rails.
- `GROUND_CLASSIFICATION`: Identified ground symbols (chassis, earth, digital).

If any prerequisite is unsatisfied, evaluation terminates immediately for that rule with status `NOT_EVALUABLE`.

---

## 4. Comprehensive Production Rule Catalog (RULE-001 through RULE-020)

### RULE-001: Dangling Wire Endpoint
- **Version**: `1.0.0`
- **Severity**: `MAJOR`
- **Category**: Wiring Topology
- **Standard Clause**: IPC/WHMA-A-620 §4.1
- **Prerequisites**: `['WIRE_GEOMETRY']`
- **Purpose**: Detects open-ended wire conductors that fail to terminate at any component terminal, connector pin, or wire junction.
- **Engineering Interpretation**: In production wire harnesses, floating conductor ends cause intermittent shorts, moisture ingress, and vibration failures. Every wire must terminate at a physical terminal or splice junction.
- **Algorithm**: Inspects each `GraphWire`. If either endpoint has no connected terminal (`connectedTerminalIds.length === 0`) and is not an explicit T-junction or crossing junction, flags the wire.
- **Evidence Emitted**: `wireIds: [wire.id]`, bounding box enclosing wire geometry, page number, SHA-256 fingerprint.
- **NOT_EVALUABLE Condition**: Triggered when `WIRE_GEOMETRY` is absent (e.g. raster scanned image).
- **Test Coverage**: Positive floating wire case, negative two-terminal connected wire case, determinism tests.

---

### RULE-002: Unconnected Required Terminal
- **Version**: `1.0.0`
- **Severity**: `CRITICAL`
- **Category**: Component Connectivity
- **Standard Clause**: UL 508A §14.1, IPC/WHMA-A-620 §13.1
- **Prerequisites**: `['COMPONENT_CLASSIFICATION', 'TERMINAL_DETECTION']`
- **Purpose**: Flags active discrete electrical components whose essential electrical terminals have no connecting conductors.
- **Engineering Interpretation**: Critical safety and operational components (`FUSE`, `POWER_SOURCE`, `BATTERY`, `RELAY`, `SWITCH`) cannot function with floating terminals. An unconnected fuse terminal leaves the downstream circuit completely unpowered.
- **Algorithm**: Collects all terminal IDs attached to wires. For critical component classifications, verifies that every declared terminal is present in the connected set.
- **Evidence Emitted**: `componentIds: [comp.id]`, `terminalIds: [term.id]`, bounding boxes, source token references, SHA-256 fingerprint.
- **NOT_EVALUABLE Condition**: Missing component classification or terminal detection.
- **Test Coverage**: Positive unattached fuse terminal, negative fully wired circuit, determinism tests.

---

### RULE-003: Duplicate Connector Reference Designator
- **Version**: `1.0.0`
- **Severity**: `CRITICAL`
- **Category**: Reference Integrity
- **Standard Clause**: ASME Y14.44 §3.1
- **Prerequisites**: `['COMPONENT_CLASSIFICATION']`
- **Purpose**: Detects multiple distinct connector headers or terminal blocks sharing the identical reference designator.
- **Engineering Interpretation**: Connectors serve as physical harness interfaces. Duplicate designators (e.g. two physical parts labelled `J1`) create fatal assembly ambiguities during harness fabrication and wiring pin-out testing.
- **Algorithm**: Groups all components of type `CONNECTOR` and `TERMINAL_BLOCK` (as well as `graph.connectors`) by normalized uppercase reference. Flags any group with cardinality $> 1$.
- **Evidence Emitted**: `componentIds: [comp1.id, comp2.id, ...]`, bounding boxes for each duplicate instance, page numbers, SHA-256 fingerprint.
- **NOT_EVALUABLE Condition**: Missing component classification.
- **Test Coverage**: Duplicate `J1` positive case, distinct `J1`/`J2` negative case, multi-page duplicates.

---

### RULE-004: Duplicate Component Reference Designator
- **Version**: `1.0.0`
- **Severity**: `MAJOR`
- **Category**: Reference Integrity
- **Standard Clause**: ASME Y14.44 §2.1
- **Prerequisites**: `['COMPONENT_CLASSIFICATION']`
- **Purpose**: Flags duplicate reference designators on discrete components within the same schematic page.
- **Engineering Interpretation**: Discrete components (`R1`, `K1`, `F1`, etc.) must have globally unique designators to avoid bill-of-materials (BOM) mismatch and wiring confusion.
- **Algorithm**: Builds a composite key `${pageNumber}:${label.toUpperCase()}` across non-connector discrete components. Flags any collision where multiple distinct components share the key.
- **Evidence Emitted**: `componentIds: [comp1.id, comp2.id]`, bounding boxes, source text tokens, SHA-256 fingerprint.
- **NOT_EVALUABLE Condition**: Missing component classification.
- **Test Coverage**: Duplicate `K1` relay positive case, distinct `K1`/`K2` negative case.

---

### RULE-005: Direct Power-to-Ground Short Circuit
- **Version**: `1.0.0`
- **Severity**: `CRITICAL`
- **Category**: Electrical Net Consistency
- **Standard Clause**: UL 508A §15.2, NFPA 79 §7.2
- **Prerequisites**: `['NET_CONSTRUCTION', 'POWER_CLASSIFICATION', 'GROUND_CLASSIFICATION']`
- **Purpose**: Detects electrical nets that directly couple a power rail/source and ground with zero intervening load impedance.
- **Engineering Interpretation**: A direct topological short between power and ground causes catastrophic overcurrent, blown fuses, conductor melting, or battery thermal runaway upon energization.
- **Algorithm**: Scans each `GraphNet`. Identifies member components classified as `POWER_SOURCE` or `BATTERY` and member components classified as `GROUND`. If both exist on the same net with no load, flags a `CRITICAL` violation.
- **Evidence Emitted**: `netIds: [net.id]`, `componentIds: [...powerIds, ...groundIds]`, terminal IDs, wire IDs, SHA-256 fingerprint.
- **NOT_EVALUABLE Condition**: Graph lacks `NET_CONSTRUCTION`, `POWER_CLASSIFICATION`, or `GROUND_CLASSIFICATION`.
- **Test Coverage**: Positive short net case, negative power/ground separated nets case, missing ground prerequisite case.

---

### RULE-006: Unresolved Terminal Connection
- **Version**: `1.0.0`
- **Severity**: `ADVISORY`
- **Category**: Extraction & Detection Uncertainty
- **Standard Clause**: IPC/WHMA-A-620 §19.5
- **Prerequisites**: `['TERMINAL_DETECTION']`
- **Purpose**: Flags active wire connections attached to uncertain, unverified, or low-confidence terminal pins.
- **Engineering Interpretation**: Wires connected to uncertain pin identifiers (e.g. OCR confidence $< 0.60$ or `UNKNOWN` pin name) require engineer verification to ensure correct pin assignments.
- **Algorithm**: Identifies terminals with status `UNRESOLVED` or name `UNKNOWN` that have connecting wires attached.
- **Evidence Emitted**: `terminalIds: [term.id]`, `componentIds: [term.componentId]`, connected wire IDs, SHA-256 fingerprint.
- **NOT_EVALUABLE Condition**: Missing terminal detection.
- **Test Coverage**: Positive low-confidence terminal with wire, negative confirmed pin with wire.

---

### RULE-007: Conflicting Voltage Power Sources
- **Version**: `1.0.0`
- **Severity**: `CRITICAL`
- **Category**: Electrical Net Consistency
- **Standard Clause**: UL 508A §14.1, NFPA 79 §7.3
- **Prerequisites**: `['NET_CONSTRUCTION', 'POWER_CLASSIFICATION']`
- **Purpose**: Detects multiple active power supplies with conflicting voltage domains tied directly together on the same net.
- **Engineering Interpretation**: Tying differing voltage rails together (e.g. `+12V` and `+24V`) without active or diode OR-ing isolation leads to backfeeding, reverse current into the lower supply, and equipment destruction.
- **Algorithm**: Inspects each net containing $\ge 2$ `POWER_SOURCE` components. Normalizes voltage ratings from `value` or `label`. Flags if $\ge 2$ distinct voltage ratings exist on the net.
- **Evidence Emitted**: `netIds: [net.id]`, `componentIds: [p1.id, p2.id]`, bounding boxes, extracted voltage labels, SHA-256 fingerprint.
- **NOT_EVALUABLE Condition**: Missing power classification or unlabelled voltages.
- **Test Coverage**: Positive `12V` vs `24V` conflict, negative matching `12V` supplies.

---

### RULE-008: Crossing Wire Ambiguity
- **Version**: `1.0.0`
- **Severity**: `MINOR`
- **Category**: Wiring Topology
- **Standard Clause**: IEEE Std 315 §4.2, ANSI Y32.2
- **Prerequisites**: `['WIRE_GEOMETRY']`
- **Purpose**: Identifies perpendicular wire intersections on the schematic that lack explicit jump-over curves or explicit junction dots.
- **Engineering Interpretation**: An orthogonal wire crossing without a 4-way dot or hump leaves it ambiguous whether the conductors are intended to connect or bypass. In modern drafting, four-way junctions are deprecated in favor of staggered T-junctions.
- **Algorithm**: Inspects `graph.diagnostics` for `CROSSING_AMBIGUITY` emitted during orthogonal wire intersection analysis.
- **Evidence Emitted**: `wireIds: [wire1.id, wire2.id]`, bounding box at intersection coordinates, page number, SHA-256 fingerprint.
- **NOT_EVALUABLE Condition**: Missing vector wire geometry.
- **Test Coverage**: Positive ambiguous crossing diagnostic, negative clean crossing.

---

### RULE-009: Isolated Unconnected Component
- **Version**: `1.0.0`
- **Severity**: `MAJOR`
- **Category**: Component Connectivity
- **Standard Clause**: IPC/WHMA-A-620 §13.4
- **Prerequisites**: `['COMPONENT_CLASSIFICATION', 'TERMINAL_DETECTION']`
- **Purpose**: Flags electrical components where zero declared terminals have connecting wires or nets.
- **Engineering Interpretation**: A physical component placed on a schematic that has zero connections represents either incomplete drafting, an orphan CAD symbol, or an unrouted device.
- **Algorithm**: For every non-ground component with $\ge 1$ declared terminals, checks if any terminal has attached wires. If 0 terminals are connected, flags an isolated component violation.
- **Evidence Emitted**: `componentIds: [comp.id]`, `terminalIds: comp.terminalIds`, bounding box, SHA-256 fingerprint.
- **NOT_EVALUABLE Condition**: Missing component classification or terminal detection.
- **Test Coverage**: Positive isolated relay with 2 unconnected pins, negative wired relay.

---

### RULE-010: Single-Terminal Floating Net
- **Version**: `1.0.0`
- **Severity**: `MINOR`
- **Category**: Net Consistency
- **Standard Clause**: IEEE Std 315 §4.1
- **Prerequisites**: `['NET_CONSTRUCTION', 'TERMINAL_DETECTION']`
- **Purpose**: Flags electrical nets consisting of a single terminal with no interconnecting conductors (dead-end stub).
- **Engineering Interpretation**: An electrical net must connect at least two points to form an intentional circuit. A net with only one node and zero wires indicates an abandoned net label or incomplete drafting.
- **Algorithm**: Scans `graph.nets` for nets with `memberTerminalIds.length === 1` and `memberWireIds.length === 0` (excluding standalone ground references).
- **Evidence Emitted**: `netIds: [net.id]`, `terminalIds: [term.id]`, `componentIds: [comp.id]`, bounding box, SHA-256 fingerprint.
- **NOT_EVALUABLE Condition**: Missing net construction.
- **Test Coverage**: Positive stub net, negative 2-terminal net.

---

### RULE-011: Incompatible Voltage Domain Bridging
- **Version**: `1.0.0`
- **Severity**: `CRITICAL`
- **Category**: Electrical Net Consistency
- **Standard Clause**: UL 508A §14.2, NFPA 79 §6.2
- **Prerequisites**: `['NET_CONSTRUCTION', 'POWER_CLASSIFICATION']`
- **Purpose**: Detects nets bridging disparate non-zero voltage domains (e.g. AC mains to DC control rails) without intervening isolation.
- **Engineering Interpretation**: Bridging a `120VAC` line to a `24VDC` control circuit destroys low-voltage I/O modules and presents severe shock hazards.
- **Algorithm**: Inspects all power supplies and batteries on a single net. Parses voltage magnitudes and AC/DC characteristics. Flags if $\ge 2$ incompatible voltage domains are bridged directly.
- **Evidence Emitted**: `netIds: [net.id]`, `componentIds: [acComp.id, dcComp.id]`, bounding boxes, SHA-256 fingerprint.
- **NOT_EVALUABLE Condition**: Missing voltage ratings or power classification.
- **Test Coverage**: Positive 120VAC vs 24VDC bridge, negative homogeneous 24VDC net.

---

### RULE-012: Fuse Missing In-Line Load / Dead-to-Ground
- **Version**: `1.0.0`
- **Severity**: `CRITICAL`
- **Category**: Electrical Net Consistency
- **Standard Clause**: NFPA 79 §7.2, UL 508A §15.2
- **Prerequisites**: `['NET_CONSTRUCTION', 'COMPONENT_CLASSIFICATION', 'GROUND_CLASSIFICATION']`
- **Purpose**: Detects circuit protection fuses whose protected path ties directly to ground with zero intervening load.
- **Engineering Interpretation**: Fuses must be in series with an electrical load (motor, coil, resistor, lamp). Tying a fuse directly from power to ground results in a dead short that blows the fuse immediately upon power-up.
- **Algorithm**: For every `FUSE`, checks all connected nets. If any connected net contains a `GROUND` symbol and zero load components (`MOTOR`, `RESISTOR`, `RELAY`, `LED`, `SENSOR`, `ECU_MODULE`), flags a dead short violation.
- **Evidence Emitted**: `componentIds: [fuse.id, ground.id]`, `netIds: [net.id]`, bounding boxes, SHA-256 fingerprint.
- **NOT_EVALUABLE Condition**: Missing ground classification or net construction.
- **Test Coverage**: Positive grounded fuse without load, negative fuse with downstream resistor load.

---

### RULE-013: Missing or Malformed Reference Designator
- **Version**: `1.0.0`
- **Severity**: `MAJOR`
- **Category**: Reference Integrity
- **Standard Clause**: ASME Y14.44 §2.1.1
- **Prerequisites**: `['COMPONENT_CLASSIFICATION']`
- **Purpose**: Flags components with unindexed, empty, placeholder, or generic reference designator labels.
- **Engineering Interpretation**: Every discrete physical part must have an indexed reference designator starting with an approved class letter (e.g. `R1`, `K2`, `SW3`). Labels such as `???`, purely numeric strings (`12345`), or unindexed generic names (`RELAY`) violate drafting standards.
- **Algorithm**: Checks non-power, non-ground components. Flags if label is empty, matches placeholders (`???`, `N/A`), lacks a leading class letter (`!/^[A-Za-z]/`), or contains illegal characters.
- **Evidence Emitted**: `componentIds: [comp.id]`, bounding box, component type, SHA-256 fingerprint.
- **NOT_EVALUABLE Condition**: Missing component classification.
- **Test Coverage**: Positive `???` and `12345` malformed labels, negative `K1` and `SW1`.

---

### RULE-014: Inconsistent Conductor Gauge Continuity
- **Version**: `1.0.0`
- **Severity**: `MAJOR`
- **Category**: Wiring Topology & Ampacity
- **Standard Clause**: NFPA 79 §12.2, IPC/WHMA-A-620 §3.2
- **Prerequisites**: `['WIRE_GEOMETRY', 'NET_CONSTRUCTION']`
- **Purpose**: Detects extreme wire gauge steps on interconnected conductors of the same net without overcurrent protection.
- **Engineering Interpretation**: Joining a heavy feeder conductor (e.g. 12 AWG) to a light branch conductor (e.g. 24 AWG) without a fuse or breaker at the transition creates a fire hazard because upstream protection sized for the heavy wire will fail to protect the lighter conductor.
- **Algorithm**: Inspects nets lacking a `FUSE` or breaker. If conductors on the net have a gauge delta $\ge 8$ AWG sizes (e.g. 12 AWG vs 24 AWG), flags an ampacity discontinuity.
- **Evidence Emitted**: `netIds: [net.id]`, `wireIds: [w1.id, w2.id]`, extracted gauge ratings, SHA-256 fingerprint.
- **NOT_EVALUABLE Condition**: Missing wire geometry or unlabelled gauges.
- **Test Coverage**: Positive 12 AWG vs 24 AWG mismatch, negative uniform 16 AWG conductors.

---

### RULE-015: Isolated Floating Wire Segment
- **Version**: `1.0.0`
- **Severity**: `MAJOR`
- **Category**: Wiring Topology
- **Standard Clause**: IPC/WHMA-A-620 §4.1
- **Prerequisites**: `['WIRE_GEOMETRY']`
- **Purpose**: Flags completely isolated wire segments with zero terminal connections at both endpoints.
- **Engineering Interpretation**: An extracted wire segment that touches no terminals on either side represents an orphaned line, an unrouted trace, or a drafting defect.
- **Algorithm**: Scans `graph.wires`. Flags any wire where `connectedTerminalIds.length === 0`.
- **Evidence Emitted**: `wireIds: [wire.id]`, bounding box derived from wire geometry, page number, SHA-256 fingerprint.
- **NOT_EVALUABLE Condition**: Missing vector wire geometry.
- **Test Coverage**: Positive completely floating wire segment, negative terminal-connected wire.

---

### RULE-016: Duplicate Terminal Identifier on Component
- **Version**: `1.0.0`
- **Severity**: `CRITICAL`
- **Category**: Component Consistency
- **Standard Clause**: ASME Y14.44 §3.2, IPC/WHMA-A-620 §19.1
- **Prerequisites**: `['COMPONENT_CLASSIFICATION', 'TERMINAL_DETECTION']`
- **Purpose**: Detects multiple distinct terminal pins on the same component sharing the identical pin name.
- **Engineering Interpretation**: A physical connector or relay cannot have two separate pins both designated "Pin 1" or "Pin A". This creates fatal ambiguity in wire assembly instructions.
- **Algorithm**: Groups pins of each component by normalized name. Flags any component having $>1$ terminal with the same non-empty name.
- **Evidence Emitted**: `componentIds: [comp.id]`, `terminalIds: [term1.id, term2.id]`, pin name, bounding box, SHA-256 fingerprint.
- **NOT_EVALUABLE Condition**: Missing component classification or terminal detection.
- **Test Coverage**: Positive connector with two pins named '1', negative connector with unique pins '1' and '2'.

---

### RULE-017: Half-Wired Relay Coil or Contact Set
- **Version**: `1.0.0`
- **Severity**: `MAJOR`
- **Category**: Component Consistency
- **Standard Clause**: IEEE Std 315 §4.3
- **Prerequisites**: `['COMPONENT_CLASSIFICATION', 'TERMINAL_DETECTION']`
- **Purpose**: Flags electromechanical relays with partially connected coils (pins 85/86 or A1/A2) or contact sets.
- **Engineering Interpretation**: An electromechanical relay coil requires both high-side and return connections to energize. Wiring pin 85 while leaving pin 86 floating renders the relay completely inoperative.
- **Algorithm**: Inspects relays with coil terminal pairs (`85`/`86` or `A1`/`A2`). If exactly one coil pin is connected to a wire while the other is unconnected, flags a half-wired coil violation.
- **Evidence Emitted**: `componentIds: [relay.id]`, `terminalIds: [unconnectedCoilPin.id]`, bounding box, SHA-256 fingerprint.
- **NOT_EVALUABLE Condition**: Missing component classification or terminal detection.
- **Test Coverage**: Positive relay with pin 85 wired and pin 86 open, negative both coil pins wired.

---

### RULE-018: Multi-Point Ground Regime Coupling
- **Version**: `1.0.0`
- **Severity**: `ADVISORY`
- **Category**: Grounding & Shielding
- **Standard Clause**: IEEE Std 1100 §8.3
- **Prerequisites**: `['NET_CONSTRUCTION', 'GROUND_CLASSIFICATION']`
- **Purpose**: Flags electrical nets coupling disparate ground regimes (Signal GND, Earth, Chassis) without explicit bonding notation.
- **Engineering Interpretation**: Direct uncontrolled inter-coupling of noisy chassis ground with sensitive analog/digital signal ground introduces ground loops and electromagnetic interference (EMI).
- **Algorithm**: Classifies ground components into regimes (`CHASSIS`, `EARTH`, `DIGITAL_GND`, `ANALOG_GND`, `ISOLATED_GND`). Flags nets that contain ground symbols from $\ge 2$ disparate regimes.
- **Evidence Emitted**: `netIds: [net.id]`, `componentIds: [...groundIds]`, terminal IDs, SHA-256 fingerprint.
- **NOT_EVALUABLE Condition**: Missing ground classification or net construction.
- **Test Coverage**: Positive chassis ground coupled to digital ground, negative homogeneous chassis ground points.

---

### RULE-019: Missing Overcurrent Protection Rating
- **Version**: `1.0.0`
- **Severity**: `MAJOR`
- **Category**: Component Integrity & Safety
- **Standard Clause**: NFPA 79 §7.2.1, UL 508A §15.1
- **Prerequisites**: `['COMPONENT_CLASSIFICATION']`
- **Purpose**: Detects active circuit protection devices (fuses/breakers) lacking an amperage rating.
- **Engineering Interpretation**: A fuse or circuit breaker without an explicit trip/ampacity rating (e.g. "15A", "2.5A") cannot be audited for wire ampacity protection and cannot be ordered in production BOMs.
- **Algorithm**: Inspects all components of type `FUSE`. Verifies presence of a valid numeric amperage string in `value` or `label` matching `/[0-9]+(\.[0-9]+)?\s*A/i`. Flags if missing.
- **Evidence Emitted**: `componentIds: [fuse.id]`, bounding box, page number, SHA-256 fingerprint.
- **NOT_EVALUABLE Condition**: Missing component classification.
- **Test Coverage**: Positive unrated fuse, negative 20A rated fuse.

---

### RULE-020: Connector Lacking Mating Harness Reference
- **Version**: `1.0.0`
- **Severity**: `ADVISORY`
- **Category**: Harness & System Integration
- **Standard Clause**: IPC/WHMA-A-620 §19.2
- **Prerequisites**: `['COMPONENT_CLASSIFICATION', 'TERMINAL_DETECTION']`
- **Purpose**: Advises when an active connector with multiple wired pins does not specify a destination harness or mating reference.
- **Engineering Interpretation**: Interface connectors in vehicle or panel harnesses must document their mating partner or destination harness tag (e.g. `J1_TO_CHASSIS` or `MATE_P1`) to ensure correct harness interconnect documentation.
- **Algorithm**: Inspects connectors with $\ge 2$ active wired pins. Flags if the connector reference designator lacks destination/mating tags (`/(TO_|MATE|W[0-9]|HARN)/i`).
- **Evidence Emitted**: `componentIds: [conn.id]`, active terminal IDs, bounding box, SHA-256 fingerprint.
- **NOT_EVALUABLE Condition**: Missing component classification or terminal detection.
- **Test Coverage**: Positive unreferenced connector with 2 active pins, negative connector with `_TO_HARN_MAIN` tag.

---

## 5. Performance Complexity & Complexity Bounds

Every rule was benchmarked against scaled synthetic electrical graphs (50 components, 100 wires, 25 nets) in `tests/rule-engine-phase5.test.ts`. Execution duration across all 20 rules strictly remains $< 5\text{ ms}$, exceeding the $< 100\text{ ms}$ requirement by over an order of magnitude.

| Rule | Computational Complexity | Primary Data Structures |
| :--- | :--- | :--- |
| `RULE-001` | $O(W)$ | Set lookup for connected terminals |
| `RULE-002` | $O(C \cdot T)$ | Map lookup for critical component terminals |
| `RULE-003` | $O(C)$ | Map grouping by uppercase connector reference |
| `RULE-004` | $O(C)$ | Map grouping by page + discrete component label |
| `RULE-005` | $O(N \cdot M)$ | Net member scan with component type map |
| `RULE-006` | $O(T + W)$ | Terminal scan + wire connectivity filter |
| `RULE-007` | $O(N \cdot P)$ | Net scan for power components |
| `RULE-008` | $O(D)$ | Direct diagnostic filter |
| `RULE-009` | $O(C \cdot T)$ | Component terminal wire intersection check |
| `RULE-010` | $O(N)$ | Direct net terminal/wire count check |
| `RULE-011` | $O(N \cdot P)$ | Net scan + regex voltage extraction |
| `RULE-012` | $O(C_{\text{fuse}} \cdot N_{\text{conn}})$ | Connected net load classification check |
| `RULE-013` | $O(C)$ | Regex reference designator validation |
| `RULE-014` | $O(N \cdot W_{\text{net}}^2)$ | Pairwise wire gauge delta comparison per net |
| `RULE-015` | $O(W)$ | Wire terminal connection array check |
| `RULE-016` | $O(C \cdot T_{\text{comp}})$ | Component pin grouping map |
| `RULE-017` | $O(C_{\text{relay}} \cdot T_{\text{coil}})$ | Relay coil pair connectivity check |
| `RULE-018` | $O(N \cdot G)$ | Ground regime classification and set check |
| `RULE-019` | $O(C_{\text{fuse}})$ | Fuse rating regex validation |
| `RULE-020` | $O(K \cdot T_{\text{pin}})$ | Connector pin wire check + mating tag regex |

---

## 6. Audit Provenance Chain

Every finding persisted to the database preserves an unbroken provenance chain:

```
Source Document (Uploaded PDF)
      │
      ▼
Source SHA-256 (64 hex characters)
      │
      ▼
Normalized Extraction (Pages, Tokens, Vector Paths)
      │
      ▼
ElectricalGraph Builder (Nodes, Terminals, Wires, Nets)
      │
      ▼
Graph SHA-256 (Canonical topological hash)
      │
      ▼
Rule Registry Entry (Rule ID, Version, Prerequisites)
      │
      ▼
Deterministic Evaluation (FindingCandidate)
      │
      ▼
Finding (PostgreSQL, Tenant Isolation, Fingerprint SHA-256)
```
