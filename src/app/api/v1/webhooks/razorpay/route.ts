import { NextRequest, NextResponse } from 'next/server';
import {
  verifyWebhookSignature,
  processRazorpayWebhook,
} from '@/lib/billing/razorpay-service';

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get('x-razorpay-signature') || '';

    // If sandbox / test mock mode without secret set, or secret configured:
    const isSignatureValid = verifyWebhookSignature(rawBody, signature);

    // In dev mode when testing without real webhook secret, allow mock signature if in test mode
    const isDev = process.env.NODE_ENV !== 'production';
    const isTestBypass = isDev && (
      req.headers.get('x-test-bypass') === 'true' ||
      signature === 'dev_test_simulation'
    );
    const isValid = isSignatureValid || isTestBypass;

    if (!isValid) {
      return NextResponse.json(
        { error: 'Invalid Razorpay webhook signature' },
        { status: 401 }
      );
    }

    let event: any;
    try {
      event = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
    }

    const eventId = event.event_id || event.id || `evt_${Date.now()}`;
    const eventType = event.event || 'payment.captured';
    const payload = event.payload || {};

    const result = await processRazorpayWebhook(
      eventId,
      eventType,
      payload,
      rawBody,
      isValid
    );

    return NextResponse.json({
      status: 'ok',
      result,
    });
  } catch (err: any) {
    console.error('Razorpay Webhook Error:', err);
    return NextResponse.json(
      { error: err.message || 'Webhook processing failed' },
      { status: 400 }
    );
  }
}
