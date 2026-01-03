import type { LocalStoreConfig, LocalStore } from '../types'
import { createSubscriberManager } from '../core/subscribers'
import { wrapStoreWithProxy, type StoreInternals } from '../core/proxy'
import { loadFromStorage, saveToStorage } from '../sync/localStorage'

export function createLocalStore<T>(
  key: string,
  defaultValue: T,
  config: LocalStoreConfig<T> = {}
): LocalStore<T> & { dispose: () => void } {
  let data: T = loadFromStorage<T>(key) ?? defaultValue
  const subscribers = createSubscriberManager()

  const onStorage = (event: StorageEvent) => {
    if (event.key === key && event.newValue !== null) {
      try {
        data = JSON.parse(event.newValue)
        subscribers.notify([[]])
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
  return Object.assign(wrapStoreWithProxy<Record<string, unknown>>(storeInternals), storeImpl) as unknown as LocalStore<T> & { dispose: () => void }
}
