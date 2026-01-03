import type { LocalArrayStoreConfig, LocalArrayStore } from '../types'
import { createSubscriberManager } from '../core/subscribers'
import { wrapStoreWithProxy, type StoreInternals } from '../core/proxy'
import { loadFromStorage, saveToStorage } from '../sync/localStorage'

export function createLocalArrayStore<T extends { id: string }>(
  key: string,
  config: LocalArrayStoreConfig<T> = {}
): LocalArrayStore<T> & { dispose: () => void } {
  let items: T[] = loadFromStorage<T[]>(key) ?? []
  const subscribers = createSubscriberManager()
  const findIndex = (id: string) => items.findIndex(item => item.id === id)

  const onStorage = (event: StorageEvent) => {
    if (event.key === key && event.newValue !== null) {
      try {
        items = JSON.parse(event.newValue)
        subscribers.notify([[]])
      } catch { /* ignore */ }
    }
  }

  if (typeof window !== 'undefined') {
    window.addEventListener('storage', onStorage)
  }

  const storeImpl = {
    get value(): T[] { return items },
    get(): T[] { return items },
    add(item: T): void {
      items = [...items, item]
      saveToStorage(key, items)
      subscribers.notify([[items.length - 1]])
      config.onAdd?.(item)
    },
    update(item: T): void {
      const index = findIndex(item.id)
      if (index < 0) throw new Error(`Item with id ${item.id} not found`)
      items = items.map((i, idx) => idx === index ? item : i)
      saveToStorage(key, items)
      subscribers.notify([[index]])
      config.onUpdate?.(item)
    },
    patch(data: Partial<T> & { id: string }): void {
      const index = findIndex(data.id)
      if (index < 0) throw new Error(`Item with id ${data.id} not found`)
      const updated = { ...items[index], ...data }
      items = items.map((i, idx) => idx === index ? updated : i)
      saveToStorage(key, items)
      subscribers.notify([[index]])
      config.onPatch?.(updated)
    },
    delete(params: { id: string }): void {
      const index = findIndex(params.id)
      if (index < 0) throw new Error(`Item with id ${params.id} not found`)
      items = items.filter(item => item.id !== params.id)
      saveToStorage(key, items)
      subscribers.notify([[]])
      config.onDelete?.(params.id)
    },
    clear(): void {
      items = []
      saveToStorage(key, items)
      subscribers.notify([[]])
      config.onClear?.()
    },
    dispose(): void {
      if (typeof window !== 'undefined') {
        window.removeEventListener('storage', onStorage)
      }
    },
  }

  const storeInternals: StoreInternals = { getValue: () => items, subscribers }
  const proxy = wrapStoreWithProxy<Record<string | number, unknown>>(storeInternals)
  const descriptors = Object.getOwnPropertyDescriptors(storeImpl)
  Object.defineProperties(proxy, descriptors)
  return proxy as unknown as LocalArrayStore<T> & { dispose: () => void }
}
