import { redis } from "./redis";

const DEFAULT_TTL = 300; // 5 minutes

/**
 * Get cached data from Redis with safe parsing
 */
async function get<T>(key: string): Promise<T | null> {
  if (!redis) return null;
  try {
    const data = await redis.get<T>(key);
    return data;
  } catch (error) {
    console.error(`Cache read error for key ${key}:`, error);
    return null;
  }
}

/**
 * Set data in Redis with TTL
 */
async function set<T>(key: string, data: T, ttl: number = DEFAULT_TTL): Promise<void> {
  if (!redis) return;
  try {
    await redis.set(key, data, { ex: ttl });
  } catch (error) {
    console.error(`Cache write error for key ${key}:`, error);
  }
}

/**
 * Delete key from Redis
 */
async function del(key: string): Promise<void> {
  if (!redis) return;
  try {
    await redis.del(key);
  } catch (error) {
    console.error(`Cache delete error for key ${key}:`, error);
  }
}

export const cache = {
  // Storefront helpers
  async getCachedStorefront(handle: string) {
    return get(`storefront:${handle}`);
  },
  async setCachedStorefront(handle: string, data: any) {
    return set(`storefront:${handle}`, data);
  },
  async invalidateStorefront(handle: string) {
    return del(`storefront:${handle}`);
  },

  // Product helpers
  async getCachedProduct(handle: string, slug: string) {
    return get(`product:${handle}:${slug}`);
  },
  async setCachedProduct(handle: string, slug: string, data: any) {
    return set(`product:${handle}:${slug}`, data);
  },
  async invalidateProduct(handle: string, slug: string) {
    return del(`product:${handle}:${slug}`);
  },
};
