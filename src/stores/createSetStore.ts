import { createSubscriberManager } from '../core/subscribers'
import { createNetworkManager } from '../core/network'
import { wrapStoreWithProxy } from '../core/proxy'
import { getCached, setCache, clearCache, clearCachePrefix } from '../core/cache'
import type { SetStoreOps, SetStore, Listener } from '../types'

const stableKey = (o: Record<string, unknown>) => {
  const keys = Object.keys(o).sort()
  return keys.length === 0 ? '' : keys.map(k => `${k}=${o[k]}`).join('&')
}

export function createSetStore<T extends { id: string }>(ops: SetStoreOps<T>): SetStore<T> {
  const persisted = ops.persist?.load() ?? []
  let items = new Map<string, T>(persisted.map(i => [String(i.id), typeof i.id === 'string' ? i : { ...i, id: String(i.id) }]))
  let ids: string[] = persisted.map(i => String(i.id))
  let meta: Record<string, unknown> = {}
  const subscribers = createSubscriberManager()
  const network = createNetworkManager({ reloadOnFocus: false, reloadOnReconnect: false, reloadInterval: 0, onReload: () => {} })
  const cleanups: (() => void)[] = []
  const cachePrefix = crypto.randomUUID()

  const setItems = (arr: T[]) => {
    items = new Map(arr.map(i => [String(i.id), typeof i.id === 'string' ? i : { ...i, id: String(i.id) }]))
    ids = arr.map(i => String(i.id))
  }
  const mutate = () => { items = new Map(items) } // New reference for React
  const toArray = () => ids.map(id => items.get(id)!)
  const persist = () => ops.persist?.save(toArray())

  if (ops.subscribe) cleanups.push(ops.subscribe(data => { setItems(data); subscribers.notify([[]]) }))

  const storeImpl = {
    get value() { return items },
    get ids() { return ids as readonly string[] },
    get meta() { return meta },
    get status() { return network.getStatus() },
    subscribeToStatus: (l: Listener) => network.subscribeToStatus(l),

    async get(params?: Record<string, unknown>) {
      if (!ops.get) throw new Error('get not configured')
      const { _force, ...rest } = params ?? {}
      const cacheKey = `${cachePrefix}:${stableKey(rest)}`
      if (!_force && ops.ttl) {
        const cached = getCached<T[]>(cacheKey, ops.ttl)
        if (cached) { setItems(cached.data); subscribers.notify([[]]); return toArray() }
      }
      network.setStatus({ isLoading: items.size === 0, isRevalidating: items.size > 0 })
      try {
        const result = await ops.get(rest) as T[]
        setItems(result)
        if (ops.ttl) setCache(cacheKey, result)
        persist()
        network.setStatus({ isLoading: false, isRevalidating: false, error: null, lastUpdated: Date.now() })
        subscribers.notify([[]])
        return toArray()
      } catch (e) { network.setStatus({ isLoading: false, isRevalidating: false, error: e as Error }); throw e }
    },

    async getOne(params: { id: string } & Record<string, unknown>) {
      if (!ops.getOne) throw new Error('getOne not configured')
      const { _force, ...rest } = params
      const cacheKey = `${cachePrefix}:one:${stableKey(rest)}`
      if (!_force && ops.ttl) {
        const cached = getCached<T>(cacheKey, ops.ttl)
        if (cached) return cached.data
      }
      const item = await ops.getOne(rest as { id: string }) as T
      const id = String(item.id)
      const normalized = typeof item.id === 'string' ? item : { ...item, id }
      if (ops.ttl) setCache(cacheKey, normalized)
      mutate()
      if (!items.has(id)) ids.push(id)
      items.set(id, normalized)
      subscribers.notify([[id]])
      return normalized
    },

    async create(data: Omit<T, 'id'> | T) {
      if (!ops.create) throw new Error('create not configured')
      const item = await ops.create(data) as T
      const id = String(item.id)
      const normalized = typeof item.id === 'string' ? item : { ...item, id }
      mutate()
      items.set(id, normalized)
      ids.push(id)
      clearCachePrefix(cachePrefix + ':')
      persist()
      subscribers.notify([[]])
      return normalized
    },

    async patch(data: Partial<T> & { id: string }) {
      if (!ops.patch) throw new Error('patch not configured')
      const id = String(data.id)
      const prev = items.get(id)
      if (!prev) throw new Error(`Item ${id} not found`)
      mutate()
      items.set(id, { ...prev, ...data, id })
      clearCache(`${cachePrefix}:one:id=${id}`)
      const changedKeys = Object.keys(data)
      const paths: (string | number)[][] = changedKeys.length > 1 ? changedKeys.filter(k => k !== 'id').map(k => [id, k]) : [[id]]
      subscribers.notify(paths)
      try {
        const result = await ops.patch(data) as T
        if (result) { items.set(id, typeof result.id === 'string' ? result : { ...result, id }); subscribers.notify([[id]]) }
        persist()
        return items.get(id)!
      } catch (e) { items.set(id, prev); subscribers.notify([[id]]); throw e }
    },

    async delete(params: { id: string }) {
      if (!ops.delete) throw new Error('delete not configured')
      const id = String(params.id)
      const prevItem = items.get(id), prevIdx = ids.indexOf(id)
      mutate()
      items.delete(id)
      if (prevIdx >= 0) ids.splice(prevIdx, 1)
      clearCachePrefix(cachePrefix + ':')
      subscribers.notify([[]])
      try { await ops.delete(params); persist() }
      catch (e) { if (prevItem) { items.set(id, prevItem); ids.splice(prevIdx, 0, id) }; subscribers.notify([[]]); throw e }
    },

    upsert(item: T) { const id = String(item.id); if (!items.has(id)) ids.push(id); items.set(id, item); subscribers.notify([[id]]) },
    clear() { items = new Map(); ids = []; meta = {}; clearCachePrefix(cachePrefix + ':'); subscribers.notify([[]]) },
    dispose() { cleanups.forEach(fn => fn()); network.dispose() },
  }

  const proxy = wrapStoreWithProxy<SetStore<T>>({ getValue: () => items, subscribers })
  Object.defineProperties(proxy, Object.getOwnPropertyDescriptors(storeImpl))
  return proxy
}
