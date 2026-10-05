import { CircuitBreaker, CircuitBreakerError } from '../src/lib/circuit-breaker';

async function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function runTests() {
  console.log("--- Starting Circuit Breaker Verification ---");

  const breaker = new CircuitBreaker({
    failureThreshold: 3,
    resetTimeoutMs: 2000,
    requestTimeoutMs: 100,
    maxConcurrency: 2
  });

  // Test 1: Concurrency Limits
  console.log("\\n[Test 1] Concurrency Limit (Bulkhead)");
  const slowAction = async () => {
    await delay(300);
    return "ok";
  };
  
  let rejected = false;
  try {
    // Fire 3 concurrent requests, max is 2
    await Promise.all([
      breaker.fire(slowAction),
      breaker.fire(slowAction),
      breaker.fire(slowAction)
    ]);
  } catch (err: any) {
    if (err.message.includes('limit reached')) {
      rejected = true;
      console.log("✅ Successfully rejected excess concurrent request");
    }
  }
  if (!rejected) throw new Error("Concurrency limit failed");

  // Wait for the slow actions to actually timeout or finish to not pollute next test
  await delay(400);

  // Test 2: Failure Threshold & Fast Failing
  console.log("\\n[Test 2] Tripping the breaker");
  
  const failingAction = async () => {
    throw new Error("Network error");
  };

  // 1
  try { await breaker.fire(failingAction); } catch (e) {}
  // 2
  try { await breaker.fire(failingAction); } catch (e) {}
  // 3
  try { await breaker.fire(failingAction); } catch (e) {}

  if (breaker.getState() !== 'OPEN') {
    throw new Error("Breaker should be OPEN after 3 failures");
  }
  console.log("✅ Breaker is OPEN");

  // Should fast fail immediately
  const start = Date.now();
  let fastFailed = false;
  try {
    await breaker.fire(async () => {
      await delay(5000); // Should not even be called
      return "bad";
    });
  } catch (err: any) {
    if (err.message.includes('OPEN')) fastFailed = true;
  }
  const duration = Date.now() - start;
  
  if (fastFailed && duration < 50) {
    console.log(`✅ Fast failed in ${duration}ms (did not wait for timeout)`);
  } else {
    throw new Error("Did not fast fail");
  }

  // Test 3: Recovery
  console.log("\\n[Test 3] Recovery (HALF_OPEN -> CLOSED)");
  console.log("Waiting for reset timeout (2 seconds)...");
  await delay(2100);

  if (breaker.getState() !== 'HALF_OPEN') {
    throw new Error("Breaker should be HALF_OPEN");
  }
  console.log("✅ Breaker is HALF_OPEN");

  const successAction = async () => {
    return "recovered";
  };

  const result = await breaker.fire(successAction);
  if (result === "recovered" && breaker.getState() === 'CLOSED') {
    console.log("✅ Breaker successfully recovered to CLOSED state!");
  } else {
    throw new Error("Breaker failed to recover");
  }

  console.log("\\n--- All Circuit Breaker tests passed! ---");
}

runTests().catch(err => {
  console.error("Test failed:", err);
  process.exit(1);
});
