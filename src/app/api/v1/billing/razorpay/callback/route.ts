import { NextRequest } from 'next/server';
import { verifyPaymentSignature } from '@/lib/billing/razorpay-service';
import { apiSuccess, apiError } from '@/lib/api-v1-response';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return apiError('MISSING_PARAMETERS', 'razorpay_order_id, razorpay_payment_id, and razorpay_signature are required.', 400);
    }

    const isValid = verifyPaymentSignature(razorpay_order_id, razorpay_payment_id, razorpay_signature);

    return apiSuccess({
      verified: isValid,
      status: isValid ? 'PAYMENT_VERIFIED' : 'SIGNATURE_MISMATCH',
      message: isValid
        ? 'Payment signature verified. Final entitlement is processed via authoritative webhook.'
        : 'Payment signature could not be verified.',
      order_id: razorpay_order_id,
      payment_id: razorpay_payment_id,
    });
  } catch (err: any) {
    return apiError('CALLBACK_VERIFICATION_FAILED', err.message || 'Callback verification failed', 400);
  }
}
