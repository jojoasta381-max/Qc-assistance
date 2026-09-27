import { prisma } from './prisma';
import { SAMPLE_DIAGRAMS } from '@/data/samples';

// Default Multi-Tenant Seed Helper
export async function ensureDefaultTenantData() {
  // 1. Seed Spandsons Horizon Engineering
  try {
    const spandsons = await prisma.tenant.upsert({
      where: { slug: 'spandsons' },
      update: {},
      create: {
        name: 'Spandsons Horizon Engineering Pvt. Ltd.',
        slug: 'spandsons',
        plan: 'MID_5',
        checkQuota: 100,
        quotaUsed: 38,
        users: {
          create: [
            {
              name: 'Pravin',
              email: 'pravin@spandsons.com',
              phone: '+91 98765 43210',
              role: 'LEAD_QC_INSPECTOR',
            },
            {
              name: 'Gogulnath',
              email: 'gogulnath@spandsons.com',
              phone: '+91 98765 43211',
              role: 'HARNESS_ENGINEER',
            },
          ],
        },
      },
    });

    const diagramCount = await prisma.diagram.count({ where: { tenantId: spandsons.id } });
    if (diagramCount === 0) {
      for (const sample of SAMPLE_DIAGRAMS) {
        await prisma.diagram.create({
          data: {
            title: sample.name,
            standard: sample.standard,
            category: sample.category,
            svgData: sample.svgKey,
            tenantId: spandsons.id,
          },
        });
      }
    }
  } catch (_err) {
    // Ignore if already seeded
  }

  // 2. Seed Tata AutoComp Demo Tenant
  try {
    await prisma.tenant.upsert({
      where: { slug: 'tata-autocomp' },
      update: {},
      create: {
        name: 'Tata AutoComp Systems (Wire Harness Division)',
        slug: 'tata-autocomp',
        plan: 'MAX_10',
        checkQuota: 500,
        quotaUsed: 142,
        users: {
          create: [
            {
              name: 'Anand Kumar',
              email: 'anand.k@tataautocomp.com',
              phone: '+91 98111 22334',
              role: 'PLANT_QUALITY_HEAD',
            },
          ],
        },
      },
    });
  } catch (_err) {
    // Ignore if already seeded
  }

  // 3. Seed Commercial Billing Plans
  try {
    const plansToSeed = [
      {
        code: 'PAY_PER_CHECK',
        name: 'Pay-Per-Check (Single Diagram Audit)',
        billingInterval: 'ONE_TIME',
        priceMinor: 9900, // ₹99 in paise
        currency: 'INR',
        includedChecks: 1,
        features: JSON.stringify([
          '1 Deterministic & AI Multi-Standard Check',
          'IPC-620 Class 3 & UL-508A Verification',
          'Instant Bounding Box Spatial Overlay',
          'PDF & XLSX Compliance Certificate',
        ]),
      },
      {
        code: 'PRO_MONTHLY',
        name: 'Professional QC Team (Monthly)',
        billingInterval: 'MONTHLY',
        priceMinor: 49900, // ₹499 in paise
        currency: 'INR',
        includedChecks: 100,
        features: JSON.stringify([
          '100 Full Diagram QC Checks / Month',
          'Interactive Schematic CAD Editor & DRC',
          'Multi-Tenant Role-Based Access Control',
          'Automated Cable Schedule Netlist BOM',
          'Priority Standard Rule Updates',
        ]),
      },
      {
        code: 'PRO_ANNUAL',
        name: 'Industrial Enterprise (Annual)',
        billingInterval: 'ANNUAL',
        priceMinor: 499900, // ₹4,999 in paise (save 17%)
        currency: 'INR',
        includedChecks: 1500,
        features: JSON.stringify([
          '1,500 Diagram QC Checks / Year',
          'All Pro Features Included',
          'Custom Organization SOP Injection',
          'Unlimited Historical Audit Certificate Archive',
          'Dedicated Technical Account Manager',
        ]),
      },
    ];

    for (const plan of plansToSeed) {
      await prisma.plan.upsert({
        where: { code: plan.code },
        update: {
          name: plan.name,
          priceMinor: plan.priceMinor,
          includedChecks: plan.includedChecks,
          features: plan.features,
        },
        create: plan,
      });
    }
  } catch (err) {
    console.warn('Plan seed warning:', err);
  }

  // 4. Seed Standards & Rules
  try {
    await prisma.standard.upsert({
      where: { name: 'IPC/WHMA-A-620' },
      update: {},
      create: {
        name: 'IPC/WHMA-A-620',
        version: 'Revision E (Class 1, 2, & 3)',
        jurisdiction: 'INTERNATIONAL',
        sourceUri: 'https://www.ipc.org/ipc-whma-a-620',
        licenseMetadata: JSON.stringify({ authorized: true, publisher: 'IPC & WHMA' }),
      },
    });

    await prisma.standard.upsert({
      where: { name: 'UL 508A' },
      update: {},
      create: {
        name: 'UL 508A',
        version: '3rd Edition (Industrial Control Panels)',
        jurisdiction: 'NORTH_AMERICA',
        sourceUri: 'https://standardscatalog.ul.com/standards/en/standard_508a_3',
        licenseMetadata: JSON.stringify({ authorized: true, publisher: 'Underwriters Laboratories' }),
      },
    });

    const rulesToSeed = [
      {
        code: 'IPC-AMP-001',
        name: 'Continuous Ampacity Conductor Thermal Derating',
        version: '1.0.0',
        severity: 'CRITICAL',
        applicability: JSON.stringify({ standard: 'IPC/WHMA-A-620', class: 'CLASS_3' }),
        definition: JSON.stringify({ engine: 'evaluateIpcAmpacity' }),
      },
      {
        code: 'IPC-PIN-002',
        name: 'Unpopulated Connector Cavity Sealing Plugs',
        version: '1.0.0',
        severity: 'MAJOR',
        applicability: JSON.stringify({ standard: 'IPC/WHMA-A-620', class: 'CLASS_3' }),
        definition: JSON.stringify({ engine: 'evaluateIpcFloatingPins' }),
      },
      {
        code: 'UL508A-GND-001',
        name: 'Equipment Protective Bonding Conductor Minimum Size',
        version: '1.0.0',
        severity: 'CRITICAL',
        applicability: JSON.stringify({ standard: 'UL 508A' }),
        definition: JSON.stringify({ engine: 'evaluateGroundBonding' }),
      },
    ];

    for (const rule of rulesToSeed) {
      await prisma.rule.upsert({
        where: { code: rule.code },
        update: {},
        create: rule,
      });
    }
  } catch (err) {
    console.warn('Standards seed warning:', err);
  }
}

export async function getTenantBySlug(slug: string) {
  await ensureDefaultTenantData();
  return prisma.tenant.findUnique({
    where: { slug },
    include: {
      users: true,
      diagrams: true,
      inspections: {
        orderBy: { createdAt: 'desc' },
      },
      sopRules: true,
    },
  });
}

export async function listAllTenants() {
  await ensureDefaultTenantData();
  return prisma.tenant.findMany({
    include: {
      users: true,
      _count: {
        select: { inspections: true, diagrams: true },
      },
    },
  });
}
