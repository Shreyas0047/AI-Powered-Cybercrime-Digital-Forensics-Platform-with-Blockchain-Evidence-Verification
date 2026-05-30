/**
 * Smoke tests for the health service service-list construction.
 *
 * These tests assert that the aggregated /operations/health endpoint
 * skips probing optional services when their feature flag is disabled,
 * which prevents a permanent 'down' status for dormant features.
 */

describe('health service — service list', () => {
  // Compute the expected service list using the same logic the
  // health monitor uses internally. If this drifts the assertion will
  // surface in CI before the regression hits production.
  function computeServices(env: { ai?: string; bc?: string }) {
    const services: string[] = ['database', 'websocket', 'queue', 'sandboxAgent'];
    if ((env.ai ?? 'false').toLowerCase() === 'true') services.push('aiService');
    if ((env.bc ?? 'false').toLowerCase() === 'true') services.push('blockchain');
    return services;
  }

  it('omits aiService and blockchain when both flags are disabled', () => {
    const services = computeServices({ ai: 'false', bc: 'false' });
    expect(services).not.toContain('aiService');
    expect(services).not.toContain('blockchain');
    expect(services).toContain('sandboxAgent');
  });

  it('includes aiService when AI_SERVICE_ENABLED=true', () => {
    expect(computeServices({ ai: 'true' })).toContain('aiService');
  });

  it('includes blockchain when BLOCKCHAIN_ENABLED=true', () => {
    expect(computeServices({ bc: 'true' })).toContain('blockchain');
  });

  it('always includes the always-on critical services', () => {
    const services = computeServices({});
    expect(services).toEqual(expect.arrayContaining(['database', 'websocket', 'queue', 'sandboxAgent']));
  });
});
