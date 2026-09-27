import { NextResponse } from 'next/server';

export interface ApiV1ErrorPayload {
  error: {
    code: string;
    message: string;
    request_id?: string;
    details?: unknown;
  };
}

export function generateRequestId(): string {
  return `req_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 8)}`;
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
      request_id: requestId,
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
