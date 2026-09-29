export interface PricingTier {
  id: string;
  name: string;
  priceMonthlyInr: number;
  priceMinorUnits: number; // in paise
  checkQuota: number;
  description: string;
  badge?: string;
  features: string[];
}

export const VALIDATED_PRICING_PLANS: Record<string, PricingTier> = {
  ENGINEERING_TEAM: {
    id: 'ENGINEERING_TEAM',
    name: 'Engineering Team',
    priceMonthlyInr: 9999,
    priceMinorUnits: 999900,
    checkQuota: 50,
    description: 'For harness engineering and quality teams reviewing complex wiring schematics.',
    features: [
      '50 Diagram Inspection Runs / month',
      'IPC/WHMA-A-620 & UL 508A deterministic rules',
      'Netlist & electrical graph extraction',
      'Formal PDF QC review reports & 5-sheet Excel workbooks',
      'Cryptographic SHA-256 report verification',
      'Standard support (24-hour response)',
    ],
  },
  ENTERPRISE_TEAM: {
    id: 'ENTERPRISE_TEAM',
    name: 'Enterprise Team',
    priceMonthlyInr: 24999,
    priceMinorUnits: 2499900,
    checkQuota: 350,
    badge: 'RECOMMENDED',
    description: 'For multi-plant manufacturing and Tier-1 builders requiring multi-engineer review workflows.',
    features: [
      '350 Diagram Inspection Runs / month',
      'Everything in Engineering Team plan',
      'Multi-engineer findings review & approval workflow',
      'Custom plant SOP rule authoring & evaluation',
      'Priority OCR and AI multimodal queue processing',
      'Dedicated engineering support with 4-hour SLA',
    ],
  },
  INDUSTRIAL_SCALE: {
    id: 'INDUSTRIAL_SCALE',
    name: 'Industrial Scale',
    priceMonthlyInr: 75000,
    priceMinorUnits: 7500000,
    checkQuota: 1500,
    description: 'High-throughput harness plants requiring custom ERP/MES integration and high-volume quotas.',
    features: [
      '1,500+ Diagram Inspection Runs / month',
      'Custom volume quotas & dedicated SLA guarantees',
      'ERP / MES integration APIs & webhook ingestion',
      'On-premise / isolated deployment consultation',
      'Custom standard rules authoring & calibration',
      'Dedicated Technical Account Manager',
    ],
  },
};
