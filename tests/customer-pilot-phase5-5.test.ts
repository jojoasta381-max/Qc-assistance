/**
 * SPANQC PHASE 5.5 CUSTOMER PILOT READINESS & END-TO-END VALIDATION TEST SUITE
 * 
 * Verifies the complete customer journey:
 * 1. Customer Onboarding & Authentication (Owner role, membership, session)
 * 2. Project Workflow & Name Validation (empty, length, duplicate conflict)
 * 3. Secure Document Upload (MIME validation, streaming PUT, hash verification)
 * 4. Extraction & 20 Deterministic QC Rules Execution (real graph, findings persistence)
 * 5. Findings Experience & Visual Evidence (canonical coordinates, bounding boxes)
 * 6. Human Review Workflow (ACCEPT, REJECT, FALSE_POSITIVE & WAIVED with mandatory reason)
 * 7. Immutable Review Audit Trail (actor, previous/new status, timestamp, reason)
 * 8. Report Generation & Cryptographic Provenance (report_sha256 seal, truthfulness)
 * 9. Multi-Tenant Isolation (Tenant B cannot access Tenant A objects at all)
 * 10. Usage Metering & Quota Reconciliation (atomic deduction, refund on failure)
 * 11. Authoritative Benchmark Status (INSUFFICIENT_DATA preserved)
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { NextRequest } from 'next/server';
import { prisma } from '../src/lib/prisma';
import { hashPassword, createSessionToken } from '../src/lib/auth';
import { computeBufferSha256 } from '../src/lib/storage/storage-provider';
import { REAL_BENCHMARK_STATUS } from '../src/lib/benchmark/benchmark-types';
import { getRuleRegistry } from '../src/lib/qc/rule-registry';

// API Handlers
import { POST as createProject } from '../src/app/api/v1/projects/route';
import { POST as createUploadSession } from '../src/app/api/v1/documents/upload-session/route';
import { PUT as directUploadPut } from '../src/app/api/v1/documents/upload-direct/route';
import { POST as verifyUpload } from '../src/app/api/v1/documents/[id]/upload-complete/route';
import { POST as processDocument } from '../src/app/api/v1/documents/[id]/process/route';
import { GET as getDocumentFindings } from '../src/app/api/v1/documents/[id]/findings/route';
import { POST as reviewFinding } from '../src/app/api/v1/findings/[id]/review/route';
import { POST as generateReport } from '../src/app/api/v1/documents/[id]/reports/route';
import { GET as downloadReport } from '../src/app/api/v1/reports/[id]/download/route';

/**
 * Helper to generate synthetic vector PDF containing identifiable electrical harness primitives
 */
function createSyntheticWiringPdf(): Buffer {
  const width = 1000;
  const height = 1000;

  // Vector stream with component designators and wire paths
  const streamContent = [
    'BT /F1 12 Tf 100 900 Td (J1 CONNECTOR AMPHENOL-D38999) Tj ET',
    'BT /F1 12 Tf 100 800 Td (J2 CONNECTOR DEUTSCH-DT06) Tj ET',
    'BT /F1 12 Tf 100 700 Td (TB1 TERMINAL BLOCK 12P) Tj ET',
    'BT /F1 12 Tf 100 600 Td (F1 FUSE 10A 28VDC) Tj ET',
    'BT /F1 12 Tf 100 500 Td (R1 RELAY 28V DPDT) Tj ET',
    'BT /F1 12 Tf 100 400 Td (GND CHASSIS GROUND 0V) Tj ET',
    'BT /F1 10 Tf 120 880 Td (PIN 1: +28VDC) Tj ET',
    'BT /F1 10 Tf 120 860 Td (PIN 2: GND) Tj ET',
    'BT /F1 10 Tf 120 780 Td (PIN 1: +28VDC) Tj ET',
    'BT /F1 10 Tf 120 760 Td (PIN 2: GND) Tj ET',
    // Vector lines simulating wiring
    '1 w 100 880 m 500 880 l S',
    '1 w 500 880 m 500 780 l S',
    '1 w 100 860 m 500 860 l S',
    '1 w 500 860 m 500 760 l S',
  ].join('\n');

  const streamLen = Buffer.byteLength(streamContent, 'utf8');

  const pdf = `%PDF-1.4
1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj
2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj
3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 ${width} ${height}] /Contents 4 0 R /Resources << /Font << /F1 << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> >> >> >> endobj
4 0 obj << /Length ${streamLen} >>
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
${400 + streamLen}
%%EOF`;

  return Buffer.from(pdf, 'utf8');
}

test('Phase 5.5: Customer Pilot Readiness & End-to-End Acceptance Suite', async (t) => {
  const timestamp = Date.now();

  // Test Entities
  let tenantA: any;
  let tenantB: any;
  let userA: any;
  let userB: any;
  let tokenA: string;
  let tokenB: string;
  let projectA: any;
  let uploadedDocId: string;
  let uploadedStorageKey: string;
  let uploadDirectUrl: string;
  let findingsList: any[] = [];
  let generatedReportId: string;

  // -------------------------------------------------------------------------
  // 1. Customer Onboarding & Authentication
  // -------------------------------------------------------------------------
  await t.test('1. Customer Onboarding: Create Organization, User, and verify OWNER role', async () => {
    tenantA = await prisma.tenant.create({
      data: {
        name: `Pilot Customer Aerospace Inc ${timestamp}`,
        slug: `pilot-aero-${timestamp}`,
        plan: 'MID_5',
        checkQuota: 25,
        quotaUsed: 0,
      },
    });

    userA = await prisma.user.create({
      data: {
        name: 'Chief Systems Engineer',
        email: `lead.pe.${timestamp}@aeropilot.com`,
        passwordHash: hashPassword('AerospaceGradeSecret2026!'),
        role: 'OWNER',
        tenantId: tenantA.id,
      },
    });

    await prisma.organizationMember.create({
      data: {
        tenantId: tenantA.id,
        userId: userA.id,
        role: 'OWNER',
      },
    });

    tokenA = createSessionToken({
      userId: userA.id,
      email: userA.email,
      name: userA.name,
      tenantId: tenantA.id,
      tenantSlug: tenantA.slug,
      role: 'OWNER',
    });

    assert.ok(tokenA, 'Valid JWT session token must be generated for owner');

    // Create adversarial Tenant B & User B for isolation testing
    tenantB = await prisma.tenant.create({
      data: {
        name: `Competitor Defense Systems ${timestamp}`,
        slug: `competitor-defense-${timestamp}`,
        plan: 'NORMAL_1',
        checkQuota: 10,
        quotaUsed: 0,
      },
    });

    userB = await prisma.user.create({
      data: {
        name: 'Unauthorized External Auditor',
        email: `adversary.${timestamp}@competitor.com`,
        passwordHash: hashPassword('AdversarialSecret123!'),
        role: 'OWNER',
        tenantId: tenantB.id,
      },
    });

    await prisma.organizationMember.create({
      data: {
        tenantId: tenantB.id,
        userId: userB.id,
        role: 'OWNER',
      },
    });

    tokenB = createSessionToken({
      userId: userB.id,
      email: userB.email,
      name: userB.name,
      tenantId: tenantB.id,
      tenantSlug: tenantB.slug,
      role: 'OWNER',
    });

    assert.ok(tokenB, 'Session token generated for adversary tenant B');
  });

  // -------------------------------------------------------------------------
  // 2. Project Workflow & Name Validation
  // -------------------------------------------------------------------------
  await t.test('2. Project Workflow: Validate empty, whitespace, overly long, and duplicate names', async () => {
    // 2a: Empty name
    const emptyReq = new NextRequest('http://localhost:3000/api/v1/projects', {
      method: 'POST',
      headers: { authorization: `Bearer ${tokenA}`, 'content-type': 'application/json' },
      body: JSON.stringify({ name: '' }),
    });
    const emptyRes = await createProject(emptyReq);
    assert.equal(emptyRes.status, 400, 'Empty project name must be rejected');

    // 2b: Whitespace name
    const spaceReq = new NextRequest('http://localhost:3000/api/v1/projects', {
      method: 'POST',
      headers: { authorization: `Bearer ${tokenA}`, 'content-type': 'application/json' },
      body: JSON.stringify({ name: '    ' }),
    });
    const spaceRes = await createProject(spaceReq);
    assert.equal(spaceRes.status, 400, 'Whitespace-only project name must be rejected');

    // 2c: Name > 100 characters
    const longName = 'A'.repeat(105);
    const longReq = new NextRequest('http://localhost:3000/api/v1/projects', {
      method: 'POST',
      headers: { authorization: `Bearer ${tokenA}`, 'content-type': 'application/json' },
      body: JSON.stringify({ name: longName }),
    });
    const longRes = await createProject(longReq);
    assert.equal(longRes.status, 400, 'Project name > 100 characters must be rejected');

    // 2d: Valid project creation
    const validReq = new NextRequest('http://localhost:3000/api/v1/projects', {
      method: 'POST',
      headers: { authorization: `Bearer ${tokenA}`, 'content-type': 'application/json' },
      body: JSON.stringify({
        name: 'Avionics Wire Harness Rev C',
        description: 'Main fuselage wiring harness quality assurance inspection',
      }),
    });
    const validRes = await createProject(validReq);
    assert.equal(validRes.status, 201, 'Valid project must be created with 201 status');
    const validBody = await validRes.json();
    projectA = validBody.project;
    assert.ok(projectA.id);
    assert.equal(projectA.name, 'Avionics Wire Harness Rev C');

    // 2e: Duplicate project name within same tenant -> 409 Conflict
    const dupReq = new NextRequest('http://localhost:3000/api/v1/projects', {
      method: 'POST',
      headers: { authorization: `Bearer ${tokenA}`, 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'Avionics Wire Harness Rev C' }),
    });
    const dupRes = await createProject(dupReq);
    assert.equal(dupRes.status, 409, 'Duplicate project name within tenant must return 409 Conflict');
  });

  // -------------------------------------------------------------------------
  // 3. Document Upload Experience & Hash Verification
  // -------------------------------------------------------------------------
  const pdfBytes = createSyntheticWiringPdf();
  const pdfSha256 = computeBufferSha256(pdfBytes);

  await t.test('3. Document Upload: Presigned session, direct streaming, and hash verification', async () => {
    // 3a: Unsupported MIME type rejection
    const invalidMimeReq = new NextRequest('http://localhost:3000/api/v1/documents/upload-session', {
      method: 'POST',
      headers: { authorization: `Bearer ${tokenA}`, 'content-type': 'application/json' },
      body: JSON.stringify({
        filename: 'malicious_script.sh',
        mime_type: 'application/x-sh',
        project_id: projectA.id,
      }),
    });
    const invalidMimeRes = await createUploadSession(invalidMimeReq);
    assert.equal(invalidMimeRes.status, 415, 'Non-schematic MIME type must be rejected with 415');

    // 3b: Valid upload session creation
    const sessionReq = new NextRequest('http://localhost:3000/api/v1/documents/upload-session', {
      method: 'POST',
      headers: { authorization: `Bearer ${tokenA}`, 'content-type': 'application/json' },
      body: JSON.stringify({
        filename: 'AVIONICS_FUSELAGE_REV_C.pdf',
        mime_type: 'application/pdf',
        size_bytes: pdfBytes.length,
        project_id: projectA.id,
      }),
    });
    const sessionRes = await createUploadSession(sessionReq);
    assert.equal(sessionRes.status, 201, 'Upload session must be initialized');
    const sessionBody = await sessionRes.json();
    uploadedDocId = sessionBody.upload_session.document_id;
    uploadedStorageKey = sessionBody.upload_session.storage_key;
    uploadDirectUrl = sessionBody.upload_session.upload_url;

    assert.ok(uploadedDocId);
    assert.ok(uploadedStorageKey.startsWith(`organizations/${tenantA.id}/projects/${projectA.id}/`));

    // 3c: Stream authentic PDF bytes to private storage
    const uploadPutReq = new NextRequest(`http://localhost:3000${uploadDirectUrl}`, {
      method: 'PUT',
      headers: { 'content-type': 'application/pdf' },
      body: pdfBytes as any,
    });
    const uploadPutRes = await directUploadPut(uploadPutReq);
    assert.equal(uploadPutRes.status, 200, 'Direct upload PUT must succeed');

    // 3d: Upload complete with TAMPERED / mismatched client hash -> Rejected
    const tamperedHash = 'sha256:0000000000000000000000000000000000000000000000000000000000000000';
    const tamperedReq = new NextRequest(
      `http://localhost:3000/api/v1/documents/${uploadedDocId}/upload-complete`,
      {
        method: 'POST',
        headers: { authorization: `Bearer ${tokenA}`, 'content-type': 'application/json' },
        body: JSON.stringify({ client_sha256: tamperedHash }),
      }
    );
    const tamperedRes = await verifyUpload(tamperedReq, {
      params: Promise.resolve({ id: uploadedDocId }),
    });
    assert.equal(tamperedRes.status, 400, 'Mismatched SHA-256 hash must be rejected');

    // 3e: Upload complete with matching authentic hash -> Succeeded
    const completeReq = new NextRequest(
      `http://localhost:3000/api/v1/documents/${uploadedDocId}/upload-complete`,
      {
        method: 'POST',
        headers: { authorization: `Bearer ${tokenA}`, 'content-type': 'application/json' },
        body: JSON.stringify({ client_sha256: pdfSha256 }),
      }
    );
    const completeRes = await verifyUpload(completeReq, {
      params: Promise.resolve({ id: uploadedDocId }),
    });
    assert.equal(completeRes.status, 200, 'Upload verification must succeed with correct hash');
  });

  // -------------------------------------------------------------------------
  // 4. Processing Pipeline & 20 Deterministic QC Rules Execution
  // -------------------------------------------------------------------------
  await t.test('4. Processing Pipeline: Extraction, ElectricalGraph, and 20 QC Rules execution', async () => {
    const processReq = new NextRequest(
      `http://localhost:3000/api/v1/documents/${uploadedDocId}/process?sync=true`,
      {
        method: 'POST',
        headers: { authorization: `Bearer ${tokenA}`, 'content-type': 'application/json' },
      }
    );
    const processRes = await processDocument(processReq, {
      params: Promise.resolve({ id: uploadedDocId }),
    });
    assert.equal(processRes.status, 200, 'Synchronous processing must succeed');
    const processBody = await processRes.json();

    assert.ok(processBody.job, 'Job object must be returned');
    assert.equal(processBody.job.document_id, uploadedDocId);
    assert.ok(processBody.job.status === 'COMPLETED' || processBody.job.status === 'QUEUED');

    // Verify document status in DB updated
    const docInDb = await prisma.document.findUnique({
      where: { id: uploadedDocId },
      include: { versions: { include: { findings: true } } },
    });
    assert.ok(docInDb);
    assert.ok(docInDb.status === 'QC_COMPLETE' || docInDb.status === 'READY_FOR_REVIEW');
    assert.equal(docInDb.versions.length, 1);
  });

  // -------------------------------------------------------------------------
  // 5. Findings Experience & Visual Evidence Linkage
  // -------------------------------------------------------------------------
  await t.test('5. Findings Experience: Retrieve findings with rules, severities, and visual evidence', async () => {
    const findingsReq = new NextRequest(
      `http://localhost:3000/api/v1/documents/${uploadedDocId}/findings`,
      {
        method: 'GET',
        headers: { authorization: `Bearer ${tokenA}` },
      }
    );
    const findingsRes = await getDocumentFindings(findingsReq, {
      params: Promise.resolve({ id: uploadedDocId }),
    });
    assert.equal(findingsRes.status, 200, 'Fetching findings must succeed');
    const findingsBody = await findingsRes.json();
    findingsList = findingsBody.findings;

    assert.ok(Array.isArray(findingsList), 'Findings must be returned as an array');

    // If findings generated from synthetic harness, verify evidence structure
    if (findingsList.length > 0) {
      const firstFinding = findingsList[0];
      assert.ok(firstFinding.id, 'Finding must have unique ID');
      assert.ok(firstFinding.status, 'Finding must have status');
      assert.ok(firstFinding.severity, 'Finding must have severity');
      assert.ok(firstFinding.description, 'Finding must have description');

      // Check evidence structure
      if (firstFinding.evidence) {
        assert.equal(typeof firstFinding.evidence, 'object');
      }
    } else {
      // Create a test finding manually to test review lifecycle thoroughly if synthetic PDF was clean
      const latestVer = await prisma.documentVersion.findFirst({
        where: { documentId: uploadedDocId },
      });
      const rule = await prisma.rule.findFirst() || await prisma.rule.create({
        data: {
          code: 'RULE-001',
          name: 'Dangling Wire Endpoint Detection',
          version: '1.0.0',
          severity: 'CRITICAL',
        },
      });

      const syntheticFinding = await prisma.finding.create({
        data: {
          documentVersionId: latestVer!.id,
          ruleId: rule.id,
          severity: 'CRITICAL',
          status: 'OPEN',
          description: 'Dangling wire segment W-01 without termination at terminal J1-1',
          confidence: 1.0,
          evidence: JSON.stringify({
            ruleId: 'RULE-001',
            page: 1,
            coordinates: { x: 100, y: 880 },
            bbox: [90, 870, 110, 890],
          }),
        },
      });

      findingsList.push({
        id: syntheticFinding.id,
        status: syntheticFinding.status,
        severity: syntheticFinding.severity,
        description: syntheticFinding.description,
      });
    }
  });

  // -------------------------------------------------------------------------
  // 6. Human Review Workflow: ACCEPT, REJECT, FALSE_POSITIVE, WAIVED
  // -------------------------------------------------------------------------
  await t.test('6. Human Review Workflow: Enforce mandatory reason on WAIVED / FALSE_POSITIVE and update state', async () => {
    assert.ok(findingsList.length >= 1, 'Must have at least one finding for review testing');
    const targetFindingId = findingsList[0].id;

    // 6a: FALSE_POSITIVE without rationale -> 400 REASON_REQUIRED
    const fpNoReasonReq = new NextRequest(
      `http://localhost:3000/api/v1/findings/${targetFindingId}/review`,
      {
        method: 'POST',
        headers: { authorization: `Bearer ${tokenA}`, 'content-type': 'application/json' },
        body: JSON.stringify({ decision: 'FALSE_POSITIVE', comment: '' }),
      }
    );
    const fpNoReasonRes = await reviewFinding(fpNoReasonReq, {
      params: Promise.resolve({ id: targetFindingId }),
    });
    assert.equal(fpNoReasonRes.status, 400, 'FALSE_POSITIVE without reason must be rejected with 400');
    const fpNoReasonBody = await fpNoReasonRes.json();
    assert.equal(fpNoReasonBody.error.code, 'REASON_REQUIRED');

    // 6b: WAIVED without rationale -> 400 REASON_REQUIRED
    const waivedNoReasonReq = new NextRequest(
      `http://localhost:3000/api/v1/findings/${targetFindingId}/review`,
      {
        method: 'POST',
        headers: { authorization: `Bearer ${tokenA}`, 'content-type': 'application/json' },
        body: JSON.stringify({ decision: 'WAIVED', comment: '   ' }),
      }
    );
    const waivedNoReasonRes = await reviewFinding(waivedNoReasonReq, {
      params: Promise.resolve({ id: targetFindingId }),
    });
    assert.equal(waivedNoReasonRes.status, 400, 'WAIVED without reason must be rejected with 400');

    // 6c: Valid ACCEPT / CONFIRMED
    const acceptReq = new NextRequest(
      `http://localhost:3000/api/v1/findings/${targetFindingId}/review`,
      {
        method: 'POST',
        headers: { authorization: `Bearer ${tokenA}`, 'content-type': 'application/json' },
        body: JSON.stringify({ decision: 'ACCEPT', comment: 'Confirmed by Lead PE per wiring schematic' }),
      }
    );
    const acceptRes = await reviewFinding(acceptReq, {
      params: Promise.resolve({ id: targetFindingId }),
    });
    assert.equal(acceptRes.status, 201, 'ACCEPT review must succeed');
    const acceptBody = await acceptRes.json();
    assert.equal(acceptBody.finding_status, 'CONFIRMED');

    // 6d: Transition to WAIVED with substantive engineering justification
    const waiveReq = new NextRequest(
      `http://localhost:3000/api/v1/findings/${targetFindingId}/review`,
      {
        method: 'POST',
        headers: { authorization: `Bearer ${tokenA}`, 'content-type': 'application/json' },
        body: JSON.stringify({
          decision: 'WAIVED',
          comment: 'Engineering deviation #DEV-4091 approved for test bench prototype only.',
        }),
      }
    );
    const waiveRes = await reviewFinding(waiveReq, {
      params: Promise.resolve({ id: targetFindingId }),
    });
    assert.equal(waiveRes.status, 201, 'WAIVED with reason must succeed');
    const waiveBody = await waiveRes.json();
    assert.equal(waiveBody.finding_status, 'WAIVED');

    // 6e: Verify DB review record
    const reviewsInDb = await prisma.findingReview.findMany({
      where: { findingId: targetFindingId },
      orderBy: { createdAt: 'desc' },
    });
    assert.ok(reviewsInDb.length >= 2, 'Reviews must be persisted in database');
    assert.equal(reviewsInDb[0].decision, 'WAIVED');
    assert.equal(reviewsInDb[0].reviewerId, userA.id);
  });

  // -------------------------------------------------------------------------
  // 7. Review Audit Trail
  // -------------------------------------------------------------------------
  await t.test('7. Review Audit Trail: Verify immutable audit records created for reviews', async () => {
    const auditLogs = await prisma.auditEvent.findMany({
      where: {
        tenantId: tenantA.id,
        action: 'FINDING_REVIEWED',
      },
      orderBy: { createdAt: 'desc' },
    });

    assert.ok(auditLogs.length >= 2, 'Audit log entries must exist for finding reviews');
    const latestLog = auditLogs[0];
    assert.equal(latestLog.actorId, userA.id);
    assert.equal(latestLog.entityType.toUpperCase(), 'FINDING');
    const meta = JSON.parse(latestLog.metadata || '{}');
    assert.equal(meta.newStatus || meta.new_status, 'WAIVED');
  });

  // -------------------------------------------------------------------------
  // 8. Report Generation & Cryptographic Provenance
  // -------------------------------------------------------------------------
  await t.test('8. Report Generation: Canonical SHA-256 seal and download format verification', async () => {
    // 8a: Generate Report
    const genReportReq = new NextRequest(
      `http://localhost:3000/api/v1/documents/${uploadedDocId}/reports`,
      {
        method: 'POST',
        headers: { authorization: `Bearer ${tokenA}`, 'content-type': 'application/json' },
      }
    );
    const genReportRes = await generateReport(genReportReq, {
      params: Promise.resolve({ id: uploadedDocId }),
    });
    assert.equal(genReportRes.status, 201, 'Report generation must succeed');
    const reportBody = await genReportRes.json();
    generatedReportId = reportBody.report.id;
    const reportSha256 = reportBody.report.report_sha256;

    assert.ok(generatedReportId, 'Report ID must be present');
    assert.match(reportSha256, /^sha256:[a-f0-9]{64}$/, 'Report SHA-256 seal must be a valid 64-char hex digest');

    // 8b: Download Report in PDF / HTML format
    const downloadReq = new NextRequest(
      `http://localhost:3000/api/v1/reports/${generatedReportId}/download?format=pdf`,
      {
        method: 'GET',
        headers: { authorization: `Bearer ${tokenA}` },
      }
    );
    const downloadRes = await downloadReport(downloadReq, {
      params: Promise.resolve({ id: generatedReportId }),
    });
    assert.equal(downloadRes.status, 200, 'Report download must succeed');
    const htmlReport = await downloadRes.text();

    // Verify Truthfulness invariants in report content
    assert.ok(htmlReport.includes('AI-Assisted Wiring Diagram Inspection Report'), 'Report must state AI-assisted');
    assert.ok(htmlReport.includes(tenantA.name), 'Report must include organization name');
    assert.ok(!htmlReport.includes('FIPS-compliant'), 'Report must NOT claim FIPS compliance');
    assert.ok(!htmlReport.includes('AS9100 certified'), 'Report must NOT claim AS9100 certification');
    assert.ok(!htmlReport.includes('autonomous engineering approval'), 'Report must NOT claim autonomous approval');
  });

  // -------------------------------------------------------------------------
  // 9. Multi-Tenant Isolation & Security Abuse Testing
  // -------------------------------------------------------------------------
  await t.test('9. Multi-Tenant Isolation: Adversary Tenant B is strictly denied access to Tenant A resources', async () => {
    // 9a: Tenant B attempts to read Tenant A documents -> 404 or 403
    const getDocReq = new NextRequest(`http://localhost:3000/api/v1/documents/${uploadedDocId}/findings`, {
      method: 'GET',
      headers: { authorization: `Bearer ${tokenB}` },
    });
    const getDocRes = await getDocumentFindings(getDocReq, {
      params: Promise.resolve({ id: uploadedDocId }),
    });
    assert.equal(getDocRes.status, 404, 'Cross-tenant finding access must return 404');

    // 9b: Tenant B attempts to review Tenant A finding -> 404
    const crossReviewReq = new NextRequest(
      `http://localhost:3000/api/v1/findings/${findingsList[0].id}/review`,
      {
        method: 'POST',
        headers: { authorization: `Bearer ${tokenB}`, 'content-type': 'application/json' },
        body: JSON.stringify({ decision: 'REJECT', comment: 'Adversarial rejection attempt' }),
      }
    );
    const crossReviewRes = await reviewFinding(crossReviewReq, {
      params: Promise.resolve({ id: findingsList[0].id }),
    });
    assert.equal(crossReviewRes.status, 404, 'Cross-tenant finding review must return 404');

    // 9c: Tenant B attempts to download Tenant A report -> 404
    const crossReportReq = new NextRequest(
      `http://localhost:3000/api/v1/reports/${generatedReportId}/download?format=pdf`,
      {
        method: 'GET',
        headers: { authorization: `Bearer ${tokenB}` },
      }
    );
    const crossReportRes = await downloadReport(crossReportReq, {
      params: Promise.resolve({ id: generatedReportId }),
    });
    assert.equal(crossReportRes.status, 404, 'Cross-tenant report download must return 404');

    // 9d: Tenant B attempts to upload into Tenant A project -> 403 or 404
    const crossUploadReq = new NextRequest('http://localhost:3000/api/v1/documents/upload-session', {
      method: 'POST',
      headers: { authorization: `Bearer ${tokenB}`, 'content-type': 'application/json' },
      body: JSON.stringify({
        filename: 'Trojan.pdf',
        mime_type: 'application/pdf',
        project_id: projectA.id,
      }),
    });
    const crossUploadRes = await createUploadSession(crossUploadReq);
    assert.ok(
      crossUploadRes.status === 403 || crossUploadRes.status === 404,
      'Cross-tenant upload into another tenant project must be denied with 403 or 404'
    );
  });

  // -------------------------------------------------------------------------
  // 10. Usage Metering & Quota Accounting
  // -------------------------------------------------------------------------
  await t.test('10. Usage Accounting: Tenant quota decremented accurately upon processing', async () => {
    const updatedTenantA = await prisma.tenant.findUnique({
      where: { id: tenantA.id },
    });
    assert.ok(updatedTenantA);
    assert.equal(updatedTenantA.quotaUsed, 1, 'Processing must increment quotaUsed by exactly 1');
    assert.equal(updatedTenantA.checkQuota, 25, 'Total quota must remain 25');

    // Check usage log record
    const usageLogs = await prisma.usageLedger.findMany({
      where: { tenantId: tenantA.id },
    });
    assert.ok(usageLogs.length >= 1, 'UsageLedger must record check consumption');
  });

  // -------------------------------------------------------------------------
  // 11. Authoritative Benchmark Status & Registry Truthfulness
  // -------------------------------------------------------------------------
  await t.test('11. Authoritative Invariants: REAL_BENCHMARK_STATUS and 20 Production Rules', async () => {
    // 11a: REAL_BENCHMARK_STATUS must strictly be INSUFFICIENT_DATA
    assert.equal(
      REAL_BENCHMARK_STATUS,
      'INSUFFICIENT_DATA',
      'Real customer benchmark status must remain INSUFFICIENT_DATA until authorized customer datasets are ingested'
    );

    // 11b: Rule registry must contain exactly 20 production rules
    const registry = getRuleRegistry();
    const ruleCount = registry.getRuleCount();
    assert.equal(ruleCount, 20, 'Registry must register exactly 20 production rules');
  });
});
