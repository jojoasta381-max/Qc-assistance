/**
 * SPANQC PHASE 5 DETERMINISTIC QC RULE EXPANSION & VALIDATION TEST SUITE
 * 
 * Comprehensive testing of:
 * 1. Central Rule Registry (authoritative, dynamic count, toggle active rules)
 * 2. All 20 Production Rules (RULE-001 through RULE-020)
 *    - Positive violation cases (exact evidence, fingerprints, severity)
 *    - Negative cases (clean design yields PASS)
 *    - Missing prerequisites / Ambiguity -> NOT_EVALUABLE
 * 3. Property & Invariant Tests
 *    - Determinism: 3 runs yield bit-identical findings
 *    - Symmetry: Reordering entities does not change semantic findings
 *    - No Phantom Findings: Unrelated component removal does not alter independent findings
 *    - Fail-closed quality gate enforcement
 * 4. Performance benchmarking (evaluates large graphs in < 100ms)
 * 5. Tenant isolation regression
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { prisma } from '../src/lib/prisma';
import { getRuleRegistry, RuleRegistry } from '../src/lib/qc/rule-registry';
import { ProductionRuleEvaluator } from '../src/lib/qc/rule-evaluator';
import {
  ElectricalGraph,
  GraphComponent,
  GraphTerminal,
  GraphWire,
  GraphNet,
} from '../src/lib/graph/electrical-graph-models';

function createDeterministicTestGraph(overrides: Partial<ElectricalGraph> = {}): ElectricalGraph {
  const baseSha = crypto.createHash('sha256').update('source-payload-bytes').digest('hex');
  const graphSha = crypto.createHash('sha256').update('graph-structure-bytes').digest('hex');

  return {
    graphId: 'graph-test-01',
    documentId: 'doc-test-01',
    versionId: 'ver-test-01',
    tenantId: 'tenant-test-01',
    sourceSha256: baseSha,
    extractionVersion: '1.0.0',
    graphVersion: '1.0.0',
    graphSha256: graphSha,
    createdAt: new Date().toISOString(),
    pages: [
      {
        pageNumber: 1,
        dimensions: { width: 1000, height: 1000 },
        componentCount: 2,
        terminalCount: 4,
        wireCount: 2,
      },
    ],
    components: [],
    terminals: [],
    wires: [],
    connectors: [],
    nets: [],
    diagnostics: [],
    ...overrides,
  };
}

test('Phase 5: Production Deterministic QC Rule Expansion & Validation', async (t) => {
  const registry = getRuleRegistry();
  const evaluator = new ProductionRuleEvaluator(registry);

  // =========================================================================
  // 1. Central Rule Registry Invariants & Dynamic Counts
  // =========================================================================
  await t.test('Registry: 1. Authoritative registry registers exactly 20 production rules', () => {
    const count = registry.getRuleCount();
    assert.equal(count, 20, 'Rule registry must dynamically count exactly 20 active rules');
    
    const all = registry.getAll();
    assert.equal(all.length, 20);

    // Verify rules are RULE-001 through RULE-020
    for (let i = 1; i <= 20; i++) {
      const code = `RULE-${String(i).padStart(3, '0')}`;
      const rule = registry.get(code);
      assert.ok(rule, `Rule ${code} must be present in registry`);
      assert.equal(rule.code, code);
      assert.ok(rule.version.length > 0, `Rule ${code} must have version`);
      assert.ok(rule.prerequisites && rule.prerequisites.length > 0, `Rule ${code} must declare prerequisites`);
    }
  });

  await t.test('Registry: 2. Dynamic metadata exposure includes docs reference and enabled state', () => {
    const entries = registry.getAllEntries();
    assert.equal(entries.length, 20);

    for (const entry of entries) {
      assert.equal(entry.enabled, true);
      assert.ok(entry.documentationRef.startsWith('docs/RULE_ENGINE.md#'));
      assert.ok(entry.name.length > 0);
      assert.ok(entry.description.length > 0);
    }
  });

  await t.test('Registry: 3. Toggling rule enabled state dynamically affects active count and evaluation', () => {
    const localRegistry = new RuleRegistry();
    assert.equal(localRegistry.getRuleCount(), 20);

    localRegistry.setEnabled('RULE-001', false);
    assert.equal(localRegistry.getRuleCount(), 19);
    assert.equal(localRegistry.isEnabled('RULE-001'), false);

    const activeRules = localRegistry.getActiveRules();
    assert.equal(activeRules.some((r) => r.code === 'RULE-001'), false);

    localRegistry.setEnabled('RULE-001', true);
    assert.equal(localRegistry.getRuleCount(), 20);
    assert.equal(localRegistry.isEnabled('RULE-001'), true);
  });

  // =========================================================================
  // 2. Existing Rules Hardening (RULE-001 to RULE-008)
  // =========================================================================
  await t.test('Rules: RULE-001 Dangling Wire Endpoint - Positive & Negative', () => {
    const rule = registry.get('RULE-001')!;

    // Positive: Wire endpoint unconnected
    const danglingGraph = createDeterministicTestGraph({
      wires: [
        {
          id: 'w1',
          pageNumber: 1,
          geometry: { start: { x: 100, y: 100 }, end: { x: 500, y: 100 } },
          connectedTerminalIds: [], // 0 terminals connected
          confidence: 0.9,
          status: 'CONFIRMED',
          sourceEvidenceId: 'src-w1',
          evidence: [],
        },
      ],
    });
    const findingsPos = rule.evaluate(danglingGraph);
    assert.equal(findingsPos.length, 1);
    assert.equal(findingsPos[0].status, 'VIOLATION');
    assert.equal(findingsPos[0].severity, 'MAJOR');
    assert.deepEqual(findingsPos[0].evidence.wireIds, ['w1']);
    assert.ok(findingsPos[0].evidence.deterministicFingerprint.length === 64);

    // Negative: Wire connected to 2 terminals
    const cleanGraph = createDeterministicTestGraph({
      wires: [
        {
          id: 'w2',
          pageNumber: 1,
          geometry: { start: { x: 100, y: 100 }, end: { x: 500, y: 100 } },
          connectedTerminalIds: ['t1', 't2'],
          confidence: 0.9,
          status: 'CONFIRMED',
          sourceEvidenceId: 'src-w2',
          evidence: [],
        },
      ],
    });
    const findingsNeg = rule.evaluate(cleanGraph);
    assert.equal(findingsNeg.length, 0);
  });

  await t.test('Rules: RULE-002 Unconnected Required Terminal - Positive & Negative', () => {
    const rule = registry.get('RULE-002')!;

    // Positive: Fuse with unconnected terminal
    const posGraph = createDeterministicTestGraph({
      components: [
        {
          id: 'c-f1',
          type: 'FUSE',
          label: 'F1',
          pageNumber: 1,
          bbox: { x: 100, y: 100, width: 50, height: 20 },
          confidence: 0.9,
          status: 'CONFIRMED',
          terminalIds: ['t-f1-1'],
          sourceEvidenceId: 'src-f1',
          evidence: [],
        },
      ],
      terminals: [
        {
          id: 't-f1-1',
          componentId: 'c-f1',
          terminalName: '1',
          position: { x: 100, y: 100 },
          pageNumber: 1,
          confidence: 0.9,
          status: 'CONFIRMED',
          sourceEvidenceId: 'src-tf1',
        },
      ],
      wires: [], // No wires touching terminal
    });
    const findingsPos = rule.evaluate(posGraph);
    assert.equal(findingsPos.length, 1);
    assert.equal(findingsPos[0].status, 'VIOLATION');
    assert.equal(findingsPos[0].severity, 'CRITICAL');

    // Negative: Terminal connected
    const negGraph = createDeterministicTestGraph({
      ...posGraph,
      wires: [
        {
          id: 'w-f1',
          pageNumber: 1,
          geometry: { start: { x: 100, y: 100 }, end: { x: 200, y: 100 } },
          connectedTerminalIds: ['t-f1-1', 't-other'],
          confidence: 0.9,
          status: 'CONFIRMED',
          sourceEvidenceId: 'src-wf1',
          evidence: [],
        },
      ],
    });
    assert.equal(rule.evaluate(negGraph).length, 0);
  });

  await t.test('Rules: RULE-003 Duplicate Connector Reference - Positive & Negative', () => {
    const rule = registry.get('RULE-003')!;

    // Positive: Duplicate J1
    const posGraph = createDeterministicTestGraph({
      connectors: [
        {
          id: 'conn1',
          reference: 'J1',
          type: 'AMPSEAL',
          pinTerminalIds: [],
          pageNumber: 1,
          bbox: { x: 100, y: 100, width: 50, height: 50 },
          confidence: 0.95,
          sourceEvidenceId: 's1',
        },
        {
          id: 'conn2',
          reference: 'J1',
          type: 'AMPSEAL',
          pinTerminalIds: [],
          pageNumber: 1,
          bbox: { x: 300, y: 100, width: 50, height: 50 },
          confidence: 0.95,
          sourceEvidenceId: 's2',
        },
      ],
    });
    const findingsPos = rule.evaluate(posGraph);
    assert.equal(findingsPos.length, 1);
    assert.equal(findingsPos[0].severity, 'CRITICAL');

    // Negative: Distinct J1, J2
    const negGraph = createDeterministicTestGraph({
      connectors: [
        { ...posGraph.connectors[0] },
        { ...posGraph.connectors[1], id: 'conn2', reference: 'J2' },
      ],
    });
    assert.equal(rule.evaluate(negGraph).length, 0);
  });

  await t.test('Rules: RULE-004 Duplicate Component Reference - Positive & Negative', () => {
    const rule = registry.get('RULE-004')!;

    // Positive: Duplicate K1
    const posGraph = createDeterministicTestGraph({
      components: [
        {
          id: 'comp1',
          label: 'K1',
          type: 'RELAY',
          pageNumber: 1,
          bbox: { x: 100, y: 100, width: 40, height: 40 },
          confidence: 0.9,
          status: 'CONFIRMED',
          terminalIds: [],
          sourceEvidenceId: 's1',
          evidence: [],
        },
        {
          id: 'comp2',
          label: 'K1',
          type: 'RELAY',
          pageNumber: 1,
          bbox: { x: 200, y: 100, width: 40, height: 40 },
          confidence: 0.9,
          status: 'CONFIRMED',
          terminalIds: [],
          sourceEvidenceId: 's2',
          evidence: [],
        },
      ],
    });
    assert.equal(rule.evaluate(posGraph).length, 1);

    // Negative: Unique labels
    const negGraph = createDeterministicTestGraph({
      components: [
        posGraph.components[0],
        { ...posGraph.components[1], id: 'comp2', label: 'K2' },
      ],
    });
    assert.equal(rule.evaluate(negGraph).length, 0);
  });

  await t.test('Rules: RULE-005 Direct Power-to-Ground Short - Positive & Negative & Prereqs', () => {
    const rule = registry.get('RULE-005')!;

    // Positive: Net contains both POWER_SOURCE and GROUND
    const posGraph = createDeterministicTestGraph({
      components: [
        {
          id: 'pwr1',
          label: '+12V',
          type: 'POWER_SOURCE',
          pageNumber: 1,
          bbox: { x: 50, y: 50, width: 30, height: 30 },
          confidence: 0.9,
          status: 'CONFIRMED',
          terminalIds: ['tp1'],
          sourceEvidenceId: 'sp',
          evidence: [],
        },
        {
          id: 'gnd1',
          label: 'GND',
          type: 'GROUND',
          pageNumber: 1,
          bbox: { x: 50, y: 150, width: 30, height: 30 },
          confidence: 0.9,
          status: 'CONFIRMED',
          terminalIds: ['tg1'],
          sourceEvidenceId: 'sg',
          evidence: [],
        },
      ],
      terminals: [
        {
          id: 'tp1',
          componentId: 'pwr1',
          terminalName: '+',
          position: { x: 50, y: 50 },
          pageNumber: 1,
          confidence: 0.9,
          status: 'CONFIRMED',
          sourceEvidenceId: 'stp',
        },
        {
          id: 'tg1',
          componentId: 'gnd1',
          terminalName: 'GND',
          position: { x: 50, y: 150 },
          pageNumber: 1,
          confidence: 0.9,
          status: 'CONFIRMED',
          sourceEvidenceId: 'stg',
        },
      ],
      nets: [
        {
          id: 'net-short',
          name: 'SHORT_NET',
          memberComponentIds: ['pwr1', 'gnd1'],
          memberTerminalIds: ['tp1', 'tg1'],
          memberWireIds: ['w-short'],
          pages: [1],
          connectivityConfidence: 0.95,
          evidenceReferences: [],
        },
      ],
      wires: [
        {
          id: 'w-short',
          pageNumber: 1,
          geometry: { start: { x: 50, y: 50 }, end: { x: 50, y: 150 } },
          connectedTerminalIds: ['tp1', 'tg1'],
          confidence: 0.9,
          status: 'CONFIRMED',
          sourceEvidenceId: 'sws',
          evidence: [],
        },
      ],
    });

    const findingsPos = rule.evaluate(posGraph);
    assert.equal(findingsPos.length, 1);
    assert.equal(findingsPos[0].status, 'VIOLATION');
    assert.equal(findingsPos[0].severity, 'CRITICAL');

    // Missing prereq check through evaluator
    const noGroundGraph = createDeterministicTestGraph({
      components: [posGraph.components[0]], // Only power, no ground
      nets: posGraph.nets,
    });
    const prereqCheck = evaluator.checkPrerequisites(rule, noGroundGraph);
    assert.equal(prereqCheck.met, false);
    assert.ok(prereqCheck.missing.includes('GROUND_CLASSIFICATION'));
  });

  await t.test('Rules: RULE-006 Unresolved Terminal Connection - Positive & Negative', () => {
    const rule = registry.get('RULE-006')!;

    // Positive: Low confidence / unresolved terminal with a connected wire
    const posGraph = createDeterministicTestGraph({
      terminals: [
        {
          id: 't-unres',
          componentId: 'c1',
          terminalName: 'UNKNOWN',
          position: { x: 100, y: 100 },
          pageNumber: 1,
          confidence: 0.45, // < 0.60 threshold
          status: 'UNRESOLVED',
          sourceEvidenceId: 's',
        },
      ],
      wires: [
        {
          id: 'w-unres',
          pageNumber: 1,
          geometry: { start: { x: 100, y: 100 }, end: { x: 200, y: 100 } },
          connectedTerminalIds: ['t-unres'],
          confidence: 0.9,
          status: 'CONFIRMED',
          sourceEvidenceId: 'sw',
          evidence: [],
        },
      ],
    });
    const findings = rule.evaluate(posGraph);
    assert.equal(findings.length, 1);
    assert.equal(findings[0].severity, 'ADVISORY');

    // Negative: Confirmed high confidence terminal
    const negGraph = createDeterministicTestGraph({
      terminals: [{ ...posGraph.terminals[0], terminalName: 'Pin 1', confidence: 0.95, status: 'CONFIRMED' }],
      wires: posGraph.wires,
    });
    assert.equal(rule.evaluate(negGraph).length, 0);
  });

  await t.test('Rules: RULE-007 Conflicting Voltage Sources - Positive & Negative', () => {
    const rule = registry.get('RULE-007')!;

    // Positive: +12V and +24V on same net
    const posGraph = createDeterministicTestGraph({
      components: [
        {
          id: 'p1',
          label: 'BATT1',
          value: '12V',
          type: 'POWER_SOURCE',
          pageNumber: 1,
          bbox: { x: 50, y: 50, width: 20, height: 20 },
          confidence: 0.9,
          status: 'CONFIRMED',
          terminalIds: ['tp1'],
          sourceEvidenceId: 's1',
          evidence: [],
        },
        {
          id: 'p2',
          label: 'BATT2',
          value: '24V',
          type: 'POWER_SOURCE',
          pageNumber: 1,
          bbox: { x: 150, y: 50, width: 20, height: 20 },
          confidence: 0.9,
          status: 'CONFIRMED',
          terminalIds: ['tp2'],
          sourceEvidenceId: 's2',
          evidence: [],
        },
      ],
      nets: [
        {
          id: 'net-conflict',
          name: 'POWER_BUS',
          memberComponentIds: ['p1', 'p2'],
          memberTerminalIds: ['tp1', 'tp2'],
          memberWireIds: [],
          pages: [1],
          connectivityConfidence: 0.9,
          evidenceReferences: [],
        },
      ],
    });
    const findings = rule.evaluate(posGraph);
    assert.equal(findings.length, 1);
    assert.equal(findings[0].severity, 'CRITICAL');

    // Negative: Identical voltages
    const negGraph = createDeterministicTestGraph({
      components: [
        { ...posGraph.components[0], label: '+12V', value: '12V' },
        { ...posGraph.components[1], label: '+12V', value: '12V' },
      ],
      nets: posGraph.nets,
    });
    assert.equal(rule.evaluate(negGraph).length, 0);
  });

  await t.test('Rules: RULE-008 Crossing Wire Ambiguity - Positive & Negative', () => {
    const rule = registry.get('RULE-008')!;

    // Positive: CROSSING_AMBIGUITY diagnostic present
    const posGraph = createDeterministicTestGraph({
      diagnostics: [
        {
          id: 'diag-cross-1',
          code: 'CROSSING_AMBIGUITY',
          severity: 'WARNING',
          message: 'Orthogonal crossing lacks explicit jump or junction point',
          entityId: 'w-cross',
          pageNumber: 1,
        },
      ],
    });
    assert.equal(rule.evaluate(posGraph).length, 1);

    // Negative: No crossing diagnostic
    const negGraph = createDeterministicTestGraph({ diagnostics: [] });
    assert.equal(rule.evaluate(negGraph).length, 0);
  });

  // =========================================================================
  // 3. New Production Rules Testing (RULE-009 through RULE-020)
  // =========================================================================
  await t.test('Rules: RULE-009 Isolated Unconnected Component - Positive & Negative', () => {
    const rule = registry.get('RULE-009')!;

    // Positive: Relay with 2 terminals, 0 connected wires
    const posGraph = createDeterministicTestGraph({
      components: [
        {
          id: 'k-iso',
          label: 'K1',
          type: 'RELAY',
          pageNumber: 1,
          bbox: { x: 200, y: 200, width: 40, height: 40 },
          confidence: 0.9,
          status: 'CONFIRMED',
          terminalIds: ['tk1', 'tk2'],
          sourceEvidenceId: 'sk',
          evidence: [],
        },
      ],
      terminals: [
        {
          id: 'tk1',
          componentId: 'k-iso',
          terminalName: '85',
          position: { x: 200, y: 200 },
          pageNumber: 1,
          confidence: 0.9,
          status: 'CONFIRMED',
          sourceEvidenceId: 'stk1',
        },
        {
          id: 'tk2',
          componentId: 'k-iso',
          terminalName: '86',
          position: { x: 220, y: 200 },
          pageNumber: 1,
          confidence: 0.9,
          status: 'CONFIRMED',
          sourceEvidenceId: 'stk2',
        },
      ],
      wires: [], // 0 connected wires
    });
    const findings = rule.evaluate(posGraph);
    assert.equal(findings.length, 1);
    assert.equal(findings[0].severity, 'MAJOR');
    assert.ok(findings[0].description.includes('zero connected wires') || findings[0].title.includes('Isolated Component'));

    // Negative: Wires connected to terminal
    const negGraph = createDeterministicTestGraph({
      ...posGraph,
      wires: [
        {
          id: 'w-k1',
          pageNumber: 1,
          geometry: { start: { x: 200, y: 200 }, end: { x: 300, y: 200 } },
          connectedTerminalIds: ['tk1', 'other'],
          confidence: 0.9,
          status: 'CONFIRMED',
          sourceEvidenceId: 'swk',
          evidence: [],
        },
      ],
    });
    assert.equal(rule.evaluate(negGraph).length, 0);
  });

  await t.test('Rules: RULE-010 Single-Terminal Floating Net - Positive & Negative', () => {
    const rule = registry.get('RULE-010')!;

    // Positive: Net with exactly 1 terminal and 0 wires
    const posGraph = createDeterministicTestGraph({
      nets: [
        {
          id: 'net-stub',
          name: 'NET_STUB',
          memberTerminalIds: ['term-alone'],
          memberComponentIds: ['c1'],
          memberWireIds: [], // 0 wires!
          pages: [1],
          connectivityConfidence: 0.9,
          evidenceReferences: [],
        },
      ],
      terminals: [
        {
          id: 'term-alone',
          componentId: 'c1',
          terminalName: '1',
          position: { x: 100, y: 100 },
          pageNumber: 1,
          confidence: 0.9,
          status: 'CONFIRMED',
          sourceEvidenceId: 'st',
        },
      ],
      components: [
        {
          id: 'c1',
          label: 'R1',
          type: 'RESISTOR',
          pageNumber: 1,
          bbox: { x: 100, y: 100, width: 20, height: 20 },
          confidence: 0.9,
          status: 'CONFIRMED',
          terminalIds: ['term-alone'],
          sourceEvidenceId: 'sc1',
          evidence: [],
        },
      ],
    });
    const findings = rule.evaluate(posGraph);
    assert.equal(findings.length, 1);
    assert.equal(findings[0].severity, 'MINOR');
    assert.ok(findings[0].description.includes('only terminal') || findings[0].title.includes('Single-Terminal Net'));

    // Negative: Net with 2 terminals
    const negGraph = createDeterministicTestGraph({
      nets: [{ ...posGraph.nets[0], memberTerminalIds: ['t1', 't2'] }],
    });
    assert.equal(rule.evaluate(negGraph).length, 0);
  });

  await t.test('Rules: RULE-011 Incompatible Voltage Domain Bridging - Positive & Negative', () => {
    const rule = registry.get('RULE-011')!;

    // Positive: Net bridging AC and DC
    const posGraph = createDeterministicTestGraph({
      nets: [
        {
          id: 'net-bridge',
          name: 'HIGH_VOLTAGE_BRIDGE',
          voltageDomain: '120VAC',
          memberTerminalIds: ['t-ac', 't-dc'],
          memberComponentIds: ['comp-ac', 'comp-dc'],
          memberWireIds: [],
          pages: [1],
          connectivityConfidence: 0.9,
          evidenceReferences: [],
        },
      ],
      components: [
        {
          id: 'comp-ac',
          label: 'SRC_AC',
          type: 'POWER_SOURCE',
          value: '120VAC',
          pageNumber: 1,
          bbox: { x: 50, y: 50, width: 20, height: 20 },
          confidence: 0.9,
          status: 'CONFIRMED',
          terminalIds: ['t-ac'],
          sourceEvidenceId: 's-ac',
          evidence: [],
        },
        {
          id: 'comp-dc',
          label: 'BATT_DC',
          type: 'BATTERY',
          value: '24VDC',
          pageNumber: 1,
          bbox: { x: 250, y: 50, width: 20, height: 20 },
          confidence: 0.9,
          status: 'CONFIRMED',
          terminalIds: ['t-dc'],
          sourceEvidenceId: 's-dc',
          evidence: [],
        },
      ],
    });
    const findings = rule.evaluate(posGraph);
    assert.equal(findings.length, 1);
    assert.equal(findings[0].severity, 'CRITICAL');
    assert.ok(findings[0].description.includes('directly bridges disparate voltage domains') || findings[0].title.includes('Incompatible Voltage Bridging'));

    // Negative: Same domains (24VDC and 24VDC)
    const negGraph = createDeterministicTestGraph({
      ...posGraph,
      components: [
        posGraph.components[0],
        { ...posGraph.components[1], value: '120VAC' },
      ],
    });
    assert.equal(rule.evaluate(negGraph).length, 0);
  });

  await t.test('Rules: RULE-012 Fuse Missing In-Line Load / Dead-to-Ground - Positive & Negative', () => {
    const rule = registry.get('RULE-012')!;

    // Positive: Fuse terminal directly connected to ground net without load
    const posGraph = createDeterministicTestGraph({
      components: [
        {
          id: 'f1',
          label: 'F1',
          type: 'FUSE',
          pageNumber: 1,
          bbox: { x: 100, y: 100, width: 30, height: 20 },
          confidence: 0.9,
          status: 'CONFIRMED',
          terminalIds: ['tf1', 'tf2'],
          sourceEvidenceId: 'sf1',
          evidence: [],
        },
        {
          id: 'gnd1',
          label: 'GND',
          type: 'GROUND',
          pageNumber: 1,
          bbox: { x: 100, y: 200, width: 30, height: 20 },
          confidence: 0.9,
          status: 'CONFIRMED',
          terminalIds: ['tg1'],
          sourceEvidenceId: 'sg1',
          evidence: [],
        },
      ],
      nets: [
        {
          id: 'net-gnd-fuse',
          name: 'GND',
          memberComponentIds: ['f1', 'gnd1'],
          memberTerminalIds: ['tf2', 'tg1'],
          memberWireIds: [],
          pages: [1],
          connectivityConfidence: 0.9,
          evidenceReferences: [],
        },
      ],
    });
    const findings = rule.evaluate(posGraph);
    assert.equal(findings.length, 1);
    assert.equal(findings[0].severity, 'CRITICAL');
    assert.ok(findings[0].description.includes('terminates on ground Net') || findings[0].title.includes('Dead Short'));

    // Negative: Fuse connected to a load resistor, not ground
    const negGraph = createDeterministicTestGraph({
      components: [
        posGraph.components[0],
        {
          id: 'r1',
          label: 'R1',
          type: 'RESISTOR',
          pageNumber: 1,
          bbox: { x: 100, y: 200, width: 30, height: 20 },
          confidence: 0.9,
          status: 'CONFIRMED',
          terminalIds: ['tr1'],
          sourceEvidenceId: 'sr1',
          evidence: [],
        },
      ],
      nets: [
        {
          id: 'net-fuse-load',
          name: 'FUSE_OUT',
          memberComponentIds: ['f1', 'r1'],
          memberTerminalIds: ['tf2', 'tr1'],
          memberWireIds: [],
          pages: [1],
          connectivityConfidence: 0.9,
          evidenceReferences: [],
        },
      ],
    });
    assert.equal(rule.evaluate(negGraph).length, 0);
  });

  await t.test('Rules: RULE-013 Missing or Malformed Reference Designator - Positive & Negative', () => {
    const rule = registry.get('RULE-013')!;

    // Positive: Invalid labels
    const posGraph = createDeterministicTestGraph({
      components: [
        {
          id: 'c-bad1',
          label: '???',
          type: 'RELAY',
          pageNumber: 1,
          bbox: { x: 100, y: 100, width: 20, height: 20 },
          confidence: 0.9,
          status: 'CONFIRMED',
          terminalIds: [],
          sourceEvidenceId: 'sb1',
          evidence: [],
        },
        {
          id: 'c-bad2',
          label: '12345', // purely numeric
          type: 'SWITCH',
          pageNumber: 1,
          bbox: { x: 200, y: 100, width: 20, height: 20 },
          confidence: 0.9,
          status: 'CONFIRMED',
          terminalIds: [],
          sourceEvidenceId: 'sb2',
          evidence: [],
        },
      ],
    });
    const findings = rule.evaluate(posGraph);
    assert.equal(findings.length, 2);
    assert.equal(findings[0].severity, 'MAJOR');

    // Negative: Standard IEEE/ANSI designators
    const negGraph = createDeterministicTestGraph({
      components: [
        { ...posGraph.components[0], id: 'c1', label: 'K1' },
        { ...posGraph.components[1], id: 'c2', label: 'SW1' },
      ],
    });
    assert.equal(rule.evaluate(negGraph).length, 0);
  });

  await t.test('Rules: RULE-014 Inconsistent Conductor Gauge Continuity - Positive & Negative', () => {
    const rule = registry.get('RULE-014')!;

    // Positive: Mismatched gauges on same net (12 AWG and 24 AWG)
    const posGraph = createDeterministicTestGraph({
      wires: [
        {
          id: 'w-heavy',
          gauge: '12 AWG',
          pageNumber: 1,
          geometry: { start: { x: 100, y: 100 }, end: { x: 200, y: 100 } },
          connectedTerminalIds: ['t1'],
          confidence: 0.9,
          status: 'CONFIRMED',
          sourceEvidenceId: 'sw1',
          evidence: [],
        },
        {
          id: 'w-light',
          gauge: '24 AWG',
          pageNumber: 1,
          geometry: { start: { x: 200, y: 100 }, end: { x: 300, y: 100 } },
          connectedTerminalIds: ['t2'],
          confidence: 0.9,
          status: 'CONFIRMED',
          sourceEvidenceId: 'sw2',
          evidence: [],
        },
      ],
      nets: [
        {
          id: 'net-mismatch',
          name: 'MISMATCHED_NET',
          memberWireIds: ['w-heavy', 'w-light'],
          memberTerminalIds: ['t1', 't2'],
          memberComponentIds: [],
          pages: [1],
          connectivityConfidence: 0.9,
          evidenceReferences: [],
        },
      ],
    });
    const findings = rule.evaluate(posGraph);
    assert.equal(findings.length, 1);
    assert.equal(findings[0].severity, 'MAJOR');
    assert.ok(findings[0].description.includes('disparate gauge') || findings[0].title.includes('Discontinuity'));

    // Negative: Identical gauges (16 AWG on both)
    const negGraph = createDeterministicTestGraph({
      wires: [
        { ...posGraph.wires[0], gauge: '16 AWG' },
        { ...posGraph.wires[1], gauge: '16 AWG' },
      ],
      nets: posGraph.nets,
    });
    assert.equal(rule.evaluate(negGraph).length, 0);
  });

  await t.test('Rules: RULE-015 Isolated Floating Wire Segment - Positive & Negative', () => {
    const rule = registry.get('RULE-015')!;

    // Positive: Wire with 0 connected terminals
    const posGraph = createDeterministicTestGraph({
      wires: [
        {
          id: 'w-floating',
          pageNumber: 1,
          geometry: { start: { x: 50, y: 50 }, end: { x: 150, y: 50 } },
          connectedTerminalIds: [],
          confidence: 0.9,
          status: 'CONFIRMED',
          sourceEvidenceId: 'swf',
          evidence: [],
        },
      ],
    });
    const findings = rule.evaluate(posGraph);
    assert.equal(findings.length, 1);
    assert.equal(findings[0].severity, 'MAJOR');
    assert.ok(findings[0].description.includes('completely floating'));

    // Negative: Connected wire
    const negGraph = createDeterministicTestGraph({
      wires: [{ ...posGraph.wires[0], connectedTerminalIds: ['t1', 't2'] }],
    });
    assert.equal(rule.evaluate(negGraph).length, 0);
  });

  await t.test('Rules: RULE-016 Duplicate Terminal Identifier on Component - Positive & Negative', () => {
    const rule = registry.get('RULE-016')!;

    // Positive: Connector J1 with duplicate pin '1'
    const posGraph = createDeterministicTestGraph({
      components: [
        {
          id: 'j1',
          label: 'J1',
          type: 'CONNECTOR',
          pageNumber: 1,
          bbox: { x: 100, y: 100, width: 40, height: 40 },
          confidence: 0.9,
          status: 'CONFIRMED',
          terminalIds: ['tj1-1', 'tj1-dup'],
          sourceEvidenceId: 'sj1',
          evidence: [],
        },
      ],
      terminals: [
        {
          id: 'tj1-1',
          componentId: 'j1',
          terminalName: '1',
          position: { x: 100, y: 100 },
          pageNumber: 1,
          confidence: 0.9,
          status: 'CONFIRMED',
          sourceEvidenceId: 'st1',
        },
        {
          id: 'tj1-dup',
          componentId: 'j1',
          terminalName: '1', // Duplicate pin name
          position: { x: 100, y: 120 },
          pageNumber: 1,
          confidence: 0.9,
          status: 'CONFIRMED',
          sourceEvidenceId: 'st2',
        },
      ],
    });
    const findings = rule.evaluate(posGraph);
    assert.equal(findings.length, 1);
    assert.equal(findings[0].severity, 'CRITICAL');
    assert.ok(findings[0].description.includes('duplicate pin'));

    // Negative: Unique pin names '1' and '2'
    const negGraph = createDeterministicTestGraph({
      ...posGraph,
      terminals: [
        posGraph.terminals[0],
        { ...posGraph.terminals[1], id: 'tj1-2', terminalName: '2' },
      ],
    });
    assert.equal(rule.evaluate(negGraph).length, 0);
  });

  await t.test('Rules: RULE-017 Half-Wired Relay Coil or Contact Set - Positive & Negative', () => {
    const rule = registry.get('RULE-017')!;

    // Positive: Relay with coil 85 wired, but coil 86 unconnected
    const posGraph = createDeterministicTestGraph({
      components: [
        {
          id: 'k1',
          label: 'K1',
          type: 'RELAY',
          pageNumber: 1,
          bbox: { x: 100, y: 100, width: 40, height: 40 },
          confidence: 0.9,
          status: 'CONFIRMED',
          terminalIds: ['tk-85', 'tk-86'],
          sourceEvidenceId: 'sk1',
          evidence: [],
        },
      ],
      terminals: [
        {
          id: 'tk-85',
          componentId: 'k1',
          terminalName: '85',
          position: { x: 100, y: 100 },
          pageNumber: 1,
          confidence: 0.9,
          status: 'CONFIRMED',
          sourceEvidenceId: 'stk1',
        },
        {
          id: 'tk-86',
          componentId: 'k1',
          terminalName: '86',
          position: { x: 120, y: 100 },
          pageNumber: 1,
          confidence: 0.9,
          status: 'CONFIRMED',
          sourceEvidenceId: 'stk2',
        },
      ],
      wires: [
        {
          id: 'w-coil',
          pageNumber: 1,
          geometry: { start: { x: 100, y: 100 }, end: { x: 100, y: 50 } },
          connectedTerminalIds: ['tk-85'], // Only 85 wired!
          confidence: 0.9,
          status: 'CONFIRMED',
          sourceEvidenceId: 'sw1',
          evidence: [],
        },
      ],
    });
    const findings = rule.evaluate(posGraph);
    assert.equal(findings.length, 1);
    assert.equal(findings[0].severity, 'MAJOR');
    assert.ok(findings[0].description.includes('has coil terminal "85" wired'));

    // Negative: Both 85 and 86 wired
    const negGraph = createDeterministicTestGraph({
      ...posGraph,
      wires: [
        posGraph.wires[0],
        {
          id: 'w-coil-ret',
          pageNumber: 1,
          geometry: { start: { x: 120, y: 100 }, end: { x: 120, y: 50 } },
          connectedTerminalIds: ['tk-86'],
          confidence: 0.9,
          status: 'CONFIRMED',
          sourceEvidenceId: 'sw2',
          evidence: [],
        },
      ],
    });
    assert.equal(rule.evaluate(negGraph).length, 0);
  });

  await t.test('Rules: RULE-018 Multi-Point Ground Regime Coupling - Positive & Negative', () => {
    const rule = registry.get('RULE-018')!;

    // Positive: Net shorting chassis ground and digital ground
    const posGraph = createDeterministicTestGraph({
      components: [
        {
          id: 'gnd-chassis',
          label: 'CHASSIS_GND',
          type: 'GROUND',
          pageNumber: 1,
          bbox: { x: 50, y: 50, width: 20, height: 20 },
          confidence: 0.9,
          status: 'CONFIRMED',
          terminalIds: ['tg-ch'],
          sourceEvidenceId: 'sg1',
          evidence: [],
        },
        {
          id: 'gnd-digital',
          label: 'DGND',
          type: 'GROUND',
          pageNumber: 1,
          bbox: { x: 150, y: 50, width: 20, height: 20 },
          confidence: 0.9,
          status: 'CONFIRMED',
          terminalIds: ['tg-dg'],
          sourceEvidenceId: 'sg2',
          evidence: [],
        },
      ],
      nets: [
        {
          id: 'net-gnd-mix',
          name: 'COMMON_GND',
          memberComponentIds: ['gnd-chassis', 'gnd-digital'],
          memberTerminalIds: ['tg-ch', 'tg-dg'],
          memberWireIds: [],
          pages: [1],
          connectivityConfidence: 0.9,
          evidenceReferences: [],
        },
      ],
    });
    const findings = rule.evaluate(posGraph);
    assert.equal(findings.length, 1);
    assert.equal(findings[0].severity, 'ADVISORY');
    assert.ok(findings[0].description.includes('couples distinct ground reference symbols') || findings[0].title.includes('Coupled Ground Regimes'));

    // Negative: Single ground regime
    const negGraph = createDeterministicTestGraph({
      components: [
        posGraph.components[0],
        { ...posGraph.components[1], label: 'CHASSIS_GND_2' },
      ],
      nets: posGraph.nets,
    });
    assert.equal(rule.evaluate(negGraph).length, 0);
  });

  await t.test('Rules: RULE-019 Missing Overcurrent Protection Rating - Positive & Negative', () => {
    const rule = registry.get('RULE-019')!;

    // Positive: Fuse without rating
    const posGraph = createDeterministicTestGraph({
      components: [
        {
          id: 'f-norate',
          label: 'F1',
          type: 'FUSE',
          value: undefined, // Missing!
          pageNumber: 1,
          bbox: { x: 100, y: 100, width: 30, height: 20 },
          confidence: 0.9,
          status: 'CONFIRMED',
          terminalIds: [],
          sourceEvidenceId: 'sf',
          evidence: [],
        },
      ],
    });
    const findings = rule.evaluate(posGraph);
    assert.equal(findings.length, 1);
    assert.equal(findings[0].severity, 'MAJOR');
    assert.ok(findings[0].description.includes('has no specified current rating'));

    // Negative: Fuse with 20A rating
    const negGraph = createDeterministicTestGraph({
      components: [{ ...posGraph.components[0], value: '20A' }],
    });
    assert.equal(rule.evaluate(negGraph).length, 0);
  });

  await t.test('Rules: RULE-020 Connector Lacking Mating Harness Reference - Positive & Negative', () => {
    const rule = registry.get('RULE-020')!;

    // Positive: Active connector with >=2 wired pins lacking mating tag
    const posGraph = createDeterministicTestGraph({
      connectors: [
        {
          id: 'j-unref',
          reference: 'J99',
          type: 'HEADER',
          pinTerminalIds: ['tj-1', 'tj-2'],
          pageNumber: 1,
          bbox: { x: 100, y: 100, width: 30, height: 30 },
          confidence: 0.9,
          sourceEvidenceId: 'sj',
        },
      ],
      wires: [
        {
          id: 'w-j99-1',
          pageNumber: 1,
          geometry: { start: { x: 100, y: 100 }, end: { x: 200, y: 100 } },
          connectedTerminalIds: ['tj-1'],
          confidence: 0.9,
          status: 'CONFIRMED',
          sourceEvidenceId: 'sw1',
          evidence: [],
        },
        {
          id: 'w-j99-2',
          pageNumber: 1,
          geometry: { start: { x: 100, y: 110 }, end: { x: 200, y: 110 } },
          connectedTerminalIds: ['tj-2'],
          confidence: 0.9,
          status: 'CONFIRMED',
          sourceEvidenceId: 'sw2',
          evidence: [],
        },
      ],
    });
    const findings = rule.evaluate(posGraph);
    assert.equal(findings.length, 1);
    assert.equal(findings[0].severity, 'ADVISORY');
    assert.ok(findings[0].description.includes('declare a mating connector reference'));

    // Negative: Connector with mating harness tag
    const negGraph = createDeterministicTestGraph({
      ...posGraph,
      connectors: [
        { ...posGraph.connectors[0], reference: 'J99_TO_HARN_MAIN' },
      ],
    });
    assert.equal(rule.evaluate(negGraph).length, 0);
  });

  // =========================================================================
  // 4. Property & Invariant Testing
  // =========================================================================
  await t.test('Invariants: 1. Determinism - 3 repeat evaluations produce bit-identical fingerprints and counts', () => {
    const complexGraph = createDeterministicTestGraph({
      components: [
        {
          id: 'c1',
          label: 'K1',
          type: 'RELAY',
          pageNumber: 1,
          bbox: { x: 100, y: 100, width: 30, height: 30 },
          confidence: 0.9,
          status: 'CONFIRMED',
          terminalIds: ['t1'],
          sourceEvidenceId: 's1',
          evidence: [],
        },
        {
          id: 'c2',
          label: 'F1',
          type: 'FUSE',
          pageNumber: 1,
          bbox: { x: 200, y: 100, width: 30, height: 30 },
          confidence: 0.9,
          status: 'CONFIRMED',
          terminalIds: ['t2'],
          sourceEvidenceId: 's2',
          evidence: [],
        },
      ],
      terminals: [
        {
          id: 't1',
          componentId: 'c1',
          terminalName: '85',
          position: { x: 100, y: 100 },
          pageNumber: 1,
          confidence: 0.9,
          status: 'CONFIRMED',
          sourceEvidenceId: 'st1',
        },
        {
          id: 't2',
          componentId: 'c2',
          terminalName: '1',
          position: { x: 200, y: 100 },
          pageNumber: 1,
          confidence: 0.9,
          status: 'CONFIRMED',
          sourceEvidenceId: 'st2',
        },
      ],
      wires: [
        {
          id: 'w1',
          pageNumber: 1,
          geometry: { start: { x: 100, y: 100 }, end: { x: 500, y: 100 } },
          connectedTerminalIds: ['t1'], // Dangling other end
          confidence: 0.9,
          status: 'CONFIRMED',
          sourceEvidenceId: 'sw1',
          evidence: [],
        },
      ],
      nets: [
        {
          id: 'net-1',
          name: 'NET1',
          memberTerminalIds: ['t1'],
          memberComponentIds: ['c1'],
          memberWireIds: ['w1'],
          pages: [1],
          connectivityConfidence: 0.9,
          evidenceReferences: [],
        },
      ],
    });

    const run1 = evaluator.evaluate(complexGraph);
    const run2 = evaluator.evaluate(complexGraph);
    const run3 = evaluator.evaluate(complexGraph);

    assert.equal(run1.findings.length, run2.findings.length);
    assert.equal(run2.findings.length, run3.findings.length);

    for (let i = 0; i < run1.findings.length; i++) {
      assert.equal(run1.findings[i].ruleId, run2.findings[i].ruleId);
      assert.equal(
        run1.findings[i].evidence.deterministicFingerprint,
        run2.findings[i].evidence.deterministicFingerprint
      );
      assert.equal(
        run2.findings[i].evidence.deterministicFingerprint,
        run3.findings[i].evidence.deterministicFingerprint
      );
    }
  });

  await t.test('Invariants: 2. Symmetry - Permuting entity order does not alter semantic findings', () => {
    const compA: GraphComponent = {
      id: 'cA',
      label: 'K1',
      type: 'RELAY',
      pageNumber: 1,
      bbox: { x: 100, y: 100, width: 30, height: 30 },
      confidence: 0.9,
      status: 'CONFIRMED',
      terminalIds: ['tA'],
      sourceEvidenceId: 'sA',
      evidence: [],
    };
    const compB: GraphComponent = {
      id: 'cB',
      label: 'F1',
      type: 'FUSE',
      pageNumber: 1,
      bbox: { x: 200, y: 100, width: 30, height: 30 },
      confidence: 0.9,
      status: 'CONFIRMED',
      terminalIds: ['tB'],
      sourceEvidenceId: 'sB',
      evidence: [],
    };

    const graphOriginal = createDeterministicTestGraph({
      components: [compA, compB],
    });
    const graphReversed = createDeterministicTestGraph({
      components: [compB, compA],
    });

    const res1 = evaluator.evaluate(graphOriginal);
    const res2 = evaluator.evaluate(graphReversed);

    // Rule violation set should be identical
    const violations1 = res1.findings.filter((f) => f.status === 'VIOLATION').map((f) => f.ruleId).sort();
    const violations2 = res2.findings.filter((f) => f.status === 'VIOLATION').map((f) => f.ruleId).sort();
    assert.deepEqual(violations1, violations2);
  });

  await t.test('Invariants: 3. No Phantom Findings - Removing unrelated clean component preserves existing findings', () => {
    const danglingWire: GraphWire = {
      id: 'w-dang',
      pageNumber: 1,
      geometry: { start: { x: 100, y: 100 }, end: { x: 400, y: 100 } },
      connectedTerminalIds: [],
      confidence: 0.9,
      status: 'CONFIRMED',
      sourceEvidenceId: 'swd',
      evidence: [],
    };

    const cleanResistor: GraphComponent = {
      id: 'r-clean',
      label: 'R1',
      type: 'RESISTOR',
      pageNumber: 1,
      bbox: { x: 800, y: 800, width: 30, height: 20 },
      confidence: 0.9,
      status: 'CONFIRMED',
      terminalIds: [],
      sourceEvidenceId: 'sr',
      evidence: [],
    };

    const graphWithClean = createDeterministicTestGraph({
      wires: [danglingWire],
      components: [cleanResistor],
    });
    const graphWithoutClean = createDeterministicTestGraph({
      wires: [danglingWire],
      components: [],
    });

    const resWith = evaluator.evaluate(graphWithClean);
    const resWithout = evaluator.evaluate(graphWithoutClean);

    const danglingWith = resWith.findings.find((f) => f.ruleId === 'RULE-001');
    const danglingWithout = resWithout.findings.find((f) => f.ruleId === 'RULE-001');

    assert.ok(danglingWith);
    assert.ok(danglingWithout);
    assert.equal(
      danglingWith.evidence.deterministicFingerprint,
      danglingWithout.evidence.deterministicFingerprint
    );
  });

  await t.test('Invariants: 4. Fail-closed on missing quality gates', () => {
    const badGraph = createDeterministicTestGraph({
      sourceSha256: 'invalid-sha', // Not 64 hex chars
    });

    const result = evaluator.evaluate(badGraph);
    assert.equal(result.totalRulesEvaluated, 0);
    assert.equal(result.findings.length, 1);
    assert.equal(result.findings[0].ruleId, 'GATE-001');
    assert.equal(result.findings[0].status, 'NOT_EVALUABLE');
  });

  // =========================================================================
  // 5. Performance Benchmarking on Scaled Graphs
  // =========================================================================
  await t.test('Performance: Evaluator processes scaled graph (50 comps, 100 wires) in under 100ms', () => {
    const components: GraphComponent[] = [];
    const terminals: GraphTerminal[] = [];
    const wires: GraphWire[] = [];
    const nets: GraphNet[] = [];

    for (let i = 0; i < 50; i++) {
      const compId = `comp-${i}`;
      const termId1 = `term-${i}-1`;
      const termId2 = `term-${i}-2`;

      components.push({
        id: compId,
        label: `R${i + 1}`,
        type: 'RESISTOR',
        pageNumber: 1,
        bbox: { x: (i * 15) % 900, y: Math.floor(i / 10) * 100, width: 20, height: 20 },
        confidence: 0.9,
        status: 'CONFIRMED',
        terminalIds: [termId1, termId2],
        sourceEvidenceId: `src-${i}`,
        evidence: [],
      });

      terminals.push(
        {
          id: termId1,
          componentId: compId,
          terminalName: '1',
          position: { x: (i * 15) % 900, y: Math.floor(i / 10) * 100 },
          pageNumber: 1,
          confidence: 0.9,
          status: 'CONFIRMED',
          sourceEvidenceId: `st-${i}-1`,
        },
        {
          id: termId2,
          componentId: compId,
          terminalName: '2',
          position: { x: (i * 15) % 900 + 20, y: Math.floor(i / 10) * 100 },
          pageNumber: 1,
          confidence: 0.9,
          status: 'CONFIRMED',
          sourceEvidenceId: `st-${i}-2`,
        }
      );
    }

    for (let i = 0; i < 100; i++) {
      const wireId = `wire-${i}`;
      const term1 = terminals[i % terminals.length].id;
      const term2 = terminals[(i + 1) % terminals.length].id;

      wires.push({
        id: wireId,
        pageNumber: 1,
        geometry: { start: { x: 100, y: 100 }, end: { x: 200, y: 200 } },
        connectedTerminalIds: [term1, term2],
        gauge: '18 AWG',
        confidence: 0.9,
        status: 'CONFIRMED',
        sourceEvidenceId: `sw-${i}`,
        evidence: [],
      });
    }

    for (let i = 0; i < 25; i++) {
      nets.push({
        id: `net-${i}`,
        name: `BUS_${i}`,
        memberComponentIds: [components[i].id, components[i + 1].id],
        memberTerminalIds: [terminals[i * 2].id, terminals[i * 2 + 1].id],
        memberWireIds: [wires[i].id],
        pages: [1],
        connectivityConfidence: 0.9,
        evidenceReferences: [],
      });
    }

    const largeGraph = createDeterministicTestGraph({
      components,
      terminals,
      wires,
      nets,
    });

    const startTime = Date.now();
    const result = evaluator.evaluate(largeGraph);
    const durationMs = Date.now() - startTime;

    assert.ok(durationMs < 100, `Evaluation must complete in under 100ms (took ${durationMs}ms)`);
    assert.equal(result.totalRulesEvaluated, 20);
    assert.ok(result.findings.length > 0);
  });

  // =========================================================================
  // 6. Tenant Isolation Regression
  // =========================================================================
  await t.test('Security: Tenant isolation prevents cross-tenant finding injection or query', async () => {
    const tenantA = await prisma.tenant.create({
      data: { name: 'Phase5 Tenant Alpha', slug: `phase5-a-${Date.now()}` },
    });
    const tenantB = await prisma.tenant.create({
      data: { name: 'Phase5 Tenant Beta', slug: `phase5-b-${Date.now()}` },
    });

    const _userA = await prisma.user.create({
      data: {
        email: `alice-${Date.now()}@tenant-a.com`,
        passwordHash: 'dummy-hash',
        name: 'Alice A',
        tenantId: tenantA.id,
        role: 'QC_INSPECTOR',
      },
    });

    const projectA = await prisma.project.create({
      data: { tenantId: tenantA.id, name: 'Project Alpha' },
    });

    const docA = await prisma.document.create({
      data: {
        tenantId: tenantA.id,
        projectId: projectA.id,
        filename: 'wiring-a.pdf',
        mimeType: 'application/pdf',
        sizeBytes: 1024,
        storageKey: `tenants/${tenantA.id}/doc.pdf`,
        status: 'READY_FOR_PREFLIGHT',
      },
    });

    const docVersionA = await prisma.documentVersion.create({
      data: {
        documentId: docA.id,
        version: 1,
        storageKey: `tenants/${tenantA.id}/doc.pdf`,
        sizeBytes: 1024,
        sha256: crypto.createHash('sha256').update('doc-a-bytes').digest('hex'),
        processingStatus: 'READY_FOR_GRAPH',
      },
    });

    // Create Rule and Finding for Tenant A
    const ruleDb = await prisma.rule.upsert({
      where: { code: 'RULE-001' },
      create: { code: 'RULE-001', name: 'Dangling Wire Endpoint', version: '1.0.0' },
      update: {},
    });

    const findingA = await prisma.finding.create({
      data: {
        documentVersionId: docVersionA.id,
        ruleId: ruleDb.id,
        status: 'UNREVIEWED',
        severity: 'MAJOR',
        description: 'Dangling wire endpoint detected on wire w1',
        confidence: 0.95,
      },
    });

    // Verify finding belongs to Tenant A's documentVersion
    const fetchedFinding = await prisma.finding.findFirst({
      where: {
        id: findingA.id,
        documentVersion: {
          document: {
            tenantId: tenantB.id, // Attempt to query with Tenant B boundary
          },
        },
      },
    });

    assert.equal(fetchedFinding, null, 'Tenant B query must return null for Tenant A finding');
  });
});
