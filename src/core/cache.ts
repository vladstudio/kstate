type CacheEntry<T> = { data: T; timestamp: number }
const cache = new Map<string, CacheEntry<unknown>>()
const MAX_SIZE = 100

export function getCached<T>(key: string, ttl: number): { data: T; stale: boolean } | null {
  const entry = cache.get(key)
  if (!entry) return null
  const age = Date.now() - entry.timestamp
  if (age >= ttl) { cache.delete(key); return null }
  cache.delete(key); cache.set(key, entry) // Move to end (LRU)
  return { data: entry.data as T, stale: age > ttl / 2 }
}

export function setCache<T>(key: string, data: T): void {
  cache.delete(key) // Remove if exists to update position
  if (cache.size >= MAX_SIZE) cache.delete(cache.keys().next().value!)
  cache.set(key, { data, timestamp: Date.now() })
}

export function clearCache(key: string): void { cache.delete(key) }

export function clearCachePrefix(prefix: string): void {
  if (!prefix) return
  for (const key of cache.keys()) if (key.startsWith(prefix)) cache.delete(key)
}
