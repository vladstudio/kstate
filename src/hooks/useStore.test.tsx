import { describe, it, expect, beforeEach, afterEach } from 'bun:test'
import { renderHook, act, cleanup } from '@testing-library/react'
import { useStore } from './useStore'
import { createLocalStore } from '../stores/createLocalStore'
import { createLocalArrayStore } from '../stores/createLocalArrayStore'
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
    if (typeof window === 'undefined') {
      (globalThis as Record<string, unknown>).window = undefined
    }
  })

  afterEach(() => {
    cleanup()
    delete (globalThis as Record<string, unknown>).localStorage
  })

  describe('with local store', () => {
    it('should return current store value', () => {
      const store = createLocalStore('test', { count: 42 })

      const { result } = renderHook(() => useStore(store))

      expect(result.current).toEqual({ count: 42 })
    })

    it('should update when store changes', () => {
      const store = createLocalStore('test', { count: 0 })
      const { result } = renderHook(() => useStore(store))

      act(() => {
        store.patch({ count: 10 })
      })

      expect(result.current).toEqual({ count: 10 })
    })

    it('should work with nested property access', () => {
      const store = createLocalStore('test', { user: { name: 'John', age: 30 } })

      const { result } = renderHook(() => useStore(store.user))

      expect(result.current).toEqual({ name: 'John', age: 30 })
    })

    it('should return primitive from nested access', () => {
      const store = createLocalStore('test', { user: { name: 'John' } })

      const { result } = renderHook(() => useStore(store.user.name))

      expect(result.current).toBe('John')
    })
  })

  describe('with array store', () => {
    it('should return array value', () => {
      const store = createLocalArrayStore<{ id: string; value: number }>('items')
      store.add({ id: '1', value: 10 })
      store.add({ id: '2', value: 20 })

      const { result } = renderHook(() => useStore(store))

      expect(result.current).toEqual([
        { id: '1', value: 10 },
        { id: '2', value: 20 },
      ])
    })

    it('should update when items added', () => {
      const store = createLocalArrayStore<{ id: string; name: string }>('items')
      const { result } = renderHook(() => useStore(store))

      act(() => {
        store.add({ id: '1', name: 'first' })
      })

      expect(result.current).toEqual([{ id: '1', name: 'first' }])
    })

    it('should access specific item by index', () => {
      const store = createLocalArrayStore<{ id: string; name: string }>('items')
      store.add({ id: '1', name: 'first' })
      store.add({ id: '2', name: 'second' })

      const { result } = renderHook(() => useStore(store[1]))

      expect(result.current).toEqual({ id: '2', name: 'second' })
    })

    it('should access item property', () => {
      const store = createLocalArrayStore<{ id: string; name: string }>('items')
      store.add({ id: '1', name: 'test-name' })

      const { result } = renderHook(() => useStore(store[0].name))

      expect(result.current).toBe('test-name')
    })
  })

  describe('with computed store', () => {
    it('should return computed value', () => {
      const source = createLocalStore('source', { count: 5 })
      const doubled = computed(source, d => d.count * 2)

      const { result } = renderHook(() => useStore(doubled))

      expect(result.current).toBe(10)
    })

    it('should update when source changes', () => {
      const source = createLocalStore('source', { count: 5 })
      const doubled = computed(source, d => d.count * 2)
      const { result } = renderHook(() => useStore(doubled))

      act(() => {
        source.patch({ count: 10 })
      })

      expect(result.current).toBe(20)
    })

    it('should work with computed object', () => {
      const items = createLocalArrayStore<{ id: string; value: number }>('items')
      items.add({ id: '1', value: 10 })
      items.add({ id: '2', value: 20 })

      const stats = computed(items, arr => ({
        count: arr.length,
        sum: arr.reduce((s, i) => s + i.value, 0),
      }))

      const { result } = renderHook(() => useStore(stats))

      expect(result.current).toEqual({ count: 2, sum: 30 })
    })

    it('should access computed nested property', () => {
      const items = createLocalArrayStore<{ id: string; value: number }>('items')
      items.add({ id: '1', value: 10 })
      items.add({ id: '2', value: 20 })

      const stats = computed(items, arr => ({
        count: arr.length,
        sum: arr.reduce((s, i) => s + i.value, 0),
      }))

      const { result } = renderHook(() => useStore(stats.sum))

      expect(result.current).toBe(30)
    })
  })

  describe('stable snapshots', () => {
    it('should return same reference for unchanged object', () => {
      const store = createLocalStore('test', { a: 1, b: 2 })
      const { result, rerender } = renderHook(() => useStore(store))

      const first = result.current
      rerender()
      const second = result.current

      expect(first).toBe(second)
    })

    it('should return new reference when value changes', () => {
      const store = createLocalStore('test', { value: 1 })
      const { result } = renderHook(() => useStore(store))

      const first = result.current

      act(() => {
        store.patch({ value: 2 })
      })

      const second = result.current

      expect(first).not.toBe(second)
    })
  })
})
