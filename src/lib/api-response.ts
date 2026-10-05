import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import zlib from 'zlib';
import { promisify } from 'util';

const gzipAsync = promisify(zlib.gzip);
const brotliAsync = promisify(zlib.brotliCompress);

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

async function createCompressedResponse(payload: any, status: number): Promise<NextResponse> {
  const reqHeaders = await headers();
  const acceptEncoding = reqHeaders.get('accept-encoding') || '';
  
  const jsonString = JSON.stringify(payload);
  const buffer = Buffer.from(jsonString, 'utf-8');
  
  const responseHeaders = new Headers({
    'Content-Type': 'application/json',
    'Vary': 'Accept-Encoding',
  });

  // Only compress if size > 1024 bytes
  if (buffer.length < 1024) {
    return new NextResponse(buffer, { status, headers: responseHeaders });
  }

  try {
    if (acceptEncoding.includes('br')) {
      const compressed = await brotliAsync(buffer);
      responseHeaders.set('Content-Encoding', 'br');
      return new NextResponse(compressed, { status, headers: responseHeaders });
    } else if (acceptEncoding.includes('gzip')) {
      const compressed = await gzipAsync(buffer);
      responseHeaders.set('Content-Encoding', 'gzip');
      return new NextResponse(compressed, { status, headers: responseHeaders });
    }
  } catch (err) {
    console.error('[COMPRESSION_ERROR]', err);
    // fallback to uncompressed
  }
  
  return new NextResponse(buffer, { status, headers: responseHeaders });
}

export async function apiSuccess<T>(data: T, message?: string, status = 200): Promise<NextResponse> {
  const payload: ApiSuccessPayload<T> = { success: true, data, message };
  return createCompressedResponse(payload, status);
}

export async function apiCreated<T>(data: T, message = 'Created successfully'): Promise<NextResponse> {
  return apiSuccess(data, message, 201);
}

export async function apiError(error: string, status = 400, details?: unknown): Promise<NextResponse> {
  const payload: ApiErrorPayload = { success: false, error, details };
  return createCompressedResponse(payload, status);
}

export async function apiUnauthorized(error = 'Unauthorized'): Promise<NextResponse> {
  return apiError(error, 401);
}

export async function apiForbidden(error = 'Forbidden'): Promise<NextResponse> {
  return apiError(error, 403);
}

export async function apiNotFound(resource = 'Resource'): Promise<NextResponse> {
  return apiError(`${resource} not found`, 404);
}

export async function apiServerError(details?: unknown): Promise<NextResponse> {
  return apiError('Internal server error', 500, details);
}

export async function apiBadRequest(error = 'Bad request', details?: unknown): Promise<NextResponse> {
  return apiError(error, 400, details);
}
