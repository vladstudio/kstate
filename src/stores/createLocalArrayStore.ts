import type { LocalArrayStoreConfig, LocalArrayStore } from '../types'
import { createSubscriberManager } from '../core/subscribers'
import { wrapStoreWithProxy, type StoreInternals } from '../core/proxy'

export function createLocalArrayStore<T extends { id: string }>(
  key: string,
  config: LocalArrayStoreConfig<T> = {}
): LocalArrayStore<T> {
  function loadFromStorage(): T[] | null {
    if (typeof localStorage === 'undefined') return null
    try {
      const stored = localStorage.getItem(key)
      return stored ? JSON.parse(stored) : null
    } catch {
      return null
    }
  }

  function saveToStorage(value: T[]): void {
    if (typeof localStorage === 'undefined') return
    try {
      localStorage.setItem(key, JSON.stringify(value))
    } catch (error) {
      console.error('KState: Failed to save to localStorage', error)
    }
  }

  // Internal state
  let items: T[] = loadFromStorage() ?? []

  // Subscribers
  const subscribers = createSubscriberManager()

  function findIndex(id: string): number {
    return items.findIndex(item => item.id === id)
  }

  // Cross-tab sync
  if (typeof window !== 'undefined') {
    window.addEventListener('storage', (event) => {
      if (event.key === key && event.newValue !== null) {
        try {
          items = JSON.parse(event.newValue)
          subscribers.notify([[]])
        } catch {
          // Ignore parse errors
        }
      }
    })
  }

  const storeImpl = {
    get value(): T[] {
      return items
    },

    get(): T[] {
      return items
    },

    add(item: T): void {
      items = [...items, item]
      saveToStorage(items)
      subscribers.notify([[items.length - 1]])
      config.onAdd?.(item)
    },

    update(item: T): void {
      const index = findIndex(item.id)
      if (index < 0) throw new Error(`Item with id ${item.id} not found`)

      items = items.map((i, idx) => idx === index ? item : i)
      saveToStorage(items)
      subscribers.notify([[index]])
      config.onUpdate?.(item)
    },

    patch(data: Partial<T> & { id: string }): void {
      const index = findIndex(data.id)
      if (index < 0) throw new Error(`Item with id ${data.id} not found`)

      const updated = { ...items[index], ...data }
      items = items.map((i, idx) => idx === index ? updated : i)
      saveToStorage(items)
      subscribers.notify([[index]])
      config.onPatch?.(updated)
    },

    delete(params: { id: string }): void {
      const index = findIndex(params.id)
      if (index < 0) throw new Error(`Item with id ${params.id} not found`)

      items = items.filter(item => item.id !== params.id)
      saveToStorage(items)
      subscribers.notify([[]])  // All indices shift
      config.onDelete?.(params.id)
    },

    clear(): void {
      items = []
      saveToStorage(items)
      subscribers.notify([[]])
      config.onClear?.()
    },
  }

  const storeInternals: StoreInternals = {
    getValue: () => items,
    subscribers,
  }

  // Create the proxy-wrapped store
  const proxyStore = wrapStoreWithProxy<Record<string | number, unknown>>(storeInternals)

  // Merge store methods with proxy
  const store = Object.assign(proxyStore, storeImpl) as unknown as LocalArrayStore<T>

  return store
}
