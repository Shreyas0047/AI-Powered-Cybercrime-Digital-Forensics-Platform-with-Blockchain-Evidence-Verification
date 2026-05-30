/**
 * Smoke tests for request-context AsyncLocalStorage middleware.
 */

import { getCorrelationId, withRequestContext } from '../middleware/request-context';

describe('request-context', () => {
  it('returns undefined outside any context', () => {
    expect(getCorrelationId()).toBeUndefined();
  });

  it('returns the active correlation id inside withRequestContext', () => {
    const inside = withRequestContext({ correlationId: 'abc-123' }, () => getCorrelationId());
    expect(inside).toBe('abc-123');
  });

  it('isolates correlation ids between concurrent contexts', async () => {
    const results = await Promise.all([
      new Promise<string | undefined>((resolve) =>
        withRequestContext({ correlationId: 'one' }, () => {
          // Simulate async work inside the context
          setTimeout(() => resolve(getCorrelationId()), 10);
        }),
      ),
      new Promise<string | undefined>((resolve) =>
        withRequestContext({ correlationId: 'two' }, () => {
          setTimeout(() => resolve(getCorrelationId()), 5);
        }),
      ),
    ]);

    expect(results.sort()).toEqual(['one', 'two']);
  });

  it('clears context after the callback returns', () => {
    withRequestContext({ correlationId: 'temp' }, () => {
      expect(getCorrelationId()).toBe('temp');
    });
    expect(getCorrelationId()).toBeUndefined();
  });
});
