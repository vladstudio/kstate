import { createSubscriberManager } from '../core/subscribers'
import { createNetworkManager } from '../core/network'
import { wrapStoreWithProxy } from '../core/proxy'
import { getCached, setCache, clearCache, clearCachePrefix } from '../core/cache'
import type { SetStoreOps, SetStore, Listener } from '../types'

export function createSetStore<T extends { id: string }>(ops: SetStoreOps<T>): SetStore<T> {
  const persisted = ops.persist?.load() ?? []
  let items = new Map<string, T>(persisted.map(i => [i.id, i]))
  let ids: string[] = persisted.map(i => i.id)
  let meta: Record<string, unknown> = {}
  const subscribers = createSubscriberManager()
  const network = createNetworkManager({ reloadOnFocus: false, reloadOnReconnect: false, reloadInterval: 0, onReload: () => {} })
  const cleanups: (() => void)[] = []
  const cachePrefix = crypto.randomUUID()

  const setItems = (arr: T[]) => { items = new Map(arr.map(i => [i.id, i])); ids = arr.map(i => i.id) }
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
      const cacheKey = `${cachePrefix}:${JSON.stringify(rest)}`
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
      const cacheKey = `${cachePrefix}:one:${JSON.stringify(rest)}`
      if (!_force && ops.ttl) {
        const cached = getCached<T>(cacheKey, ops.ttl)
        if (cached) return cached.data
      }
      const item = await ops.getOne(rest as { id: string }) as T
      if (ops.ttl) setCache(cacheKey, item)
      const isNew = !items.has(item.id)
      items.set(item.id, item)
      if (isNew) ids = [...ids, item.id]
      subscribers.notify([[item.id]])
      return item
    },

    async create(data: Omit<T, 'id'> | T) {
      if (!ops.create) throw new Error('create not configured')
      const item = await ops.create(data) as T
      items.set(item.id, item)
      ids = [...ids, item.id]
      clearCachePrefix(cachePrefix + ':')
      persist()
      subscribers.notify([[]])
      return item
    },

    async patch(data: Partial<T> & { id: string }) {
      if (!ops.patch) throw new Error('patch not configured')
      const prev = items.get(data.id)
      if (!prev) throw new Error(`Item ${data.id} not found`)
      items.set(data.id, { ...prev, ...data })
      clearCache(`${cachePrefix}:one:${JSON.stringify({ id: data.id })}`)
      subscribers.notify(Object.keys(data).filter(k => k !== 'id').map(k => [data.id, k]))
      try {
        const result = await ops.patch(data) as T
        if (result) { items.set(data.id, result); subscribers.notify([[data.id]]) }
        persist()
        return items.get(data.id)!
      } catch (e) { items.set(data.id, prev); subscribers.notify([[data.id]]); throw e }
    },

    async delete(params: { id: string }) {
      if (!ops.delete) throw new Error('delete not configured')
      const prev = items.get(params.id), prevIds = ids
      items.delete(params.id)
      ids = ids.filter(id => id !== params.id)
      clearCachePrefix(cachePrefix + ':')
      subscribers.notify([[]])
      try { await ops.delete(params); persist() }
      catch (e) { if (prev) items.set(params.id, prev); ids = prevIds; subscribers.notify([[]]); throw e }
    },

    clear() { items.clear(); ids = []; meta = {}; clearCachePrefix(cachePrefix + ':'); subscribers.notify([[]]) },
    dispose() { cleanups.forEach(fn => fn()); network.dispose() },
  }

  const proxy = wrapStoreWithProxy<SetStore<T>>({ getValue: () => items, subscribers })
  Object.defineProperties(proxy, Object.getOwnPropertyDescriptors(storeImpl))
  return proxy
}
