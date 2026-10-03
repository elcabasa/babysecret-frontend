/**
 * Minimal in-memory sliding-window rate limiter for abuse-sensitive routes
 * (auth, OTP, password reset, assistance requests, transfer confirmations).
 *
 * Semantics: at most `limit` hits per `windowMs` per key. Exceeding callers
 * should receive HTTP 429 with a generic message — never a distinguisher
 * that leaks account or order existence.
 *
 * Limitation: state lives in this server instance only. On multi-instance /
 * serverless deployments each instance enforces its own budget, so this is a
 * backstop against casual abuse, not a distributed guarantee. Do not use it
 * for correctness (idempotency lives with the business logic).
 */

type Bucket = { hits: number[] };

// Bound the map so a key-flood cannot grow memory without limit.
const MAX_BUCKETS = 5000;

const buckets = new Map<string, Bucket>();

export function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number,
  now: number = Date.now(),
): { allowed: boolean; retryAfterMs: number } {
  if (buckets.size > MAX_BUCKETS) {
    const oldestKey = buckets.keys().next().value;
    if (oldestKey !== undefined) buckets.delete(oldestKey);
  }

  const bucket = buckets.get(key) ?? { hits: [] };
  const fresh = bucket.hits.filter((at) => now - at < windowMs);

  if (fresh.length >= limit) {
    const oldest = fresh[0] ?? now;
    return {
      allowed: false,
      retryAfterMs: Math.max(0, oldest + windowMs - now),
    };
  }

  buckets.set(key, { hits: [...fresh, now] });

  return { allowed: true, retryAfterMs: 0 };
}

/**
 * Builds a rate-limit key from the caller IP plus a caller-supplied scope.
 * Callers append an already-normalized account/order suffix — never raw PII.
 */
export function requestKey(request: Request, scope: string): string {
  const forwarded = request.headers.get("x-forwarded-for");
  const ip = forwarded?.split(",")[0]?.trim() || "unknown";

  return `${scope}:${ip}`;
}
