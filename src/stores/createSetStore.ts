import { createSubscriberManager } from '../core/subscribers'
import { createNetworkManager } from '../core/network'
import { wrapStoreWithProxy } from '../core/proxy'
import { getCached, setCache, clearCache, clearCachePrefix } from '../core/cache'
import type { SetStoreOps, SetStore, Listener } from '../types'

export function createSetStore<T extends { id: string }>(ops: SetStoreOps<T>): SetStore<T> {
  let items: T[] = ops.persist?.load() ?? []
  let meta: Record<string, unknown> = {}
  const subscribers = createSubscriberManager()
  const network = createNetworkManager({ reloadOnFocus: false, reloadOnReconnect: false, reloadInterval: 0, onReload: () => {} })
  const cleanups: (() => void)[] = []
  const cachePrefix = crypto.randomUUID()

  if (ops.subscribe) cleanups.push(ops.subscribe(data => { items = data; subscribers.notify([[]]) }))
  const findIdx = (id: string) => items.findIndex(i => i.id === id)

  const storeImpl = {
    get value() { return items },
    get meta() { return meta },
    get status() { return network.getStatus() },
    subscribeToStatus: (l: Listener) => network.subscribeToStatus(l),

    async get(params?: Record<string, unknown>) {
      if (!ops.get) throw new Error('get not configured')
      const { _force, ...rest } = params ?? {}
      const cacheKey = `${cachePrefix}:${JSON.stringify(rest)}`
      if (!_force && ops.ttl) {
        const cached = getCached<T[]>(cacheKey, ops.ttl)
        if (cached) { items = cached.data; subscribers.notify([[]]); return items }
      }
      network.setStatus({ isLoading: items.length === 0, isRevalidating: items.length > 0 })
      try {
        items = await ops.get(rest) as T[]
        if (ops.ttl) setCache(cacheKey, items)
        ops.persist?.save(items)
        network.setStatus({ isLoading: false, isRevalidating: false, error: null, lastUpdated: Date.now() })
        subscribers.notify([[]])
        return items
      } catch (e) { network.setStatus({ isLoading: false, isRevalidating: false, error: e as Error }); throw e }
    },

    async getOne(params: { id: string } & Record<string, unknown>) {
      if (!ops.getOne) throw new Error('getOne not configured')
      const { _force, ...rest } = params
      const cacheKey = `${cachePrefix}:one:${JSON.stringify(rest)}`
      if (!_force && ops.ttl) {
        const cached = getCached<T>(cacheKey, ops.ttl)
        if (cached) return cached.data
      }
      const item = await ops.getOne(rest as { id: string }) as T
      if (ops.ttl) setCache(cacheKey, item)
      const idx = findIdx(item.id)
      if (idx >= 0) items = [...items.slice(0, idx), item, ...items.slice(idx + 1)]
      else items = [...items, item]
      subscribers.notify([[idx >= 0 ? idx : items.length - 1]])
      return item
    },

    async create(data: Omit<T, 'id'> | T) {
      if (!ops.create) throw new Error('create not configured')
      const item = await ops.create(data) as T
      items = [...items, item]
      clearCachePrefix(cachePrefix + ':')  // Invalidate list caches
      ops.persist?.save(items)
      subscribers.notify([[]])
      return item
    },

    async patch(data: Partial<T> & { id: string }) {
      if (!ops.patch) throw new Error('patch not configured')
      const idx = findIdx(data.id)
      const prev = items[idx]
      if (idx >= 0) {
        const updated = { ...items[idx], ...data }
        items = [...items.slice(0, idx), updated, ...items.slice(idx + 1)]
      }
      clearCache(`${cachePrefix}:one:${JSON.stringify({ id: data.id })}`)  // Invalidate item cache
      const paths = Object.keys(data).filter(k => k !== 'id').map(k => [idx, k])
      subscribers.notify(paths)
      try {
        const result = await ops.patch(data) as T
        if (result && idx >= 0) {
          items = [...items.slice(0, idx), result, ...items.slice(idx + 1)]
          subscribers.notify([[idx]])
        }
        ops.persist?.save(items)
        return items[idx]
      } catch (e) {
        if (idx >= 0) items = [...items.slice(0, idx), prev, ...items.slice(idx + 1)]
        subscribers.notify([[idx]])
        throw e
      }
    },

    async delete(params: { id: string }) {
      if (!ops.delete) throw new Error('delete not configured')
      const prev = items
      items = items.filter(i => i.id !== params.id)
      clearCachePrefix(cachePrefix + ':')  // Invalidate all caches
      subscribers.notify([[]])
      try {
        await ops.delete(params)
        ops.persist?.save(items)
      } catch (e) { items = prev; subscribers.notify([[]]); throw e }
    },

    clear() { items = []; meta = {}; clearCachePrefix(cachePrefix + ':'); subscribers.notify([[]]) },
    dispose() { cleanups.forEach(fn => fn()); network.dispose() },
  }

  const proxy = wrapStoreWithProxy<SetStore<T>>({ getValue: () => items, subscribers })
  Object.defineProperties(proxy, Object.getOwnPropertyDescriptors(storeImpl))
  return proxy
}
