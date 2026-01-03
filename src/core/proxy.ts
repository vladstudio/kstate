import type { Path, Listener, SubscriberManager } from '../types'
import { KSTATE_PROXY, KSTATE_PATH, KSTATE_SUBSCRIBE, KSTATE_GET_DATA } from '../types'

interface ProxyContext {
  getData: () => unknown
  subscribe: (path: Path, listener: Listener) => () => void
  path: Path
}

function createReactiveProxy(context: ProxyContext): unknown {
  const handler: ProxyHandler<object> = {
    get(_target, prop) {
      // Handle special symbol properties
      if (prop === KSTATE_PROXY) return true
      if (prop === KSTATE_PATH) return context.path
      if (prop === KSTATE_SUBSCRIBE) return context.subscribe
      if (prop === KSTATE_GET_DATA) return context.getData

      const data = context.getData()
      if (data === null || data === undefined) {
        return undefined
      }

      // Handle array length property
      if (prop === 'length' && Array.isArray(data)) {
        return data.length
      }

      // Handle Symbol.iterator for arrays
      if (prop === Symbol.iterator && Array.isArray(data)) {
        return function* () {
          for (let i = 0; i < data.length; i++) {
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

      const value = (data as Record<string | symbol, unknown>)[prop]

      // For primitive values, return as-is
      if (value === null || typeof value !== 'object') {
        return value
      }

      // For objects/arrays, return nested proxy
      const newPath = [...context.path, prop as string | number]
      return createReactiveProxy({
        getData: () => {
          const d = context.getData()
          if (d === null || d === undefined) return undefined
          return (d as Record<string | symbol, unknown>)[prop]
        },
        subscribe: context.subscribe,
        path: newPath,
      })
    },
  }

  const data = context.getData()
  const target = (Array.isArray(data) ? [] : {}) as object
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
