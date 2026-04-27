import { NextRequest } from 'next/server';
import { UserRole } from '@prisma/client';
import { z } from 'zod';
import { requireAuth, JwtPayload, verifyToken } from '@/lib/auth';
import { apiForbidden, apiError, apiServerError } from '@/lib/api-response';

type ApiHandlerConfig<TBody = unknown> = {
  /** If provided, requires the user to have one of these roles. */
  allowedRoles?: UserRole[];
  /** If true, requires authentication but allows any role. */
  requireAuth?: boolean;
  /** If provided, parses and validates the request body. */
  schema?: z.ZodType<TBody>;
};

type ApiHandlerContext<TBody = unknown> = {
  /** The authenticated user, if auth was required or token was present. */
  user: JwtPayload | null;
  /** The parsed and validated body, if a schema was provided. */
  parsedBody: TBody;
  /** The route parameters, if any. */
  params?: Record<string, string | string[]>;
};

type RouteHandler<TBody = unknown> = (
  req: NextRequest,
  ctx: ApiHandlerContext<TBody>
) => Promise<Response> | Response;

/**
 * A higher-order function to wrap Next.js App Router API handlers.
 * It standardizes error handling, authentication, and body validation.
 */
export function withApiHandler<TBody = unknown>(
  config: ApiHandlerConfig<TBody>,
  handler: RouteHandler<TBody>
) {
  return async (
    req: NextRequest,
    { params }: { params?: Promise<Record<string, string | string[]>> | Record<string, string | string[]> } = {}
  ) => {
    try {
      let user: JwtPayload | null = null;

      // 1. Authentication & Authorization
      if (config.allowedRoles && config.allowedRoles.length > 0) {
        user = await requireAuth(req, config.allowedRoles);
        if (!user) return apiForbidden('Insufficient permissions');
      } else if (config.requireAuth) {
        user = await requireAuth(req);
        if (!user) return apiForbidden('Authentication required');
      } else {
        // Even if not required, try to extract the user
        user = await verifyToken(req);
      }

      // 2. Body Validation
      let parsedBody: TBody = undefined as unknown as TBody;
      if (config.schema) {
        // Only parse body for methods that typically have one
        if (req.method !== 'GET' && req.method !== 'DELETE' && req.method !== 'HEAD') {
          const body = await req.json().catch(() => ({}));
          const result = config.schema.safeParse(body);
          if (!result.success) {
            return apiError('Validation failed', 400, result.error.flatten());
          }
          parsedBody = result.data;
        }
      }

      // Resolve params if it's a promise (Next.js 15+ dynamic APIs)
      const resolvedParams = params instanceof Promise ? await params : params;

      // 3. Execute Handler
      return await handler(req, { user, parsedBody, params: resolvedParams });
    } catch (error) {
      console.error(`[API_ERROR] ${req.method} ${req.nextUrl.pathname}`, error);
      return apiServerError();
    }
  };
}
