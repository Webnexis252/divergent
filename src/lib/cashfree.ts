// Shared Cashfree SDK instance (singleton)
import { Cashfree, CFEnvironment } from "cashfree-pg";
import { CircuitBreaker } from "./circuit-breaker";

// Validate required Cashfree environment variables at startup.
// If these are missing, all payment requests will fail with a cryptic
// "authentication Failed" error from Cashfree. Catching it here makes
// debugging much faster.
const CASHFREE_APP_ID = process.env.CASHFREE_APP_ID;
const CASHFREE_SECRET_KEY = process.env.CASHFREE_SECRET_KEY;

if (!CASHFREE_APP_ID || !CASHFREE_SECRET_KEY) {
  console.error(
    "[Cashfree] MISSING ENVIRONMENT VARIABLES: CASHFREE_APP_ID and/or CASHFREE_SECRET_KEY are not set. " +
    "Payment operations will fail. Please set these in your Vercel project settings (or .env for local dev)."
  );
}

const environment =
  process.env.CASHFREE_ENVIRONMENT === "PRODUCTION"
    ? CFEnvironment.PRODUCTION
    : CFEnvironment.SANDBOX;

const cashfree = new Cashfree(
  environment,
  CASHFREE_APP_ID,
  CASHFREE_SECRET_KEY,
);

export const paymentBreaker = new CircuitBreaker({
  failureThreshold: 3,
  resetTimeoutMs: 30000,
  requestTimeoutMs: 8000,
  maxConcurrency: 15
});

export default cashfree;
