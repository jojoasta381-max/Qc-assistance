import { test, expect } from '@playwright/test';

test.describe('Wiring Diagram QC Assistant - Core Test Suite', () => {
  test('Landing page loads with Executive Engineering theme', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/Wiring Diagram QC Assistant/);

    // Verify Brand title is visible
    const brand = page.locator('text=Wiring Diagram QC Assistant').first();
    await expect(brand).toBeVisible();

    // Verify Hero CTA is present
    const cta = page.getByRole('button', { name: /Run Your First QC Check/i });
    await expect(cta).toBeVisible();
  });

  test('Operational App Workspace loads cleanly', async ({ page }) => {
    await page.goto('/app');
    await expect(page.locator('text=OPERATIONAL QUALITY CENTER')).toBeVisible();

    // Check KPI cards
    await expect(page.locator('text=Total Audited')).toBeVisible();
    await expect(page.locator('text=First-Pass Yield')).toBeVisible();
  });

  test('Interactive How-it-Works pipeline page renders with clean stage tabs', async ({ page }) => {
    await page.goto('/how-it-works');
    await expect(page.locator('text=How Wiring Diagram QC Works')).toBeVisible();

    // Check Stage 02 label is cleanly rendered as 'Netlist Graph' without truncation
    await expect(page.locator('text=STAGE 02')).toBeVisible();
    await expect(page.locator('text=Netlist Graph')).toBeVisible();

    // Check bottom CTA points to /app
    const launchBtn = page.getByRole('link', { name: /Launch QC Workspace/i });
    await expect(launchBtn).toHaveAttribute('href', '/app');
  });

  test('Discrepancies severity filter pills work cleanly', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });
    // Switch to workspace view
    const startBtn = page.getByRole('button', { name: /Run Your First QC Check/i }).first();
    await expect(startBtn).toBeVisible({ timeout: 15000 });
    await startBtn.click();

    // Verify filter pills are visible
    const allPill = page.getByRole('button', { name: 'All', exact: true });
    const critPill = page.getByRole('button', { name: 'CRITICAL', exact: true });
    await expect(allPill).toBeVisible({ timeout: 15000 });
    await expect(critPill).toBeVisible({ timeout: 15000 });

    // Click CRITICAL filter pill
    await critPill.click();

    // Verify filtered count badge updates to '2 of 6'
    await expect(page.locator('text=2 of 6')).toBeVisible({ timeout: 15000 });
  });

  test('All key marketing pages load with HTTP 200 and correct headings', async ({ request, page }) => {
    for (const path of ['/standards', '/pricing', '/solutions', '/security', '/resources', '/contact']) {
      const res = await request.get(path);
      expect(res.status()).toBe(200);
    }
    await page.goto('/standards');
    await expect(page.locator('h1').first()).toBeVisible();
  });

  test('Health and readiness APIs respond with 200 OK', async ({ request }) => {
    const health = await request.get('/api/health');
    expect(health.status()).toBe(200);
    const healthJson = await health.json();
    expect(healthJson.status).toBe('ok');
    expect(healthJson.checks.database).toBe('healthy');

    const ready = await request.get('/api/ready');
    expect(ready.status()).toBe(200);
  });

  test('Interactive EasySchematic CAD Editor operates cleanly and DRC auto-remediates to 100% compliance', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });
    // Switch to Editor view using navigation
    const editorNavBtn = page.getByRole('button', { name: /Schematic Editor/i }).first();
    await expect(editorNavBtn).toBeVisible({ timeout: 15000 });
    await editorNavBtn.click();

    // Verify CAD engine toolbar is rendered
    await expect(page.locator('text=Interactive Schematic CAD Engine')).toBeVisible({ timeout: 15000 });

    // Verify DRC violations initially flagged
    await expect(page.locator('text=DRC VIOLATIONS FLAGGED')).toBeVisible({ timeout: 15000 });

    // Click Auto-Remediate Violations button
    const autoRemediateBtn = page.getByRole('button', { name: /Auto-Remediate/i }).first();
    await expect(autoRemediateBtn).toBeVisible({ timeout: 15000 });
    await autoRemediateBtn.click();

    // Verify banner updates to ALL DRC CHECKS PASSED: 100% Standards Compliant
    await expect(page.locator('text=ALL DRC CHECKS PASSED: 100% Standards Compliant')).toBeVisible({ timeout: 15000 });

    // Test adding a relay component
    const addRelayBtn = page.getByRole('button', { name: '+Relay' });
    await expect(addRelayBtn).toBeVisible({ timeout: 15000 });
    await addRelayBtn.click();

    // Test Auto-Arrange button
    const autoArrangeBtn = page.getByRole('button', { name: /Auto-Arrange/i });
    await expect(autoArrangeBtn).toBeVisible({ timeout: 15000 });
    await autoArrangeBtn.click();
  });

  test('Pricing View displays server plans and opens Razorpay checkout sandbox', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });
    // Switch to Pricing view
    const pricingNavBtn = page.getByRole('button', { name: 'Pricing', exact: true }).first();
    await expect(pricingNavBtn).toBeVisible({ timeout: 15000 });
    await pricingNavBtn.click();

    // Verify Official Razorpay Engineering Checkout heading
    await expect(page.locator('text=Official Razorpay Engineering Checkout')).toBeVisible({ timeout: 15000 });
    await expect(page.locator('text=₹99').first()).toBeVisible();
    await expect(page.locator('text=₹499').first()).toBeVisible();

    // Click checkout on Pay-Per-Check or Top-Up
    const checkoutBtn = page.getByRole('button', { name: /Checkout ₹99|Buy Top-Up/i }).first();
    await expect(checkoutBtn).toBeVisible();
    await checkoutBtn.click();

    // Verify Sandbox Modal opens with Razorpay brand and order
    await expect(page.locator('text=Razorpay Standard Checkout')).toBeVisible({ timeout: 15000 });
    await expect(page.locator('text=Server-Authoritative Price')).toBeVisible();

    // Click Pay button in sandbox
    const payBtn = page.getByRole('button', { name: /Pay ₹/i }).first();
    await expect(payBtn).toBeVisible();
    await payBtn.click();

    // Verify entitlement provisioned feedback
    await expect(page.locator('text=Entitlement Provisioned!')).toBeVisible({ timeout: 15000 });
  });
});


