/**
 * High-Performance In-Memory RAM Cache Utility
 * Zero external dependencies, sub-millisecond lookups with TTL expiration.
 */

interface CacheEntry<T = any> {
  data: T;
  expiresAt: number;
}

class MemoryCache {
  private store = new Map<string, CacheEntry>();

  /**
   * Set a value in cache with TTL (in seconds). Default TTL = 120 seconds (2 mins)
   */
  set<T = any>(key: string, data: T, ttlSeconds: number = 120): void {
    const expiresAt = Date.now() + ttlSeconds * 1000;
    this.store.set(key, { data, expiresAt });
  }

  /**
   * Get a cached value. Returns null if expired or not found.
   */
  get<T = any>(key: string): T | null {
    const entry = this.store.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }

    return entry.data as T;
  }

  /**
   * Delete a specific cache key
   */
  del(key: string): void {
    this.store.delete(key);
  }

  /**
   * Invalidate all keys matching a prefix (e.g. "clusters_")
   */
  delPrefix(prefix: string): void {
    for (const key of this.store.keys()) {
      if (key.startsWith(prefix)) {
        this.store.delete(key);
      }
    }
  }

  /**
   * Clear all cached data
   */
  clear(): void {
    this.store.clear();
  }

  /**
   * Helper to invalidate cluster and stall related caches
   */
  invalidateClusters(): void {
    this.del('all_clusters');
    this.delPrefix('cluster_');
    this.delPrefix('stall_');
  }
}

export const memoryCache = new MemoryCache();
export default memoryCache;
