import type { ComputedStore } from '../types'
import { createSubscriberManager } from '../core/subscribers'
import { wrapStoreWithProxy, type StoreInternals, isKStateProxy, getProxySubscribe } from '../core/proxy'

interface SourceStore { value: unknown }

export function computed<T, R>(
  source: SourceStore & { value: T },
  selector: (value: T) => R
): ComputedStore<R> & { dispose: () => void }

export function computed<T extends unknown[], R>(
  sources: { [K in keyof T]: SourceStore & { value: T[K] } },
  selector: (values: T) => R
): ComputedStore<R> & { dispose: () => void }

export function computed<R>(
  sourceOrSources: SourceStore | SourceStore[],
  selector: (value: unknown) => R
): ComputedStore<R> & { dispose: () => void } {
  // Check if it's a single store (KState proxy) or array of stores
  // Array.isArray would be true for array store proxies, so check for proxy first
  const isSingleSource = isKStateProxy(sourceOrSources) || !Array.isArray(sourceOrSources)
  const sources = isSingleSource ? [sourceOrSources] : sourceOrSources as SourceStore[]
  const subscribers = createSubscriberManager()
  const unsubscribes: (() => void)[] = []

  for (const source of sources) {
    if (isKStateProxy(source)) {
      const unsub = getProxySubscribe(source)?.([], () => subscribers.notify([[]]))
      if (unsub) unsubscribes.push(unsub)
    }
  }

  const getValue = (): R => isSingleSource
    ? selector(sourceOrSources.value)
    : selector(sources.map(s => s.value))

  const storeImpl = {
    get value(): R { return getValue() },
    dispose(): void { unsubscribes.forEach(fn => fn()) },
  }

  const storeInternals: StoreInternals = { getValue, subscribers }
  return Object.assign(wrapStoreWithProxy<Record<string, unknown>>(storeInternals), storeImpl) as unknown as ComputedStore<R> & { dispose: () => void }
}
