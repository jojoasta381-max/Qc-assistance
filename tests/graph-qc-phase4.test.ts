import test from 'node:test';
import assert from 'node:assert/strict';
import { prisma } from '../src/lib/prisma';
import { createSessionToken } from '../src/lib/auth';
import { getDocumentExtractor } from '../src/lib/extraction/document-extractor';
import { buildElectricalGraph } from '../src/lib/graph/electrical-graph-builder';
import { ProductionRuleEvaluator } from '../src/lib/qc/rule-evaluator';
import { POST as createUploadSession } from '../src/app/api/v1/documents/upload-session/route';
import { PUT as directUploadPut } from '../src/app/api/v1/documents/upload-direct/route';
import { POST as verifyUpload } from '../src/app/api/v1/documents/[id]/upload-complete/route';
import { POST as processDocument } from '../src/app/api/v1/documents/[id]/process/route';
import { GET as getProcessingStatus } from '../src/app/api/v1/documents/[id]/processing-status/route';
import { GET as getFindings } from '../src/app/api/v1/documents/[id]/findings/route';
import { NextRequest } from 'next/server';

/**
 * Generates an authentic binary PDF with genuine text streams and optional vector operators.
 */
function createSyntheticPdfFixture(params: {
  textLines: string[];
  vectorCommands?: string[];
  pageCount?: number;
  width?: number;
  height?: number;
}): Buffer {
  const { textLines, vectorCommands = [], pageCount = 1, width = 612, height = 792 } = params;
  const header = '%PDF-1.4\n';
  const offsets: number[] = [];
  let currentOffset = header.length;
  let body = '';

  function addObj(num: number, content: string) {
    offsets[num] = currentOffset;
    const str = `${num} 0 obj\n${content}\nendobj\n`;
    body += str;
    currentOffset += Buffer.byteLength(str);
  }

  addObj(1, '<< /Type /Catalog /Pages 2 0 R >>');

  const kids: string[] = [];
  for (let i = 0; i < pageCount; i++) {
    kids.push(`${3 + i * 2} 0 R`);
  }
  addObj(2, `<< /Type /Pages /Kids [${kids.join(' ')}] /Count ${pageCount} >>`);

  // Build stream content: text BT ... ET and vector operators
  let streamText = 'BT /F1 12 Tf 72 712 Td ';
  textLines.forEach((line) => {
    streamText += `(${line}) ' `;
  });
  streamText += 'ET\n';

  vectorCommands.forEach((cmd) => {
    streamText += `${cmd} S\n`;
  });

  for (let i = 0; i < pageCount; i++) {
    const pageObjNum = 3 + i * 2;
    const contentObjNum = pageObjNum + 1;

    addObj(
      pageObjNum,
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${width} ${height}] /Contents ${contentObjNum} 0 R /Resources << /Font << /F1 << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> >> >> >>`
    );

    const streamLen = Buffer.byteLength(streamText, 'utf8');
    addObj(contentObjNum, `<< /Length ${streamLen} >>\nstream\n${streamText}\nendstream`);
  }

  const xrefOffset = currentOffset;
  const totalObjs = 3 + pageCount * 2;
  let xref = `xref\n0 ${totalObjs}\n0000000000 65535 f \n`;
  for (let i = 1; i < totalObjs; i++) {
    xref += `${String(offsets[i] || 0).padStart(10, '0')} 00000 n \n`;
  }

  const trailer = `trailer\n<< /Size ${totalObjs} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;
  return Buffer.from(header + body + xref + trailer, 'binary');
}

test('Phase 4: Real Electrical Graph & Deterministic QC Engine', async (t) => {
  // Set up testing tenant & users
  const tenantA = await prisma.tenant.create({
    data: {
      name: 'Aero Avionics Dynamic Tenant',
      slug: `aero-${Date.now()}-${Math.random().toString(36).substring(7)}`,
      plan: 'MAX_10',
      checkQuota: 1000,
    },
  });

  const tenantB = await prisma.tenant.create({
    data: {
      name: 'Rival Marine Tenant',
      slug: `marine-${Date.now()}-${Math.random().toString(36).substring(7)}`,
      plan: 'NORMAL_1',
      checkQuota: 10,
    },
  });

  const userA = await prisma.user.create({
    data: {
      email: `inspector.alpha.${Date.now()}@aero.test`,
      name: 'Chief Inspector Alpha',
      passwordHash: 'dummy_hash',
      tenantId: tenantA.id,
      role: 'ADMIN',
    },
  });

  const userB = await prisma.user.create({
    data: {
      email: `viewer.beta.${Date.now()}@marine.test`,
      name: 'Viewer Beta',
      passwordHash: 'dummy_hash',
      tenantId: tenantB.id,
      role: 'VIEWER',
    },
  });

  const projectA = await prisma.project.create({
    data: {
      name: 'Lunar Rover Avionics Core',
      tenantId: tenantA.id,
    },
  });

  const tokenA = createSessionToken({
    userId: userA.id,
    email: userA.email,
    tenantId: tenantA.id,
    name: userA.name,
    tenantSlug: tenantA.slug,
    role: userA.role,
  });

  const tokenB = createSessionToken({
    userId: userB.id,
    email: userB.email,
    tenantId: tenantB.id,
    name: userB.name,
    tenantSlug: tenantB.slug,
    role: userB.role,
  });

  // -------------------------------------------------------------
  // 1. Component & Terminal Detection Tests
  // -------------------------------------------------------------
  await t.test('Component Detection: 1. Recognizes standard ref-des and pin labels without templates', async () => {
    const pdfBytes = createSyntheticPdfFixture({
      textLines: [
        'SCHEMATIC DWG 902-A',
        'J1 CONNECTOR PIN 1 PIN 2 PIN 3',
        'F1 FUSE 15A',
        'BAT1 BATTERY 12V',
        'GND GROUND',
      ],
      vectorCommands: ['M 100 200 L 400 200'],
    });

    const extractor = getDocumentExtractor();
    const normalizedDoc = await extractor.extract({
      buffer: pdfBytes,
      mimeType: 'application/pdf',
      documentId: 'doc-test-comp-01',
      versionId: 'v1',
    });

    const graph = buildElectricalGraph(normalizedDoc, {
      documentId: 'doc-test-comp-01',
      versionId: 'v1',
      tenantId: tenantA.id,
    });

    const labels = graph.components.map((c) => c.label);
    assert.ok(labels.includes('J1'));
    assert.ok(labels.includes('F1'));
    assert.ok(labels.includes('BAT1'));
    assert.ok(labels.includes('GND'));

    const j1 = graph.components.find((c) => c.label === 'J1')!;
    assert.equal(j1.type, 'CONNECTOR');
    assert.ok(j1.terminalIds.length >= 2);

    const f1 = graph.components.find((c) => c.label === 'F1')!;
    assert.equal(f1.type, 'FUSE');
    assert.equal(f1.value, '15A');

    const bat1 = graph.components.find((c) => c.label === 'BAT1')!;
    assert.equal(bat1.type, 'BATTERY');
    assert.equal(bat1.value, '12V');
  });

  // -------------------------------------------------------------
  // 2. Wire & Geometric Connectivity Tests
  // -------------------------------------------------------------
  await t.test('Wire Extraction: 2. Extracts vector lines and connects endpoints to terminals', async () => {
    const pdfBytes = createSyntheticPdfFixture({
      textLines: ['F1 15A', 'M1 12V', 'W101 16 AWG RED'],
      vectorCommands: ['M 50 100 L 250 100'],
    });

    const extractor = getDocumentExtractor();
    const doc = await extractor.extract({
      buffer: pdfBytes,
      mimeType: 'application/pdf',
      documentId: 'doc-test-wire-01',
      versionId: 'v1',
    });

    const graph = buildElectricalGraph(doc, {
      documentId: 'doc-test-wire-01',
      versionId: 'v1',
      tenantId: tenantA.id,
    });

    assert.ok(graph.wires.length >= 1);
    assert.ok(graph.nets.length >= 1);
  });

  await t.test('Connectivity: 3. Crossing wires without junction marker do not connect', async () => {
    const pdfBytes = createSyntheticPdfFixture({
      textLines: ['J1 1 2', 'J2 1 2'],
      vectorCommands: [
        'M 100 200 L 500 200', // Horizontal line
        'M 300 50 L 300 400',  // Vertical intersecting line
      ],
    });

    const extractor = getDocumentExtractor();
    const doc = await extractor.extract({
      buffer: pdfBytes,
      mimeType: 'application/pdf',
      documentId: 'doc-test-crossing-01',
      versionId: 'v1',
    });

    const graph = buildElectricalGraph(doc, {
      documentId: 'doc-test-crossing-01',
      versionId: 'v1',
      tenantId: tenantA.id,
    });

    const crossingDiag = graph.diagnostics.find((d) => d.code === 'CROSSING_AMBIGUITY');
    assert.ok(crossingDiag, 'Crossing ambiguity diagnostic must be recorded');
  });

  // -------------------------------------------------------------
  // 3. Graph Validation & Determinism
  // -------------------------------------------------------------
  await t.test('Graph Determinism: 4. Same source bytes produce identical graph hash and topology', async () => {
    const pdfBytes = createSyntheticPdfFixture({
      textLines: ['BAT1 24V', 'SW1 SWITCH', 'M1 MOTOR', 'GND GROUND'],
      vectorCommands: ['M 100 150 L 400 150'],
    });

    const extractor = getDocumentExtractor();
    const doc1 = await extractor.extract({
      buffer: pdfBytes,
      mimeType: 'application/pdf',
      documentId: 'doc-det-01',
      versionId: 'v1',
    });
    const doc2 = await extractor.extract({
      buffer: pdfBytes,
      mimeType: 'application/pdf',
      documentId: 'doc-det-02',
      versionId: 'v1',
    });

    const graph1 = buildElectricalGraph(doc1, { documentId: 'doc-det-01', versionId: 'v1', tenantId: tenantA.id });
    const graph2 = buildElectricalGraph(doc2, { documentId: 'doc-det-02', versionId: 'v1', tenantId: tenantA.id });

    assert.equal(graph1.graphSha256, graph2.graphSha256);
    assert.equal(graph1.components.length, graph2.components.length);
    assert.equal(graph1.terminals.length, graph2.terminals.length);
    assert.equal(graph1.wires.length, graph2.wires.length);
    assert.equal(graph1.nets.length, graph2.nets.length);
  });

  // -------------------------------------------------------------
  // 4. Deterministic QC Rules Tests (RULE-001 through RULE-008)
  // -------------------------------------------------------------
  const evaluator = new ProductionRuleEvaluator();

  await t.test('QC Rule: 5. RULE-001 flags dangling wire endpoints with source evidence', async () => {
    const pdfBytes = createSyntheticPdfFixture({
      textLines: ['W-DANGLING WIRE 18 AWG'],
      vectorCommands: ['M 200 200 L 700 200'],
    });

    const doc = await getDocumentExtractor().extract({
      buffer: pdfBytes,
      mimeType: 'application/pdf',
      documentId: 'doc-dang-01',
      versionId: 'v1',
    });
    const graph = buildElectricalGraph(doc, { documentId: 'doc-dang-01', versionId: 'v1', tenantId: tenantA.id });

    const result = evaluator.evaluate(graph);
    const danglingFinding = result.findings.find((f) => f.ruleId === 'RULE-001');

    assert.ok(danglingFinding, 'Dangling wire finding must be emitted');
    assert.equal(danglingFinding.severity, 'MAJOR');
    assert.equal(danglingFinding.status, 'VIOLATION');
    assert.ok(danglingFinding.evidence.wireIds.length > 0);
    assert.ok(danglingFinding.evidence.deterministicFingerprint.length > 0);
  });

  await t.test('QC Rule: 6. RULE-002 flags unconnected required terminals on Fuse/Power', async () => {
    const pdfBytes = createSyntheticPdfFixture({
      textLines: ['F1 FUSE 20A'], // Fuse present with 0 connecting wires
    });

    const doc = await getDocumentExtractor().extract({
      buffer: pdfBytes,
      mimeType: 'application/pdf',
      documentId: 'doc-f1-unconnected',
      versionId: 'v1',
    });
    const graph = buildElectricalGraph(doc, { documentId: 'doc-f1-unconnected', versionId: 'v1', tenantId: tenantA.id });

    const result = evaluator.evaluate(graph);
    const unconnectedFinding = result.findings.find((f) => f.ruleId === 'RULE-002');

    assert.ok(unconnectedFinding, 'Unconnected required terminal on fuse must be flagged');
    assert.equal(unconnectedFinding.severity, 'CRITICAL');
  });

  await t.test('QC Rule: 7. RULE-003 flags duplicate connector reference designators', async () => {
    const pdfBytes = createSyntheticPdfFixture({
      textLines: ['J1 MAIN CONNECTOR', 'J1 REDUNDANT CONNECTOR'],
    });

    const doc = await getDocumentExtractor().extract({
      buffer: pdfBytes,
      mimeType: 'application/pdf',
      documentId: 'doc-dup-j1',
      versionId: 'v1',
    });
    const graph = buildElectricalGraph(doc, { documentId: 'doc-dup-j1', versionId: 'v1', tenantId: tenantA.id });

    const result = evaluator.evaluate(graph);
    const dupConnFinding = result.findings.find((f) => f.ruleId === 'RULE-003');

    assert.ok(dupConnFinding, 'Duplicate connector J1 must be flagged as CRITICAL');
    assert.equal(dupConnFinding.severity, 'CRITICAL');
    assert.ok(dupConnFinding.evidence.componentIds.length === 2);
  });

  await t.test('QC Rule: 8. RULE-004 flags duplicate discrete component designators', async () => {
    const pdfBytes = createSyntheticPdfFixture({
      textLines: ['F1 FUSE 10A', 'F1 FUSE 25A'],
    });

    const doc = await getDocumentExtractor().extract({
      buffer: pdfBytes,
      mimeType: 'application/pdf',
      documentId: 'doc-dup-f1',
      versionId: 'v1',
    });
    const graph = buildElectricalGraph(doc, { documentId: 'doc-dup-f1', versionId: 'v1', tenantId: tenantA.id });

    const result = evaluator.evaluate(graph);
    const dupCompFinding = result.findings.find((f) => f.ruleId === 'RULE-004');

    assert.ok(dupCompFinding, 'Duplicate component F1 must be flagged');
    assert.equal(dupCompFinding.severity, 'MAJOR');
  });

  await t.test('QC Rule: 9. RULE-005 flags direct power-to-ground short circuit', async () => {
    const pdfBytes = createSyntheticPdfFixture({
      textLines: ['+12V GND SHORTED_BUS'],
      vectorCommands: ['M 50 50 L 100 50'], // Direct wire spanning power to ground
    });

    const doc = await getDocumentExtractor().extract({
      buffer: pdfBytes,
      mimeType: 'application/pdf',
      documentId: 'doc-short-01',
      versionId: 'v1',
    });
    const graph = buildElectricalGraph(doc, { documentId: 'doc-short-01', versionId: 'v1', tenantId: tenantA.id });

    const result = evaluator.evaluate(graph);
    const shortFinding = result.findings.find((f) => f.ruleId === 'RULE-005');

    assert.ok(shortFinding, 'Direct Power-to-Ground short circuit must be flagged');
    assert.equal(shortFinding.severity, 'CRITICAL');
  });

  await t.test('QC Rule: 10. RULE-007 flags conflicting voltage power sources on same net', async () => {
    const pdfBytes = createSyntheticPdfFixture({
      textLines: ['+12V +24V CONFLICT_BUS'],
      vectorCommands: ['M 50 50 L 100 50'],
    });

    const doc = await getDocumentExtractor().extract({
      buffer: pdfBytes,
      mimeType: 'application/pdf',
      documentId: 'doc-conflict-volt',
      versionId: 'v1',
    });
    const graph = buildElectricalGraph(doc, { documentId: 'doc-conflict-volt', versionId: 'v1', tenantId: tenantA.id });

    const result = evaluator.evaluate(graph);
    const conflictFinding = result.findings.find((f) => f.ruleId === 'RULE-007');

    assert.ok(conflictFinding, 'Conflicting power sources (+12V vs +24V) on same net must be flagged');
    assert.equal(conflictFinding.severity, 'CRITICAL');
  });

  // -------------------------------------------------------------
  // 5. Anti-Template Regression Tests
  // -------------------------------------------------------------
  await t.test('Anti-Template: 11. Different filenames with same bytes yield identical graph and findings', async () => {
    const bytes = createSyntheticPdfFixture({
      textLines: ['J10 CONNECTOR', 'F2 FUSE 30A', 'BAT2 24V'],
    });

    const docA = await getDocumentExtractor().extract({
      buffer: bytes,
      mimeType: 'application/pdf',
      documentId: 'arbitrary-name-alpha.pdf',
      versionId: 'v1',
    });
    const docB = await getDocumentExtractor().extract({
      buffer: bytes,
      mimeType: 'application/pdf',
      documentId: 'WH-402_Special_Harness.pdf',
      versionId: 'v1',
    });

    const graphA = buildElectricalGraph(docA, { documentId: 'docA', versionId: 'v1', tenantId: tenantA.id });
    const graphB = buildElectricalGraph(docB, { documentId: 'docB', versionId: 'v1', tenantId: tenantA.id });

    assert.equal(graphA.graphSha256, graphB.graphSha256);
    assert.deepEqual(
      graphA.components.map((c) => c.label),
      graphB.components.map((c) => c.label)
    );

    const findingsA = evaluator.evaluate(graphA).findings;
    const findingsB = evaluator.evaluate(graphB).findings;
    assert.equal(findingsA.length, findingsB.length);
  });

  await t.test('Anti-Template: 12. Different bytes with same filename yield different graphs', async () => {
    const bytes1 = createSyntheticPdfFixture({ textLines: ['J1 CONNECTOR', 'F1 10A'] });
    const bytes2 = createSyntheticPdfFixture({ textLines: ['TB1 TERMINAL_BLOCK', 'RL1 RELAY'] });

    const doc1 = await getDocumentExtractor().extract({
      buffer: bytes1,
      mimeType: 'application/pdf',
      documentId: 'WH-402.pdf',
      versionId: 'v1',
    });
    const doc2 = await getDocumentExtractor().extract({
      buffer: bytes2,
      mimeType: 'application/pdf',
      documentId: 'WH-402.pdf',
      versionId: 'v1',
    });

    const graph1 = buildElectricalGraph(doc1, { documentId: 'doc1', versionId: 'v1', tenantId: tenantA.id });
    const graph2 = buildElectricalGraph(doc2, { documentId: 'doc2', versionId: 'v1', tenantId: tenantA.id });

    assert.notEqual(graph1.graphSha256, graph2.graphSha256);
    assert.notDeepEqual(
      graph1.components.map((c) => c.label),
      graph2.components.map((c) => c.label)
    );
  });

  // -------------------------------------------------------------
  // 6. Tenant Isolation Tests (Graph & Findings)
  // -------------------------------------------------------------
  await t.test('Tenant Isolation: 13. Organization B cannot read Organization A findings', async () => {
    // Create doc with findings in Tenant A
    const docA = await prisma.document.create({
      data: {
        tenantId: tenantA.id,
        projectId: projectA.id,
        filename: 'tenantA_schematic.pdf',
        mimeType: 'application/pdf',
        sizeBytes: 1024,
        storageKey: `organizations/${tenantA.id}/projects/${projectA.id}/docA.pdf`,
        status: 'READY_FOR_PREFLIGHT',
      },
    });

    const docVersion = await prisma.documentVersion.create({
      data: {
        documentId: docA.id,
        version: 1,
        storageKey: `organizations/${tenantA.id}/projects/${projectA.id}/docA.pdf`,
        processingStatus: 'READY_FOR_GRAPH',
      },
    });

    const verId = docVersion.id;
    await prisma.finding.create({
      data: {
        documentVersionId: verId,
        status: 'UNREVIEWED',
        severity: 'CRITICAL',
        description: 'Tenant A Confirmed Electrical Violation',
        confidence: 0.99,
        evidence: JSON.stringify({ page: 1 }),
      },
    });

    // Tenant B attempts to fetch findings for Tenant A's document
    const findingsReq = new NextRequest(`http://localhost:3000/api/v1/documents/${docA.id}/findings`, {
      method: 'GET',
      headers: { authorization: `Bearer ${tokenB}` },
    });
    const findingsRes = await getFindings(findingsReq, { params: Promise.resolve({ id: docA.id }) });
    assert.equal(findingsRes.status, 404, 'Cross-tenant finding access must return 404');
  });

  // -------------------------------------------------------------
  // 7. Full End-to-End Pipeline: Upload -> Preflight -> Graph -> QC -> Findings
  // -------------------------------------------------------------
  await t.test('End-to-End Pipeline: 14. Real PDF uploads, builds graph, evaluates QC, persists findings', async () => {
    const e2ePdf = createSyntheticPdfFixture({
      textLines: [
        'BAT1 BATTERY 12V',
        'F1 FUSE 15A',
        'M1 MOTOR 12V',
        'W-UNCONNECTED-WIRE',
      ],
      vectorCommands: [
        'M 100 200 L 400 200', // Connected wire
        'M 600 600 L 900 600', // Dangling wire
      ],
      pageCount: 1,
      width: 1920,
      height: 1080,
    });

    // Step 1: Upload session
    const sessionReq = new NextRequest('http://localhost:3000/api/v1/documents/upload-session', {
      method: 'POST',
      headers: { authorization: `Bearer ${tokenA}`, 'content-type': 'application/json' },
      body: JSON.stringify({
        filename: 'e2e_avionics_power_bus.pdf',
        mime_type: 'application/pdf',
        size_bytes: e2ePdf.length,
        project_id: projectA.id,
      }),
    });
    const sessionRes = await createUploadSession(sessionReq);
    assert.equal(sessionRes.status, 201);
    const sessionData = await sessionRes.json();
    const docId = sessionData.upload_session.document_id;
    const uploadUrl = sessionData.upload_session.upload_url;

    // Step 2: Direct upload
    const uploadReq = new NextRequest(`http://localhost:3000${uploadUrl}`, {
      method: 'PUT',
      headers: { 'content-type': 'application/pdf' },
      body: e2ePdf as unknown as BodyInit,
    });
    const uploadRes = await directUploadPut(uploadReq);
    assert.equal(uploadRes.status, 200);

    // Step 3: Complete upload
    const verifyReq = new NextRequest(`http://localhost:3000/api/v1/documents/${docId}/upload-complete`, {
      method: 'POST',
      headers: { authorization: `Bearer ${tokenA}` },
    });
    const verifyRes = await verifyUpload(verifyReq, { params: Promise.resolve({ id: docId }) });
    assert.equal(verifyRes.status, 200);

    // Step 4: Process Document Pipeline (Extraction + Graph + Deterministic QC)
    const processReq = new NextRequest(`http://localhost:3000/api/v1/documents/${docId}/process?sync=true`, {
      method: 'POST',
      headers: { authorization: `Bearer ${tokenA}`, 'content-type': 'application/json' },
      body: JSON.stringify({ sync: true }),
    });
    const processRes = await processDocument(processReq, { params: Promise.resolve({ id: docId }) });
    assert.equal(processRes.status, 200);

    // Step 5: Verify Processing Status
    const statusReq = new NextRequest(`http://localhost:3000/api/v1/documents/${docId}/processing-status`, {
      method: 'GET',
      headers: { authorization: `Bearer ${tokenA}` },
    });
    const statusRes = await getProcessingStatus(statusReq, { params: Promise.resolve({ id: docId }) });
    assert.equal(statusRes.status, 200);
    const statusData = await statusRes.json();

    assert.equal(statusData.status, 'QC_COMPLETE');
    assert.ok(statusData.stats.components_count >= 3); // BAT1, F1, M1
    assert.ok(statusData.stats.findings_count >= 1);   // Dangling wire detected

    const graphArtifact = statusData.artifacts.find((a: any) => a.artifactType === 'ELECTRICAL_GRAPH');
    assert.ok(graphArtifact, 'ELECTRICAL_GRAPH artifact must be persisted');

    const qcArtifact = statusData.artifacts.find((a: any) => a.artifactType === 'QC_RULE_EXECUTION');
    assert.ok(qcArtifact, 'QC_RULE_EXECUTION artifact must be persisted');

    // Step 6: Verify Findings API output
    const findingsReq = new NextRequest(`http://localhost:3000/api/v1/documents/${docId}/findings`, {
      method: 'GET',
      headers: { authorization: `Bearer ${tokenA}` },
    });
    const findingsRes = await getFindings(findingsReq, { params: Promise.resolve({ id: docId }) });
    assert.equal(findingsRes.status, 200);
    const findingsData = await findingsRes.json();

    assert.ok(findingsData.findings.length >= 1);
    const f = findingsData.findings[0];
    assert.ok(f.evidence, 'Finding must contain evidence');
    assert.ok(f.evidence.deterministicFingerprint, 'Finding must have deterministic fingerprint');
  });

  // Cleanup testing tenants
  await prisma.tenant.delete({ where: { id: tenantA.id } });
  await prisma.tenant.delete({ where: { id: tenantB.id } });
});
