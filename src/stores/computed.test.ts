import { describe, it, expect, beforeEach, afterEach, mock } from 'bun:test'
import { computed } from './computed'
import { createSetStore } from './createSetStore'
import { local } from '../adapters'
import { isKStateProxy, getProxySubscribe } from '../core/proxy'

describe('computed', () => {
  const mockStorage: Record<string, string> = {}

  beforeEach(() => {
    Object.keys(mockStorage).forEach(key => delete mockStorage[key])
    globalThis.localStorage = {
      getItem: (key: string) => mockStorage[key] ?? null,
      setItem: (key: string, value: string) => { mockStorage[key] = value },
      removeItem: (key: string) => { delete mockStorage[key] },
      clear: () => Object.keys(mockStorage).forEach(key => delete mockStorage[key]),
      key: (index: number) => Object.keys(mockStorage)[index] ?? null,
      length: 0,
    }
  })

  afterEach(() => {
    delete (globalThis as Record<string, unknown>).localStorage
  })

  describe('single source', () => {
    it('should compute derived value', () => {
      const source = createSetStore<{ id: string; count: number }>(local('source', [{ id: '1', count: 5 }]))
      const doubled = computed(source, items => items[0]?.count * 2)

      expect(doubled.value).toBe(10)
    })

    it('should update when source changes', () => {
      const source = createSetStore<{ id: string; count: number }>(local('source', [{ id: '1', count: 5 }]))
      const doubled = computed(source, items => items[0]?.count * 2)

      source.patch({ id: '1', count: 10 })

      expect(doubled.value).toBe(20)
    })

    it('should be a KState proxy', () => {
      const source = createSetStore<{ id: string; count: number }>(local('source', [{ id: '1', count: 1 }]))
      const derived = computed(source, items => items[0]?.count)

      expect(isKStateProxy(derived)).toBe(true)
    })

    it('should notify subscribers when source changes', () => {
      const source = createSetStore<{ id: string; count: number }>(local('source', [{ id: '1', count: 1 }]))
      const derived = computed(source, items => items[0]?.count * 2)

      const listener = mock(() => {})
      const subscribe = getProxySubscribe(derived)
      subscribe!([], listener)

      source.patch({ id: '1', count: 5 })

      expect(listener).toHaveBeenCalled()
    })
  })

  describe('multiple sources', () => {
    it('should compute from multiple sources', () => {
      const a = createSetStore<{ id: string; value: number }>(local('a', [{ id: '1', value: 10 }]))
      const b = createSetStore<{ id: string; value: number }>(local('b', [{ id: '1', value: 20 }]))

      const sum = computed([a, b], ([aItems, bItems]) => (aItems[0]?.value ?? 0) + (bItems[0]?.value ?? 0))

      expect(sum.value).toBe(30)
    })

    it('should update when any source changes', () => {
      const a = createSetStore<{ id: string; value: number }>(local('a', [{ id: '1', value: 10 }]))
      const b = createSetStore<{ id: string; value: number }>(local('b', [{ id: '1', value: 20 }]))
      const sum = computed([a, b], ([aItems, bItems]) => (aItems[0]?.value ?? 0) + (bItems[0]?.value ?? 0))

      a.patch({ id: '1', value: 100 })
      expect(sum.value).toBe(120)

      b.patch({ id: '1', value: 200 })
      expect(sum.value).toBe(300)
    })
  })

  describe('with array store', () => {
    it('should compute derived values from array', async () => {
      const items = createSetStore<{ id: string; value: number }>(local('items'))
      await items.create({ id: '1', value: 10 })
      await items.create({ id: '2', value: 20 })

      const total = computed(items, arr => arr.reduce((sum, i) => sum + i.value, 0))

      expect(total.value).toBe(30)
    })

    it('should update when array items change', async () => {
      const items = createSetStore<{ id: string; value: number }>(local('items'))
      await items.create({ id: '1', value: 10 })

      const total = computed(items, arr => arr.reduce((sum, i) => sum + i.value, 0))

      await items.create({ id: '2', value: 5 })

      expect(total.value).toBe(15)
    })

    it('should filter arrays', async () => {
      const items = createSetStore<{ id: string; active: boolean }>(local('items'))
      await items.create({ id: '1', active: true })
      await items.create({ id: '2', active: false })
      await items.create({ id: '3', active: true })

      const activeItems = computed(items, arr => arr.filter(i => i.active))

      expect(activeItems.value.length).toBe(2)
    })
  })

  describe('nested computed access', () => {
    it('should access nested computed properties', () => {
      const source = createSetStore<{ id: string; user: { name: string } }>(
        local('source', [{ id: '1', user: { name: 'John' } }])
      )
      const derived = computed(source, items => ({ greeting: `Hello, ${items[0]?.user.name}` }))

      expect(String(derived.greeting)).toBe('Hello, John')
    })
  })

  describe('dispose', () => {
    it('should unsubscribe from sources', () => {
      const source = createSetStore<{ id: string; count: number }>(local('source', [{ id: '1', count: 1 }]))
      const derived = computed(source, items => items[0]?.count * 2)

      const listener = mock(() => {})
      getProxySubscribe(derived)!([], listener)

      derived.dispose()
      source.patch({ id: '1', count: 10 })

      expect(typeof derived.dispose).toBe('function')
    })

    it('should unsubscribe from multiple sources', () => {
      const a = createSetStore<{ id: string; value: number }>(local('a', [{ id: '1', value: 1 }]))
      const b = createSetStore<{ id: string; value: number }>(local('b', [{ id: '1', value: 2 }]))
      const sum = computed([a, b], ([av, bv]) => (av[0]?.value ?? 0) + (bv[0]?.value ?? 0))

      expect(() => sum.dispose()).not.toThrow()
    })
  })
})
