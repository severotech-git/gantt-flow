/**
 * In-memory sliding-window rate limiter for Node.js API routes.
 *
 * NOTE: State is per-process. On a single-server deployment this works perfectly.
 * For multi-instance / serverless deployments, replace the `store` Map with a
 * Redis-backed implementation (e.g. @upstash/ratelimit) using the same interface.
 */

interface Entry {
  count: number;
  resetAt: number; // epoch ms when the window expires
}

const store = new Map<string, Entry>();
let lastCleanup = Date.now();

/** Periodically evict expired entries so the Map doesn't grow unbounded. */
function cleanup() {
  const now = Date.now();
  if (now - lastCleanup < 60_000) return;
  lastCleanup = now;
  for (const [key, entry] of store) {
    if (entry.resetAt < now) store.delete(key);
  }
}

/**
 * Check whether `key` is within the allowed `limit` for the sliding `windowMs`.
 * Returns `{ ok: true }` when the request is allowed, or
 * `{ ok: false, retryAfterSeconds }` when the limit is exceeded.
 */
export function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number,
): { ok: true } | { ok: false; retryAfterSeconds: number } {
  cleanup();
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || entry.resetAt < now) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true };
  }

  if (entry.count >= limit) {
    return { ok: false, retryAfterSeconds: Math.ceil((entry.resetAt - now) / 1000) };
  }

  entry.count++;
  return { ok: true };
}

/**
 * Extract the client IP from request headers.
 * Trusts X-Forwarded-For (first hop) or X-Real-IP, falling back to '127.0.0.1'.
 */
export function getClientIp(headers: Headers): string {
  const forwarded = headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  return headers.get('x-real-ip') ?? '127.0.0.1';
}
