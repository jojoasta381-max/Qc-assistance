import test from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import { prisma } from '../src/lib/prisma';
import { createSessionToken } from '../src/lib/auth';
import {
  verifyTenantStorageKeyAccess,
  computeBufferSha256,
} from '../src/lib/storage/storage-provider';
import { performRealPreflight } from '../src/lib/ingestion/real-preflight';
import { getDocumentExtractor } from '../src/lib/extraction/document-extractor';
import { POST as createUploadSession } from '../src/app/api/v1/documents/upload-session/route';
import { PUT as directUploadPut } from '../src/app/api/v1/documents/upload-direct/route';
import { POST as verifyUpload } from '../src/app/api/v1/documents/[id]/upload-complete/route';
import { GET as downloadDocument } from '../src/app/api/v1/documents/[id]/download/route';
import { POST as processDocument } from '../src/app/api/v1/documents/[id]/process/route';
import { GET as getProcessingStatus } from '../src/app/api/v1/documents/[id]/processing-status/route';
import { NextRequest } from 'next/server';

function createValidPdf(text: string, pageCount = 1, width = 612, height = 792): Buffer {
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

  const safeY = Math.min(height - 100, Math.max(100, Math.round(height / 2)));
  for (let i = 0; i < pageCount; i++) {
    const pageNum = 3 + i * 2;
    const contentNum = pageNum + 1;
    const stream = `BT\n/F1 12 Tf\n72 ${safeY} Td\n(${text} - Page ${i + 1}) Tj\nET\n`;
    const streamLen = Buffer.byteLength(stream);

    addObj(pageNum, `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${width} ${height}] /Contents ${contentNum} 0 R >>`);
    addObj(contentNum, `<< /Length ${streamLen} >>\nstream\n${stream}endstream`);
  }

  const startXref = currentOffset;
  const totalObjs = 3 + pageCount * 2;
  let xref = `xref\n0 ${totalObjs}\n0000000000 65535 f \n`;
  for (let i = 1; i < totalObjs; i++) {
    const offStr = String(offsets[i]).padStart(10, '0');
    xref += `${offStr} 00000 n \n`;
  }

  const trailer = `trailer\n<< /Size ${totalObjs} /Root 1 0 R >>\nstartxref\n${startXref}\n%%EOF\n`;
  return Buffer.from(header + body + xref + trailer);
}

function createEncryptedPdf(): Buffer {
  const body = '%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [] /Count 0 >>\nendobj\n3 0 obj\n<< /Filter /Standard /V 2 /R 3 /P -4 >>\nendobj\ntrailer\n<< /Size 4 /Root 1 0 R /Encrypt 3 0 R >>\nstartxref\n150\n%%EOF\n';
  return Buffer.from(body);
}

test('Phase 3: Real Document Ingestion & Storage Architecture', async (t) => {
  // Test Tenants Setup
  const suffix = Date.now().toString(36);
  const tenantA = await prisma.tenant.create({
    data: {
      name: `Tenant Alpha ${suffix}`,
      slug: `tenant-a-${suffix}`,
      checkQuota: 50,
      quotaUsed: 0,
    },
  });

  const tenantB = await prisma.tenant.create({
    data: {
      name: `Tenant Beta ${suffix}`,
      slug: `tenant-b-${suffix}`,
      checkQuota: 50,
      quotaUsed: 0,
    },
  });

  const userA = await prisma.user.create({
    data: {
      email: `admin-a-${suffix}@example.com`,
      name: 'Alice Inspector',
      role: 'QC_INSPECTOR',
      tenantId: tenantA.id,
    },
  });

  const userB = await prisma.user.create({
    data: {
      email: `admin-b-${suffix}@example.com`,
      name: 'Bob Inspector',
      role: 'QC_INSPECTOR',
      tenantId: tenantB.id,
    },
  });

  const projectA = await prisma.project.create({
    data: {
      name: 'Avionics Project Alpha',
      tenantId: tenantA.id,
    },
  });

  const projectB = await prisma.project.create({
    data: {
      name: 'Propulsion Project Beta',
      tenantId: tenantB.id,
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
  // 1. Upload Security Tests
  // -------------------------------------------------------------

  await t.test('Upload Security: 1. Unauthenticated upload rejected', async () => {
    const req = new NextRequest('http://localhost:3000/api/v1/documents/upload-session', {
      method: 'POST',
      body: JSON.stringify({ filename: 'schematic.pdf', mime_type: 'application/pdf' }),
    });
    const res = await createUploadSession(req);
    assert.equal(res.status, 401);
  });

  await t.test('Upload Security: 2. Unauthorized organization upload rejected', async () => {
    const req = new NextRequest('http://localhost:3000/api/v1/documents/upload-session', {
      method: 'POST',
      headers: {
        authorization: `Bearer ${tokenA}`,
        'x-organization-id': tenantB.id,
        'content-type': 'application/json',
      },
      body: JSON.stringify({ filename: 'schematic.pdf', mime_type: 'application/pdf' }),
    });
    const res = await createUploadSession(req);
    assert.equal(res.status, 403);
  });

  await t.test('Upload Security: 3. Unauthorized project upload rejected', async () => {
    const req = new NextRequest('http://localhost:3000/api/v1/documents/upload-session', {
      method: 'POST',
      headers: {
        authorization: `Bearer ${tokenA}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        filename: 'schematic.pdf',
        mime_type: 'application/pdf',
        project_id: projectB.id,
      }),
    });
    const res = await createUploadSession(req);
    assert.equal(res.status, 404);
  });

  await t.test('Upload Security: 4. Arbitrary storageKey rejected and verified within tenant boundary', async () => {
    assert.equal(verifyTenantStorageKeyAccess('organizations/another-tenant/file.pdf', tenantA.id), false);
    assert.equal(verifyTenantStorageKeyAccess('../../etc/passwd', tenantA.id), false);
    assert.equal(verifyTenantStorageKeyAccess(`organizations/${tenantA.id}/../escape.pdf`, tenantA.id), false);
    assert.equal(verifyTenantStorageKeyAccess(`organizations/${tenantA.id}/projects/p1/doc.pdf`, tenantA.id), true);
  });

  await t.test('Upload Security: 5. Oversized file (>50MB) rejected in upload session and upload-direct', async () => {
    const req = new NextRequest('http://localhost:3000/api/v1/documents/upload-session', {
      method: 'POST',
      headers: {
        authorization: `Bearer ${tokenA}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        filename: 'huge_cad.pdf',
        mime_type: 'application/pdf',
        size_bytes: 55 * 1024 * 1024,
      }),
    });
    const res = await createUploadSession(req);
    assert.equal(res.status, 400);
    const data = await res.json();
    assert.equal(data.error.code, 'FILE_TOO_LARGE');
  });

  await t.test('Upload Security: 6. Unsupported MIME/file type rejected', async () => {
    const req = new NextRequest('http://localhost:3000/api/v1/documents/upload-session', {
      method: 'POST',
      headers: {
        authorization: `Bearer ${tokenA}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        filename: 'exploit.exe',
        mime_type: 'application/x-msdownload',
      }),
    });
    const res = await createUploadSession(req);
    assert.equal(res.status, 415);
  });

  // -------------------------------------------------------------
  // 2. Object Verification & Integrity
  // -------------------------------------------------------------

  let validDocId: string = '';
  let validStorageKey: string = '';
  let validUploadUrl: string = '';

  await t.test('Upload Session: Creates authoritative document and presigned URL', async () => {
    const req = new NextRequest('http://localhost:3000/api/v1/documents/upload-session', {
      method: 'POST',
      headers: {
        authorization: `Bearer ${tokenA}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        filename: 'real_harness_2026.pdf',
        mime_type: 'application/pdf',
        project_id: projectA.id,
        size_bytes: 4096,
      }),
    });
    const res = await createUploadSession(req);
    assert.equal(res.status, 201);
    const body = await res.json();
    validDocId = body.upload_session.document_id;
    validStorageKey = body.upload_session.storage_key;
    validUploadUrl = body.upload_session.upload_url;

    assert.ok(validDocId);
    assert.ok(validStorageKey.startsWith(`organizations/${tenantA.id}/projects/${projectA.id}/`));
    assert.ok(validUploadUrl);
  });

  await t.test('Object Verification: 7. Missing object rejected in upload-complete', async () => {
    const req = new NextRequest(`http://localhost:3000/api/v1/documents/${validDocId}/upload-complete`, {
      method: 'POST',
      headers: { authorization: `Bearer ${tokenA}` },
    });
    const res = await verifyUpload(req, { params: Promise.resolve({ id: validDocId }) });
    assert.equal(res.status, 422);
    const data = await res.json();
    assert.equal(data.error.code, 'OBJECT_NOT_FOUND');
  });

  const pdfText = 'UNIQUE_HARNESS_TRACE_CIRCUIT_99';
  const realPdfBytes = createValidPdf(pdfText, 2, 842, 595);
  const expectedSha256 = computeBufferSha256(realPdfBytes);

  await t.test('Object Verification: 8. Upload direct saves bytes and generates correct SHA-256', async () => {
    const uploadReq = new NextRequest(`http://localhost:3000${validUploadUrl}`, {
      method: 'PUT',
      headers: {
        'content-type': 'application/pdf',
      },
      body: realPdfBytes as unknown as BodyInit,
    });
    const res = await directUploadPut(uploadReq);
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.uploaded.sha256, expectedSha256);
    assert.equal(data.uploaded.size_bytes, realPdfBytes.length);
  });

  await t.test('Object Verification: 9. Upload verification establishes READY_FOR_PREFLIGHT and true metadata', async () => {
    const req = new NextRequest(`http://localhost:3000/api/v1/documents/${validDocId}/upload-complete`, {
      method: 'POST',
      headers: { authorization: `Bearer ${tokenA}` },
    });
    const res = await verifyUpload(req, { params: Promise.resolve({ id: validDocId }) });
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.verification.status, 'READY_FOR_PREFLIGHT');
    assert.equal(data.verification.upload_status, 'VERIFIED');
    assert.equal(data.verification.source_sha256, expectedSha256);
    assert.equal(data.verification.source_size_bytes, realPdfBytes.length);
  });

  // -------------------------------------------------------------
  // 3. Real PDF Inspection & Preflight Tests
  // -------------------------------------------------------------

  await t.test('PDF Preflight: 10. Real PDF page count and dimensions detected', async () => {
    const preflight = await performRealPreflight(realPdfBytes);
    assert.equal(preflight.isValid, true);
    assert.equal(preflight.fileType, 'PDF');
    assert.equal(preflight.pageCount, 2);
    assert.equal(preflight.hasText, true);
    assert.equal(preflight.dimensions.width, 842);
    assert.equal(preflight.dimensions.height, 595);
  });

  await t.test('PDF Preflight: 11. Malformed PDF rejected safely', async () => {
    const malformedBytes = Buffer.alloc(200, 0);
    malformedBytes.write('%PDF-1.4 corrupt data without trailer or xref objects');
    const preflight = await performRealPreflight(malformedBytes);
    assert.equal(preflight.isValid, false);
    assert.ok(preflight.error?.includes('Malformed or corrupt PDF structure'));
  });

  await t.test('PDF Preflight: 12. Password-protected / encrypted PDF handled and rejected gracefully', async () => {
    const encryptedBytes = createEncryptedPdf();
    const preflight = await performRealPreflight(encryptedBytes);
    assert.equal(preflight.isValid, false);
    assert.equal(preflight.isEncrypted, true);
    assert.ok(preflight.error?.includes('password-protected or encrypted'));
  });

  await t.test('PDF Extraction: 13. Text extraction comes directly from actual PDF bytes', async () => {
    const extractor = getDocumentExtractor();
    const result = await extractor.extract({
      buffer: realPdfBytes,
      mimeType: 'application/pdf',
      documentId: 'test-doc-1',
      versionId: 'test-v-1',
    });

    assert.equal(result.pageCount, 2);
    assert.equal(result.sha256, expectedSha256);
    const combinedText = result.pages.map((p) => p.textBlocks.map((b) => b.text).join(' ')).join(' ');
    assert.ok(combinedText.includes(pdfText));
    assert.equal(result.pages[0].source, 'pdf-text');
  });

  // -------------------------------------------------------------
  // 4. Real Image Preflight Tests
  // -------------------------------------------------------------

  await t.test('Image Preflight: 14. Real image dimensions and format extracted via sharp', async () => {
    const realPngBytes = await sharp({
      create: {
        width: 1280,
        height: 720,
        channels: 3,
        background: { r: 10, g: 20, b: 30 },
      },
    })
      .png()
      .toBuffer();

    const preflight = await performRealPreflight(realPngBytes);
    assert.equal(preflight.isValid, true);
    assert.equal(preflight.fileType, 'PNG');
    assert.equal(preflight.dimensions.width, 1280);
    assert.equal(preflight.dimensions.height, 720);
    assert.equal(preflight.hasRaster, true);
  });

  await t.test('Image Preflight: 15. Corrupt image bytes rejected', async () => {
    const corruptPng = Buffer.alloc(200, 0);
    corruptPng[0] = 0x89;
    corruptPng[1] = 0x50;
    corruptPng[2] = 0x4e;
    corruptPng[3] = 0x47;
    corruptPng[4] = 0x0d;
    corruptPng[5] = 0x0a;
    corruptPng[6] = 0x1a;
    corruptPng[7] = 0x0a;
    corruptPng.write('Corrupted PNG body stream without IHDR chunks', 8);

    const preflight = await performRealPreflight(corruptPng);
    assert.equal(preflight.isValid, false);
    assert.ok(preflight.error?.includes('Corrupt or unreadable image stream'));
  });

  // -------------------------------------------------------------
  // 5. Anti-Template Regression Tests
  // -------------------------------------------------------------

  await t.test('Anti-Template: 16. Two documents with different filenames produce results from actual bytes', async () => {
    const pdfA = createValidPdf('POWER_FEED_TRANSFORMER_T1', 1, 600, 800);
    const pdfB = createValidPdf('MOTOR_STARTER_CONTACTOR_K2', 3, 1200, 900);

    const extractor = getDocumentExtractor();
    const resA = await extractor.extract({ buffer: pdfA, mimeType: 'application/pdf', documentId: 'd1', versionId: 'v1' });
    const resB = await extractor.extract({ buffer: pdfB, mimeType: 'application/pdf', documentId: 'd2', versionId: 'v2' });

    assert.notEqual(resA.sha256, resB.sha256);
    assert.equal(resA.pageCount, 1);
    assert.equal(resB.pageCount, 3);
    assert.ok(resA.pages[0].textBlocks.some((b) => b.text.includes('POWER_FEED_TRANSFORMER_T1')));
    assert.ok(resB.pages[0].textBlocks.some((b) => b.text.includes('MOTOR_STARTER_CONTACTOR_K2')));
  });

  await t.test('Anti-Template: 17. Changing filename without changing bytes preserves identical extraction', async () => {
    const bytes = createValidPdf('CONSTANT_DIAGRAM_PAYLOAD', 1, 700, 700);
    const extractor = getDocumentExtractor();

    const res1 = await extractor.extract({ buffer: bytes, mimeType: 'application/pdf', documentId: 'doc_alpha', versionId: 'v1' });
    const res2 = await extractor.extract({ buffer: bytes, mimeType: 'application/pdf', documentId: 'WH-402_Special.pdf', versionId: 'v1' });

    assert.equal(res1.sha256, res2.sha256);
    assert.equal(res1.pageCount, res2.pageCount);
    assert.equal(res1.rawTextLength, res2.rawTextLength);
  });

  await t.test('Anti-Template: 18. Changing bytes while keeping filename changes extraction', async () => {
    const bytes1 = createValidPdf('VERSION_ONE_SCHEMATIC', 1, 500, 500);
    const bytes2 = createValidPdf('VERSION_TWO_MODIFIED', 2, 500, 500);

    const extractor = getDocumentExtractor();
    const res1 = await extractor.extract({ buffer: bytes1, mimeType: 'application/pdf', documentId: 'schematic.pdf', versionId: 'v1' });
    const res2 = await extractor.extract({ buffer: bytes2, mimeType: 'application/pdf', documentId: 'schematic.pdf', versionId: 'v2' });

    assert.notEqual(res1.sha256, res2.sha256);
    assert.notEqual(res1.pageCount, res2.pageCount);
  });

  await t.test('Anti-Template: 19. WH-402 is not required for processing', async () => {
    const arbitraryDrawingBytes = createValidPdf('SOLAR_INVERTER_SUBSTATION_DRAWING', 1, 1024, 768);
    const preflight = await performRealPreflight(arbitraryDrawingBytes);
    assert.equal(preflight.isValid, true);
    assert.equal(preflight.pageCount, 1);
    assert.equal(preflight.dimensions.width, 1024);
  });

  // -------------------------------------------------------------
  // 6. Tenant Isolation Tests
  // -------------------------------------------------------------

  await t.test('Tenant Isolation: 20. Organization B cannot download Organization A document', async () => {
    const req = new NextRequest(`http://localhost:3000/api/v1/documents/${validDocId}/download`, {
      method: 'GET',
      headers: { authorization: `Bearer ${tokenB}` },
    });
    const res = await downloadDocument(req, { params: Promise.resolve({ id: validDocId }) });
    assert.equal(res.status, 404);
  });

  await t.test('Tenant Isolation: 21. Organization B cannot process Organization A document', async () => {
    const req = new NextRequest(`http://localhost:3000/api/v1/documents/${validDocId}/process`, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${tokenB}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({ standard: 'IPC-WHMA-A-620' }),
    });
    const res = await processDocument(req, { params: Promise.resolve({ id: validDocId }) });
    assert.equal(res.status, 404);
  });

  // -------------------------------------------------------------
  // 7. End-to-End Ingestion, Verification, and Processing Pipeline
  // -------------------------------------------------------------

  await t.test('End-to-End: Full pipeline uploads, verifies, extracts, and reaches READY_FOR_GRAPH', async () => {
    // 1. Initiate upload session
    const sessionReq = new NextRequest('http://localhost:3000/api/v1/documents/upload-session', {
      method: 'POST',
      headers: {
        authorization: `Bearer ${tokenA}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        filename: 'e2e_avionics_bus.pdf',
        mime_type: 'application/pdf',
        project_id: projectA.id,
      }),
    });
    const sessionRes = await createUploadSession(sessionReq);
    assert.equal(sessionRes.status, 201);
    const sessionData = await sessionRes.json();
    const docId = sessionData.upload_session.document_id;
    const uploadUrl = sessionData.upload_session.upload_url;

    // 2. Direct upload
    const e2ePdf = createValidPdf('AVIONICS_MAIN_COMM_BUS_J10', 2, 1920, 1080);
    const uploadReq = new NextRequest(`http://localhost:3000${uploadUrl}`, {
      method: 'PUT',
      headers: { 'content-type': 'application/pdf' },
      body: e2ePdf as unknown as BodyInit,
    });
    const uploadRes = await directUploadPut(uploadReq);
    assert.equal(uploadRes.status, 200);

    // 3. Verify upload
    const verifyReq = new NextRequest(`http://localhost:3000/api/v1/documents/${docId}/upload-complete`, {
      method: 'POST',
      headers: { authorization: `Bearer ${tokenA}` },
    });
    const verifyRes = await verifyUpload(verifyReq, { params: Promise.resolve({ id: docId }) });
    assert.equal(verifyRes.status, 200);
    const verifyData = await verifyRes.json();
    assert.equal(verifyData.verification.status, 'READY_FOR_PREFLIGHT');

    // 4. Trigger processing pipeline synchronously
    const processReq = new NextRequest(`http://localhost:3000/api/v1/documents/${docId}/process?sync=true`, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${tokenA}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({ sync: true }),
    });
    const processRes = await processDocument(processReq, { params: Promise.resolve({ id: docId }) });
    assert.equal(processRes.status, 200);
    const processData = await processRes.json();
    assert.ok(['READY_FOR_GRAPH', 'QC_COMPLETE'].includes(processData.job.document_status));

    // 5. Query processing status
    const statusReq = new NextRequest(`http://localhost:3000/api/v1/documents/${docId}/processing-status`, {
      method: 'GET',
      headers: { authorization: `Bearer ${tokenA}` },
    });
    const statusRes = await getProcessingStatus(statusReq, { params: Promise.resolve({ id: docId }) });
    assert.equal(statusRes.status, 200);
    const statusData = await statusRes.json();
    assert.ok(['READY_FOR_GRAPH', 'QC_COMPLETE'].includes(statusData.status));
    assert.equal(statusData.stats.pages_count, 2);
    assert.ok(statusData.artifacts.length >= 2); // PREFLIGHT_METADATA & NORMALIZED_PAGES

    // 6. Authorized download
    const dlReq = new NextRequest(`http://localhost:3000/api/v1/documents/${docId}/download?format=stream`, {
      method: 'GET',
      headers: { authorization: `Bearer ${tokenA}` },
    });
    const dlRes = await downloadDocument(dlReq, { params: Promise.resolve({ id: docId }) });
    assert.equal(dlRes.status, 200);
    const downloadedBuf = Buffer.from(await dlRes.arrayBuffer());
    assert.equal(downloadedBuf.length, e2ePdf.length);
    assert.equal(computeBufferSha256(downloadedBuf), computeBufferSha256(e2ePdf));
  });

  // Cleanup test tenants
  await prisma.tenant.deleteMany({ where: { id: { in: [tenantA.id, tenantB.id] } } });
});
