import { describe, it, expect, beforeEach, afterEach, mock } from 'bun:test'
import { createLocalStore } from './createLocalStore'
import { isKStateProxy, getProxyPath } from '../core/proxy'

describe('createLocalStore', () => {
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
    // Prevent window event listener errors
    if (typeof window === 'undefined') {
      (globalThis as Record<string, unknown>).window = undefined
    }
  })

  afterEach(() => {
    delete (globalThis as Record<string, unknown>).localStorage
  })

  describe('initialization', () => {
    it('should use default value when localStorage is empty', () => {
      const store = createLocalStore('test', { theme: 'light' })

      expect(store.value).toEqual({ theme: 'light' })
    })

    it('should load existing value from localStorage', () => {
      mockStorage['existing'] = JSON.stringify({ theme: 'dark' })

      const store = createLocalStore('existing', { theme: 'light' })

      expect(store.value).toEqual({ theme: 'dark' })
    })

    it('should be a KState proxy', () => {
      const store = createLocalStore('test', { name: 'John' })

      expect(isKStateProxy(store)).toBe(true)
    })
  })

  describe('get', () => {
    it('should return current value', () => {
      const store = createLocalStore('test', { count: 0 })

      expect(store.get()).toEqual({ count: 0 })
    })
  })

  describe('set', () => {
    it('should replace entire value', () => {
      const store = createLocalStore('test', { a: 1, b: 2 })

      store.set({ a: 10, b: 20 })

      expect(store.value).toEqual({ a: 10, b: 20 })
    })

    it('should persist to localStorage', () => {
      const store = createLocalStore('persist-test', { value: 1 })

      store.set({ value: 42 })

      expect(mockStorage['persist-test']).toBe('{"value":42}')
    })

    it('should call onSet callback', () => {
      const onSet = mock((data: { value: number }) => {})
      const store = createLocalStore('test', { value: 0 }, { onSet })

      store.set({ value: 5 })

      expect(onSet).toHaveBeenCalledWith({ value: 5 })
    })
  })

  describe('patch', () => {
    it('should merge partial updates', () => {
      const store = createLocalStore('test', { a: 1, b: 2, c: 3 })

      store.patch({ b: 20 })

      expect(store.value).toEqual({ a: 1, b: 20, c: 3 })
    })

    it('should persist to localStorage', () => {
      const store = createLocalStore('patch-test', { x: 1, y: 2 })

      store.patch({ y: 99 })

      expect(JSON.parse(mockStorage['patch-test'])).toEqual({ x: 1, y: 99 })
    })

    it('should call onPatch callback', () => {
      const onPatch = mock((data: { a: number; b: number }) => {})
      const store = createLocalStore('test', { a: 1, b: 2 }, { onPatch })

      store.patch({ a: 10 })

      expect(onPatch).toHaveBeenCalledWith({ a: 10, b: 2 })
    })
  })

  describe('clear', () => {
    it('should reset to default value', () => {
      const store = createLocalStore('test', { value: 'default' })
      store.set({ value: 'changed' })

      store.clear()

      expect(store.value).toEqual({ value: 'default' })
    })

    it('should persist default to localStorage', () => {
      const store = createLocalStore('clear-test', { reset: true })
      store.set({ reset: false })

      store.clear()

      expect(JSON.parse(mockStorage['clear-test'])).toEqual({ reset: true })
    })

    it('should call onClear callback', () => {
      const onClear = mock(() => {})
      const store = createLocalStore('test', {}, { onClear })

      store.clear()

      expect(onClear).toHaveBeenCalled()
    })
  })

  describe('nested proxy access', () => {
    it('should access nested properties', () => {
      const store = createLocalStore('nested', {
        user: { profile: { name: 'John' } }
      })

      // Primitive values are wrapped; use String() for comparison
      expect(String(store.user.profile.name)).toBe('John')
    })

    it('should track path for nested proxies', () => {
      const store = createLocalStore('path-test', {
        user: { name: 'John' }
      })

      expect(getProxyPath(store.user)).toEqual(['user'])
    })
  })

  describe('dispose', () => {
    it('should have dispose method', () => {
      const store = createLocalStore('test', {})

      expect(typeof store.dispose).toBe('function')
      store.dispose()
    })
  })
})
