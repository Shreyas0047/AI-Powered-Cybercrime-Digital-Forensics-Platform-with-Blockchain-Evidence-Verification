"use strict";
/**
 * Resilience Service
 * Circuit breakers, retry logic, and graceful degradation
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.retryUtility = exports.resilienceService = exports.GracefulDegradationService = exports.RetryUtility = exports.CircuitBreaker = exports.CircuitState = void 0;
const logger_1 = __importDefault(require("../config/logger"));
const uuid_1 = require("uuid");
/**
 * Circuit Breaker States
 */
var CircuitState;
(function (CircuitState) {
    CircuitState["CLOSED"] = "closed";
    CircuitState["OPEN"] = "open";
    CircuitState["HALF_OPEN"] = "half_open"; // Testing if service recovered
})(CircuitState || (exports.CircuitState = CircuitState = {}));
/**
 * Circuit Breaker
 * Prevents cascading failures by failing fast when a service is down
 */
class CircuitBreaker {
    state = CircuitState.CLOSED;
    failureCount = 0;
    successCount = 0;
    lastFailure = 0;
    name;
    config;
    constructor(name, config = {}) {
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
    async execute(operation, fallback) {
        // Check if circuit should transition
        this.checkState();
        if (this.state === CircuitState.OPEN) {
            logger_1.default.warn(`Circuit breaker [${this.name}] is OPEN`, {
                lastFailure: this.lastFailure,
                failureCount: this.failureCount,
            });
            if (fallback) {
                logger_1.default.info(`Executing fallback for circuit [${this.name}]`);
                return fallback();
            }
            throw new Error(`Circuit breaker [${this.name}] is OPEN - service unavailable`);
        }
        try {
            const result = await operation();
            this.onSuccess();
            return result;
        }
        catch (error) {
            this.onFailure();
            throw error;
        }
    }
    /**
     * Record a successful operation
     */
    onSuccess() {
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
    onFailure() {
        this.failureCount++;
        this.lastFailure = Date.now();
        if (this.state === CircuitState.HALF_OPEN) {
            this.transitionTo(CircuitState.OPEN);
        }
        else if (this.failureCount >= this.config.failureThreshold) {
            this.transitionTo(CircuitState.OPEN);
        }
    }
    /**
     * Check if circuit should transition from OPEN to HALF_OPEN
     */
    checkState() {
        if (this.state === CircuitState.OPEN) {
            if (Date.now() - this.lastFailure >= this.config.timeout) {
                this.transitionTo(CircuitState.HALF_OPEN);
            }
        }
    }
    /**
     * Transition to a new state
     */
    transitionTo(newState) {
        const oldState = this.state;
        this.state = newState;
        if (newState === CircuitState.CLOSED) {
            this.failureCount = 0;
            this.successCount = 0;
            logger_1.default.info(`Circuit breaker [${this.name}] CLOSED after recovery`);
        }
        else if (newState === CircuitState.HALF_OPEN) {
            this.successCount = 0;
            logger_1.default.info(`Circuit breaker [${this.name}] HALF_OPEN for testing`);
        }
        else if (newState === CircuitState.OPEN) {
            logger_1.default.warn(`Circuit breaker [${this.name}] OPEN after failures`);
        }
        // Emit state change event
        this.onStateChange(oldState, newState);
    }
    /**
     * Override for state change events
     */
    onStateChange(from, to) {
        // Can be overridden by subclasses or listeners
    }
    /**
     * Get current circuit state
     */
    getState() {
        return this.state;
    }
    /**
     * Get circuit breaker status
     */
    getStatus() {
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
    reset() {
        this.state = CircuitState.CLOSED;
        this.failureCount = 0;
        this.successCount = 0;
        this.lastFailure = 0;
    }
}
exports.CircuitBreaker = CircuitBreaker;
/**
 * Retry Utility
 * Implements exponential backoff retry logic
 */
class RetryUtility {
    config;
    constructor(config = {}) {
        this.config = config;
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
    async execute(operation, options = {}) {
        let lastError;
        let delay = this.config.initialDelay;
        for (let attempt = 1; attempt <= this.config.maxAttempts; attempt++) {
            try {
                return await operation();
            }
            catch (error) {
                lastError = error;
                // Check if error is retryable
                if (!this.isRetryable(error)) {
                    throw error;
                }
                // Check if we have retries left
                if (attempt >= this.config.maxAttempts) {
                    break;
                }
                // Log retry attempt
                logger_1.default.warn(`Retry attempt ${attempt}/${this.config.maxAttempts}`, {
                    context: options.context,
                    error: lastError.message,
                    nextDelay: delay,
                });
                // Call onRetry callback
                options.onRetry?.(attempt, lastError, delay);
                // Wait before retry with exponential backoff
                await this.sleep(delay);
                // Calculate next delay with jitter
                delay = Math.min(delay * this.config.backoffMultiplier, this.config.maxDelay);
                delay = this.addJitter(delay);
            }
        }
        throw lastError || new Error('All retry attempts failed');
    }
    /**
     * Check if an error is retryable
     */
    isRetryable(error) {
        const errorCode = error.code;
        return this.config.retryableErrors.includes(errorCode);
    }
    /**
     * Sleep for a given duration
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    /**
     * Add jitter to delay to prevent thundering herd
     */
    addJitter(delay) {
        const jitter = delay * 0.1 * Math.random();
        return Math.floor(delay + jitter);
    }
}
exports.RetryUtility = RetryUtility;
/**
 * Graceful Degradation Service
 * Provides fallback behaviors for degraded services
 */
class GracefulDegradationService {
    fallbacks = new Map();
    circuitBreakers = new Map();
    healthStatus = new Map();
    /**
     * Register a fallback for a service
     */
    registerFallback(serviceName, fallback) {
        this.fallbacks.set(serviceName, fallback);
    }
    /**
     * Register a circuit breaker for a service
     */
    registerCircuitBreaker(serviceName, config) {
        this.circuitBreakers.set(serviceName, new CircuitBreaker(serviceName, config));
    }
    /**
     * Execute with automatic fallback and circuit breaker
     */
    async executeWithDegradation(serviceName, operation, options = {}) {
        const correlationId = options.correlationId || (0, uuid_1.v4)();
        const circuitBreaker = this.circuitBreakers.get(serviceName);
        try {
            let result;
            if (circuitBreaker) {
                result = await circuitBreaker.execute(operation, options.useFallback ? this.fallbacks.get(serviceName) : undefined);
            }
            else {
                result = await operation();
            }
            this.updateHealthStatus(serviceName, 'healthy');
            return { result, source: 'primary' };
        }
        catch (error) {
            logger_1.default.error(`Service [${serviceName}] failed`, {
                correlationId,
                error: error.message,
            });
            // Try fallback
            const fallback = this.fallbacks.get(serviceName);
            if (fallback && options.useFallback) {
                try {
                    logger_1.default.info(`Executing fallback for [${serviceName}]`, { correlationId });
                    const result = await fallback();
                    this.updateHealthStatus(serviceName, 'degraded');
                    return { result, source: 'fallback' };
                }
                catch (fallbackError) {
                    logger_1.default.error(`Fallback also failed for [${serviceName}]`, {
                        correlationId,
                        error: fallbackError.message,
                    });
                }
            }
            this.updateHealthStatus(serviceName, 'down');
            return {
                source: 'error',
                error: error,
            };
        }
    }
    /**
     * Update health status for a service
     */
    updateHealthStatus(serviceName, status) {
        this.healthStatus.set(serviceName, status);
    }
    /**
     * Get health status for all services
     */
    getHealthStatus() {
        return Object.fromEntries(this.healthStatus);
    }
    /**
     * Get circuit breaker status for a service
     */
    getCircuitBreakerStatus(serviceName) {
        const cb = this.circuitBreakers.get(serviceName);
        return cb?.getState() || null;
    }
}
exports.GracefulDegradationService = GracefulDegradationService;
// Singleton instances for global use
exports.resilienceService = new GracefulDegradationService();
// Pre-configured circuit breakers
exports.resilienceService.registerCircuitBreaker('database', {
    failureThreshold: 5,
    timeout: 30000,
});
exports.resilienceService.registerCircuitBreaker('blockchain', {
    failureThreshold: 3,
    timeout: 60000,
});
exports.resilienceService.registerCircuitBreaker('websocket', {
    failureThreshold: 5,
    timeout: 15000,
});
// Export default retry utility
exports.retryUtility = new RetryUtility();
//# sourceMappingURL=resilience.service.js.map