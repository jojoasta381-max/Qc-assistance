import { NextRequest, NextResponse } from 'next/server';
import { STANDARDS_RULE_REGISTRY } from '@/lib/rules/standards-registry';
import { getRuleRegistry } from '@/lib/qc/rule-registry';
import { StandardPreset } from '@/types/qc';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const typeFilter = searchParams.get('type');
    const standardFilter = searchParams.get('standard') as StandardPreset | null;
    const categoryFilter = searchParams.get('category');
    const deterministicRegistry = getRuleRegistry();

    if (typeFilter === 'deterministic') {
      const entries = deterministicRegistry.getAllEntries().map((r) => ({
        id: r.id,
        code: r.code,
        version: r.version,
        name: r.name,
        description: r.description,
        severity: r.severity,
        enabled: r.enabled,
        standardClause: r.standardClause,
        prerequisites: r.prerequisites,
        documentationRef: r.documentationRef,
      }));

      return NextResponse.json({
        success: true,
        engine: 'deterministic',
        totalRules: entries.length,
        activeRules: deterministicRegistry.getRuleCount(),
        rules: entries,
      });
    }

    let rules = [...STANDARDS_RULE_REGISTRY];

    if (standardFilter) {
      rules = rules.filter((r) => r.standard === standardFilter);
    }

    if (categoryFilter) {
      rules = rules.filter((r) => r.category.toLowerCase() === categoryFilter.toLowerCase());
    }

    return NextResponse.json({
      success: true,
      totalRules: rules.length,
      deterministicRuleCount: deterministicRegistry.getRuleCount(),
      rules,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to retrieve rules';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
