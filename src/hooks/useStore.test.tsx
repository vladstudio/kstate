import { describe, it, expect, beforeEach, afterEach } from 'bun:test'
import { renderHook, act, cleanup } from '@testing-library/react'
import { useStore } from './useStore'
import { createSetStore } from '../stores/createSetStore'
import { local } from '../adapters'
import { computed } from '../stores/computed'

describe('useStore', () => {
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
    cleanup()
    delete (globalThis as Record<string, unknown>).localStorage
  })

  describe('with set store', () => {
    it('should return Map value', async () => {
      const store = createSetStore<{ id: string; value: number }>(local('items'))
      await store.create({ id: '1', value: 10 })
      await store.create({ id: '2', value: 20 })

      const { result } = renderHook(() => useStore(store))

      expect(result.current.get('1')).toEqual({ id: '1', value: 10 })
      expect(result.current.get('2')).toEqual({ id: '2', value: 20 })
    })

    it('should update when items added', async () => {
      const store = createSetStore<{ id: string; name: string }>(local('items'))
      const { result } = renderHook(() => useStore(store))

      await act(async () => {
        await store.create({ id: '1', name: 'first' })
      })

      expect(result.current.get('1')).toEqual({ id: '1', name: 'first' })
    })

    it('should access specific item by id', async () => {
      const store = createSetStore<{ id: string; name: string }>(local('items'))
      await store.create({ id: '1', name: 'first' })
      await store.create({ id: '2', name: 'second' })

      const { result } = renderHook(() => useStore(store['2']))

      expect(result.current).toEqual({ id: '2', name: 'second' })
    })

    it('should access item property by id', async () => {
      const store = createSetStore<{ id: string; name: string }>(local('items'))
      await store.create({ id: '1', name: 'test-name' })

      const { result } = renderHook(() => useStore(store['1'].name))

      expect(result.current).toBe('test-name')
    })
  })

  describe('with computed store', () => {
    it('should return computed value', () => {
      const source = createSetStore<{ id: string; count: number }>(local('source', [{ id: '1', count: 5 }]))
      const doubled = computed(source, items => items[0]?.count * 2)

      const { result } = renderHook(() => useStore(doubled))

      expect(result.current).toBe(10)
    })

    it('should update when source changes', async () => {
      const source = createSetStore<{ id: string; count: number }>(local('source', [{ id: '1', count: 5 }]))
      const doubled = computed(source, items => items[0]?.count * 2)
      const { result } = renderHook(() => useStore(doubled))

      await act(async () => {
        await source.patch({ id: '1', count: 10 })
      })

      expect(result.current).toBe(20)
    })

    it('should work with computed object', async () => {
      const items = createSetStore<{ id: string; value: number }>(local('items'))
      await items.create({ id: '1', value: 10 })
      await items.create({ id: '2', value: 20 })

      const stats = computed(items, arr => ({
        count: arr.length,
        sum: arr.reduce((s, i) => s + i.value, 0),
      }))

      const { result } = renderHook(() => useStore(stats))

      expect(result.current).toEqual({ count: 2, sum: 30 })
    })

    it('should access computed nested property', async () => {
      const items = createSetStore<{ id: string; value: number }>(local('items'))
      await items.create({ id: '1', value: 10 })
      await items.create({ id: '2', value: 20 })

      const stats = computed(items, arr => ({
        count: arr.length,
        sum: arr.reduce((s, i) => s + i.value, 0),
      }))

      const { result } = renderHook(() => useStore(stats.sum))

      expect(result.current).toBe(30)
    })
  })

  describe('stable snapshots', () => {
    it('should return same reference for unchanged store', () => {
      const store = createSetStore<{ id: string; value: number }>(local('test', [{ id: '1', value: 1 }]))
      const { result, rerender } = renderHook(() => useStore(store))

      const first = result.current
      rerender()
      const second = result.current

      expect(first).toBe(second)
    })

    it('should return new reference when value changes', async () => {
      const store = createSetStore<{ id: string; value: number }>(local('test', [{ id: '1', value: 1 }]))
      const { result } = renderHook(() => useStore(store['1']))

      const first = result.current

      await act(async () => {
        await store.patch({ id: '1', value: 2 })
      })

      const second = result.current

      expect(first.value).not.toBe(second.value)
    })
  })
})
