import type { Path, Listener, SubscriberManager, ProxyContext } from '../types'
import { KSTATE_PROXY, KSTATE_PATH, KSTATE_SUBSCRIBE, KSTATE_GET_DATA } from '../types'

const STORE_METHODS = new Set(['get', 'set', 'patch', 'update', 'delete', 'clear', 'dispose', 'add', 'create', 'getOne', 'upsert', 'subscribeToStatus', 'status', 'meta', 'ids'])
const ARRAY_METHODS = new Set(['map', 'filter', 'find', 'findIndex', 'some', 'every', 'forEach', 'reduce', 'indexOf', 'includes'])

const isNumeric = (s: string) => s.length > 0 && s.charCodeAt(0) >= 48 && s.charCodeAt(0) <= 57 && Number(s) == (s as unknown)

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

function createNestedProxy(ctx: ProxyContext<unknown>, prop: string | number, getter: () => unknown, value: unknown): unknown {
  const path = ctx.path.length === 0 ? [prop] : ctx.path.concat(prop)
  const newCtx = { getData: getter, subscribe: ctx.subscribe, path }
  return (value === null || typeof value !== 'object') ? createPrimitiveProxy(newCtx) : createReactiveProxy(newCtx)
}

function* iterateArray(ctx: ProxyContext<unknown>, data: unknown[]) {
  for (let i = 0; i < data.length; i++) {
    const item = data[i]
    if (item === null || typeof item !== 'object') { yield item; continue }
    const path = ctx.path.length === 0 ? [i] : ctx.path.concat(i)
    yield createReactiveProxy({ getData: () => (ctx.getData() as unknown[])?.[i], subscribe: ctx.subscribe, path })
  }
}

function* iterateMap(ctx: ProxyContext<unknown>, data: Map<unknown, unknown>) {
  for (const [key, item] of data) {
    if (item === null || typeof item !== 'object') { yield [key, item]; continue }
    const path = ctx.path.length === 0 ? [key as string] : ctx.path.concat(key as string)
    yield [key, createReactiveProxy({ getData: () => (ctx.getData() as Map<unknown, unknown>)?.get(key), subscribe: ctx.subscribe, path })]
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

      if (data == null) {
        const path = ctx.path.length === 0 ? [prop as string] : ctx.path.concat(prop as string)
        return createReactiveProxy({
          getData: () => { const d = ctx.getData(); return d == null ? undefined : (d as Record<string | symbol, unknown>)[prop] },
          subscribe: ctx.subscribe, path,
        })
      }

      if (prop === 'length' && Array.isArray(data)) return data.length
      if (prop === 'size' && data instanceof Map) return data.size

      if (prop === Symbol.iterator) {
        if (Array.isArray(data)) return function* () { yield* iterateArray(ctx, data) }
        if (data instanceof Map) return function* () { yield* iterateMap(ctx, data) }
      }

      if (Array.isArray(data) && typeof prop === 'string' && ARRAY_METHODS.has(prop)) {
        const m = (data as unknown as Record<string, unknown>)[prop]
        if (typeof m === 'function') return m.bind(data)
      }

      if (data instanceof Map && typeof prop === 'string') {
        const value = data.get(prop)
        return createNestedProxy(ctx, prop, () => (ctx.getData() as Map<string, unknown>)?.get(prop), value)
      }

      const pathKey = typeof prop === 'string' && isNumeric(prop) ? Number(prop) : prop as string
      const value = (data as Record<string | symbol, unknown>)[prop]
      return createNestedProxy(ctx, pathKey, () => {
        const d = ctx.getData()
        return d == null ? undefined : (d as Record<string | symbol, unknown>)[prop]
      }, value)
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
  return (proxy as Record<symbol, Path>)[KSTATE_PATH] ?? []
}

export function getProxySubscribe(proxy: unknown): ((path: Path, listener: Listener) => () => void) | null {
  if (proxy == null) return null
  return (proxy as Record<symbol, (path: Path, listener: Listener) => () => void>)[KSTATE_SUBSCRIBE] ?? null
}

export function getProxyGetData(proxy: unknown): (() => unknown) | null {
  if (proxy == null) return null
  return (proxy as Record<symbol, () => unknown>)[KSTATE_GET_DATA] ?? null
}
