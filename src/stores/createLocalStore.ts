import type { LocalStoreConfig, LocalStore } from '../types'
import { createSubscriberManager } from '../core/subscribers'
import { wrapStoreWithProxy, type StoreInternals } from '../core/proxy'

export function createLocalStore<T>(
  key: string,
  defaultValue: T,
  config: LocalStoreConfig<T> = {}
): LocalStore<T> {
  function loadFromStorage(): T | null {
    if (typeof localStorage === 'undefined') return null
    try {
      const stored = localStorage.getItem(key)
      return stored ? JSON.parse(stored) : null
    } catch {
      return null
    }
  }

  function saveToStorage(value: T): void {
    if (typeof localStorage === 'undefined') return
    try {
      localStorage.setItem(key, JSON.stringify(value))
    } catch (error) {
      console.error('KState: Failed to save to localStorage', error)
    }
  }

  // Internal state
  let data: T = loadFromStorage() ?? defaultValue

  // Subscribers
  const subscribers = createSubscriberManager()

  // Cross-tab sync
  if (typeof window !== 'undefined') {
    window.addEventListener('storage', (event) => {
      if (event.key === key && event.newValue !== null) {
        try {
          data = JSON.parse(event.newValue)
          subscribers.notify([[]])
        } catch {
          // Ignore parse errors
        }
      }
    })
  }

  const storeImpl = {
    get value(): T {
      return data
    },

    get(): T {
      return data
    },

    set(newData: T): void {
      data = newData
      saveToStorage(data)
      subscribers.notify([[]])
      config.onSet?.(data)
    },

    patch(partial: Partial<T>): void {
      data = { ...data, ...partial }
      saveToStorage(data)
      subscribers.notify([[]])
      config.onPatch?.(data)
    },

    clear(): void {
      data = defaultValue
      saveToStorage(data)
      subscribers.notify([[]])
      config.onClear?.()
    },
  }

  const storeInternals: StoreInternals = {
    getValue: () => data,
    subscribers,
  }

  // Create the proxy-wrapped store
  const proxyStore = wrapStoreWithProxy<Record<string, unknown>>(storeInternals)

  // Merge store methods with proxy
  const store = Object.assign(proxyStore, storeImpl) as unknown as LocalStore<T>

  return store
}
