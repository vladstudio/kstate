type CacheEntry<T> = { data: T; timestamp: number }
const cache = new Map<string, CacheEntry<unknown>>()

export function getCached<T>(key: string, ttl: number): T | null {
  const entry = cache.get(key)
  if (entry && Date.now() - entry.timestamp < ttl) return entry.data as T
  return null
}

export function setCache<T>(key: string, data: T): void {
  cache.set(key, { data, timestamp: Date.now() })
}

export function clearCache(key: string): void {
  cache.delete(key)
}
