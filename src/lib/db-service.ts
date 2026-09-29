import { prisma } from './prisma';
import { SAMPLE_DIAGRAMS } from '@/data/samples';
import { isProduction } from './config/app-mode';

// Default Multi-Tenant Seed Helper
export async function ensureDefaultTenantData() {
  // 1. Seed Demo Tenant ONLY in DEMO / TEST modes, never in PRODUCTION
  if (!isProduction()) {
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
  }


  // 2. Seed Commercial Billing Plans
  try {
    const plansToSeed = [
      {
        code: 'ENGINEERING_TEAM',
        name: 'Engineering Team',
        billingInterval: 'MONTHLY',
        priceMinor: 999900, // ₹9,999 in paise
        currency: 'INR',
        includedChecks: 50,
        features: JSON.stringify([
          '50 Diagram Inspection Runs / month',
          'IPC/WHMA-A-620 & UL 508A deterministic rules',
          'Netlist & electrical graph extraction',
          'Formal PDF QC review reports & 5-sheet Excel workbooks',
          'Cryptographic SHA-256 report verification',
        ]),
      },
      {
        code: 'ENTERPRISE_TEAM',
        name: 'Enterprise Team',
        billingInterval: 'MONTHLY',
        priceMinor: 2499900, // ₹24,999 in paise
        currency: 'INR',
        includedChecks: 350,
        features: JSON.stringify([
          '350 Diagram Inspection Runs / month',
          'Multi-engineer findings review & approval workflow',
          'Custom plant SOP rule authoring & evaluation',
          'Priority OCR and multimodal queue processing',
          'Dedicated engineering support with 4-hour SLA',
        ]),
      },
      {
        code: 'INDUSTRIAL_SCALE',
        name: 'Industrial Scale',
        billingInterval: 'MONTHLY',
        priceMinor: 7500000, // ₹75,000 in paise
        currency: 'INR',
        includedChecks: 1500,
        features: JSON.stringify([
          '1,500+ Diagram Inspection Runs / month',
          'Custom volume quotas & dedicated SLA guarantees',
          'ERP / MES integration APIs & webhook ingestion',
          'Dedicated single-tenant VPC or isolated deployment',
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
