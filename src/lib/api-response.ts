import { NextResponse } from 'next/server';

/**
 * Common API response helpers for the Divergent Classes LMS backend.
 * All API routes MUST use these helpers for consistency.
 */

type ApiSuccessPayload<T> = {
  success: true;
  data: T;
  message?: string;
};

type ApiErrorPayload = {
  success: false;
  error: string;
  details?: unknown;
};

export function apiSuccess<T>(data: T, message?: string, status = 200): NextResponse {
  const payload: ApiSuccessPayload<T> = { success: true, data, message };
  return NextResponse.json(payload, { status });
}

export function apiCreated<T>(data: T, message = 'Created successfully'): NextResponse {
  return apiSuccess(data, message, 201);
}

export function apiError(error: string, status = 400, details?: unknown): NextResponse {
  const payload: ApiErrorPayload = { success: false, error, details };
  return NextResponse.json(payload, { status });
}

export function apiUnauthorized(error = 'Unauthorized'): NextResponse {
  return apiError(error, 401);
}

export function apiForbidden(error = 'Forbidden'): NextResponse {
  return apiError(error, 403);
}

export function apiNotFound(resource = 'Resource'): NextResponse {
  return apiError(`${resource} not found`, 404);
}

export function apiServerError(details?: unknown): NextResponse {
  return apiError('Internal server error', 500, details);
}

export function apiBadRequest(error = 'Bad request', details?: unknown): NextResponse {
  return apiError(error, 400, details);
}
