import { describe, it, expect, beforeEach, afterEach } from 'bun:test'
import { loadFromStorage, saveToStorage } from './localStorage'

describe('localStorage sync', () => {
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

  describe('loadFromStorage', () => {
    it('should return parsed value from localStorage', () => {
      mockStorage['test-key'] = JSON.stringify({ name: 'John' })

      const result = loadFromStorage<{ name: string }>('test-key')

      expect(result).toEqual({ name: 'John' })
    })

    it('should return null for missing key', () => {
      const result = loadFromStorage('missing-key')

      expect(result).toBeNull()
    })

    it('should return null for invalid JSON', () => {
      mockStorage['bad-json'] = 'not valid json'

      const result = loadFromStorage('bad-json')

      expect(result).toBeNull()
    })

    it('should return null when localStorage is undefined', () => {
      delete (globalThis as Record<string, unknown>).localStorage

      const result = loadFromStorage('test-key')

      expect(result).toBeNull()
    })
  })

  describe('saveToStorage', () => {
    it('should save stringified value to localStorage', () => {
      saveToStorage('test-key', { name: 'John' })

      expect(mockStorage['test-key']).toBe('{"name":"John"}')
    })

    it('should handle arrays', () => {
      saveToStorage('array-key', [1, 2, 3])

      expect(mockStorage['array-key']).toBe('[1,2,3]')
    })

    it('should not throw when localStorage is undefined', () => {
      delete (globalThis as Record<string, unknown>).localStorage

      expect(() => saveToStorage('test-key', { data: 'test' })).not.toThrow()
    })
  })
})
