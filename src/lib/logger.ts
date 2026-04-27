type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogPayload {
  message: string;
  level: LogLevel;
  timestamp: string;
  context?: Record<string, unknown>;
  error?: unknown;
}

class StructuredLogger {
  private formatLog(level: LogLevel, message: string, context?: Record<string, unknown>, error?: unknown): LogPayload {
    const payload: LogPayload = {
      message,
      level,
      timestamp: new Date().toISOString(),
    };

    if (context) {
      payload.context = context;
    }

    if (error) {
      if (error instanceof Error) {
        payload.error = {
          name: error.name,
          message: error.message,
          stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
        };
      } else {
        payload.error = error;
      }
    }

    return payload;
  }

  private print(payload: LogPayload) {
    const jsonStr = JSON.stringify(payload);
    
    // In local development, we might want to log somewhat readable JSON
    // In production, one-line JSON is best for log aggregators (Datadog, CloudWatch, etc.)
    switch (payload.level) {
      case 'debug':
        console.debug(jsonStr);
        break;
      case 'info':
        console.info(jsonStr);
        break;
      case 'warn':
        console.warn(jsonStr);
        break;
      case 'error':
        console.error(jsonStr);
        break;
    }
  }

  debug(message: string, context?: Record<string, unknown>) {
    // Optionally disable debug in production
    if (process.env.NODE_ENV === 'production' && process.env.DEBUG_LOGS !== 'true') return;
    this.print(this.formatLog('debug', message, context));
  }

  info(message: string, context?: Record<string, unknown>) {
    this.print(this.formatLog('info', message, context));
  }

  warn(message: string, context?: Record<string, unknown>, error?: unknown) {
    this.print(this.formatLog('warn', message, context, error));
  }

  error(message: string, error?: unknown, context?: Record<string, unknown>) {
    this.print(this.formatLog('error', message, context, error));
  }
}

export const logger = new StructuredLogger();
