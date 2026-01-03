import { describe, it, expect, beforeEach, afterEach, mock } from 'bun:test'
import { createLocalArrayStore } from './createLocalArrayStore'
import { isKStateProxy } from '../core/proxy'

interface TestItem { id: string; name: string; value: number }

describe('createLocalArrayStore', () => {
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
    delete (globalThis as Record<string, unknown>).localStorage
  })

  describe('initialization', () => {
    it('should start with empty array', () => {
      const store = createLocalArrayStore<TestItem>('items')

      expect(store.value).toEqual([])
    })

    it('should load existing items from localStorage', () => {
      const existing = [{ id: '1', name: 'one', value: 1 }]
      mockStorage['existing'] = JSON.stringify(existing)

      const store = createLocalArrayStore<TestItem>('existing')

      expect(store.value).toEqual(existing)
    })

    it('should be a KState proxy', () => {
      const store = createLocalArrayStore<TestItem>('items')

      expect(isKStateProxy(store)).toBe(true)
    })
  })

  describe('get', () => {
    it('should return current items', () => {
      const store = createLocalArrayStore<TestItem>('items')

      expect(store.get()).toEqual([])
    })
  })

  describe('add', () => {
    it('should append item to array', () => {
      const store = createLocalArrayStore<TestItem>('items')
      const item = { id: '1', name: 'first', value: 10 }

      store.add(item)

      expect(store.value).toEqual([item])
    })

    it('should persist to localStorage', () => {
      const store = createLocalArrayStore<TestItem>('add-test')
      store.add({ id: '1', name: 'test', value: 5 })

      expect(JSON.parse(mockStorage['add-test'])).toEqual([
        { id: '1', name: 'test', value: 5 },
      ])
    })

    it('should call onAdd callback', () => {
      const onAdd = mock((item: TestItem) => {})
      const store = createLocalArrayStore<TestItem>('items', { onAdd })
      const item = { id: '1', name: 'test', value: 1 }

      store.add(item)

      expect(onAdd).toHaveBeenCalledWith(item)
    })
  })

  describe('update', () => {
    it('should replace item by id', () => {
      const store = createLocalArrayStore<TestItem>('items')
      store.add({ id: '1', name: 'original', value: 1 })

      store.update({ id: '1', name: 'updated', value: 100 })

      expect(store.value[0]).toEqual({ id: '1', name: 'updated', value: 100 })
    })

    it('should throw if item not found', () => {
      const store = createLocalArrayStore<TestItem>('items')

      expect(() => store.update({ id: 'missing', name: 'x', value: 0 }))
        .toThrow('Item with id missing not found')
    })

    it('should call onUpdate callback', () => {
      const onUpdate = mock((item: TestItem) => {})
      const store = createLocalArrayStore<TestItem>('items', { onUpdate })
      store.add({ id: '1', name: 'test', value: 1 })

      store.update({ id: '1', name: 'updated', value: 2 })

      expect(onUpdate).toHaveBeenCalledWith({ id: '1', name: 'updated', value: 2 })
    })
  })

  describe('patch', () => {
    it('should merge partial update', () => {
      const store = createLocalArrayStore<TestItem>('items')
      store.add({ id: '1', name: 'original', value: 10 })

      store.patch({ id: '1', value: 99 })

      expect(store.value[0]).toEqual({ id: '1', name: 'original', value: 99 })
    })

    it('should throw if item not found', () => {
      const store = createLocalArrayStore<TestItem>('items')

      expect(() => store.patch({ id: 'missing', value: 0 }))
        .toThrow('Item with id missing not found')
    })

    it('should call onPatch callback with merged item', () => {
      const onPatch = mock((item: TestItem) => {})
      const store = createLocalArrayStore<TestItem>('items', { onPatch })
      store.add({ id: '1', name: 'test', value: 1 })

      store.patch({ id: '1', name: 'patched' })

      expect(onPatch).toHaveBeenCalledWith({ id: '1', name: 'patched', value: 1 })
    })
  })

  describe('delete', () => {
    it('should remove item by id', () => {
      const store = createLocalArrayStore<TestItem>('items')
      store.add({ id: '1', name: 'one', value: 1 })
      store.add({ id: '2', name: 'two', value: 2 })

      store.delete({ id: '1' })

      expect(store.value).toEqual([{ id: '2', name: 'two', value: 2 }])
    })

    it('should throw if item not found', () => {
      const store = createLocalArrayStore<TestItem>('items')

      expect(() => store.delete({ id: 'missing' }))
        .toThrow('Item with id missing not found')
    })

    it('should call onDelete callback', () => {
      const onDelete = mock((id: string) => {})
      const store = createLocalArrayStore<TestItem>('items', { onDelete })
      store.add({ id: '1', name: 'test', value: 1 })

      store.delete({ id: '1' })

      expect(onDelete).toHaveBeenCalledWith('1')
    })
  })

  describe('clear', () => {
    it('should empty the array', () => {
      const store = createLocalArrayStore<TestItem>('items')
      store.add({ id: '1', name: 'one', value: 1 })
      store.add({ id: '2', name: 'two', value: 2 })

      store.clear()

      expect(store.value).toEqual([])
    })

    it('should persist empty array to localStorage', () => {
      const store = createLocalArrayStore<TestItem>('clear-test')
      store.add({ id: '1', name: 'test', value: 1 })

      store.clear()

      expect(JSON.parse(mockStorage['clear-test'])).toEqual([])
    })

    it('should call onClear callback', () => {
      const onClear = mock(() => {})
      const store = createLocalArrayStore<TestItem>('items', { onClear })
      store.add({ id: '1', name: 'test', value: 1 })

      store.clear()

      expect(onClear).toHaveBeenCalled()
    })
  })

  describe('array proxy features', () => {
    it('should support length property', () => {
      const store = createLocalArrayStore<TestItem>('items')
      store.add({ id: '1', name: 'one', value: 1 })
      store.add({ id: '2', name: 'two', value: 2 })

      expect(store.length).toBe(2)
    })

    it('should support index access', () => {
      const store = createLocalArrayStore<TestItem>('items')
      store.add({ id: '1', name: 'first', value: 10 })

      // Primitive values are wrapped; use String() for comparison
      expect(String(store[0].name)).toBe('first')
    })

    it('should support iteration', () => {
      const store = createLocalArrayStore<TestItem>('items')
      store.add({ id: '1', name: 'one', value: 1 })
      store.add({ id: '2', name: 'two', value: 2 })

      const names: string[] = []
      for (const item of store) {
        // item.name is wrapped; use String() for comparison
        names.push(String((item as TestItem).name))
      }

      expect(names).toEqual(['one', 'two'])
    })
  })

  describe('dispose', () => {
    it('should have dispose method', () => {
      const store = createLocalArrayStore<TestItem>('items')

      expect(typeof store.dispose).toBe('function')
      store.dispose()
    })
  })
})
