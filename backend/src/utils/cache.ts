/**
 * High-Performance In-Memory RAM Cache Utility
 * Zero external dependencies, sub-millisecond lookups with TTL expiration.
 * Auto-sweeping cleanup prevents memory leaks on long-running processes.
 */

interface CacheEntry<T = any> {
  data: T;
  expiresAt: number;
}

class MemoryCache {
  private store = new Map<string, CacheEntry>();
  private sweepTimer: NodeJS.Timeout | null = null;

  constructor() {
    // Periodically sweep expired keys every 60 seconds
    if (typeof setInterval !== "undefined") {
      this.sweepTimer = setInterval(() => {
        this.sweep();
      }, 60000);
      if (this.sweepTimer.unref) {
        this.sweepTimer.unref();
      }
    }
  }

  /**
   * Set a value in cache with TTL (in seconds). Default TTL = 600 seconds (10 mins)
   */
  set<T = any>(key: string, data: T, ttlSeconds: number = 600): void {
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
   * Check if a key exists and is not expired
   */
  has(key: string): boolean {
    return this.get(key) !== null;
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
   * Remove all expired entries to keep memory footprint minimal
   */
  sweep(): void {
    const now = Date.now();
    for (const [key, entry] of this.store.entries()) {
      if (now > entry.expiresAt) {
        this.store.delete(key);
      }
    }
  }

  /**
   * Helper to invalidate cluster and stall related caches
   */
  invalidateClusters(): void {
    this.del("all_clusters");
    this.delPrefix("cluster_");
    this.delPrefix("stall_");
  }

  /**
   * Helper to invalidate offers caches
   */
  invalidateOffers(): void {
    this.delPrefix("offers_");
  }

  /**
   * Helper to invalidate admin overview and transaction caches
   */
  invalidateAdminStats(): void {
    this.del("admin_overview_stats");
    this.del("admin_transactions");
  }
}

export const memoryCache = new MemoryCache();
export default memoryCache;
