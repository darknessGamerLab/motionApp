/**
 * queryCache — A lightweight in-memory + time-based cache for Supabase queries.
 *
 * Prevents duplicate network requests for the same data across components and page
 * navigations. Works as a module-level singleton (survives component remounts).
 *
 * Usage:
 *   const data = await queryCache.get('key', () => supabase.from(...), ttlMs);
 */

type CacheEntry<T> = {
    data: T;
    timestamp: number;
    promise?: Promise<T>;
};

class QueryCache {
    private cache = new Map<string, CacheEntry<any>>();
    // In-flight deduplication: if a request for the same key is already in flight,
    // return the same promise instead of creating a new network request.
    private inflight = new Map<string, Promise<any>>();

    /**
     * Get cached data or fetch it.
     * @param key       Unique cache key
     * @param fetcher   Async function to fetch data
     * @param ttlMs     Time-to-live in milliseconds (default: 60s)
     * @param force     If true, bypass cache and refetch
     */
    async get<T>(
        key: string,
        fetcher: () => Promise<T>,
        ttlMs = 60_000,
        force = false
    ): Promise<T> {
        // Check memory cache
        if (!force) {
            const cached = this.cache.get(key);
            if (cached && Date.now() - cached.timestamp < ttlMs) {
                return cached.data as T;
            }
        }

        // Deduplicate in-flight requests — if already fetching, return same promise
        const existing = this.inflight.get(key);
        if (existing) return existing as Promise<T>;

        const promise = fetcher().then((data) => {
            this.cache.set(key, { data, timestamp: Date.now() });
            this.inflight.delete(key);
            return data;
        }).catch((err) => {
            this.inflight.delete(key);
            throw err;
        });

        this.inflight.set(key, promise);
        return promise;
    }

    /** Delete a specific cache entry (call after mutations) */
    invalidate(key: string) {
        this.cache.delete(key);
        this.inflight.delete(key);
    }

    /** Delete all cache entries matching a prefix */
    invalidatePrefix(prefix: string) {
        for (const key of this.cache.keys()) {
            if (key.startsWith(prefix)) {
                this.cache.delete(key);
                this.inflight.delete(key);
            }
        }
    }

    /** Clear all cache */
    clear() {
        this.cache.clear();
        this.inflight.clear();
    }

    /** Check if a key is currently fresh in cache */
    has(key: string, ttlMs = 60_000): boolean {
        const cached = this.cache.get(key);
        return !!cached && Date.now() - cached.timestamp < ttlMs;
    }
}

// Singleton — module-level, survives across component mounts/unmounts
export const queryCache = new QueryCache();
