import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({ ready: true, timestamp: new Date().toISOString() }, { status: 200 });
  } catch (err) {
    return NextResponse.json({ ready: false, error: 'Database not accessible' }, { status: 503 });
  }
}
