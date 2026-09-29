import { NextRequest, NextResponse } from 'next/server';
import { clearSessionCookie, getCurrentSession } from '@/lib/auth';
import { recordAuditEvent } from '@/lib/audit/audit-logger';

export async function POST(req: NextRequest) {
  try {
    const session = await getCurrentSession();
    if (session) {
      await recordAuditEvent({
        tenantId: session.tenantId,
        actorId: session.userId,
        action: 'AUTH_LOGOUT',
        entityType: 'USER',
        entityId: session.userId,
      });
    }

    await clearSessionCookie();
    return NextResponse.json({ success: true, message: 'Successfully logged out.' });
  } catch (error) {
    console.error('Logout error:', error);
    await clearSessionCookie();
    return NextResponse.json({ success: true });
  }
}
