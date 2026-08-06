// Serverless-safe rate limiter
// In-memory store — resets per cold start (acceptable for basic protection)
// For production scale, consider Upstash Redis rate limiting

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

// Inline cleanup instead of setInterval (serverless has no persistent process)
function cleanupExpired() {
  const now = Date.now();
  // Only clean up if store grows large to avoid overhead on every call
  if (rateLimitStore.size > 1000) {
    for (const [key, entry] of rateLimitStore.entries()) {
      if (entry.resetAt < now) {
        rateLimitStore.delete(key);
      }
    }
  }
}

interface RateLimitConfig {
  windowMs: number;   // Time window in milliseconds
  maxRequests: number; // Max requests per window
}

interface RateLimitResult {
  success: boolean;
  remaining: number;
  resetAt: number;
}

export function rateLimit(
  key: string,
  config: RateLimitConfig = { windowMs: 60 * 1000, maxRequests: 5 }
): RateLimitResult {
  cleanupExpired();

  const now = Date.now();
  const entry = rateLimitStore.get(key);

  if (!entry || entry.resetAt < now) {
    // New window
    rateLimitStore.set(key, {
      count: 1,
      resetAt: now + config.windowMs,
    });
    return {
      success: true,
      remaining: config.maxRequests - 1,
      resetAt: now + config.windowMs,
    };
  }

  if (entry.count >= config.maxRequests) {
    return {
      success: false,
      remaining: 0,
      resetAt: entry.resetAt,
    };
  }

  entry.count++;
  return {
    success: true,
    remaining: config.maxRequests - entry.count,
    resetAt: entry.resetAt,
  };
}

// Specific rate limiters
export function rateLimitLogin(ip: string): RateLimitResult {
  return rateLimit(`login:${ip}`, { windowMs: 15 * 60 * 1000, maxRequests: 10 });
}

export function rateLimitOtp(email: string): RateLimitResult {
  return rateLimit(`otp:${email}`, { windowMs: 5 * 60 * 1000, maxRequests: 3 });
}

export function rateLimitApi(ip: string): RateLimitResult {
  return rateLimit(`api:${ip}`, { windowMs: 60 * 1000, maxRequests: 100 });
}
