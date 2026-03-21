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
 *
 * X-Forwarded-For / X-Real-IP are user-controllable unless the request passes
 * through a trusted reverse proxy first.  Set TRUSTED_PROXY=1 in your
 * environment (e.g. behind Nginx, AWS ALB, Cloudflare) to enable XFF trust.
 * Without it the headers are ignored to prevent rate-limit bypass via spoofing.
 *
 * Pass `directIp` (e.g. `NextRequest.ip`) as a fallback when the runtime
 * provides the connection IP directly without a proxy header.
 */
export function getClientIp(headers: Headers, directIp?: string | null): string {
  if (process.env.TRUSTED_PROXY === '1') {
    const forwarded = headers.get('x-forwarded-for');
    if (forwarded) {
      const ip = forwarded.split(',')[0].trim();
      if (isValidIp(ip)) return ip;
    }
    const realIp = headers.get('x-real-ip');
    if (realIp && isValidIp(realIp)) return realIp;
  }
  if (directIp && isValidIp(directIp)) return directIp;
  if (process.env.NODE_ENV === 'production') {
    console.warn(
      '[rateLimit] getClientIp: no valid client IP resolved — all requests share the same ' +
      'rate-limit bucket. Set TRUSTED_PROXY=1 behind a reverse proxy (Nginx, ALB, Cloudflare).'
    );
  }
  return '127.0.0.1';
}

function isValidIp(ip: string): boolean {
  const ipv4 = /^(\d{1,3}\.){3}\d{1,3}$/;
  const ipv6 = /^[\da-fA-F:]+$/;
  return ipv4.test(ip) || ipv6.test(ip);
}
