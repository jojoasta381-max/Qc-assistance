import { NextResponse } from 'next/server';
import crypto from 'crypto';

export interface ApiV1ErrorPayload {
  error: {
    code: string;
    message: string;
    requestId: string;
    details?: unknown;
  };
}

export function generateRequestId(): string {
  return `req_${Date.now().toString(36)}_${crypto.randomBytes(4).toString('hex')}`;
}

export function apiSuccess<T>(data: T, status = 200): NextResponse {
  return NextResponse.json(data, {
    status,
    headers: {
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}

export function apiError(
  code: string,
  message: string,
  status = 400,
  details?: unknown,
  requestId = generateRequestId()
): NextResponse {
  const body: ApiV1ErrorPayload = {
    error: {
      code,
      message,
      requestId,
      ...(details ? { details } : {}),
    },
  };

  return NextResponse.json(body, {
    status,
    headers: {
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}

