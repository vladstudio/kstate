import type { StoreConfig, Store, Operation, ErrorMeta } from '../types'
import { createSubscriberManager } from '../core/subscribers'
import { createNetworkManager } from '../core/network'
import { wrapStoreWithProxy } from '../core/proxy'
import { apiFetch } from '../sync/api'
import { getConfig } from '../config'

export function createStore<T extends { id: string }>(config: StoreConfig<T> = {}): Store<T> {
  let data: T | null = null
  let lastFetchParams: string | null = null
  let fetchPromise: Promise<T> | null = null

  const ttl = config.ttl ?? 60000
  const reloadOnMount = config.reloadOnMount ?? false

  const doReload = () => { if (lastFetchParams !== null) storeImpl.get(JSON.parse(lastFetchParams)) }

  const network = createNetworkManager({
    reloadOnFocus: config.reloadOnFocus ?? false,
    reloadOnReconnect: config.reloadOnReconnect ?? true,
    reloadInterval: config.reloadInterval ?? 0,
    onReload: doReload,
  })

  const subscribers = createSubscriberManager(reloadOnMount ? () => storeImpl.get() : undefined)

  function handleError(error: Error, operation: Operation, params: Record<string, string | number>, rollbackData: T | null): void {
    const meta: ErrorMeta = { operation, endpoint: config.endpoints?.[operation as keyof typeof config.endpoints] ?? '', params, rollbackData }
    config.onError?.(error, meta)
    getConfig().onError?.(error, operation, meta)
  }

  const storeImpl = {
    get value() { return data },
    get status() { return network.getStatus() },
    subscribeToStatus: network.subscribeToStatus,
    dispose: network.dispose,

    async get(params: Record<string, string | number> = {}): Promise<T> {
      const endpoint = config.endpoints?.get
      if (!endpoint) throw new Error('No get endpoint configured')

      const force = '_force' in params
      const cleanParams = { ...params }
      delete cleanParams._force
      const paramsKey = JSON.stringify(cleanParams)

      const now = Date.now()
      const isFresh = lastFetchParams === paramsKey && now - network.getStatus().lastUpdated < ttl

      if (isFresh && !force && data !== null) {
        if (now - network.getStatus().lastUpdated > ttl / 2) fetchInBackground(endpoint, cleanParams)
        return data
      }

      if (fetchPromise && lastFetchParams === paramsKey) return fetchPromise

      lastFetchParams = paramsKey
      network.setStatus({ isLoading: data === null, isRevalidating: data !== null })

      fetchPromise = (async () => {
        try {
          const result = await apiFetch<T>({ method: 'GET', endpoint, params: cleanParams, dataKey: config.dataKey })
          data = result.data
          network.setStatus({ isLoading: false, isRevalidating: false, error: null, lastUpdated: Date.now() })
          subscribers.notify([[]])
          config.onGet?.(result.data, result.meta)
          return data
        } catch (error) {
          network.setStatus({ isLoading: false, isRevalidating: false, error: error as Error })
          handleError(error as Error, 'get', cleanParams, null)
          throw error
        } finally { fetchPromise = null }
      })()

      return fetchPromise
    },

    async update(newData: T): Promise<T> {
      const endpoint = config.endpoints?.update
      if (!endpoint) throw new Error('No update endpoint configured')

      const previousData = data
      data = newData
      subscribers.notify([[]])

      try {
        const result = await apiFetch<T>({ method: 'PUT', endpoint, params: { id: newData.id }, body: newData, dataKey: config.dataKey, requestKey: config.requestKey })
        data = result.data
        network.setStatus({ lastUpdated: Date.now(), error: null })
        subscribers.notify([[]])
        config.onUpdate?.(result.data, result.meta)
        return data
      } catch (error) {
        data = previousData
        subscribers.notify([[]])
        handleError(error as Error, 'update', { id: newData.id }, previousData)
        throw error
      }
    },

    async patch(partialData: Partial<T> & { id: string }): Promise<T> {
      const endpoint = config.endpoints?.patch
      if (!endpoint) throw new Error('No patch endpoint configured')
      if (!data) throw new Error('No data to patch')

      const previousData = data
      data = { ...data, ...partialData }
      subscribers.notify([[]])

      try {
        const result = await apiFetch<T>({ method: 'PATCH', endpoint, params: { id: partialData.id }, body: partialData, dataKey: config.dataKey, requestKey: config.requestKey })
        data = result.data
        network.setStatus({ lastUpdated: Date.now(), error: null })
        subscribers.notify([[]])
        config.onPatch?.(result.data, result.meta)
        return data
      } catch (error) {
        data = previousData
        subscribers.notify([[]])
        handleError(error as Error, 'patch', { id: partialData.id }, previousData)
        throw error
      }
    },

    async delete(params: { id: string }): Promise<void> {
      const endpoint = config.endpoints?.delete
      if (!endpoint) throw new Error('No delete endpoint configured')

      const previousData = data
      data = null
      subscribers.notify([[]])

      try {
        const result = await apiFetch<void>({ method: 'DELETE', endpoint, params })
        network.setStatus({ lastUpdated: Date.now(), error: null })
        config.onDelete?.(result.meta)
      } catch (error) {
        data = previousData
        subscribers.notify([[]])
        handleError(error as Error, 'delete', params, previousData)
        throw error
      }
    },

    clear(): void {
      data = null
      lastFetchParams = null
      network.setStatus({ isLoading: false, isRevalidating: false, error: null, lastUpdated: 0 })
      subscribers.notify([[]])
    },
  }

  async function fetchInBackground(endpoint: string, params: Record<string, string | number>): Promise<void> {
    network.setStatus({ isRevalidating: true })
    try {
      const result = await apiFetch<T>({ method: 'GET', endpoint, params, dataKey: config.dataKey })
      data = result.data
      network.setStatus({ isRevalidating: false, error: null, lastUpdated: Date.now() })
      subscribers.notify([[]])
      config.onGet?.(result.data, result.meta)
    } catch (error) {
      network.setStatus({ isRevalidating: false, error: error as Error })
      handleError(error as Error, 'get', params, null)
    }
  }

  const proxy = wrapStoreWithProxy<Record<string, unknown>>({ getValue: () => data, subscribers })

  // Copy all properties including getters from storeImpl to proxy
  const descriptors = Object.getOwnPropertyDescriptors(storeImpl)
  Object.defineProperties(proxy, descriptors)

  return proxy as unknown as Store<T>
}
