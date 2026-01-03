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
  const sources = Array.isArray(sourceOrSources) ? sourceOrSources : [sourceOrSources]
  const subscribers = createSubscriberManager()
  const unsubscribes: (() => void)[] = []

  for (const source of sources) {
    if (isKStateProxy(source)) {
      const unsub = getProxySubscribe(source)?.([], () => subscribers.notify([[]]))
      if (unsub) unsubscribes.push(unsub)
    }
  }

  const getValue = (): R => Array.isArray(sourceOrSources)
    ? selector(sources.map(s => s.value))
    : selector(sourceOrSources.value)

  const storeImpl = {
    get value(): R { return getValue() },
    dispose(): void { unsubscribes.forEach(fn => fn()) },
  }

  const storeInternals: StoreInternals = { getValue, subscribers }
  return Object.assign(wrapStoreWithProxy<Record<string, unknown>>(storeInternals), storeImpl) as unknown as ComputedStore<R> & { dispose: () => void }
}
