/**
 * Browser error tracking with Sentry, off unless NEXT_PUBLIC_SENTRY_DSN is set
 * at build time. Without it the SDK is never downloaded.
 */
const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

let captureRouterTransitionStart: ((href: string, navigationType: string) => void) | undefined;

if (dsn) {
  import('@sentry/nextjs').then((Sentry) => {
    Sentry.init({
      dsn,
      environment: process.env.NEXT_PUBLIC_VERCEL_ENV ?? process.env.NODE_ENV,
      tracesSampleRate: Number(process.env.NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE ?? 0),
      // No cookies, headers, query strings or bodies in error reports
      dataCollection: { userInfo: false, cookies: false, httpHeaders: false, httpBodies: [], urlQueryParams: false },
    });
    captureRouterTransitionStart = Sentry.captureRouterTransitionStart;
  });
}

export function onRouterTransitionStart(href: string, navigationType: string) {
  captureRouterTransitionStart?.(href, navigationType);
}
