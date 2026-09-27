import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// In-memory feedback store for session regression test updates
interface FeedbackEntry {
  id: string;
  reportId: string;
  discrepancyId: string;
  status: 'CONFIRMED' | 'FALSE_POSITIVE';
  note?: string;
  category?: string;
  timestamp: string;
}

const feedbackStore: FeedbackEntry[] = [
  {
    id: 'FB-01',
    reportId: 'QC-2026-0814',
    discrepancyId: 'D-004',
    status: 'FALSE_POSITIVE',
    note: 'Internal customer SOP rev 2 allows splice marking on outer loom sheath instead of inner sleeve.',
    category: 'Customer SOP Variance',
    timestamp: '2026-09-25T14:40:00Z',
  },
  {
    id: 'FB-02',
    reportId: 'QC-2026-0814',
    discrepancyId: 'D-003',
    status: 'CONFIRMED',
    note: 'Confirmed color netlist mismatch between schedule and schematic.',
    category: 'Drawing Contradiction',
    timestamp: '2026-09-26T11:20:00Z',
  },
];

export async function GET() {
  try {
    let dbEntries: FeedbackEntry[] = [];
    try {
      const records = await prisma.regressionFeedback.findMany({
        orderBy: { createdAt: 'desc' },
        take: 50,
      });
      dbEntries = records.map((f: { id: string; discrepancyId: string; status: string; notes: string | null; category: string; createdAt: Date }) => ({
        id: f.id,
        reportId: 'QC-DB',
        discrepancyId: f.discrepancyId,
        status: f.status as 'CONFIRMED' | 'FALSE_POSITIVE',
        note: f.notes || undefined,
        category: f.category,
        timestamp: f.createdAt.toISOString(),
      }));
    } catch {
      // Prisma offline or unmigrated table fallback
    }

    const combinedEntries: FeedbackEntry[] = [...dbEntries, ...feedbackStore];

    return NextResponse.json({
      totalEntries: combinedEntries.length,
      falsePositives: combinedEntries.filter((f) => f.status === 'FALSE_POSITIVE').length,
      confirmedDefects: combinedEntries.filter((f) => f.status === 'CONFIRMED').length,
      entries: combinedEntries,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to retrieve feedback';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { reportId, discrepancyId, status, note, category } = body;

    const newEntry: FeedbackEntry = {
      id: `FB-${(feedbackStore.length + 1).toString().padStart(2, '0')}`,
      reportId: reportId || 'QC-CURRENT',
      discrepancyId: discrepancyId || 'UNKNOWN',
      status: status || 'CONFIRMED',
      note: note || '',
      category: category || 'General Review',
      timestamp: new Date().toISOString(),
    };

    feedbackStore.unshift(newEntry);

    // Save to Prisma SQLite if default tenant exists
    try {
      const defaultTenant = await prisma.tenant.findFirst();
      if (defaultTenant) {
        await prisma.regressionFeedback.create({
          data: {
            tenantId: defaultTenant.id,
            discrepancyId: newEntry.discrepancyId,
            status: newEntry.status,
            category: newEntry.category || 'General Review',
            notes: newEntry.note,
          },
        });
      }
    } catch {
      // Graceful fallback to in-memory store
    }

    return NextResponse.json({
      success: true,
      entry: newEntry,
      stats: {
        total: feedbackStore.length,
        falsePositives: feedbackStore.filter((f) => f.status === 'FALSE_POSITIVE').length,
        confirmedDefects: feedbackStore.filter((f) => f.status === 'CONFIRMED').length,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Feedback logging failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
