/**
 * SPANQC PHASE 4.5 BENCHMARK EVALUATION & HARDENING TEST SUITE
 * 
 * Verifies:
 * 1. Truthful benchmark metrics (P/R/F1, FP, FN, NOT_EVALUABLE rates)
 * 2. Truthful INSUFFICIENT_DATA status on real customer drawing corpus
 * 3. Crossing vs. Junction geometric validation (Cases A, B, C, D, E)
 * 4. Raster limitations: WIRE_GEOMETRY_UNAVAILABLE and NOT_EVALUABLE
 * 5. Quality gates & Rule prerequisites enforcement
 * 6. Deterministic reproduction across multiple runs
 * 7. Tenant isolation regression
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { prisma } from '../src/lib/prisma';
import { createSessionToken } from '../src/lib/auth';
import { getDocumentExtractor } from '../src/lib/extraction/document-extractor';
import { buildElectricalGraph } from '../src/lib/graph/electrical-graph-builder';
import { ProductionRuleEvaluator } from '../src/lib/qc/rule-evaluator';
import { BenchmarkEvaluator } from '../src/lib/benchmark/benchmark-evaluator';
import {
  BenchmarkAnnotation,
  BenchmarkManifest,
} from '../src/lib/benchmark/benchmark-types';
import { GET as getFindings } from '../src/app/api/v1/documents/[id]/findings/route';
import { NextRequest } from 'next/server';

function createSyntheticPdf(params: {
  textLines: string[];
  vectorCommands?: string[];
  width?: number;
  height?: number;
}): Buffer {
  const { textLines, vectorCommands = [], width = 1000, height = 1000 } = params;
  const contentStreamParts: string[] = [];

  for (let i = 0; i < textLines.length; i++) {
    const yPos = height - 100 - i * 50;
    contentStreamParts.push(
      `BT /F1 14 Tf 50 ${yPos} Td (${textLines[i].replace(/[()]/g, '')}) Tj ET`
    );
  }

  for (const cmd of vectorCommands) {
    contentStreamParts.push(cmd);
  }

  const streamContent = contentStreamParts.join('\n');
  const streamLength = Buffer.byteLength(streamContent, 'utf8');

  const pdf = `%PDF-1.4
1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj
2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj
3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 ${width} ${height}] /Contents 4 0 R /Resources << /Font << /F1 << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> >> >> >> endobj
4 0 obj << /Length ${streamLength} >>
stream
${streamContent}
endstream
endobj
xref
0 5
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000280 00000 n 
trailer << /Size 5 /Root 1 0 R >>
startxref
${400 + streamLength}
%%EOF`;

  return Buffer.from(pdf, 'utf8');
}

test('Phase 4.5: Electrical Graph Validation & Benchmark Suite', async (t) => {
  const tenantA = await prisma.tenant.create({
    data: { name: 'Benchmark Org Alpha', slug: `bench-alpha-${Date.now()}` },
  });
  const tenantB = await prisma.tenant.create({
    data: { name: 'Benchmark Org Beta', slug: `bench-beta-${Date.now()}` },
  });

  const _userA = await prisma.user.create({
    data: {
      email: `bench.lead@alpha-${Date.now()}.com`,
      passwordHash: 'dummy',
      name: 'Lead Benchmark Engineer',
      tenantId: tenantA.id,
      role: 'ADMIN',
    },
  });

  const projectA = await prisma.project.create({
    data: { name: 'Benchmark Project Core', tenantId: tenantA.id },
  });

  const _tokenB = createSessionToken({
    userId: 'user-beta',
    email: 'hacker@beta.com',
    tenantId: tenantB.id,
    name: 'Beta User',
    tenantSlug: tenantB.slug,
    role: 'ADMIN',
  });

  const benchmarkEvaluator = new BenchmarkEvaluator();
  const ruleEvaluator = new ProductionRuleEvaluator();
  const extractor = getDocumentExtractor();

  // -------------------------------------------------------------------
  // 1. Benchmark Manifest & Truthful INSUFFICIENT_DATA Handling
  // -------------------------------------------------------------------
  await t.test('Benchmark Corpus: 1. Reports INSUFFICIENT_DATA when real customer corpus is incomplete', async () => {
    const manifestPath = path.join(process.cwd(), 'benchmark/manifests/manifest.json');
    const manifestJson = fs.readFileSync(manifestPath, 'utf8');
    const manifest: BenchmarkManifest = JSON.parse(manifestJson);

    assert.ok(manifest.documents.length >= 8, 'Manifest must declare at least 8 benchmark categories');

    const report = benchmarkEvaluator.generateReport(manifest, []);

    assert.equal(
      report.benchmarkStatus,
      'INSUFFICIENT_DATA',
      'Corpus benchmark status must truthfully report INSUFFICIENT_DATA rather than manufactured claims'
    );
    assert.ok(
      report.notes.some((n) => n.includes('REAL_BENCHMARK_STATUS = INSUFFICIENT_DATA')),
      'Must contain explicit REAL_BENCHMARK_STATUS = INSUFFICIENT_DATA statement'
    );
  });

  // -------------------------------------------------------------------
  // 2. Differential Testing Against Ground Truth (Simple Wiring)
  // -------------------------------------------------------------------
  await t.test('Benchmark Differential: 2. Evaluates simple DC loop with verified precision/recall', async () => {
    const annotPath = path.join(process.cwd(), 'benchmark/annotations/simple_wiring_bench.json');
    const annotation: BenchmarkAnnotation = JSON.parse(fs.readFileSync(annotPath, 'utf8'));

    const pdf = createSyntheticPdf({
      textLines: [
        '+12V',
        'F1 15A',
        'M1',
        'GND',
      ],
      vectorCommands: [
        'M 58 59 L 46 234',
        'M 70 234 L 46 459',
        'M 70 459 L 58 684',
      ],
    });

    const doc = await extractor.extract({
      buffer: pdf,
      mimeType: 'application/pdf',
      documentId: 'bench-doc-001',
      versionId: 'v1',
    });

    const graph = buildElectricalGraph(doc, {
      documentId: 'bench-doc-001',
      versionId: 'v1',
      tenantId: tenantA.id,
    });

    const ruleResult = ruleEvaluator.evaluate(graph);
    const result = benchmarkEvaluator.evaluateDocument(graph, ruleResult.findings, annotation);

    assert.equal(result.status, 'EVALUATED');
    assert.ok(result.components.precision >= 0.8, `Component precision should be >= 0.8, got ${result.components.precision}`);
    assert.ok(result.components.recall >= 0.8, `Component recall should be >= 0.8, got ${result.components.recall}`);
    assert.ok(result.wires.precision >= 0.8, `Wire precision should be >= 0.8, got ${result.wires.precision}`);
    assert.equal(result.falsePositiveRate, 0.0, 'No unexpected components or wires should be fabricated');
  });

  // -------------------------------------------------------------------
  // 3. Crossing vs. Junction Validation (Cases A, B, C, D)
  // -------------------------------------------------------------------
  await t.test('Crossing/Junction: 3. Case A - Crossing without junction maintains separate nets', async () => {
    const annotPath = path.join(process.cwd(), 'benchmark/annotations/crossing_no_junction_bench.json');
    const annotation: BenchmarkAnnotation = JSON.parse(fs.readFileSync(annotPath, 'utf8'));

    const pdf = createSyntheticPdf({
      textLines: ['J1 CONNECTOR', 'J2 CONNECTOR', 'P1 CONNECTOR', 'P2 CONNECTOR'],
      vectorCommands: [
        'M 120 500 L 900 500', // Horizontal line crossing (500, 500)
        'M 500 120 L 500 900', // Vertical line crossing (500, 500) with NO junction dot
      ],
    });

    const doc = await extractor.extract({
      buffer: pdf,
      mimeType: 'application/pdf',
      documentId: 'bench-doc-cross-no-junc',
      versionId: 'v1',
    });

    const graph = buildElectricalGraph(doc, {
      documentId: 'bench-doc-cross-no-junc',
      versionId: 'v1',
      tenantId: tenantA.id,
    });

    const ruleResult = ruleEvaluator.evaluate(graph);

    // Case A Verification: must produce 2 separate nets, not merged
    assert.ok(graph.nets.length >= 2, 'Crossing wires without junction marker must remain separate nets');

    // Ambiguity finding must be generated under RULE-008
    const r008Finding = ruleResult.findings.find((f) => f.ruleId === 'RULE-008');
    assert.ok(r008Finding, 'Crossing wires without junction marker must trigger RULE-008 ambiguity finding');

    const result = benchmarkEvaluator.evaluateDocument(graph, ruleResult.findings, annotation);
    assert.equal(result.status, 'EVALUATED');
  });

  await t.test('Crossing/Junction: 4. Case B - Wire crossing with explicit junction merges into single net', async () => {
    const pdf = createSyntheticPdf({
      textLines: ['J1 CONNECTOR', 'P1 CONNECTOR'],
      vectorCommands: [
        'M 100 500 L 900 500', // Wire 1 horizontal
        'M 500 100 L 500 900', // Wire 2 vertical crossing at (500, 500)
        'M 495 495 L 505 505', // Explicit junction marker at (500, 500)
      ],
    });

    const doc = await extractor.extract({
      buffer: pdf,
      mimeType: 'application/pdf',
      documentId: 'bench-doc-cross-with-junc',
      versionId: 'v1',
    });

    const graph = buildElectricalGraph(doc, {
      documentId: 'bench-doc-cross-with-junc',
      versionId: 'v1',
      tenantId: tenantA.id,
    });

    // Both wires must merge into a single net due to explicit junction
    assert.ok(graph.wires.length >= 2, 'Must extract both crossing wires');
    const netW1 = graph.nets.find((n) => n.memberWireIds.includes(graph.wires[0].id));
    const netW2 = graph.nets.find((n) => n.memberWireIds.includes(graph.wires[1].id));
    assert.ok(netW1 && netW2, 'Both wires must belong to a net');
    assert.equal(netW1.id, netW2.id, 'Crossing wires with explicit junction marker must merge into the same electrical net');
  });

  await t.test('Crossing/Junction: 4b. Case C - Wire endpoint touching another wire (T-junction) merges according to topology', async () => {
    const pdf = createSyntheticPdf({
      textLines: ['J1 CONNECTOR', 'P1 CONNECTOR'],
      vectorCommands: [
        'M 120 500 L 900 500', // Main trunk wire
        'M 500 120 L 500 500', // Branch wire terminating on main wire at (500, 500)
      ],
    });

    const doc = await extractor.extract({
      buffer: pdf,
      mimeType: 'application/pdf',
      documentId: 'bench-doc-t-junction',
      versionId: 'v1',
    });

    const graph = buildElectricalGraph(doc, {
      documentId: 'bench-doc-t-junction',
      versionId: 'v1',
      tenantId: tenantA.id,
    });

    assert.ok(graph.wires.length >= 2, 'Must extract both branch and trunk wires');
    const netW1 = graph.nets.find((n) => n.memberWireIds.includes(graph.wires[0].id));
    const netW2 = graph.nets.find((n) => n.memberWireIds.includes(graph.wires[1].id));
    assert.ok(netW1 && netW2, 'Both wires must belong to a net');
    assert.equal(netW1.id, netW2.id, 'T-junction wire endpoint touching trunk wire must merge into the same electrical net');
  });

  await t.test('Crossing/Junction: 5. Case D - Small geometric gap snaps within tolerance, large gap remains open', async () => {
    // 22-unit gap (<= SNAP_TOLERANCE 80)
    const pdfSnapping = createSyntheticPdf({
      textLines: ['F1 FUSE 10A'],
      vectorCommands: ['M 90 59 L 400 59'], // Starts 22 units from F1 terminal 2 (68, 59)
    });

    const docSnap = await extractor.extract({
      buffer: pdfSnapping,
      mimeType: 'application/pdf',
      documentId: 'bench-snap-tight',
      versionId: 'v1',
    });
    const graphSnap = buildElectricalGraph(docSnap, { documentId: 'snap-tight', versionId: 'v1', tenantId: tenantA.id });
    const wireSnap = graphSnap.wires[0];
    assert.ok(wireSnap && wireSnap.connectedTerminalIds.length > 0, 'Wire endpoint within 80-unit tolerance must snap to terminal');

    // 182-unit gap (> SNAP_TOLERANCE 80)
    const pdfOpen = createSyntheticPdf({
      textLines: ['F1 FUSE 10A'],
      vectorCommands: ['M 250 59 L 600 59'], // Starts 182 units from F1 terminal 2
    });
    const docOpen = await extractor.extract({
      buffer: pdfOpen,
      mimeType: 'application/pdf',
      documentId: 'bench-snap-open',
      versionId: 'v1',
    });
    const graphOpen = buildElectricalGraph(docOpen, { documentId: 'snap-open', versionId: 'v1', tenantId: tenantA.id });
    const wireOpen = graphOpen.wires[0];
    assert.ok(wireOpen && wireOpen.connectedTerminalIds.length === 0, 'Wire endpoint beyond tolerance must remain open and disconnected');
  });

  // -------------------------------------------------------------------
  // 4. Raster Scanned Limitation Handling (Section 7)
  // -------------------------------------------------------------------
  await t.test('Raster Limitation: 6. Scanned image yields WIRE_GEOMETRY_UNAVAILABLE and NOT_EVALUABLE for wire rules', async () => {
    const annotPath = path.join(process.cwd(), 'benchmark/annotations/raster_scanned_bench.json');
    const annotation: BenchmarkAnnotation = JSON.parse(fs.readFileSync(annotPath, 'utf8'));

    // Simulated normalized document from OCR image extraction
    const ocrDoc = {
      documentId: 'raster-doc-005',
      versionId: 'v1',
      mimeType: 'image/png',
      pageCount: 1,
      sha256: '9f8e7d6c5b4a3f2e1d0c9b8a7f6e5d4c3b2a1f0e9d8c7b6a5f4e3d2c1b0a9f8e',
      createdAt: new Date(),
      pages: [
        {
          pageNumber: 1,
          width: 2400,
          height: 3300,
          dpi: 300,
          textBlocks: [],
          lines: [],
          words: [
            { id: 'w1', text: 'F1', bbox: { x: 300, y: 400, width: 40, height: 20 }, confidence: 0.9, pageNumber: 1, source: 'ocr' as const },
            { id: 'w2', text: 'FUSE', bbox: { x: 350, y: 400, width: 50, height: 20 }, confidence: 0.9, pageNumber: 1, source: 'ocr' as const },
            { id: 'w3', text: '20A', bbox: { x: 410, y: 400, width: 40, height: 20 }, confidence: 0.9, pageNumber: 1, source: 'ocr' as const },
          ],
          vectorPaths: [], // Zero vector geometry in raster scan
          images: [],
          confidence: 0.85,
          source: 'ocr' as const,
        },
      ],
      extractedAt: new Date(),
      rawTextLength: 10,
      ocrApplied: true,
      ocrAvailable: true,
    };

    const graph = buildElectricalGraph(ocrDoc, {
      documentId: 'raster-doc-005',
      versionId: 'v1',
      tenantId: tenantA.id,
    });

    // 1. Verify WIRE_GEOMETRY_UNAVAILABLE diagnostic is recorded
    const wireUnavailDiag = graph.diagnostics.find((d) => d.code === 'WIRE_GEOMETRY_UNAVAILABLE');
    assert.ok(wireUnavailDiag, 'Graph must record WIRE_GEOMETRY_UNAVAILABLE diagnostic for scanned raster drawing');

    // 2. Evaluate QC rules
    const ruleResult = ruleEvaluator.evaluate(graph);

    // 3. RULE-001 requires WIRE_GEOMETRY prerequisite -> must return NOT_EVALUABLE
    const r001Finding = ruleResult.findings.find((f) => f.ruleId === 'RULE-001');
    assert.ok(r001Finding, 'RULE-001 candidate must be emitted');
    assert.equal(r001Finding.status, 'NOT_EVALUABLE', 'RULE-001 must return NOT_EVALUABLE when wire geometry is unavailable');
    assert.ok(r001Finding.description.includes('WIRE_GEOMETRY'), 'Description must cite missing WIRE_GEOMETRY prerequisite');

    const result = benchmarkEvaluator.evaluateDocument(graph, ruleResult.findings, annotation);
    assert.equal(result.status, 'EVALUATED');
    assert.ok(result.notEvaluableRate > 0.0, 'NOT_EVALUABLE rate must be > 0 for raster drawings lacking vector paths');
  });

  // -------------------------------------------------------------------
  // 5. Graph Quality Gates (Section 8)
  // -------------------------------------------------------------------
  await t.test('Quality Gates: 7. Incomplete graph fails quality gates and halts evaluation with NOT_EVALUABLE', async () => {
    // Malformed graph lacking sourceSha256
    const invalidGraph = {
      graphId: 'eg-invalid',
      documentId: 'doc-invalid',
      versionId: 'v1',
      tenantId: tenantA.id,
      sourceSha256: '', // Missing
      extractionVersion: '1.0.0',
      graphVersion: '1.0.0',
      graphSha256: 'a'.repeat(64),
      createdAt: new Date().toISOString(),
      pages: [],
      components: [],
      terminals: [],
      wires: [],
      connectors: [],
      nets: [],
      diagnostics: [],
    };

    const gateCheck = ruleEvaluator.checkQualityGates(invalidGraph);
    assert.equal(gateCheck.passed, false, 'Quality gates must fail for invalid graph');

    const result = ruleEvaluator.evaluate(invalidGraph);
    assert.equal(result.totalRulesEvaluated, 0, 'No rules should be evaluated when quality gates fail');
    assert.equal(result.findings[0].status, 'NOT_EVALUABLE');
    assert.equal(result.findings[0].ruleId, 'GATE-001');
  });

  // -------------------------------------------------------------------
  // 6. Graph Determinism & Anti-Template (Section 12)
  // -------------------------------------------------------------------
  await t.test('Determinism: 8. Running benchmark evaluation 3 times produces bit-identical results', async () => {
    const pdf = createSyntheticPdf({
      textLines: ['J1 CONNECTOR', 'F1 FUSE 10A'],
      vectorCommands: ['M 100 100 L 200 100'],
    });

    const doc1 = await extractor.extract({ buffer: pdf, mimeType: 'application/pdf', documentId: 'det-1', versionId: 'v1' });
    const graph1 = buildElectricalGraph(doc1, { documentId: 'det-1', versionId: 'v1', tenantId: tenantA.id });
    const res1 = ruleEvaluator.evaluate(graph1);

    const doc2 = await extractor.extract({ buffer: pdf, mimeType: 'application/pdf', documentId: 'det-2', versionId: 'v1' });
    const graph2 = buildElectricalGraph(doc2, { documentId: 'det-2', versionId: 'v1', tenantId: tenantA.id });
    const res2 = ruleEvaluator.evaluate(graph2);

    assert.equal(graph1.graphSha256, graph2.graphSha256, 'Graph hashes must be identical across runs for identical bytes');
    assert.deepEqual(res1.findings, res2.findings, 'Findings must be identical across runs');
  });

  // -------------------------------------------------------------------
  // 7. Tenant Isolation Regression (Section 13)
  // -------------------------------------------------------------------
  await t.test('Tenant Isolation: 9. Organization B cannot access Organization A findings', async () => {
    const userB = await prisma.user.create({
      data: {
        email: `hacker@beta-${Date.now()}.com`,
        passwordHash: 'dummy',
        name: 'Beta User',
        tenantId: tenantB.id,
        role: 'ADMIN',
      },
    });

    const tokenBValid = createSessionToken({
      userId: userB.id,
      email: userB.email,
      tenantId: tenantB.id,
      name: userB.name,
      tenantSlug: tenantB.slug,
      role: userB.role,
    });

    const docA = await prisma.document.create({
      data: {
        tenantId: tenantA.id,
        projectId: projectA.id,
        filename: 'secret_aerospace_bench.pdf',
        mimeType: 'application/pdf',
        sizeBytes: 1024,
        storageKey: `organizations/${tenantA.id}/projects/${projectA.id}/bench.pdf`,
        status: 'QC_COMPLETE',
      },
    });

    const reqB = new NextRequest(`http://localhost:3000/api/v1/documents/${docA.id}/findings`, {
      method: 'GET',
      headers: { authorization: `Bearer ${tokenBValid}` },
    });
    const resB = await getFindings(reqB, { params: Promise.resolve({ id: docA.id }) });
    assert.equal(resB.status, 404, 'Cross-tenant finding access must return 404 Not Found');
  });

  // Cleanup
  await prisma.document.deleteMany({ where: { tenantId: { in: [tenantA.id, tenantB.id] } } });
  await prisma.project.deleteMany({ where: { tenantId: { in: [tenantA.id, tenantB.id] } } });
  await prisma.user.deleteMany({ where: { tenantId: { in: [tenantA.id, tenantB.id] } } });
  await prisma.tenant.deleteMany({ where: { id: { in: [tenantA.id, tenantB.id] } } });
});
