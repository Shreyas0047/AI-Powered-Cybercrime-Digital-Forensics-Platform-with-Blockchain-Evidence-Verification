/**
 * Resilience Service
 * Circuit breakers, retry logic, and graceful degradation
 */

import logger from '../config/logger';
import { v4 as uuidv4 } from 'uuid';

/**
 * Circuit Breaker States
 */
export enum CircuitState {
  CLOSED = 'closed',      // Normal operation
  OPEN = 'open',          // Failing, reject requests
  HALF_OPEN = 'half_open' // Testing if service recovered
}

/**
 * Circuit Breaker Configuration
 */
export interface CircuitBreakerConfig {
  failureThreshold: number;      // Failures before opening circuit
  successThreshold: number;       // Successes to close circuit from half-open
  timeout: number;               // Time in ms before trying again
  resetTimeout: number;           // Time between checks in half-open
}

/**
 * Circuit Breaker
 * Prevents cascading failures by failing fast when a service is down
 */
export class CircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED;
  private failureCount: number = 0;
  private successCount: number = 0;
  private lastFailure: number = 0;
  private readonly name: string;
  private readonly config: CircuitBreakerConfig;

  constructor(name: string, config: Partial<CircuitBreakerConfig> = {}) {
    this.name = name;
    this.config = {
      failureThreshold: config.failureThreshold ?? 5,
      successThreshold: config.successThreshold ?? 3,
      timeout: config.timeout ?? 60000, // 1 minute
      resetTimeout: config.resetTimeout ?? 10000, // 10 seconds
    };
  }

  /**
   * Execute a function with circuit breaker protection
   */
  async execute<T>(
    operation: () => Promise<T>,
    fallback?: () => Promise<T>
  ): Promise<T> {
    // Check if circuit should transition
    this.checkState();

    if (this.state === CircuitState.OPEN) {
      logger.warn(`Circuit breaker [${this.name}] is OPEN`, {
        lastFailure: this.lastFailure,
        failureCount: this.failureCount,
      });

      if (fallback) {
        logger.info(`Executing fallback for circuit [${this.name}]`);
        return fallback();
      }

      throw new Error(`Circuit breaker [${this.name}] is OPEN - service unavailable`);
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  /**
   * Record a successful operation
   */
  private onSuccess(): void {
    this.failureCount = 0;

    if (this.state === CircuitState.HALF_OPEN) {
      this.successCount++;
      if (this.successCount >= this.config.successThreshold) {
        this.transitionTo(CircuitState.CLOSED);
      }
    }
  }

  /**
   * Record a failed operation
   */
  private onFailure(): void {
    this.failureCount++;
    this.lastFailure = Date.now();

    if (this.state === CircuitState.HALF_OPEN) {
      this.transitionTo(CircuitState.OPEN);
    } else if (this.failureCount >= this.config.failureThreshold) {
      this.transitionTo(CircuitState.OPEN);
    }
  }

  /**
   * Check if circuit should transition from OPEN to HALF_OPEN
   */
  private checkState(): void {
    if (this.state === CircuitState.OPEN) {
      if (Date.now() - this.lastFailure >= this.config.timeout) {
        this.transitionTo(CircuitState.HALF_OPEN);
      }
    }
  }

  /**
   * Transition to a new state
   */
  private transitionTo(newState: CircuitState): void {
    const oldState = this.state;
    this.state = newState;

    if (newState === CircuitState.CLOSED) {
      this.failureCount = 0;
      this.successCount = 0;
      logger.info(`Circuit breaker [${this.name}] CLOSED after recovery`);
    } else if (newState === CircuitState.HALF_OPEN) {
      this.successCount = 0;
      logger.info(`Circuit breaker [${this.name}] HALF_OPEN for testing`);
    } else if (newState === CircuitState.OPEN) {
      logger.warn(`Circuit breaker [${this.name}] OPEN after failures`);
    }

    // Emit state change event
    this.onStateChange(oldState, newState);
  }

  /**
   * Override for state change events
   */
  protected onStateChange(from: CircuitState, to: CircuitState): void {
    // Can be overridden by subclasses or listeners
  }

  /**
   * Get current circuit state
   */
  getState(): CircuitState {
    return this.state;
  }

  /**
   * Get circuit breaker status
   */
  getStatus(): {
    name: string;
    state: CircuitState;
    failureCount: number;
    lastFailure: number;
  } {
    return {
      name: this.name,
      state: this.state,
      failureCount: this.failureCount,
      lastFailure: this.lastFailure,
    };
  }

  /**
   * Force reset the circuit breaker
   */
  reset(): void {
    this.state = CircuitState.CLOSED;
    this.failureCount = 0;
    this.successCount = 0;
    this.lastFailure = 0;
  }
}

/**
 * Retry Configuration
 */
export interface RetryConfig {
  maxAttempts: number;
  initialDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
  retryableErrors?: string[];
}

/**
 * Retry Utility
 * Implements exponential backoff retry logic
 */
export class RetryUtility {
  constructor(private config: Partial<RetryConfig> = {}) {
    this.config = {
      maxAttempts: config.maxAttempts ?? 3,
      initialDelay: config.initialDelay ?? 1000,
      maxDelay: config.maxDelay ?? 30000,
      backoffMultiplier: config.backoffMultiplier ?? 2,
      retryableErrors: config.retryableErrors ?? [
        'ECONNRESET',
        'ETIMEDOUT',
        'ENOTFOUND',
        'ENETUNREACH',
        'EHOSTUNREACH',
      ],
    };
  }

  /**
   * Execute a function with retry logic
   */
  async execute<T>(
    operation: () => Promise<T>,
    options: {
      context?: string;
      onRetry?: (attempt: number, error: Error, delay: number) => void;
    } = {}
  ): Promise<T> {
    let lastError: Error | undefined;
    let delay = this.config.initialDelay!;

    for (let attempt = 1; attempt <= this.config.maxAttempts!; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;

        // Check if error is retryable
        if (!this.isRetryable(error as Error)) {
          throw error;
        }

        // Check if we have retries left
        if (attempt >= this.config.maxAttempts!) {
          break;
        }

        // Log retry attempt
        logger.warn(`Retry attempt ${attempt}/${this.config.maxAttempts}`, {
          context: options.context,
          error: lastError.message,
          nextDelay: delay,
        });

        // Call onRetry callback
        options.onRetry?.(attempt, lastError, delay);

        // Wait before retry with exponential backoff
        await this.sleep(delay);

        // Calculate next delay with jitter
        delay = Math.min(delay * this.config.backoffMultiplier!, this.config.maxDelay!);
        delay = this.addJitter(delay);
      }
    }

    throw lastError || new Error('All retry attempts failed');
  }

  /**
   * Check if an error is retryable
   */
  private isRetryable(error: Error): boolean {
    const errorCode = (error as any).code;
    return this.config.retryableErrors!.includes(errorCode);
  }

  /**
   * Sleep for a given duration
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Add jitter to delay to prevent thundering herd
   */
  private addJitter(delay: number): number {
    const jitter = delay * 0.1 * Math.random();
    return Math.floor(delay + jitter);
  }
}

/**
 * Graceful Degradation Service
 * Provides fallback behaviors for degraded services
 */
export class GracefulDegradationService {
  private fallbacks: Map<string, () => Promise<any>> = new Map();
  private circuitBreakers: Map<string, CircuitBreaker> = new Map();
  private healthStatus: Map<string, 'healthy' | 'degraded' | 'down'> = new Map();

  /**
   * Register a fallback for a service
   */
  registerFallback(serviceName: string, fallback: () => Promise<any>): void {
    this.fallbacks.set(serviceName, fallback);
  }

  /**
   * Register a circuit breaker for a service
   */
  registerCircuitBreaker(serviceName: string, config?: Partial<CircuitBreakerConfig>): void {
    this.circuitBreakers.set(serviceName, new CircuitBreaker(serviceName, config));
  }

  /**
   * Execute with automatic fallback and circuit breaker
   */
  async executeWithDegradation<T>(
    serviceName: string,
    operation: () => Promise<T>,
    options: {
      useFallback?: boolean;
      correlationId?: string;
    } = {}
  ): Promise<{ result?: T; source: 'primary' | 'fallback' | 'error'; error?: Error }> {
    const correlationId = options.correlationId || uuidv4();
    const circuitBreaker = this.circuitBreakers.get(serviceName);

    try {
      let result: T;

      if (circuitBreaker) {
        result = await circuitBreaker.execute(
          operation,
          options.useFallback ? this.fallbacks.get(serviceName) : undefined
        );
      } else {
        result = await operation();
      }

      this.updateHealthStatus(serviceName, 'healthy');
      return { result, source: 'primary' };
    } catch (error) {
      logger.error(`Service [${serviceName}] failed`, {
        correlationId,
        error: (error as Error).message,
      });

      // Try fallback
      const fallback = this.fallbacks.get(serviceName);
      if (fallback && options.useFallback) {
        try {
          logger.info(`Executing fallback for [${serviceName}]`, { correlationId });
          const result = await fallback();
          this.updateHealthStatus(serviceName, 'degraded');
          return { result, source: 'fallback' };
        } catch (fallbackError) {
          logger.error(`Fallback also failed for [${serviceName}]`, {
            correlationId,
            error: (fallbackError as Error).message,
          });
        }
      }

      this.updateHealthStatus(serviceName, 'down');
      return {
        source: 'error',
        error: error as Error,
      };
    }
  }

  /**
   * Update health status for a service
   */
  updateHealthStatus(serviceName: string, status: 'healthy' | 'degraded' | 'down'): void {
    this.healthStatus.set(serviceName, status);
  }

  /**
   * Get health status for all services
   */
  getHealthStatus(): Record<string, 'healthy' | 'degraded' | 'down'> {
    return Object.fromEntries(this.healthStatus);
  }

  /**
   * Get circuit breaker status for a service
   */
  getCircuitBreakerStatus(serviceName: string): CircuitState | null {
    const cb = this.circuitBreakers.get(serviceName);
    return cb?.getState() || null;
  }
}

// Singleton instances for global use
export const resilienceService = new GracefulDegradationService();

// Pre-configured circuit breakers
resilienceService.registerCircuitBreaker('database', {
  failureThreshold: 5,
  timeout: 30000,
});

resilienceService.registerCircuitBreaker('blockchain', {
  failureThreshold: 3,
  timeout: 60000,
});

resilienceService.registerCircuitBreaker('websocket', {
  failureThreshold: 5,
  timeout: 15000,
});

// Export default retry utility
export const retryUtility = new RetryUtility();