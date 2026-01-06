import type { Path, Listener, SubscriberManager, ProxyContext } from '../types'
import { KSTATE_PROXY, KSTATE_PATH, KSTATE_SUBSCRIBE, KSTATE_GET_DATA } from '../types'

const STORE_METHODS = new Set(['get', 'set', 'patch', 'update', 'delete', 'clear', 'dispose', 'add', 'create', 'getOne', 'subscribeToStatus', 'status', 'meta', 'ids'])
const ARRAY_METHODS = new Set(['map', 'filter', 'find', 'findIndex', 'some', 'every', 'forEach', 'reduce', 'indexOf', 'includes'])

function createPrimitiveProxy(ctx: ProxyContext<unknown>): unknown {
  return {
    [KSTATE_PROXY]: true, [KSTATE_PATH]: ctx.path, [KSTATE_SUBSCRIBE]: ctx.subscribe, [KSTATE_GET_DATA]: ctx.getData,
    valueOf() { return ctx.getData() },
    toString() { return String(ctx.getData()) },
    [Symbol.toPrimitive](hint: string) {
      const v = ctx.getData()
      return hint === 'number' ? Number(v) : hint === 'string' ? String(v) : v
    },
  }
}

function createNestedProxy(ctx: ProxyContext<unknown>, prop: string | symbol, getter: () => unknown): unknown {
  const newCtx = { getData: getter, subscribe: ctx.subscribe, path: [...ctx.path, prop as string | number] }
  const value = getter()
  return (value === null || typeof value !== 'object') ? createPrimitiveProxy(newCtx) : createReactiveProxy(newCtx)
}

function* iterateWithProxies<K>(ctx: ProxyContext<unknown>, entries: Iterable<[K, unknown]>, getItem: (k: K) => unknown, isMap: boolean) {
  for (const [key, item] of entries) {
    if (item === null || typeof item !== 'object') { yield isMap ? [key, item] : item; continue }
    const proxy = createReactiveProxy({ getData: () => getItem(key), subscribe: ctx.subscribe, path: [...ctx.path, key as string | number] })
    yield isMap ? [key, proxy] : proxy
  }
}

function createReactiveProxy(ctx: ProxyContext<unknown>): unknown {
  const handler: ProxyHandler<object> = {
    get(target, prop) {
      if (prop === KSTATE_PROXY) return true
      if (prop === KSTATE_PATH) return ctx.path
      if (prop === KSTATE_SUBSCRIBE) return ctx.subscribe
      if (prop === KSTATE_GET_DATA) return ctx.getData
      if (prop === 'value') return ctx.getData()

      if (typeof prop === 'string' && STORE_METHODS.has(prop)) {
        const v = (target as Record<string, unknown>)[prop]
        if (v !== undefined) return v
      }

      const data = ctx.getData()

      if (data === null || data === undefined) {
        return createReactiveProxy({
          getData: () => { const d = ctx.getData(); return d == null ? undefined : (d as Record<string | symbol, unknown>)[prop] },
          subscribe: ctx.subscribe,
          path: [...ctx.path, prop as string | number],
        })
      }

      if (prop === 'length' && Array.isArray(data)) return data.length
      if (prop === 'size' && data instanceof Map) return data.size

      if (prop === Symbol.iterator) {
        if (Array.isArray(data)) return function* () { yield* iterateWithProxies(ctx, data.map((v, i) => [i, v]), i => (ctx.getData() as unknown[])?.[i as number], false) }
        if (data instanceof Map) return function* () { yield* iterateWithProxies(ctx, data, k => (ctx.getData() as Map<unknown, unknown>)?.get(k), true) }
      }

      if (Array.isArray(data) && typeof prop === 'string' && ARRAY_METHODS.has(prop)) {
        const m = (data as unknown as Record<string, unknown>)[prop]
        if (typeof m === 'function') return m.bind(data)
      }

      if (data instanceof Map && typeof prop === 'string') {
        return createNestedProxy(ctx, prop, () => (ctx.getData() as Map<string, unknown>)?.get(prop))
      }

      const pathKey = typeof prop === 'string' && /^\d+$/.test(prop) ? Number(prop) : prop
      return createNestedProxy(ctx, pathKey as string, () => {
        const d = ctx.getData()
        return d == null ? undefined : (d as Record<string | symbol, unknown>)[prop]
      })
    },
  }
  const data = ctx.getData()
  return new Proxy((Array.isArray(data) ? [] : data instanceof Map ? new Map() : {}) as object, handler)
}

export interface StoreInternals { getValue: () => unknown; subscribers: SubscriberManager }

export function wrapStoreWithProxy<T>(store: StoreInternals): T {
  return createReactiveProxy({ getData: store.getValue, subscribe: (path, listener) => store.subscribers.subscribe(path, listener), path: [] }) as T
}

export function isKStateProxy(value: unknown): boolean {
  return typeof value === 'object' && value !== null && (value as Record<symbol, unknown>)[KSTATE_PROXY] === true
}

export function getProxyPath(proxy: unknown): Path {
  return isKStateProxy(proxy) ? (proxy as Record<symbol, Path>)[KSTATE_PATH] : []
}

export function getProxySubscribe(proxy: unknown): ((path: Path, listener: Listener) => () => void) | null {
  return isKStateProxy(proxy) ? (proxy as Record<symbol, (path: Path, listener: Listener) => () => void>)[KSTATE_SUBSCRIBE] : null
}

export function getProxyGetData(proxy: unknown): (() => unknown) | null {
  return isKStateProxy(proxy) ? (proxy as Record<symbol, () => unknown>)[KSTATE_GET_DATA] : null
}
