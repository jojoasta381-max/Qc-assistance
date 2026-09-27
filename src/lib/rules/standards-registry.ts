import { StandardPreset, SeverityLevel } from '@/types/qc';

export type RuleCategory =
  | 'ELECTRICAL_SAFETY'
  | 'CONDUCTOR_SIZING'
  | 'GROUNDING_BONDING'
  | 'MECHANICAL_RELIABILITY'
  | 'TERMINATION_CRIMPING'
  | 'DOCUMENTATION_SOP';

export interface StandardRuleDefinition {
  code: string;
  standard: StandardPreset;
  clause: string;
  title: string;
  category: RuleCategory;
  severityDefault: SeverityLevel;
  description: string;
  formulaOrCheck: string;
  defaultParameters: Record<string, string | number | boolean>;
  remediationTemplate: string;
}

export const STANDARDS_RULE_REGISTRY: StandardRuleDefinition[] = [
  // ==========================================
  // IPC/WHMA-A-620 RULES
  // ==========================================
  {
    code: 'IPC620-01-AMPACITY',
    standard: 'IPC-WHMA-A-620',
    clause: '§4.2.1 & Table 4-2',
    title: 'Continuous Conductor Ampacity & Thermal Derating',
    category: 'CONDUCTOR_SIZING',
    severityDefault: 'CRITICAL',
    description: 'Ensures wire gauge cross-sectional area is rated for continuous operating current with bundle count and ambient temperature derating applied.',
    formulaOrCheck: 'I_continuous <= I_nominal * k_bundle * k_temp',
    defaultParameters: {
      ambientTempC: 35,
      bundleWireCount: 4,
      safetyMarginPercent: 15,
    },
    remediationTemplate: 'Upsize conductor gauge or decrease continuous branch circuit load.',
  },
  {
    code: 'IPC620-02-SPLICE-STAGGER',
    standard: 'IPC-WHMA-A-620',
    clause: '§13.4.1',
    title: 'Axial Splice Stagger Clearance Distance',
    category: 'MECHANICAL_RELIABILITY',
    severityDefault: 'MAJOR',
    description: 'Splices within adjacent wires in a multi-conductor harness bundle must be staggered axially to avoid localized thickening and heat concentration.',
    formulaOrCheck: 'Delta_X >= 50mm (Class 2/3) or >= 30mm (Class 1)',
    defaultParameters: {
      minStaggerClass1Mm: 30,
      minStaggerClass2Class3Mm: 50,
    },
    remediationTemplate: 'Offset ultrasonic or in-line crimp splices by minimum 50mm along the wire bundle axis.',
  },
  {
    code: 'IPC620-03-CRIMP-BRUSH',
    standard: 'IPC-WHMA-A-620',
    clause: '§5.1.3 & Table 5-2',
    title: 'Crimp Conductor Brush Protrusion Tolerance',
    category: 'TERMINATION_CRIMPING',
    severityDefault: 'CRITICAL',
    description: 'Conductor strands must extend beyond the crimp barrel face to ensure full wire grip without interfering with contact insertion into the connector housing.',
    formulaOrCheck: '0.5mm <= Brush_Length <= 1.0mm (Class 2 & 3)',
    defaultParameters: {
      minBrushMm: 0.5,
      maxBrushMm: 1.0,
    },
    remediationTemplate: 'Calibrate wire stripping cut length to achieve 0.5mm to 1.0mm exposed conductor brush past the crimp barrel face.',
  },
  {
    code: 'IPC620-04-SHIELD-PIGTAIL',
    standard: 'IPC-WHMA-A-620',
    clause: '§15.2.2',
    title: 'Maximum Shield Braid Termination Pigtail Length',
    category: 'ELECTRICAL_SAFETY',
    severityDefault: 'MAJOR',
    description: 'Limits the maximum unshielded length of a braided shield drain wire / pigtail to maintain high-frequency electromagnetic immunity.',
    formulaOrCheck: 'Pigtail_Length <= 25.0mm',
    defaultParameters: {
      maxPigtailLengthMm: 25.0,
    },
    remediationTemplate: 'Shorten drain wire pigtail to <= 25mm or specify a 360-degree backshell shield clamping band.',
  },
  {
    code: 'IPC620-05-BEND-RADIUS',
    standard: 'IPC-WHMA-A-620',
    clause: '§17.1.1',
    title: 'Minimum Conductor & Harness Bend Radius',
    category: 'MECHANICAL_RELIABILITY',
    severityDefault: 'MAJOR',
    description: 'Enforces minimum bend radii to prevent conductor strand fatigue and insulation dielectric breakdown under cyclic motion.',
    formulaOrCheck: 'Radius >= 6x Outer_Diameter (Unshielded) or >= 10x Outer_Diameter (Shielded)',
    defaultParameters: {
      unshieldedMultiplier: 6,
      shieldedMultiplier: 10,
    },
    remediationTemplate: 'Increase harness routing radius or install 90-degree connector backshell adapters.',
  },
  {
    code: 'IPC620-06-FLOATING-PINS',
    standard: 'IPC-WHMA-A-620',
    clause: '§8.2.3 & SAE AS50881',
    title: 'Unassigned Connector Cavity Sealing Plugs (Class 3)',
    category: 'TERMINATION_CRIMPING',
    severityDefault: 'MAJOR',
    description: 'Requires all unpopulated pin cavities in sealed connectors to contain waterproof sealing cavity plugs (MS27488).',
    formulaOrCheck: 'Count(Unassigned_Cavities_Without_Plugs) == 0',
    defaultParameters: {
      requireSealingPlugsForClass3: true,
    },
    remediationTemplate: 'Add MS27488 sealing cavity plugs to BOM for all unused connector cavities.',
  },

  // ==========================================
  // UL 508A RULES
  // ==========================================
  {
    code: 'UL508A-01-GROUNDING-TABLE15',
    standard: 'UL-508A',
    clause: 'Table 15.1 & §15.2',
    title: 'Equipment Grounding Conductor Minimum Copper Size',
    category: 'GROUNDING_BONDING',
    severityDefault: 'CRITICAL',
    description: 'Equipment grounding and bonding conductor gauge must equal or exceed the minimum size specified for the upstream circuit breaker rating.',
    formulaOrCheck: 'Conductor_AWG <= Table15_Max_AWG(Upstream_Breaker_Amps)',
    defaultParameters: {
      conductorMaterial: 'Copper',
    },
    remediationTemplate: 'Upgrade equipment grounding conductor to match UL 508A Table 15.1 copper requirements.',
  },
  {
    code: 'UL508A-02-SCCR-WEAKEST-LINK',
    standard: 'UL-508A',
    clause: 'Supplement SB4.2',
    title: 'Panel Short-Circuit Current Rating (SCCR) Coordination',
    category: 'ELECTRICAL_SAFETY',
    severityDefault: 'CRITICAL',
    description: 'The overall panel marked SCCR cannot exceed the lowest withstand rating of any power-circuit component in the branch.',
    formulaOrCheck: 'Panel_SCCR <= Min(Component_1_SCCR, Component_2_SCCR, ...)',
    defaultParameters: {
      defaultFeederSccrKa: 65,
    },
    remediationTemplate: 'Derate marked panel SCCR to match lowest branch component or install upstream current-limiting fuses.',
  },
  {
    code: 'UL508A-03-WIRE-DUCT-FILL',
    standard: 'UL-508A',
    clause: '§29.3.4 & NFPA 79 §13.5',
    title: 'Internal Panel Wire Duct 20% Fill Ratio Limit',
    category: 'MECHANICAL_RELIABILITY',
    severityDefault: 'MAJOR',
    description: 'Total cross-sectional area of conductors within internal plastic raceways / wire ducts cannot exceed 20% of duct interior volume.',
    formulaOrCheck: '(Total_Wire_Area / Duct_Interior_Area) * 100 <= 20.0%',
    defaultParameters: {
      maxFillPercent: 20.0,
      insulationAreaFactor: 2.6,
    },
    remediationTemplate: 'Upsize wire duct dimensions or divide high-density conductors into parallel secondary wireways.',
  },
  {
    code: 'UL508A-04-COLOR-CODE-VOLTAGE',
    standard: 'UL-508A',
    clause: '§20.1 & §20.2',
    title: 'Conductor Color Coding & Voltage Domain Separation',
    category: 'ELECTRICAL_SAFETY',
    severityDefault: 'CRITICAL',
    description: 'Standardizes conductor colors by circuit function: Black for AC power, Red for AC control, Blue for DC control, Blue/White for DC common, and Green/Yellow for PE ground.',
    formulaOrCheck: 'Color(Conductor) == Standard_Color(Voltage_Domain)',
    defaultParameters: {
      strictDcBlue: true,
      strictGroundGreenYellow: true,
    },
    remediationTemplate: 'Update schematic conductor callout to comply with UL 508A §20 standardized insulation color codes.',
  },

  // ==========================================
  // CUSTOM PLANT SOP RULES
  // ==========================================
  {
    code: 'SOP-01-TITLE-APPROVAL',
    standard: 'CUSTOMER-SOP',
    clause: 'SOP §1.1',
    title: 'Mandatory Professional Engineering (PE) Sign-Off',
    category: 'DOCUMENTATION_SOP',
    severityDefault: 'CRITICAL',
    description: 'Schematic drawings must contain a validated Lead PE / QA approval signature and sign-off date prior to fabrication release.',
    formulaOrCheck: 'Approved_By != "" && Approved_By != "PENDING"',
    defaultParameters: {
      requireSignatureDate: true,
    },
    remediationTemplate: 'Submit drawing package through formal ECO workflow and obtain Lead Engineer sign-off.',
  },
  {
    code: 'SOP-02-WIRE-TAG-SYNTAX',
    standard: 'CUSTOMER-SOP',
    clause: 'SOP §4.1',
    title: 'Wire Tag Naming Syntax Conformance (W-###)',
    category: 'DOCUMENTATION_SOP',
    severityDefault: 'MINOR',
    description: 'Wire tag identifiers must conform to standardized plant syntax for automated wire cutting, stripping, and inkjet marking.',
    formulaOrCheck: 'Regex_Match(Wire_Tag, "^W-[0-9]{3,4}$")',
    defaultParameters: {
      pattern: '^W-[0-9]{3,4}$',
    },
    remediationTemplate: 'Update wire tags in CAD to match plant standardized numbering format W-###.',
  },
];
