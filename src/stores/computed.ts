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
  const isSingleSource = isKStateProxy(sourceOrSources) || !Array.isArray(sourceOrSources)
  const sources: SourceStore[] = isSingleSource ? [sourceOrSources as SourceStore] : sourceOrSources as SourceStore[]
  const unsubscribes: (() => void)[] = []
  let cachedValue: R | undefined
  let cacheValid = false

  // Lazy subscription: only subscribe to sources when computed has subscribers
  const subscribeToSources = () => {
    if (unsubscribes.length > 0) return
    for (const source of sources) {
      if (isKStateProxy(source)) {
        const unsub = getProxySubscribe(source)?.([], () => {
          cacheValid = false
          subscribers.notify([[]])
        })
        if (unsub) unsubscribes.push(unsub)
      }
    }
  }
  const subscribers = createSubscriberManager(subscribeToSources)

  const getValue = (): R => {
    if (cacheValid) return cachedValue!
    cachedValue = isSingleSource
      ? selector((sourceOrSources as SourceStore).value)
      : selector(sources.map(s => s.value))
    cacheValid = true
    return cachedValue
  }

  const storeImpl = {
    get value(): R { return getValue() },
    dispose(): void { unsubscribes.forEach(fn => fn()) },
  }

  const storeInternals: StoreInternals = { getValue, subscribers }
  const proxy = wrapStoreWithProxy<Record<string, unknown>>(storeInternals)
  const descriptors = Object.getOwnPropertyDescriptors(storeImpl)
  Object.defineProperties(proxy, descriptors)
  return proxy as unknown as ComputedStore<R> & { dispose: () => void }
}
