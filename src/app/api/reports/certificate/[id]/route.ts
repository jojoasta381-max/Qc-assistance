import { NextRequest, NextResponse } from 'next/server';
import { SAMPLE_DIAGRAMS } from '@/data/samples';
import { buildAuditCertificate } from '@/lib/reports/audit-report-generator';
import { isProduction } from '@/lib/config/app-mode';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const cleanId = decodeURIComponent(id);

    if (isProduction()) {
      // In production, no fake sample certificate fallback
      return NextResponse.json(
        { error: 'Certificate verification requires authoritative verification URL.' },
        { status: 404 }
      );
    }

    // Look for matching report in sample diagrams
    const matchedSample = SAMPLE_DIAGRAMS.find(
      (s) =>
        s.sampleReport.id.toLowerCase() === cleanId.toLowerCase() ||
        s.code.toLowerCase() === cleanId.toLowerCase() ||
        cleanId.toLowerCase().includes(s.code.toLowerCase())
    );

    if (!matchedSample) {
      return NextResponse.json({ error: 'Certificate record not found.' }, { status: 404 });
    }

    const cert = buildAuditCertificate(matchedSample.sampleReport);

    return NextResponse.json({
      success: true,
      verified: true,
      certificate: cert,
      report: matchedSample.sampleReport,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Certificate verification failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
