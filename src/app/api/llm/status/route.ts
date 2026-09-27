import { NextRequest, NextResponse } from 'next/server';
import { checkOllamaStatus } from '@/lib/llm-engine';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const endpoint = body.endpoint || 'http://localhost:11434';
    const status = await checkOllamaStatus(endpoint);
    return NextResponse.json(status);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Status check failed';
    return NextResponse.json({ online: false, models: [], error: message }, { status: 500 });
  }
}
