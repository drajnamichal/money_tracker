/**
 * Simple in-memory sliding-window rate limiter.
 *
 * Works inside a single serverless instance lifetime — catches rapid-fire
 * spam (e.g. user clicking OCR 50 times) without any external dependencies.
 *
 * For production multi-instance setups, swap this for @upstash/ratelimit.
 */

interface RateLimitEntry {
  /** Timestamps of requests within the current window */
  timestamps: number[];
}

interface RateLimiterOptions {
  /** Maximum number of requests allowed within the window */
  limit: number;
  /** Window size in seconds */
  windowSeconds: number;
}

const stores = new Map<string, Map<string, RateLimitEntry>>();

/**
 * Creates a named rate limiter. Each limiter has its own store so different
 * routes can have different limits.
 *
 * @example
 * ```ts
 * const limiter = createRateLimiter('ocr', { limit: 5, windowSeconds: 60 });
 *
 * export async function POST(req: Request) {
 *   const result = limiter.check(getClientIdentifier(req));
 *   if (!result.allowed) {
 *     return NextResponse.json(
 *       { error: `Príliš veľa požiadaviek. Skúste znova o ${result.retryAfterSeconds}s.` },
 *       { status: 429 }
 *     );
 *   }
 *   // ... handle request
 * }
 * ```
 */
export function createRateLimiter(name: string, options: RateLimiterOptions) {
  if (!stores.has(name)) {
    stores.set(name, new Map());
  }
  const store = stores.get(name)!;

  return {
    check(identifier: string): {
      allowed: boolean;
      remaining: number;
      retryAfterSeconds: number;
    } {
      const now = Date.now();
      const windowMs = options.windowSeconds * 1000;
      const windowStart = now - windowMs;

      let entry = store.get(identifier);
      if (!entry) {
        entry = { timestamps: [] };
        store.set(identifier, entry);
      }

      // Prune timestamps outside the window
      entry.timestamps = entry.timestamps.filter((ts) => ts > windowStart);

      if (entry.timestamps.length >= options.limit) {
        // Calculate when the oldest request in the window expires
        const oldestInWindow = entry.timestamps[0];
        const retryAfterMs = oldestInWindow + windowMs - now;
        return {
          allowed: false,
          remaining: 0,
          retryAfterSeconds: Math.ceil(retryAfterMs / 1000),
        };
      }

      entry.timestamps.push(now);
      return {
        allowed: true,
        remaining: options.limit - entry.timestamps.length,
        retryAfterSeconds: 0,
      };
    },
  };
}

/**
 * Extract a client identifier from the request. Uses IP address from
 * common proxy headers, falling back to a generic key.
 */
export function getClientIdentifier(req: Request): string {
  const headers = new Headers(req.headers);
  return (
    headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    headers.get('x-real-ip') ||
    'anonymous'
  );
}
