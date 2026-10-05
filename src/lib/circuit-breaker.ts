type CircuitBreakerState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export interface CircuitBreakerOptions {
  /** Number of consecutive failures before tripping the breaker. Default 5. */
  failureThreshold?: number;
  /** Time in ms to wait before transitioning from OPEN to HALF_OPEN. Default 30000 (30s). */
  resetTimeoutMs?: number;
  /** Time in ms before a single request is considered timed out and fails. Default 5000 (5s). */
  requestTimeoutMs?: number;
  /** Maximum number of concurrent requests allowed. Default 10. */
  maxConcurrency?: number;
}

export class CircuitBreakerError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CircuitBreakerError';
  }
}

export class CircuitBreaker {
  private state: CircuitBreakerState = 'CLOSED';
  private failureCount = 0;
  private nextAttempt = 0;
  private activeRequests = 0;

  private readonly failureThreshold: number;
  private readonly resetTimeoutMs: number;
  private readonly requestTimeoutMs: number;
  private readonly maxConcurrency: number;

  constructor(options: CircuitBreakerOptions = {}) {
    this.failureThreshold = options.failureThreshold ?? 5;
    this.resetTimeoutMs = options.resetTimeoutMs ?? 30000;
    this.requestTimeoutMs = options.requestTimeoutMs ?? 5000;
    this.maxConcurrency = options.maxConcurrency ?? 10;
  }

  getState(): CircuitBreakerState {
    if (this.state === 'OPEN') {
      if (Date.now() >= this.nextAttempt) {
        this.state = 'HALF_OPEN';
      }
    }
    return this.state;
  }

  async fire<T>(action: () => Promise<T>, fallback?: () => Promise<T>): Promise<T> {
    const currentState = this.getState();

    if (currentState === 'OPEN') {
      if (fallback) return fallback();
      throw new CircuitBreakerError('Circuit is OPEN (fast-failing)');
    }

    if (currentState === 'HALF_OPEN') {
      // Only allow 1 request through in HALF_OPEN to test recovery
      if (this.activeRequests >= 1) {
        if (fallback) return fallback();
        throw new CircuitBreakerError('Circuit is HALF_OPEN (waiting for test request)');
      }
    }

    if (this.activeRequests >= this.maxConcurrency) {
      if (fallback) return fallback();
      throw new CircuitBreakerError('Circuit concurrency limit reached (bulkhead rejected)');
    }

    this.activeRequests++;
    try {
      const result = await this.executeWithTimeout(action);
      this.onSuccess();
      return result;
    } catch (err) {
      this.onFailure();
      if (fallback) return fallback();
      throw err; // re-throw original error, or a timeout error
    } finally {
      this.activeRequests--;
    }
  }

  private executeWithTimeout<T>(action: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new CircuitBreakerError('Circuit request timed out'));
      }, this.requestTimeoutMs);

      action()
        .then((result) => {
          clearTimeout(timer);
          resolve(result);
        })
        .catch((err) => {
          clearTimeout(timer);
          reject(err);
        });
    });
  }

  private onSuccess() {
    this.failureCount = 0;
    if (this.state === 'HALF_OPEN') {
      this.state = 'CLOSED';
    }
  }

  private onFailure() {
    this.failureCount++;
    if (this.failureCount >= this.failureThreshold || this.state === 'HALF_OPEN') {
      this.state = 'OPEN';
      this.nextAttempt = Date.now() + this.resetTimeoutMs;
    }
  }
}
