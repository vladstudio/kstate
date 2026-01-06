import type { Path, Listener, SubscriberManager, ProxyContext } from '../types'
import { KSTATE_PROXY, KSTATE_PATH, KSTATE_SUBSCRIBE, KSTATE_GET_DATA } from '../types'

// Store method names that should be retrieved from target, not data
const STORE_METHODS = new Set([
  'get', 'set', 'patch', 'update', 'delete', 'clear', 'dispose',
  'add', 'create', 'getOne', 'subscribeToStatus', 'status', 'meta', 'ids'
])

// Create a proxy wrapper for primitive values that supports subscription
function createPrimitiveProxy(context: ProxyContext<unknown>): unknown {
  const wrapper = {
    [KSTATE_PROXY]: true,
    [KSTATE_PATH]: context.path,
    [KSTATE_SUBSCRIBE]: context.subscribe,
    [KSTATE_GET_DATA]: context.getData,
    valueOf() { return context.getData() },
    toString() { return String(context.getData()) },
    [Symbol.toPrimitive](hint: string) {
      const value = context.getData()
      if (hint === 'number') return Number(value)
      if (hint === 'string') return String(value)
      return value
    },
  }
  return wrapper
}

function createReactiveProxy(context: ProxyContext<unknown>): unknown {
  const handler: ProxyHandler<object> = {
    get(target, prop) {
      // Handle special symbol properties
      if (prop === KSTATE_PROXY) return true
      if (prop === KSTATE_PATH) return context.path
      if (prop === KSTATE_SUBSCRIBE) return context.subscribe
      if (prop === KSTATE_GET_DATA) return context.getData

      // Handle 'value' property - returns the entire data
      if (prop === 'value') {
        return context.getData()
      }

      // Check for store methods on target (not array built-ins)
      if (typeof prop === 'string' && STORE_METHODS.has(prop)) {
        const targetValue = (target as Record<string | symbol, unknown>)[prop]
        if (targetValue !== undefined) {
          return targetValue
        }
      }

      const data = context.getData()

      // When data is null/undefined, return a proxy that allows continued chaining
      // This enables patterns like users[id].address.city to work even when user doesn't exist
      if (data === null || data === undefined) {
        const newPath = [...context.path, prop as string | number]
        const newGetData = () => {
          const d = context.getData()
          if (d === null || d === undefined) return undefined
          return (d as Record<string | symbol, unknown>)[prop]
        }
        return createReactiveProxy({ getData: newGetData, subscribe: context.subscribe, path: newPath })
      }

      // Handle array length property
      if (prop === 'length' && Array.isArray(data)) {
        return data.length
      }

      // Handle Map size property
      if (prop === 'size' && data instanceof Map) {
        return data.size
      }

      // Handle Symbol.iterator for arrays
      if (prop === Symbol.iterator && Array.isArray(data)) {
        return function* () {
          for (let i = 0; i < data.length; i++) {
            const item = data[i]
            // For primitive values, yield directly
            if (item === null || typeof item !== 'object') {
              yield item
            } else {
              // For objects, yield a proxy
              const newPath = [...context.path, i]
              yield createReactiveProxy({
                getData: () => {
                  const d = context.getData()
                  return Array.isArray(d) ? d[i] : undefined
                },
                subscribe: context.subscribe,
                path: newPath,
              })
            }
          }
        }
      }

      // Handle Symbol.iterator for Maps (yield [key, proxy] entries)
      if (prop === Symbol.iterator && data instanceof Map) {
        return function* () {
          for (const [key, item] of data) {
            if (item === null || typeof item !== 'object') {
              yield [key, item]
            } else {
              const newPath = [...context.path, key]
              yield [key, createReactiveProxy({
                getData: () => {
                  const d = context.getData()
                  return d instanceof Map ? d.get(key) : undefined
                },
                subscribe: context.subscribe,
                path: newPath,
              })]
            }
          }
        }
      }

      // Handle array methods
      if (Array.isArray(data) && typeof prop === 'string') {
        const arrayMethods = ['map', 'filter', 'find', 'findIndex', 'some', 'every', 'forEach', 'reduce', 'indexOf', 'includes']
        if (arrayMethods.includes(prop)) {
          const method = (data as unknown as Record<string, unknown>)[prop]
          if (typeof method === 'function') {
            return method.bind(data)
          }
        }
      }

      // Handle Map string key access: store['abc123'] → Map.get('abc123')
      if (data instanceof Map && typeof prop === 'string') {
        const value = data.get(prop)
        const newPath = [...context.path, prop]
        const newGetData = () => {
          const d = context.getData()
          return d instanceof Map ? d.get(prop) : undefined
        }
        // Return reactive proxy for objects OR undefined/null (to allow chaining like users[id].address.city)
        if (value === undefined || value === null || typeof value === 'object') {
          return createReactiveProxy({ getData: newGetData, subscribe: context.subscribe, path: newPath })
        }
        // Only primitives (string, number, boolean) get primitive proxy
        return createPrimitiveProxy({ getData: newGetData, subscribe: context.subscribe, path: newPath })
      }

      const value = (data as Record<string | symbol, unknown>)[prop]
      const pathKey = typeof prop === 'string' && /^\d+$/.test(prop) ? Number(prop) : prop
      const newPath = [...context.path, pathKey as string | number]
      const newGetData = () => {
        const d = context.getData()
        if (d === null || d === undefined) return undefined
        return (d as Record<string | symbol, unknown>)[prop]
      }

      // For primitive values, return a subscribable primitive wrapper
      if (value === null || typeof value !== 'object') {
        return createPrimitiveProxy({
          getData: newGetData,
          subscribe: context.subscribe,
          path: newPath,
        })
      }

      // For objects/arrays, return nested proxy
      return createReactiveProxy({
        getData: newGetData,
        subscribe: context.subscribe,
        path: newPath,
      })
    },
  }

  const data = context.getData()
  const target = (Array.isArray(data) ? [] : data instanceof Map ? new Map() : {}) as object
  return new Proxy(target, handler)
}

export interface StoreInternals {
  getValue: () => unknown
  subscribers: SubscriberManager
}

export function wrapStoreWithProxy<T>(store: StoreInternals): T {
  return createReactiveProxy({
    getData: store.getValue,
    subscribe: (path, listener) => store.subscribers.subscribe(path, listener),
    path: [],
  }) as T
}

export function isKStateProxy(value: unknown): boolean {
  return typeof value === 'object' && value !== null && (value as Record<symbol, unknown>)[KSTATE_PROXY] === true
}

export function getProxyPath(proxy: unknown): Path {
  if (!isKStateProxy(proxy)) return []
  return (proxy as Record<symbol, unknown>)[KSTATE_PATH] as Path
}

export function getProxySubscribe(proxy: unknown): ((path: Path, listener: Listener) => () => void) | null {
  if (!isKStateProxy(proxy)) return null
  return (proxy as Record<symbol, unknown>)[KSTATE_SUBSCRIBE] as (path: Path, listener: Listener) => () => void
}

export function getProxyGetData(proxy: unknown): (() => unknown) | null {
  if (!isKStateProxy(proxy)) return null
  return (proxy as Record<symbol, unknown>)[KSTATE_GET_DATA] as () => unknown
}
