import test from 'node:test';
import assert from 'node:assert/strict';
import { getAppMode, isProduction } from '../src/lib/config/app-mode';
import { VALIDATED_PRICING_PLANS } from '../src/lib/config/pricing';
import { generateReportChecksum, buildAuditCertificate } from '../src/lib/reports/audit-report-generator';
import { runDeterministicQcInspection } from '../src/lib/rules/rule-evaluator';
import { STANDARDS_RULE_REGISTRY } from '../src/lib/rules/standards-registry';
import { AIProviderRouter } from '../src/lib/ai/router';
import { QCReport } from '../src/types/qc';

test('App Mode Configuration', () => {
  // Default mode should be PRODUCTION or TEST in test runner
  const mode = getAppMode();
  assert.ok(mode === 'PRODUCTION' || mode === 'TEST', `Unexpected mode: ${mode}`);
  assert.equal(typeof isProduction(), 'boolean');
});

test('Validated Pricing Plans Structure & Alignment', () => {
  assert.ok(VALIDATED_PRICING_PLANS.ENGINEERING_TEAM, 'ENGINEERING_TEAM plan must exist');
  assert.equal(VALIDATED_PRICING_PLANS.ENGINEERING_TEAM.priceMonthlyInr, 9999);
  assert.equal(VALIDATED_PRICING_PLANS.ENGINEERING_TEAM.priceMinorUnits, 999900);
  assert.equal(VALIDATED_PRICING_PLANS.ENGINEERING_TEAM.checkQuota, 50);

  assert.ok(VALIDATED_PRICING_PLANS.ENTERPRISE_TEAM, 'ENTERPRISE_TEAM plan must exist');
  assert.equal(VALIDATED_PRICING_PLANS.ENTERPRISE_TEAM.priceMonthlyInr, 24999);
  assert.equal(VALIDATED_PRICING_PLANS.ENTERPRISE_TEAM.priceMinorUnits, 2499900);
  assert.equal(VALIDATED_PRICING_PLANS.ENTERPRISE_TEAM.checkQuota, 350);

  assert.ok(VALIDATED_PRICING_PLANS.INDUSTRIAL_SCALE, 'INDUSTRIAL_SCALE plan must exist');
  assert.equal(VALIDATED_PRICING_PLANS.INDUSTRIAL_SCALE.priceMonthlyInr, 75000);
  assert.equal(VALIDATED_PRICING_PLANS.INDUSTRIAL_SCALE.priceMinorUnits, 7500000);
});

test('Cryptographic Report Fingerprint Integrity (SHA-256)', () => {
  const dummyReport: QCReport = {
    id: 'QC-TEST-001',
    diagramName: 'TEST-HARNESS-WIRING.dwg',
    diagramCategory: 'Wiring Harness',
    standard: 'IPC-WHMA-A-620',
    timestamp: '2026-09-28T12:00:00.000Z',
    overallResult: 'PASS',
    qualityScore: 98,
    summary: {
      executed: 12,
      passed: 12,
      failed: 0,
      na: 0,
      critical: 0,
      major: 0,
      minor: 0,
    },
    discrepancies: [],
    inspectedBy: 'Deterministic Rule Engine',
    modelUsed: 'Deterministic Engine v2.4',
    executionTimeMs: 120,
  };

  const hash1 = generateReportChecksum(dummyReport);
  assert.match(hash1, /^sha256:[a-f0-9]{64}$/, 'Hash must be a valid 64-char hex SHA-256 digest prefixed with sha256:');

  // Must be deterministic
  const hash2 = generateReportChecksum(dummyReport);
  assert.equal(hash1, hash2, 'Hash must be identical for identical report data');

  // Must change if content changes
  const modifiedReport = { ...dummyReport, qualityScore: 97 };
  const hash3 = generateReportChecksum(modifiedReport);
  assert.notEqual(hash1, hash3, 'Hash must change when report content changes');
});

test('Deterministic Rule Evaluator derives counts from standards registry', async () => {
  const report = await runDeterministicQcInspection('SAMPLE-HARNESS', 'Wiring Harness', 'IPC-WHMA-A-620');
  
  // Total executed checks must derive from actual registry length
  assert.ok(report.summary.executed > 0, 'Executed checks must be positive');
  assert.ok(report.summary.executed <= STANDARDS_RULE_REGISTRY.length, 'Executed checks cannot exceed registry count');
  assert.notEqual(report.summary.executed, 142, 'Executed checks must NOT be hardcoded to 142');
  assert.ok(report.id.startsWith('QC-'), 'Report ID must start with QC-');
  assert.doesNotMatch(report.id, /undefined|null|NaN/, 'Report ID must be valid');
});

test('Report metadata builds truthful QC Review terminology', () => {
  const dummyReport: QCReport = {
    id: 'QC-789123',
    diagramName: 'HARNESS-REV-A.pdf',
    diagramCategory: 'Industrial Panel',
    standard: 'UL-508A',
    timestamp: '2026-09-28T14:30:00.000Z',
    overallResult: 'PASS',
    qualityScore: 100,
    summary: { executed: 12, passed: 12, failed: 0, na: 0, critical: 0, major: 0, minor: 0 },
    discrepancies: [],
    inspectedBy: 'Deterministic Engine',
    modelUsed: 'Rules Engine v2.4',
    executionTimeMs: 95,
  };

  const cert = buildAuditCertificate(dummyReport, {
    organization: 'Acme Harness Manufacturing',
    leadAuditor: 'J. Doe, Lead Engineer',
  });

  assert.equal(cert.organization, 'Acme Harness Manufacturing');
  assert.equal(cert.leadAuditor, 'J. Doe, Lead Engineer');
  assert.equal(cert.overallDisposition, 'ACCEPTED_REVIEW');
  assert.match(cert.sha256Fingerprint, /^sha256:[a-f0-9]{64}$/);
});

test('AI Provider Router in PRODUCTION mode fails closed on mock provider request', () => {
  const originalMode = process.env.APP_MODE;
  process.env.APP_MODE = 'PRODUCTION';
  try {
    const router = new AIProviderRouter();
    assert.throws(
      () => router.getProvider('mock'),
      /disabled in PRODUCTION mode/,
      'Router must reject mock provider in PRODUCTION mode'
    );
  } finally {
    process.env.APP_MODE = originalMode;
  }
});
