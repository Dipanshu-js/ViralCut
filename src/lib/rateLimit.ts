/**
 * Simple in-memory rate limiter for API routes
 * 10 requests per minute per user ID
 */

const requests = new Map<string, number[]>();

export function checkRateLimit(
  userId: string,
  limit = 10,
  windowMs = 60000,
): { ok: boolean; remaining: number; resetIn: number } {
  const now = Date.now();
  const key = userId;
  const windowStart = now - windowMs;

  const timestamps = (requests.get(key) || []).filter((t) => t > windowStart);

  if (timestamps.length >= limit) {
    const oldest = timestamps[0];
    const resetIn = Math.ceil((oldest + windowMs - now) / 1000);
    return { ok: false, remaining: 0, resetIn };
  }

  timestamps.push(now);
  requests.set(key, timestamps);

  // Cleanup old entries occasionally
  if (Math.random() < 0.01) {
    for (const [k, v] of requests.entries()) {
      const fresh = v.filter((t: number) => t > windowStart);
      if (fresh.length === 0) requests.delete(k);
      else requests.set(k, fresh);
    }
  }

  return { ok: true, remaining: limit - timestamps.length, resetIn: 0 };
}
