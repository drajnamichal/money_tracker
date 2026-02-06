import { createRateLimiter, getClientIdentifier } from '../lib/rate-limit';

describe('createRateLimiter', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('allows requests under the limit', () => {
    const limiter = createRateLimiter('test-allow', {
      limit: 3,
      windowSeconds: 60,
    });

    const r1 = limiter.check('user-1');
    const r2 = limiter.check('user-1');
    const r3 = limiter.check('user-1');

    expect(r1.allowed).toBe(true);
    expect(r1.remaining).toBe(2);
    expect(r2.allowed).toBe(true);
    expect(r2.remaining).toBe(1);
    expect(r3.allowed).toBe(true);
    expect(r3.remaining).toBe(0);
  });

  it('blocks requests over the limit', () => {
    const limiter = createRateLimiter('test-block', {
      limit: 2,
      windowSeconds: 60,
    });

    limiter.check('user-1');
    limiter.check('user-1');
    const r3 = limiter.check('user-1');

    expect(r3.allowed).toBe(false);
    expect(r3.remaining).toBe(0);
    expect(r3.retryAfterSeconds).toBeGreaterThan(0);
    expect(r3.retryAfterSeconds).toBeLessThanOrEqual(60);
  });

  it('resets after the time window passes', () => {
    const limiter = createRateLimiter('test-reset', {
      limit: 1,
      windowSeconds: 10,
    });

    const r1 = limiter.check('user-1');
    expect(r1.allowed).toBe(true);

    const r2 = limiter.check('user-1');
    expect(r2.allowed).toBe(false);

    // Advance time past the window
    jest.advanceTimersByTime(11_000);

    const r3 = limiter.check('user-1');
    expect(r3.allowed).toBe(true);
  });

  it('tracks different users independently', () => {
    const limiter = createRateLimiter('test-users', {
      limit: 1,
      windowSeconds: 60,
    });

    const rA = limiter.check('user-A');
    const rB = limiter.check('user-B');

    expect(rA.allowed).toBe(true);
    expect(rB.allowed).toBe(true);

    // Both are now at limit
    expect(limiter.check('user-A').allowed).toBe(false);
    expect(limiter.check('user-B').allowed).toBe(false);
  });

  it('uses separate stores for different limiter names', () => {
    const limiterA = createRateLimiter('route-a', {
      limit: 1,
      windowSeconds: 60,
    });
    const limiterB = createRateLimiter('route-b', {
      limit: 1,
      windowSeconds: 60,
    });

    limiterA.check('user-1');

    // Same user, different limiter — should still be allowed
    expect(limiterB.check('user-1').allowed).toBe(true);
  });

  it('calculates retryAfterSeconds correctly', () => {
    const limiter = createRateLimiter('test-retry', {
      limit: 1,
      windowSeconds: 30,
    });

    limiter.check('user-1');

    // Advance 10 seconds
    jest.advanceTimersByTime(10_000);

    const blocked = limiter.check('user-1');
    expect(blocked.allowed).toBe(false);
    // Should be ~20 seconds remaining (30 - 10)
    expect(blocked.retryAfterSeconds).toBe(20);
  });

  it('sliding window prunes old timestamps', () => {
    const limiter = createRateLimiter('test-sliding', {
      limit: 2,
      windowSeconds: 10,
    });

    limiter.check('user-1'); // t=0
    jest.advanceTimersByTime(6_000);
    limiter.check('user-1'); // t=6s

    // At t=6s, both requests are within window → at limit
    expect(limiter.check('user-1').allowed).toBe(false);

    // Advance to t=11s — first request (t=0) falls outside window
    jest.advanceTimersByTime(5_000);

    const result = limiter.check('user-1');
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(0); // now at 2/2
  });
});

describe('getClientIdentifier', () => {
  /** Create a minimal Request-like object for testing (jsdom lacks Request) */
  function mockRequest(headers: Record<string, string> = {}) {
    return { headers: new Headers(headers) } as Request;
  }

  it('extracts IP from x-forwarded-for header', () => {
    const req = mockRequest({ 'x-forwarded-for': '1.2.3.4, 5.6.7.8' });
    expect(getClientIdentifier(req)).toBe('1.2.3.4');
  });

  it('extracts IP from x-real-ip header', () => {
    const req = mockRequest({ 'x-real-ip': '10.0.0.1' });
    expect(getClientIdentifier(req)).toBe('10.0.0.1');
  });

  it('prefers x-forwarded-for over x-real-ip', () => {
    const req = mockRequest({
      'x-forwarded-for': '1.2.3.4',
      'x-real-ip': '10.0.0.1',
    });
    expect(getClientIdentifier(req)).toBe('1.2.3.4');
  });

  it('falls back to anonymous when no headers present', () => {
    const req = mockRequest();
    expect(getClientIdentifier(req)).toBe('anonymous');
  });
});
