const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert');
const { RateLimiter, rateLimitMiddleware } = require('../../server/utils/rateLimiter');

describe('RateLimiter', () => {
  let rl;

  beforeEach(() => {
    rl = new RateLimiter(10); // 10 tokens per minute
  });

  it('allows initial consumption', () => {
    assert.strictEqual(rl.consume(), true);
  });

  it('blocks after exhausting tokens', () => {
    for (let i = 0; i < 10; i++) rl.consume();
    assert.strictEqual(rl.consume(), false);
  });

  it('refills partial tokens after time passes', () => {
    for (let i = 0; i < 10; i++) rl.consume();
    // Simulate 30 seconds elapsed
    const origNow = Date.now;
    Date.now = () => origNow() + 30000; // 30s → 5 tokens refilled
    assert.strictEqual(rl.consume(), true);
    Date.now = origNow;
  });

  it('never exceeds max tokens', () => {
    const origNow = Date.now;
    Date.now = () => origNow() + 999999999;
    for (let i = 0; i < 100; i++) rl.consume();
    // Should hit a limit since max tokens is capped
    // Actually with huge time elapsed, all 100 should be accepted
    // Reset and test differently: after extreme refill, bucket caps at max
    rl = new RateLimiter(10);
    Date.now = () => origNow() + 999999999;
    for (let i = 0; i < 20; i++) {
      if (!rl.consume()) {
        // Some should fail since max tokens is limited
        Date.now = origNow;
        return; // Test passes if any failed
      }
    }
    Date.now = origNow;
    assert.fail('Expected some consume to return false');
  });
});

describe('rateLimitMiddleware', () => {
  it('calls next() when under limit', () => {
    const mw = rateLimitMiddleware(60);
    let called = false;
    const res = { status: () => ({ json: () => {} }) };
    mw({ ip: '1.2.3.4' }, res, () => { called = true; });
    assert.strictEqual(called, true);
  });

  it('returns 429 when over limit', () => {
    const mw = rateLimitMiddleware(1);
    let called = false;
    let statusCode = 0;
    const res = {
      status: (code) => { statusCode = code; return { json: () => {} }; },
    };
    mw({ ip: 'test-ip' }, res, () => { called = true; });
    assert.strictEqual(called, true); // First passes
    mw({ ip: 'test-ip' }, res, () => { called = true; });
    assert.strictEqual(statusCode, 429);
  });
});
