import { createSubscriberManager } from '../core/subscribers'
import { createNetworkManager } from '../core/network'
import { wrapStoreWithProxy } from '../core/proxy'
import type { StoreOps, NewStore, Listener } from '../types'

export function createStore<T>(ops: StoreOps<T>): NewStore<T> {
  let data: T | null = ops.persist?.load() ?? null
  const subscribers = createSubscriberManager()
  const network = createNetworkManager({ reloadOnFocus: false, reloadOnReconnect: false, reloadInterval: 0, onReload: () => {} })
  const cleanups: (() => void)[] = []

  if (ops.subscribe) cleanups.push(ops.subscribe(d => { data = d; subscribers.notify([[]]) }))

  const storeImpl = {
    get value() { return data },
    get status() { return network.getStatus() },
    subscribeToStatus: (l: Listener) => network.subscribeToStatus(l),

    async get(params?: Record<string, unknown>) {
      if (!ops.get) throw new Error('get not configured')
      network.setStatus({ isLoading: data === null, isRevalidating: data !== null })
      try {
        data = await ops.get(params) as T
        ops.persist?.save(data)
        network.setStatus({ isLoading: false, isRevalidating: false, error: null, lastUpdated: Date.now() })
        subscribers.notify([[]])
        return data
      } catch (e) { network.setStatus({ isLoading: false, isRevalidating: false, error: e as Error }); throw e }
    },

    async set(newData: T) {
      if (!ops.set) throw new Error('set not configured')
      const prev = data
      data = newData
      subscribers.notify([[]])
      try {
        const result = await ops.set(newData) as T
        if (result) { data = result; subscribers.notify([[]]) }
        ops.persist?.save(data)
        return data
      } catch (e) { data = prev; subscribers.notify([[]]); throw e }
    },

    async patch(partial: Partial<T>) {
      if (!ops.patch) throw new Error('patch not configured')
      const prev = data
      data = { ...data, ...partial } as T
      const paths = Object.keys(partial).map(k => [k])
      subscribers.notify(paths)
      try {
        const result = await ops.patch(partial) as T
        if (result) { data = result; subscribers.notify([[]]) }
        ops.persist?.save(data)
        return data as T
      } catch (e) { data = prev; subscribers.notify([[]]); throw e }
    },

    async delete(params?: Record<string, unknown>) {
      if (!ops.delete) throw new Error('delete not configured')
      const prev = data
      data = null
      subscribers.notify([[]])
      try {
        await ops.delete(params)
        ops.persist?.save(data as T)
      } catch (e) { data = prev; subscribers.notify([[]]); throw e }
    },

    clear() { data = null; subscribers.notify([[]]) },
    dispose() { cleanups.forEach(fn => fn()); network.dispose() },
  }

  const proxy = wrapStoreWithProxy<NewStore<T>>({ getValue: () => data, subscribers })
  Object.defineProperties(proxy, Object.getOwnPropertyDescriptors(storeImpl))
  return proxy
}
