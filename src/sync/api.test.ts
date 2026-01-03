import { describe, it, expect, beforeEach, mock, spyOn } from 'bun:test'
import { apiFetch } from './api'
import { configureKState } from '../config'

describe('apiFetch', () => {
  beforeEach(() => {
    configureKState({ baseUrl: 'https://api.test.com', getHeaders: () => ({}) })
  })

  describe('URL building', () => {
    it('should build simple URLs', async () => {
      const mockFetch = spyOn(globalThis, 'fetch').mockResolvedValue(
        new Response(JSON.stringify({ data: 'test' }), { status: 200 })
      )

      await apiFetch({ method: 'GET', endpoint: '/users' })

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.test.com/users',
        expect.any(Object)
      )
      mockFetch.mockRestore()
    })

    it('should replace path parameters', async () => {
      const mockFetch = spyOn(globalThis, 'fetch').mockResolvedValue(
        new Response(JSON.stringify({ data: 'test' }), { status: 200 })
      )

      await apiFetch({
        method: 'GET',
        endpoint: '/users/:id',
        params: { id: '123' },
      })

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.test.com/users/123',
        expect.any(Object)
      )
      mockFetch.mockRestore()
    })

    it('should add query params for unused params', async () => {
      const mockFetch = spyOn(globalThis, 'fetch').mockResolvedValue(
        new Response(JSON.stringify({ data: 'test' }), { status: 200 })
      )

      await apiFetch({
        method: 'GET',
        endpoint: '/users/:id',
        params: { id: '123', page: 1, limit: 10 },
      })

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.test.com/users/123?page=1&limit=10',
        expect.any(Object)
      )
      mockFetch.mockRestore()
    })

    it('should encode URL parameters', async () => {
      const mockFetch = spyOn(globalThis, 'fetch').mockResolvedValue(
        new Response(JSON.stringify({ data: 'test' }), { status: 200 })
      )

      await apiFetch({
        method: 'GET',
        endpoint: '/search',
        params: { query: 'hello world' },
      })

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.test.com/search?query=hello%20world',
        expect.any(Object)
      )
      mockFetch.mockRestore()
    })

    it('should throw on missing path params', async () => {
      await expect(
        apiFetch({ method: 'GET', endpoint: '/users/:id' })
      ).rejects.toThrow('Missing URL parameter: id')
    })
  })

  describe('headers', () => {
    it('should include Content-Type header', async () => {
      const mockFetch = spyOn(globalThis, 'fetch').mockResolvedValue(
        new Response(JSON.stringify({}), { status: 200 })
      )

      await apiFetch({ method: 'GET', endpoint: '/test' })

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({ 'Content-Type': 'application/json' }),
        })
      )
      mockFetch.mockRestore()
    })

    it('should include config headers', async () => {
      configureKState({
        baseUrl: 'https://api.test.com',
        getHeaders: () => ({ Authorization: 'Bearer token123' }),
      })

      const mockFetch = spyOn(globalThis, 'fetch').mockResolvedValue(
        new Response(JSON.stringify({}), { status: 200 })
      )

      await apiFetch({ method: 'GET', endpoint: '/test' })

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({ Authorization: 'Bearer token123' }),
        })
      )
      mockFetch.mockRestore()
    })
  })

  describe('request body', () => {
    it('should send JSON body', async () => {
      const mockFetch = spyOn(globalThis, 'fetch').mockResolvedValue(
        new Response(JSON.stringify({}), { status: 200 })
      )

      await apiFetch({
        method: 'POST',
        endpoint: '/users',
        body: { name: 'John' },
      })

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ body: '{"name":"John"}' })
      )
      mockFetch.mockRestore()
    })

    it('should wrap body with requestKey', async () => {
      const mockFetch = spyOn(globalThis, 'fetch').mockResolvedValue(
        new Response(JSON.stringify({}), { status: 200 })
      )

      await apiFetch({
        method: 'POST',
        endpoint: '/users',
        body: { name: 'John' },
        requestKey: 'user',
      })

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ body: '{"user":{"name":"John"}}' })
      )
      mockFetch.mockRestore()
    })
  })

  describe('response handling', () => {
    it('should return parsed JSON data', async () => {
      const mockFetch = spyOn(globalThis, 'fetch').mockResolvedValue(
        new Response(JSON.stringify({ name: 'John' }), { status: 200 })
      )

      const result = await apiFetch<{ name: string }>({
        method: 'GET',
        endpoint: '/users/1',
      })

      expect(result.data).toEqual({ name: 'John' })
      mockFetch.mockRestore()
    })

    it('should extract data using dataKey', async () => {
      const mockFetch = spyOn(globalThis, 'fetch').mockResolvedValue(
        new Response(JSON.stringify({ items: [{ id: '1' }], total: 100 }), { status: 200 })
      )

      const result = await apiFetch<{ id: string }[]>({
        method: 'GET',
        endpoint: '/users',
        dataKey: 'items',
      })

      expect(result.data).toEqual([{ id: '1' }])
      expect(result.meta.total).toBe(100)
      mockFetch.mockRestore()
    })

    it('should handle 204 No Content', async () => {
      const mockFetch = spyOn(globalThis, 'fetch').mockResolvedValue(
        new Response(null, { status: 204 })
      )

      const result = await apiFetch({ method: 'DELETE', endpoint: '/users/1' })

      expect(result.data).toBeUndefined()
      expect(result.meta.status).toBe(204)
      mockFetch.mockRestore()
    })

    it('should include meta information', async () => {
      const mockFetch = spyOn(globalThis, 'fetch').mockResolvedValue(
        new Response(JSON.stringify({}), {
          status: 200,
          headers: { 'X-Request-Id': 'abc123' },
        })
      )

      const result = await apiFetch({ method: 'GET', endpoint: '/test' })

      expect(result.meta.status).toBe(200)
      expect(result.meta.url).toBe('https://api.test.com/test')
      expect(result.meta.duration).toBeGreaterThanOrEqual(0)
      mockFetch.mockRestore()
    })
  })

  describe('error handling', () => {
    it('should throw on non-ok response', async () => {
      const mockFetch = spyOn(globalThis, 'fetch').mockResolvedValue(
        new Response('Not Found', { status: 404 })
      )

      await expect(
        apiFetch({ method: 'GET', endpoint: '/users/999' })
      ).rejects.toThrow('HTTP 404')

      mockFetch.mockRestore()
    })

    it('should parse error message from JSON response', async () => {
      const mockFetch = spyOn(globalThis, 'fetch').mockResolvedValue(
        new Response(JSON.stringify({ message: 'User not found' }), { status: 404 })
      )

      await expect(
        apiFetch({ method: 'GET', endpoint: '/users/999' })
      ).rejects.toThrow('User not found')

      mockFetch.mockRestore()
    })

    it('should parse error field from JSON response', async () => {
      const mockFetch = spyOn(globalThis, 'fetch').mockResolvedValue(
        new Response(JSON.stringify({ error: 'Invalid request' }), { status: 400 })
      )

      await expect(
        apiFetch({ method: 'POST', endpoint: '/users' })
      ).rejects.toThrow('Invalid request')

      mockFetch.mockRestore()
    })

    it('should throw on invalid JSON response', async () => {
      const mockFetch = spyOn(globalThis, 'fetch').mockResolvedValue(
        new Response('not json', { status: 200 })
      )

      await expect(
        apiFetch({ method: 'GET', endpoint: '/test' })
      ).rejects.toThrow('Invalid JSON response')

      mockFetch.mockRestore()
    })
  })
})
