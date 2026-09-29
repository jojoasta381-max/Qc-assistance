import { NextRequest, NextResponse } from 'next/server';
import {
  verifyWebhookSignature,
  processRazorpayWebhook,
} from '@/lib/billing/razorpay-service';

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get('x-razorpay-signature');

    // Strict HMAC SHA-256 signature verification using configured RAZORPAY_WEBHOOK_SECRET
    if (!signature || !verifyWebhookSignature(rawBody, signature)) {
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

    const eventId = event.event_id || event.id;
    if (!eventId) {
      return NextResponse.json({ error: 'Missing event ID in webhook payload' }, { status: 400 });
    }

    const eventType = event.event || 'payment.captured';
    const payload = event.payload || {};

    // Process webhook with database-backed deduplication & transactional fulfillment
    const result = await processRazorpayWebhook(
      eventId,
      eventType,
      payload,
      rawBody,
      true
    );

    return NextResponse.json({
      status: 'ok',
      result,
    });
  } catch (err: any) {
    console.error('Razorpay Webhook Error:', err);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}
