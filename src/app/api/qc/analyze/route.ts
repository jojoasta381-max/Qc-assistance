import { NextRequest, NextResponse } from 'next/server';
import { runDeterministicQcInspection } from '@/lib/rules/rule-evaluator';
import { runAIQualityInspection, DEFAULT_LLM_CONFIG } from '@/lib/llm-engine';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { diagramName, diagramCategory, standard, imagePayload, config, evaluationOptions, mode } = body;

    if (!diagramName || !standard) {
      return NextResponse.json(
        { error: 'Missing required parameters: diagramName or standard.' },
        { status: 400 }
      );
    }

    // If pure LLM mode is explicitly requested, run the AI vision pipeline
    if (mode === 'llm') {
      const report = await runAIQualityInspection(
        diagramName,
        diagramCategory || 'Wiring Harness',
        standard,
        imagePayload || 'wh-402',
        config || DEFAULT_LLM_CONFIG
      );
      return NextResponse.json(report);
    }

    // Default & Recommended: Deterministic Rules Engine (Zero Hallucination)
    const report = await runDeterministicQcInspection(
      diagramName,
      diagramCategory || 'Wiring Harness',
      standard,
      evaluationOptions || {}
    );

    return NextResponse.json(report);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Analysis failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
