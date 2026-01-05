const getStorage = () => typeof localStorage !== 'undefined' ? localStorage : (globalThis as { localStorage?: Storage }).localStorage

export function local<T extends { id: string }>(key: string, defaultValue?: T[]) {
  const load = (): T[] => {
    try {
      const storage = getStorage()
      if (!storage) return defaultValue ?? []
      const raw = storage.getItem(key)
      if (!raw) return defaultValue ?? []
      const parsed = JSON.parse(raw)
      return Array.isArray(parsed) ? parsed : (defaultValue ?? [])
    } catch { return defaultValue ?? [] }
  }
  const save = (data: T[]) => {
    const storage = getStorage()
    if (storage) storage.setItem(key, JSON.stringify(data))
  }

  return {
    get: () => load(),
    getOne: (params: { id: string }) => load().find(i => i.id === params.id)!,
    create: (data: Omit<T, 'id'> | T) => {
      const items = load()
      const item = { ...data, id: (data as T).id ?? crypto.randomUUID() } as T
      items.push(item)
      save(items)
      return item
    },
    patch: (data: Partial<T> & { id: string }) => {
      const items = load()
      const idx = items.findIndex(i => i.id === data.id)
      if (idx >= 0) { items[idx] = { ...items[idx], ...data }; save(items) }
      return items[idx]
    },
    delete: (params: { id: string }) => {
      save(load().filter(i => i.id !== params.id))
    },
    persist: { load, save },
  }
}
