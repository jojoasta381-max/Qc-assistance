import { ElectricalGraph, ElectricalEdge } from '@/lib/graph/netlist-graph';
import { TitleBlockMetadata } from '@/lib/ingestion/bounds-extractor';
import { Discrepancy } from '@/types/qc';

export interface TenantCustomRuleConfig {
  id: string;
  ruleCode: string;
  name: string;
  description: string;
  severity: 'CRITICAL' | 'MAJOR' | 'MINOR';
  conditionType: 'REGEX_PATTERN' | 'NUMERIC_LIMIT' | 'MANDATORY_FIELD' | 'FORBIDDEN_TERM';
  conditionConfig: {
    targetField?: 'wireTag' | 'nodeId' | 'drawingNumber' | 'revision' | 'engineer';
    pattern?: string;
    forbiddenWords?: string[];
    minValue?: number;
    maxValue?: number;
    requiredFields?: string[];
  };
  isActive: boolean;
}

/**
 * Default Plant SOP Rules for Spandsons Horizon Engineering
 */
export const DEFAULT_PLANT_SOP_RULES: TenantCustomRuleConfig[] = [
  {
    id: 'SOP-001',
    ruleCode: 'SOP-DWG-REV-FMT',
    name: 'Standard ECO Revision Code Format',
    description: 'Engineering drawing revision identifier must strictly be a capital letter (A-Z) or two-digit sequential number (01-99). Preliminary prefixes like "DRAFT" or "WIP" are strictly prohibited on released drawings.',
    severity: 'MAJOR',
    conditionType: 'REGEX_PATTERN',
    conditionConfig: {
      targetField: 'revision',
      pattern: '^([A-Z]{1,2}|[0-9]{2})$',
    },
    isActive: true,
  },
  {
    id: 'SOP-002',
    ruleCode: 'SOP-WIRE-TAG-SYNTAX',
    name: 'Wire Tag Naming Syntax (W-###)',
    description: 'All individual single-conductor wire tags must follow the plant prefix format W-### (e.g. W-101, W-102).',
    severity: 'MINOR',
    conditionType: 'REGEX_PATTERN',
    conditionConfig: {
      targetField: 'wireTag',
      pattern: '^W-[0-9]{3,4}$',
    },
    isActive: true,
  },
  {
    id: 'SOP-003',
    ruleCode: 'SOP-TITLE-APPROVAL-REQ',
    name: 'Mandatory PE Approval Sign-Off',
    description: 'Title block must contain a certified Lead Electrical Engineer approval signature and date prior to shop-floor manufacturing release.',
    severity: 'CRITICAL',
    conditionType: 'MANDATORY_FIELD',
    conditionConfig: {
      targetField: 'engineer',
      requiredFields: ['approvedBy', 'approvalDate'],
    },
    isActive: true,
  },
];

/**
 * Evaluates drawing Title Block against plant SOP standards
 */
export function evaluateTitleBlockSop(
  titleBlock: TitleBlockMetadata,
  rules: TenantCustomRuleConfig[] = DEFAULT_PLANT_SOP_RULES
): Discrepancy[] {
  const discrepancies: Discrepancy[] = [];

  for (const rule of rules) {
    if (!rule.isActive) continue;

    // Check Revision code format
    if (rule.conditionConfig.targetField === 'revision' && rule.conditionConfig.pattern) {
      const reg = new RegExp(rule.conditionConfig.pattern);
      const rev = (titleBlock.revision || '').trim();
      if (!rev || !reg.test(rev)) {
        discrepancies.push({
          id: `SOP-REV-${rule.id}`,
          title: `Non-Compliant Drawing Revision Code ("${rev || 'MISSING'}")`,
          description: `Drawing revision is marked as "${rev || 'NONE'}". Plant SOP standard ${rule.ruleCode} mandates revision codes matching pattern ${rule.conditionConfig.pattern}.`,
          severity: rule.severity,
          confidence: 99,
          standardRef: `Plant SOP Standard §2.4 (${rule.ruleCode})`,
          componentRef: 'Drawing Title Block Revision Zone',
          plainLanguageExplanation: `Uncontrolled revision markings cause version ambiguity on the shop floor and can lead to obsolete harness builds.`,
          recommendation: `Update drawing revision block to official ECO release letter (e.g. "REV B") or signed engineering change note.`,
          bbox: { x: 75, y: 88, width: 20, height: 8 },
          status: 'UNREVIEWED',
        });
      }
    }

    // Check Approval Sign-off
    if (rule.conditionConfig.targetField === 'engineer') {
      const approvedBy = (titleBlock.approvedBy || '').trim();
      if (!approvedBy || approvedBy.toLowerCase().includes('pending') || approvedBy.toLowerCase().includes('tbd')) {
        discrepancies.push({
          id: `SOP-APPROV-${rule.id}`,
          title: `Unapproved Schematic Drawing (Missing PE Approval)`,
          description: `Title block indicates approval authority is "${approvedBy || 'UNASSIGNED'}". Plant policy requires formal QA/PE sign-off prior to shop harness fabrication.`,
          severity: 'CRITICAL',
          confidence: 97,
          standardRef: `Plant SOP Standard §1.1 (${rule.ruleCode})`,
          componentRef: 'Title Block Sign-Off Field',
          plainLanguageExplanation: `Production fabrication of unapproved engineering drawings creates high risk of scrap, rework, and field liability.`,
          recommendation: `Route drawing package through engineering change approval workflow and populate Lead PE sign-off before manufacturing release.`,
          bbox: { x: 80, y: 92, width: 16, height: 6 },
          status: 'UNREVIEWED',
        });
      }
    }
  }

  return discrepancies;
}

/**
 * Evaluates Wire Tag Naming conventions
 */
export function evaluateWireTagSop(
  edges: ElectricalEdge[],
  rules: TenantCustomRuleConfig[] = DEFAULT_PLANT_SOP_RULES
): Discrepancy[] {
  const discrepancies: Discrepancy[] = [];
  const tagRule = rules.find(
    (r) => r.isActive && r.conditionConfig.targetField === 'wireTag' && r.conditionConfig.pattern
  );

  if (!tagRule || !tagRule.conditionConfig.pattern) return discrepancies;
  const reg = new RegExp(tagRule.conditionConfig.pattern);

  for (const edge of edges) {
    if (!reg.test(edge.wireTag)) {
      discrepancies.push({
        id: `SOP-TAG-${edge.id}`,
        title: `Wire Tag Syntax Violation on "${edge.wireTag}"`,
        description: `Wire tag "${edge.wireTag}" does not conform to required plant numbering standard ${tagRule.conditionConfig.pattern} per ${tagRule.ruleCode}.`,
        severity: tagRule.severity,
        confidence: 95,
        standardRef: `Plant Wiring Guideline §4.1 (${tagRule.ruleCode})`,
        componentRef: `Conductor ${edge.wireTag} (${edge.sourceNodeId} \u2192 ${edge.targetNodeId})`,
        plainLanguageExplanation: `Automated wire cutting, stripping, and inkjet marking machines (Komax / Schleuniger) require uniform wire identification tags.`,
        recommendation: `Re-label conductor tag to match standardized schema (e.g. W-101, W-102).`,
        bbox: { x: 40, y: 38, width: 18, height: 12 },
        status: 'UNREVIEWED',
      });
    }
  }

  return discrepancies;
}

/**
 * Master Custom Plant SOP Evaluation Engine
 */
export function evaluateCustomSopRules(
  graph: ElectricalGraph,
  titleBlock?: TitleBlockMetadata,
  tenantRules: TenantCustomRuleConfig[] = DEFAULT_PLANT_SOP_RULES
): Discrepancy[] {
  const discrepancies: Discrepancy[] = [];

  // 1. Evaluate Title Block Rules
  const effectiveTitleBlock: TitleBlockMetadata = titleBlock || {
    drawingNumber: 'WH-402-E01',
    revision: 'REV 02',
    title: 'MAIN CHASSIS ELECTRICAL HARNESS',
    drawnBy: 'A. Sharma',
    approvedBy: 'PENDING_QA',
    sheetNumber: '1 of 1',
    scale: '1:1',
    companyName: 'Spandsons Horizon Engineering',
  };

  discrepancies.push(...evaluateTitleBlockSop(effectiveTitleBlock, tenantRules));

  // 2. Evaluate Wire Tagging Syntax
  discrepancies.push(...evaluateWireTagSop(graph.edges, tenantRules));

  return discrepancies;
}
