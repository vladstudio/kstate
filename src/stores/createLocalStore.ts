import type { LocalStoreConfig, LocalStore } from '../types'
import { createSubscriberManager } from '../core/subscribers'
import { wrapStoreWithProxy, type StoreInternals } from '../core/proxy'
import { loadFromStorage, saveToStorage } from '../sync/localStorage'

export function createLocalStore<T>(
  key: string,
  defaultValue: T,
  config: LocalStoreConfig<T> = {}
): LocalStore<T> {
  let data: T = loadFromStorage<T>(key) ?? defaultValue
  const subscribers = createSubscriberManager()

  const onStorage = (event: StorageEvent) => {
    if (event.key === key && event.newValue !== null) {
      try {
        const parsed = JSON.parse(event.newValue)
        if (parsed !== null && typeof parsed === 'object') {
          data = parsed
          subscribers.notify([[]])
        }
      } catch { /* ignore */ }
    }
  }

  if (typeof window !== 'undefined') {
    window.addEventListener('storage', onStorage)
  }

  const storeImpl = {
    get value(): T { return data },
    get(): T { return data },
    set(newData: T): void {
      data = newData
      saveToStorage(key, data)
      subscribers.notify([[]])
      config.onSet?.(data)
    },
    patch(partial: Partial<T>): void {
      data = { ...data, ...partial }
      saveToStorage(key, data)
      subscribers.notify([[]])
      config.onPatch?.(data)
    },
    clear(): void {
      data = defaultValue
      saveToStorage(key, data)
      subscribers.notify([[]])
      config.onClear?.()
    },
    dispose(): void {
      if (typeof window !== 'undefined') {
        window.removeEventListener('storage', onStorage)
      }
    },
  }

  const storeInternals: StoreInternals = { getValue: () => data, subscribers }
  const proxy = wrapStoreWithProxy<Record<string, unknown>>(storeInternals)
  const descriptors = Object.getOwnPropertyDescriptors(storeImpl)
  Object.defineProperties(proxy, descriptors)
  return proxy as unknown as LocalStore<T>
}
