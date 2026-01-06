import { createSubscriberManager } from '../core/subscribers'
import { createNetworkManager } from '../core/network'
import { wrapStoreWithProxy } from '../core/proxy'
import { getCached, setCache, clearCache, clearCachePrefix } from '../core/cache'
import type { SetStoreOps, SetStore, Listener } from '../types'

const stableKey = (o: Record<string, unknown>) => JSON.stringify(Object.keys(o).sort().reduce((a, k) => (a[k] = o[k], a), {} as typeof o))

export function createSetStore<T extends { id: string }>(ops: SetStoreOps<T>): SetStore<T> {
  const persisted = ops.persist?.load() ?? []
  let items = new Map<string, T>(persisted.map(i => [String(i.id), { ...i, id: String(i.id) }]))
  let ids: string[] = persisted.map(i => String(i.id))
  let meta: Record<string, unknown> = {}
  const subscribers = createSubscriberManager()
  const network = createNetworkManager({ reloadOnFocus: false, reloadOnReconnect: false, reloadInterval: 0, onReload: () => {} })
  const cleanups: (() => void)[] = []
  const cachePrefix = crypto.randomUUID()

  const setItems = (arr: T[]) => { items = new Map(arr.map(i => [String(i.id), { ...i, id: String(i.id) }])); ids = arr.map(i => String(i.id)) }
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
      const itemWithStringId = { ...item, id: String(item.id) }
      if (ops.ttl) setCache(cacheKey, itemWithStringId)
      const isNew = !items.has(itemWithStringId.id)
      items.set(itemWithStringId.id, itemWithStringId)
      if (isNew) ids = [...ids, itemWithStringId.id]
      subscribers.notify([[itemWithStringId.id]])
      return itemWithStringId
    },

    async create(data: Omit<T, 'id'> | T) {
      if (!ops.create) throw new Error('create not configured')
      const item = await ops.create(data) as T
      const itemWithStringId = { ...item, id: String(item.id) }
      items.set(itemWithStringId.id, itemWithStringId)
      ids = [...ids, itemWithStringId.id]
      clearCachePrefix(cachePrefix + ':')
      persist()
      subscribers.notify([[]])
      return itemWithStringId
    },

    async patch(data: Partial<T> & { id: string }) {
      if (!ops.patch) throw new Error('patch not configured')
      const id = String(data.id)
      const prev = items.get(id)
      if (!prev) throw new Error(`Item ${id} not found`)
      items.set(id, { ...prev, ...data, id })
      clearCache(`${cachePrefix}:one:${JSON.stringify({ id })}`)
      subscribers.notify(Object.keys(data).filter(k => k !== 'id').map(k => [id, k]))
      try {
        const result = await ops.patch(data) as T
        if (result) { items.set(id, { ...result, id: String(result.id) }); subscribers.notify([[id]]) }
        persist()
        return items.get(id)!
      } catch (e) { items.set(id, prev); subscribers.notify([[id]]); throw e }
    },

    async delete(params: { id: string }) {
      if (!ops.delete) throw new Error('delete not configured')
      const id = String(params.id)
      const prev = items.get(id), prevIds = ids
      items.delete(id)
      ids = ids.filter(i => i !== id)
      clearCachePrefix(cachePrefix + ':')
      subscribers.notify([[]])
      try { await ops.delete(params); persist() }
      catch (e) { if (prev) items.set(id, prev); ids = prevIds; subscribers.notify([[]]); throw e }
    },

    clear() { items.clear(); ids = []; meta = {}; clearCachePrefix(cachePrefix + ':'); subscribers.notify([[]]) },
    dispose() { cleanups.forEach(fn => fn()); network.dispose() },
  }

  const proxy = wrapStoreWithProxy<SetStore<T>>({ getValue: () => items, subscribers })
  Object.defineProperties(proxy, Object.getOwnPropertyDescriptors(storeImpl))
  return proxy
}
