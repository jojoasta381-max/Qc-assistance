/**
 * SPANQC CENTRAL AUTHORITATIVE RULE REGISTRY (Phase 5)
 * 
 * Central authoritative registry for all production deterministic QC rules.
 * 
 * Strict Guarantees:
 * - Every production rule is registered centrally with its metadata, version, and prerequisites.
 * - Dynamic rule counting: UI, APIs, and reports derive rule counts from this registry.
 * - Zero hardcoding of rule numbers.
 * - Fail-closed execution: only active, validated rules are executed.
 */

import { ElectricalGraph } from '@/lib/graph/electrical-graph-models';
import {
  QCRule,
  FindingCandidate,
  FindingSeverity,
  GraphPrerequisite,
} from './rule-engine-types';
import { PRODUCTION_RULES } from './rules/production-rules';

export interface RuleRegistryEntry {
  id: string;
  code: string;
  version: string;
  name: string;
  description: string;
  severity: FindingSeverity;
  enabled: boolean;
  standardClause?: string;
  prerequisites: GraphPrerequisite[];
  evaluate: (graph: ElectricalGraph) => FindingCandidate[];
  documentationRef: string;
}

export class RuleRegistry {
  private rules: Map<string, QCRule> = new Map();
  private enabledStates: Map<string, boolean> = new Map();

  constructor() {
    this.registerDefaults();
  }

  private registerDefaults(): void {
    for (const rule of PRODUCTION_RULES) {
      this.register(rule);
    }
  }

  /**
   * Registers a rule into the central registry.
   */
  register(rule: QCRule, enabled: boolean = true): void {
    this.rules.set(rule.code, rule);
    this.enabledStates.set(rule.code, enabled);
  }

  /**
   * Retrieves a rule by its unique code (e.g. "RULE-001").
   */
  get(code: string): QCRule | undefined {
    return this.rules.get(code);
  }

  /**
   * Returns all registered rules sorted deterministically by code.
   */
  getAll(): QCRule[] {
    return Array.from(this.rules.values()).sort((a, b) => a.code.localeCompare(b.code));
  }

  /**
   * Returns only active (enabled) rules sorted deterministically by code.
   */
  getActiveRules(): QCRule[] {
    return this.getAll().filter((r) => this.isEnabled(r.code));
  }

  /**
   * Checks whether a rule is currently enabled.
   */
  isEnabled(code: string): boolean {
    return this.enabledStates.get(code) !== false;
  }

  /**
   * Enables or disables a rule.
   */
  setEnabled(code: string, enabled: boolean): void {
    if (this.rules.has(code)) {
      this.enabledStates.set(code, enabled);
    }
  }

  /**
   * Dynamically returns the count of active registered rules.
   */
  getRuleCount(): number {
    return this.getActiveRules().length;
  }

  /**
   * Returns complete metadata entries for all registered rules for UI and API exposure.
   */
  getAllEntries(): RuleRegistryEntry[] {
    return this.getAll().map((rule) => ({
      id: rule.id,
      code: rule.code,
      version: rule.version,
      name: rule.name,
      description: rule.description,
      severity: rule.severity,
      enabled: this.isEnabled(rule.code),
      standardClause: rule.standardClause,
      prerequisites: rule.prerequisites || [],
      evaluate: rule.evaluate,
      documentationRef: `docs/RULE_ENGINE.md#${rule.code.toLowerCase()}`,
    }));
  }
}

// Global authoritative singleton instance
let globalRegistryInstance: RuleRegistry | null = null;

export function getRuleRegistry(): RuleRegistry {
  if (!globalRegistryInstance) {
    globalRegistryInstance = new RuleRegistry();
  }
  return globalRegistryInstance;
}
