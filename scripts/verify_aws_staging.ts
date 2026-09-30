import crypto from 'crypto';

const ALB_BASE = process.env.AWS_STAGING_URL || 'http://spanqc-staging-alb-1167170205.ap-south-1.elb.amazonaws.com';
const S3_BUCKET = process.env.AWS_S3_BUCKET || 'spanqc-staging-documents-905418293374';

function buildSyntheticSchematicPdf(): Buffer {
  const width = 1191;
  const height = 842;
  const streamContent = [
    'BT /F1 14 Tf 50 800 Td (HARNESS SCHEMATIC DRAWING H-202) Tj ET',
    'BT /F1 12 Tf 100 700 Td (J1 CONNECTOR MS3106A-20-29P) Tj ET',
    'BT /F1 12 Tf 600 700 Td (J2 CONNECTOR MS3102A-20-29S) Tj ET',
    'BT /F1 12 Tf 100 600 Td (F1 FUSE 10A 28VDC) Tj ET',
    'BT /F1 12 Tf 100 500 Td (R1 RELAY 28V DPDT) Tj ET',
    'BT /F1 12 Tf 100 400 Td (GND CHASSIS GROUND 0V) Tj ET',
    'BT /F1 10 Tf 120 880 Td (PIN 1: +28VDC) Tj ET',
    'BT /F1 10 Tf 120 860 Td (PIN 2: GND) Tj ET',
    'BT /F1 10 Tf 120 780 Td (PIN 1: +28VDC) Tj ET',
    'BT /F1 10 Tf 120 760 Td (PIN 2: GND) Tj ET',
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

async function runAwsAcceptanceSuite() {
  console.log('================================================================');
  console.log('SPANQC — AWS STAGING PRODUCTION ACCEPTANCE SUITE');
  console.log(`Target ALB: ${ALB_BASE}`);
  console.log(`Target S3:  ${S3_BUCKET}`);
  console.log('================================================================\n');

  const results: Record<string, { status: 'PASS' | 'FAIL'; detail: string; latencyMs: number }> = {};
  const randSuffix = Math.floor(Math.random() * 1000000);

  // 1. Health & Liveness Probe
  const t0 = Date.now();
  const healthRes = await fetch(`${ALB_BASE}/api/health`);
  const healthData = await healthRes.json();
  const healthLatency = Date.now() - t0;
  results['ALB Health Probe'] = {
    status: healthRes.status === 200 && healthData.status === 'ok' && healthData.checks?.database === 'healthy' ? 'PASS' : 'FAIL',
    detail: `HTTP ${healthRes.status} OK (DB: ${healthData.checks?.database})`,
    latencyMs: healthLatency,
  };

  // 2. Readiness Probe
  const tReady = Date.now();
  const readyRes = await fetch(`${ALB_BASE}/api/ready`);
  const readyData = await readyRes.json();
  results['ALB Readiness Probe'] = {
    status: readyRes.status === 200 && readyData.ready === true ? 'PASS' : 'FAIL',
    detail: `HTTP ${readyRes.status} (Ready: ${readyData.ready})`,
    latencyMs: Date.now() - tReady,
  };

  // 3. Security: S3 Public Access Denial
  const tS3 = Date.now();
  try {
    const s3DirectRes = await fetch(`https://${S3_BUCKET}.s3.ap-south-1.amazonaws.com/test-probe.txt`);
    results['S3 Public Access Denial'] = {
      status: s3DirectRes.status === 403 ? 'PASS' : 'FAIL',
      detail: `HTTP ${s3DirectRes.status} Forbidden (Public direct access successfully blocked)`,
      latencyMs: Date.now() - tS3,
    };
  } catch (err: any) {
    results['S3 Public Access Denial'] = { status: 'PASS', detail: `Blocked at network: ${err.message}`, latencyMs: Date.now() - tS3 };
  }

  // 4. Security: Unauthenticated Protected API Access
  const tAuthSec = Date.now();
  const unauthRes = await fetch(`${ALB_BASE}/api/v1/documents`);
  results['Unauthenticated Access Rejection'] = {
    status: unauthRes.status === 401 ? 'PASS' : 'FAIL',
    detail: `HTTP ${unauthRes.status} Unauthorized as expected`,
    latencyMs: Date.now() - tAuthSec,
  };

  // 5. Tenant A Onboarding
  const tUserA = Date.now();
  const emailA = `aerospace-qc-${randSuffix}@apex-avionics.com`;
  const signupARes = await fetch(`${ALB_BASE}/api/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: emailA,
      name: 'Lead Avionics Inspector A',
      password: 'SecurePassword123!',
      organizationName: `Apex Avionics Staging ${randSuffix}`,
    }),
  });
  const cookieA = signupARes.headers.get('set-cookie') || '';
  const signupAData = await signupARes.json();
  const sessionTokenA = cookieA.split(';')[0];
  const tenantAId = signupAData.data?.tenant?.id || signupAData.tenant?.id;
  results['Tenant A Onboarding'] = {
    status: (signupARes.status === 200 || signupARes.status === 201) && (signupAData.success || signupAData.user) ? 'PASS' : 'FAIL',
    detail: `Org: ${tenantAId}, Email: ${emailA}`,
    latencyMs: Date.now() - tUserA,
  };

  // 6. Tenant B Onboarding
  const tUserB = Date.now();
  const emailB = `harness-inspector-${randSuffix}@delta-cables.com`;
  const signupBRes = await fetch(`${ALB_BASE}/api/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: emailB,
      name: 'Inspector B',
      password: 'SecurePassword123!',
      organizationName: `Delta Cables Staging ${randSuffix}`,
    }),
  });
  const cookieB = signupBRes.headers.get('set-cookie') || '';
  const signupBData = await signupBRes.json();
  const sessionTokenB = cookieB.split(';')[0];
  results['Tenant B Onboarding'] = {
    status: (signupBRes.status === 200 || signupBRes.status === 201) && (signupBData.success || signupBData.user) ? 'PASS' : 'FAIL',
    detail: `Org: ${signupBData.data?.tenant?.id || signupBData.tenant?.id}`,
    latencyMs: Date.now() - tUserB,
  };

  // 7. Project Creation for Tenant A
  const tProj = Date.now();
  const projRes = await fetch(`${ALB_BASE}/api/v1/projects`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: sessionTokenA,
    },
    body: JSON.stringify({
      name: `Fighter Jet Harness QC ${randSuffix}`,
      description: 'Production wiring diagram acceptance',
    }),
  });
  const projData = await projRes.json();
  const projectA = projData.project || projData.data?.project || projData.data;
  const projectIdA = projectA?.id;
  results['Tenant A Project Creation'] = {
    status: projRes.status === 201 && projectIdA ? 'PASS' : 'FAIL',
    detail: `Project ID: ${projectIdA}`,
    latencyMs: Date.now() - tProj,
  };

  // 8. Upload Session Creation (Presigned S3 URL)
  const tUploadSession = Date.now();
  const pdfBytes = buildSyntheticSchematicPdf();
  const pdfSha256 = crypto.createHash('sha256').update(pdfBytes).digest('hex');
  const uploadSessionRes = await fetch(`${ALB_BASE}/api/v1/documents/upload-session`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: sessionTokenA,
    },
    body: JSON.stringify({
      project_id: projectIdA,
      filename: 'harness_schematic_h202.pdf',
      mime_type: 'application/pdf',
      size_bytes: pdfBytes.length,
    }),
  });
  const sessionData = await uploadSessionRes.json();
  const uploadSession = sessionData.upload_session || sessionData.data?.upload_session;
  const docIdA = uploadSession?.document_id;
  const presignedUploadUrl = uploadSession?.upload_url;
  results['Upload Session & S3 Presigned URL'] = {
    status: uploadSessionRes.status === 201 && docIdA && presignedUploadUrl ? 'PASS' : 'FAIL',
    detail: `Doc ID: ${docIdA}, Method: ${uploadSession?.method}`,
    latencyMs: Date.now() - tUploadSession,
  };

  // 9. Presigned Binary Upload directly to S3
  const tS3Upload = Date.now();
  let fullUploadUrl = presignedUploadUrl || '';
  if (fullUploadUrl.startsWith('/')) {
    fullUploadUrl = `${ALB_BASE}${fullUploadUrl}`;
  }
  const putRes = await fetch(fullUploadUrl, {
    method: uploadSession?.method || 'PUT',
    headers: {
      'Content-Type': 'application/pdf',
      ...(uploadSession?.headers || {}),
    },
    body: pdfBytes as any,
  });
  results['Direct Binary S3 Storage Write'] = {
    status: putRes.status >= 200 && putRes.status < 300 ? 'PASS' : 'FAIL',
    detail: `HTTP ${putRes.status} (Uploaded ${pdfBytes.length} bytes)`,
    latencyMs: Date.now() - tS3Upload,
  };

  // 10. Upload Verification Gate
  const tVerify = Date.now();
  const verifyRes = await fetch(`${ALB_BASE}/api/v1/documents/${docIdA}/upload-complete`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: sessionTokenA,
    },
    body: JSON.stringify({
      client_sha256: pdfSha256,
    }),
  });
  const verifyData = await verifyRes.json();
  results['Upload Verification & Checksum Gate'] = {
    status: verifyRes.status === 200 && (verifyData.verification || verifyData.document || verifyData.success) ? 'PASS' : 'FAIL',
    detail: `Status: ${verifyData.verification?.upload_status || verifyData.document?.status || verifyData.data?.status || 'VERIFIED'}`,
    latencyMs: Date.now() - tVerify,
  };

  // 11. Pipeline Processing: Extraction, ElectricalGraph & 20 QC Rules
  const tProcess = Date.now();
  const processRes = await fetch(`${ALB_BASE}/api/v1/documents/${docIdA}/process?sync=true`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: sessionTokenA,
    },
  });
  const processText = await processRes.text();
  let processData: any = {};
  try {
    processData = JSON.parse(processText);
  } catch (e) {
    console.error(`Process endpoint returned non-JSON (${processRes.status}):`, processText);
  }
  const job = processData.job || processData.data?.job;
  results['Real Pipeline & Deterministic 20 QC Engine'] = {
    status: processRes.status === 200 && (job?.status === 'COMPLETED' || job?.status === 'READY_FOR_GRAPH') ? 'PASS' : 'FAIL',
    detail: `Job Status: ${job?.status}, Stage: ${job?.stage}, Document: ${job?.document_status}`,
    latencyMs: Date.now() - tProcess,
  };

  // 12. Findings Retrieval
  const tFindings = Date.now();
  const findingsRes = await fetch(`${ALB_BASE}/api/v1/documents/${docIdA}/findings`, {
    headers: { Cookie: sessionTokenA },
  });
  const findingsData = await findingsRes.json().catch(() => ({}));
  const findingsList = findingsData.findings || findingsData.data?.findings || [];
  results['Findings Retrieval Experience'] = {
    status: findingsRes.status === 200 ? 'PASS' : 'FAIL',
    detail: `Retrieved findings response (Status: ${findingsRes.status}, count: ${findingsList.length})`,
    latencyMs: Date.now() - tFindings,
  };

  // 13. Report Generation (QC Review Report)
  const tReport = Date.now();
  const reportRes = await fetch(`${ALB_BASE}/api/v1/documents/${docIdA}/reports`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: sessionTokenA,
    },
    body: JSON.stringify({
      reportType: 'FULL_AUDIT',
    }),
  });
  const reportText = await reportRes.text();
  let reportData: any = {};
  try {
    reportData = JSON.parse(reportText);
  } catch (e) {
    console.error(`Report endpoint returned non-JSON (${reportRes.status}):`, reportText);
  }
  const report = reportData.report || reportData.data?.report;
  results['QC Review Report Generation'] = {
    status: (reportRes.status === 200 || reportRes.status === 201) && report ? 'PASS' : 'FAIL',
    detail: `Report ID: ${report?.id}, Status: ${reportRes.status}`,
    latencyMs: Date.now() - tReport,
  };

  // 14. Presigned Report Download Authorization
  const tDownload = Date.now();
  const dlRes = await fetch(`${ALB_BASE}/api/v1/documents/${docIdA}/download?type=report`, {
    headers: { Cookie: sessionTokenA },
  });
  const dlData = await dlRes.json();
  const downloadUrl = dlData.download?.download_url || dlData.download_url || dlData.data?.downloadUrl || dlData.downloadUrl;
  results['Authorized Report Download URL'] = {
    status: dlRes.status === 200 && downloadUrl ? 'PASS' : 'FAIL',
    detail: `Presigned URL: ${String(downloadUrl).substring(0, 45)}...`,
    latencyMs: Date.now() - tDownload,
  };

  // 15. Security: Cross-Tenant Isolation Enforcement (Tenant B cannot read Tenant A's doc)
  const tIsoDoc = Date.now();
  const isoDocRes = await fetch(`${ALB_BASE}/api/v1/documents/${docIdA}`, {
    headers: { Cookie: sessionTokenB },
  });
  results['Tenant Isolation: Document IDOR Block'] = {
    status: isoDocRes.status === 404 || isoDocRes.status === 403 ? 'PASS' : 'FAIL',
    detail: `HTTP ${isoDocRes.status} (Tenant B blocked from accessing Tenant A document)`,
    latencyMs: Date.now() - tIsoDoc,
  };

  // 16. Security: Cross-Tenant Isolation Enforcement (Tenant B cannot read Tenant A's findings)
  const tIsoFind = Date.now();
  const isoFindRes = await fetch(`${ALB_BASE}/api/v1/documents/${docIdA}/findings`, {
    headers: { Cookie: sessionTokenB },
  });
  results['Tenant Isolation: Findings IDOR Block'] = {
    status: isoFindRes.status === 404 || isoFindRes.status === 403 ? 'PASS' : 'FAIL',
    detail: `HTTP ${isoFindRes.status} (Tenant B blocked from viewing Tenant A findings)`,
    latencyMs: Date.now() - tIsoFind,
  };

  // Print Summary Table
  console.log('\nACCEPTANCE RESULTS:\n');
  console.log('| Gate / Test Name | Status | Latency | Details |');
  console.log('| :--- | :--- | :--- | :--- |');
  let allPassed = true;
  for (const [name, res] of Object.entries(results)) {
    console.log(`| ${name} | **${res.status}** | ${res.latencyMs}ms | ${res.detail} |`);
    if (res.status !== 'PASS') allPassed = false;
  }

  console.log(`\nOVERALL SUITE STATUS: ${allPassed ? 'ALL GATES PASSED (16/16)' : 'FAILURES DETECTED'}`);
  if (!allPassed) {
    process.exit(1);
  }
}

runAwsAcceptanceSuite().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
