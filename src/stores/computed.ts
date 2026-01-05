import type { ComputedStore } from '../types'
import { createSubscriberManager } from '../core/subscribers'
import { wrapStoreWithProxy, type StoreInternals, isKStateProxy, getProxySubscribe } from '../core/proxy'

interface SourceStore { value: unknown }

// Unwrap Map to array for SetStore, else pass through
type UnwrapValue<T> = T extends Map<string, infer U> ? U[] : T

// Single source - Map<string, T> unwraps to T[]
export function computed<T, R>(
  source: { value: T },
  selector: (value: UnwrapValue<T>) => R
): ComputedStore<R>

// Multiple sources (values array - Maps unwrapped)
export function computed<R>(
  sources: { value: unknown }[],
  selector: (values: unknown[]) => R
): ComputedStore<R>

// Implementation
export function computed<R>(
  sourceOrSources: { value: unknown } | { value: unknown }[],
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  selector: (value: any) => R
): ComputedStore<R> {
  const isSingleSource = isKStateProxy(sourceOrSources) || !Array.isArray(sourceOrSources)
  const sources: SourceStore[] = isSingleSource ? [sourceOrSources as SourceStore] : sourceOrSources as SourceStore[]
  const unsubscribes: (() => void)[] = []
  let cachedValue: R | undefined
  let cacheValid = false

  const subscribers = createSubscriberManager()

  for (const source of sources) {
    if (isKStateProxy(source)) {
      const unsub = getProxySubscribe(source)?.([], () => {
        cacheValid = false
        subscribers.notify([[]])
      })
      if (unsub) unsubscribes.push(unsub)
    }
  }

  const getValue = (): R => {
    if (cacheValid) return cachedValue!
    const unwrap = (v: unknown) => v instanceof Map ? [...v.values()] : v
    cachedValue = isSingleSource
      ? selector(unwrap((sourceOrSources as SourceStore).value))
      : selector(sources.map(s => unwrap(s.value)))
    cacheValid = true
    return cachedValue
  }

  const storeImpl = {
    get value(): R { return getValue() },
    dispose(): void { unsubscribes.forEach(fn => fn()) },
  }

  const storeInternals: StoreInternals = { getValue, subscribers }
  const proxy = wrapStoreWithProxy<Record<string, unknown>>(storeInternals)
  Object.defineProperties(proxy, Object.getOwnPropertyDescriptors(storeImpl))
  return proxy as unknown as ComputedStore<R>
}
