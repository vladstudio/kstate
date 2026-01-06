const getStorage = () => typeof localStorage !== 'undefined' ? localStorage : null

export function local<T extends { id: string }>(key: string, defaultValue?: T[]) {
  const parse = (raw: string | null): T[] => {
    if (!raw) return defaultValue ?? []
    try { const p = JSON.parse(raw); return Array.isArray(p) ? p : (defaultValue ?? []) } catch { return defaultValue ?? [] }
  }
  const load = (): T[] => parse(getStorage()?.getItem(key) ?? null)
  const save = (data: T[]) => getStorage()?.setItem(key, JSON.stringify(data))

  return {
    get: () => load(),
    getOne: (params: { id: string }) => {
      const item = load().find(i => i.id === params.id)
      if (!item) throw new Error(`Item ${params.id} not found`)
      return item
    },
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
      if (idx < 0) throw new Error(`Item ${data.id} not found`)
      items[idx] = { ...items[idx], ...data }
      save(items)
      return items[idx]
    },
    delete: (params: { id: string }) => save(load().filter(i => i.id !== params.id)),
    persist: { load, save },
  }
}
