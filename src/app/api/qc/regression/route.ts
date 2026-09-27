import { NextRequest, NextResponse } from 'next/server';
import { runRegressionTestSuite } from '@/lib/calibration/regression-runner';

export async function GET() {
  try {
    const report = await runRegressionTestSuite();
    return NextResponse.json({
      success: true,
      report,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Regression suite execution failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST() {
  return GET();
}
