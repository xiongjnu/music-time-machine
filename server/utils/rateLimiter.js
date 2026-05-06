/**
 * 简易令牌桶限速器 — 60请求/分钟
 */
class RateLimiter {
  constructor(maxPerMinute = 60) {
    this.maxPerMinute = maxPerMinute;
    this.tokens = maxPerMinute;
    this.lastRefill = Date.now();
  }

  consume(count = 1) {
    this._refill();
    if (this.tokens >= count) {
      this.tokens -= count;
      return true;
    }
    return false;
  }

  _refill() {
    const now = Date.now();
    const elapsed = (now - this.lastRefill) / 1000;
    const refillAmount = (elapsed / 60) * this.maxPerMinute;
    this.tokens = Math.min(this.maxPerMinute, this.tokens + refillAmount);
    this.lastRefill = now;
  }
}

function rateLimitMiddleware(maxPerMinute = 60) {
  const limiter = new RateLimiter(maxPerMinute);
  return (req, res, next) => {
    if (!limiter.consume()) {
      return res.status(429).json({ code: 429, message: '请求过于频繁，请稍后再试' });
    }
    next();
  };
}

module.exports = { RateLimiter, rateLimitMiddleware };
