interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const SEARCH_WINDOW_MS = 10 * 60 * 1000;
const SEARCH_MAX_REQUESTS = 20;
const STORY_WINDOW_MS = 30 * 60 * 1000;
const STORY_MAX_REQUESTS = 5;
const IMAGE_WINDOW_MS = 10 * 60 * 1000;
const IMAGE_MAX_REQUESTS = 8;
const REPORT_EMAIL_WINDOW_MS = 30 * 60 * 1000;
const REPORT_EMAIL_MAX_REQUESTS = 5;
const buckets = new Map<string, RateLimitEntry>();

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
  limit: number;
}

function consume(
  key: string,
  maxRequests: number,
  windowMs: number,
  now: number,
): RateLimitResult {
  if (buckets.size > 2_000) {
    for (const [bucketKey, entry] of buckets) {
      if (entry.resetAt <= now) buckets.delete(bucketKey);
    }
  }

  const existing = buckets.get(key);
  if (!existing || existing.resetAt <= now) {
    const resetAt = now + windowMs;
    buckets.set(key, { count: 1, resetAt });
    return {
      allowed: true,
      remaining: maxRequests - 1,
      resetAt,
      limit: maxRequests,
    };
  }

  if (existing.count >= maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: existing.resetAt,
      limit: maxRequests,
    };
  }

  existing.count += 1;
  return {
    allowed: true,
    remaining: maxRequests - existing.count,
    resetAt: existing.resetAt,
    limit: maxRequests,
  };
}

export function checkRateLimit(key: string, now = Date.now()): RateLimitResult {
  return consume(`search:${key}`, SEARCH_MAX_REQUESTS, SEARCH_WINDOW_MS, now);
}

export function checkStoryRateLimit(key: string, now = Date.now()): RateLimitResult {
  return consume(`story:${key}`, STORY_MAX_REQUESTS, STORY_WINDOW_MS, now);
}

export function checkImageRateLimit(key: string, now = Date.now()): RateLimitResult {
  return consume(`image:${key}`, IMAGE_MAX_REQUESTS, IMAGE_WINDOW_MS, now);
}

export function checkReportEmailRateLimit(
  key: string,
  now = Date.now(),
): RateLimitResult {
  return consume(
    `report-email:${key}`,
    REPORT_EMAIL_MAX_REQUESTS,
    REPORT_EMAIL_WINDOW_MS,
    now,
  );
}

export function resetRateLimitForTests(): void {
  buckets.clear();
}
