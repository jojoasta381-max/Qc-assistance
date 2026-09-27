import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const startTime = Date.now();
  let dbStatus = 'healthy';

  try {
    // Quick probe query to SQLite/PostgreSQL
    await prisma.$queryRaw`SELECT 1`;
  } catch (err) {
    dbStatus = 'unhealthy';
  }

  const responseTime = Date.now() - startTime;
  const isHealthy = dbStatus === 'healthy';

  return NextResponse.json(
    {
      status: isHealthy ? 'ok' : 'degraded',
      service: 'wiring-diagram-qc-assistant',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      latencyMs: responseTime,
      checks: {
        database: dbStatus,
        aiEngine: 'standby',
      },
    },
    { status: isHealthy ? 200 : 503 }
  );
}
