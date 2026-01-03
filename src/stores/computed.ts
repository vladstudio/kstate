import type { ComputedStore } from '../types'
import { createSubscriberManager } from '../core/subscribers'
import { wrapStoreWithProxy, type StoreInternals, isKStateProxy, getProxySubscribe } from '../core/proxy'

interface SourceStore {
  value: unknown
}

export function computed<T, R>(
  source: SourceStore & { value: T },
  selector: (value: T) => R
): ComputedStore<R>

export function computed<T extends unknown[], R>(
  sources: { [K in keyof T]: SourceStore & { value: T[K] } },
  selector: (values: T) => R
): ComputedStore<R>

export function computed<R>(
  sourceOrSources: SourceStore | SourceStore[],
  selector: (value: unknown) => R
): ComputedStore<R> {
  const sources = Array.isArray(sourceOrSources) ? sourceOrSources : [sourceOrSources]
  const subscribers = createSubscriberManager()

  for (const source of sources) {
    if (isKStateProxy(source)) {
      getProxySubscribe(source)?.([], () => subscribers.notify([[]]))
    }
  }

  function getValue(): R {
    if (Array.isArray(sourceOrSources)) {
      const values = sources.map(s => s.value)
      return selector(values)
    } else {
      return selector(sourceOrSources.value)
    }
  }

  const storeImpl = {
    get value(): R {
      return getValue()
    },
  }

  const storeInternals: StoreInternals = {
    getValue,
    subscribers,
  }

  // Create the proxy-wrapped store
  const proxyStore = wrapStoreWithProxy<Record<string, unknown>>(storeInternals)

  // Merge store methods with proxy
  const store = Object.assign(proxyStore, storeImpl) as unknown as ComputedStore<R>

  return store
}
