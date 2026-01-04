import type { ArrayStoreConfig, ArrayStore, Operation, ErrorMeta } from '../types'
import { createSubscriberManager } from '../core/subscribers'
import { createNetworkManager } from '../core/network'
import { wrapStoreWithProxy } from '../core/proxy'
import { apiFetch } from '../sync/api'
import { getConfig } from '../config'
import { getCached, setCache, clearCache } from '../core/cache'

export function createArrayStore<T extends { id: string }>(config: ArrayStoreConfig<T> = {}): ArrayStore<T> {
  let items: T[] = []
  let meta: Record<string, unknown> = {}
  let lastFetchParams: Record<string, string | number> = {}
  let inFlightKey: string | null = null
  let fetchPromise: Promise<T[]> | null = null

  const ttl = config.ttl ?? 60000
  const reloadOnMount = config.reloadOnMount ?? false

  const doReload = () => storeImpl.get({ ...lastFetchParams, _force: 1 })

  const network = createNetworkManager({
    reloadOnFocus: config.reloadOnFocus ?? false,
    reloadOnReconnect: config.reloadOnReconnect ?? true,
    reloadInterval: config.reloadInterval ?? 0,
    onReload: doReload,
  })

  const subscribers = createSubscriberManager(reloadOnMount ? () => storeImpl.get() : undefined)

  const findIndex = (id: string) => items.findIndex(item => item.id === id)

  function handleError(error: Error, operation: Operation, params: Record<string, string | number>, rollbackData: T | T[] | null): void {
    const errorMeta: ErrorMeta = { operation, endpoint: config.endpoints?.[operation as keyof typeof config.endpoints] ?? '', params, rollbackData }
    config.onError?.(error, errorMeta)
    getConfig().onError?.(error, operation, errorMeta)
  }

  const storeImpl = {
    get value() { return items },
    get meta() { return meta },
    get status() { return network.getStatus() },
    subscribeToStatus: network.subscribeToStatus,
    dispose: network.dispose,

    async get(params: Record<string, string | number> = {}): Promise<T[]> {
      const endpoint = config.endpoints?.get
      if (!endpoint) throw new Error('No get endpoint configured')

      const force = '_force' in params
      const cleanParams = { ...params }
      delete cleanParams._force
      const cacheKey = `${endpoint}:${JSON.stringify(cleanParams)}`

      if (force) clearCache(cacheKey)

      const cached = getCached<{ data: T[]; meta: Record<string, unknown> }>(cacheKey, ttl)
      if (cached) {
        items = cached.data
        meta = cached.meta
        subscribers.notify([[]])
        return items
      }

      if (fetchPromise && inFlightKey === cacheKey) return fetchPromise
      lastFetchParams = cleanParams
      inFlightKey = cacheKey

      network.setStatus({ isLoading: items.length === 0, isRevalidating: items.length > 0 })

      fetchPromise = (async () => {
        try {
          const result = await apiFetch<T[]>({ method: 'GET', endpoint, params: cleanParams, dataKey: config.dataKey })
          items = result.data
          meta = result.meta
          setCache(cacheKey, { data: items, meta })
          network.setStatus({ isLoading: false, isRevalidating: false, error: null, lastUpdated: Date.now() })
          subscribers.notify([[]])
          config.onGet?.(items, result.meta)
          return items
        } catch (error) {
          network.setStatus({ isLoading: false, isRevalidating: false, error: error as Error })
          handleError(error as Error, 'get', cleanParams, null)
          throw error
        } finally { fetchPromise = null; inFlightKey = null }
      })()

      return fetchPromise
    },

    async getOne(params: { id: string }): Promise<T> {
      const endpoint = config.endpoints?.getOne
      if (!endpoint) throw new Error('No getOne endpoint configured')

      network.setStatus({ isRevalidating: true })
      try {
        const result = await apiFetch<T>({ method: 'GET', endpoint, params, dataKey: config.dataKey })
        const index = findIndex(params.id)
        if (index >= 0) {
          items = items.map((item, i) => i === index ? result.data : item)
          subscribers.notify([[index]])
        } else {
          items = [...items, result.data]
          subscribers.notify([[items.length - 1]])
        }
        network.setStatus({ isRevalidating: false, error: null, lastUpdated: Date.now() })
        config.onGetOne?.(result.data, result.meta)
        return result.data
      } catch (error) {
        network.setStatus({ isRevalidating: false, error: error as Error })
        handleError(error as Error, 'getOne', params, null)
        throw error
      }
    },

    async create(data: Omit<T, 'id'>): Promise<T> {
      const endpoint = config.endpoints?.create
      if (!endpoint) throw new Error('No create endpoint configured')

      network.setStatus({ isRevalidating: true })
      try {
        const result = await apiFetch<T>({ method: 'POST', endpoint, body: data, dataKey: config.dataKey, requestKey: config.requestKey })
        items = [...items, result.data]
        network.setStatus({ isRevalidating: false, error: null, lastUpdated: Date.now() })
        subscribers.notify([[items.length - 1]])
        config.onCreate?.(result.data, result.meta)
        return result.data
      } catch (error) {
        network.setStatus({ isRevalidating: false, error: error as Error })
        handleError(error as Error, 'create', {}, null)
        throw error
      }
    },

    async update(data: T): Promise<T> {
      const endpoint = config.endpoints?.update
      if (!endpoint) throw new Error('No update endpoint configured')

      const index = findIndex(data.id)
      if (index < 0) throw new Error(`Item with id ${data.id} not found`)

      const previousItems = [...items]
      items = items.map((item, i) => i === index ? data : item)
      subscribers.notify([[index]])

      try {
        const result = await apiFetch<T>({ method: 'PUT', endpoint, params: { id: data.id }, body: data, dataKey: config.dataKey, requestKey: config.requestKey })
        items = items.map((item, i) => i === index ? result.data : item)
        network.setStatus({ lastUpdated: Date.now(), error: null })
        subscribers.notify([[index]])
        config.onUpdate?.(result.data, result.meta)
        return result.data
      } catch (error) {
        items = previousItems
        subscribers.notify([[index]])
        handleError(error as Error, 'update', { id: data.id }, previousItems[index])
        throw error
      }
    },

    async patch(data: Partial<T> & { id: string }): Promise<T> {
      const endpoint = config.endpoints?.patch
      if (!endpoint) throw new Error('No patch endpoint configured')

      const index = findIndex(data.id)
      if (index < 0) throw new Error(`Item with id ${data.id} not found`)

      const previousItems = [...items]
      const previousItem = items[index]
      items = items.map((item, i) => i === index ? { ...item, ...data } : item)
      subscribers.notify([[index]])

      try {
        const result = await apiFetch<T>({ method: 'PATCH', endpoint, params: { id: data.id }, body: data, dataKey: config.dataKey, requestKey: config.requestKey })
        items = items.map((item, i) => i === index ? result.data : item)
        network.setStatus({ lastUpdated: Date.now(), error: null })
        subscribers.notify([[index]])
        config.onPatch?.(result.data, result.meta)
        return result.data
      } catch (error) {
        items = previousItems
        subscribers.notify([[index]])
        handleError(error as Error, 'patch', { id: data.id }, previousItem)
        throw error
      }
    },

    async delete(params: { id: string }): Promise<void> {
      const endpoint = config.endpoints?.delete
      if (!endpoint) throw new Error('No delete endpoint configured')

      const index = findIndex(params.id)
      if (index < 0) throw new Error(`Item with id ${params.id} not found`)

      const previousItems = [...items]
      const previousItem = items[index]
      items = items.filter(item => item.id !== params.id)
      subscribers.notify([[]])

      try {
        const result = await apiFetch<void>({ method: 'DELETE', endpoint, params })
        network.setStatus({ lastUpdated: Date.now(), error: null })
        config.onDelete?.(params.id, result.meta)
      } catch (error) {
        items = previousItems
        subscribers.notify([[]])
        handleError(error as Error, 'delete', params, previousItem)
        throw error
      }
    },

    clear(): void {
      items = []
      meta = {}
      lastFetchParams = {}
      network.setStatus({ isLoading: false, isRevalidating: false, error: null, lastUpdated: 0 })
      subscribers.notify([[]])
    },
  }

  const proxy = wrapStoreWithProxy<Record<string | number, unknown>>({ getValue: () => items, subscribers })

  // Copy all properties including getters from storeImpl to proxy
  const descriptors = Object.getOwnPropertyDescriptors(storeImpl)
  Object.defineProperties(proxy, descriptors)

  return proxy as unknown as ArrayStore<T>
}
