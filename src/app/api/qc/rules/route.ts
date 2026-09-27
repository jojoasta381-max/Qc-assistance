import { NextRequest, NextResponse } from 'next/server';
import { STANDARDS_RULE_REGISTRY } from '@/lib/rules/standards-registry';
import { StandardPreset } from '@/types/qc';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const standardFilter = searchParams.get('standard') as StandardPreset | null;
    const categoryFilter = searchParams.get('category');

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
      rules,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to retrieve rules';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
