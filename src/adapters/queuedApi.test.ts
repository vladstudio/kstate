import { describe, it, expect, beforeEach, spyOn, afterEach } from 'bun:test'
import { queuedApi } from './queuedApi'
import { configureKState } from '../config'

describe('queuedApi', () => {
  let mockFetch: ReturnType<typeof spyOn>

  beforeEach(() => {
    configureKState({ baseUrl: 'https://api.test.com', getHeaders: () => ({}) })
  })

  afterEach(() => {
    mockFetch?.mockRestore()
  })

  it('executes requests sequentially', async () => {
    const order: number[] = []
    let callCount = 0

    mockFetch = spyOn(globalThis, 'fetch').mockImplementation(async () => {
      const n = ++callCount
      order.push(n)
      await new Promise(r => setTimeout(r, 10))
      order.push(n)
      return new Response(JSON.stringify({ id: String(n), name: 'test' }))
    })

    const adapter = queuedApi<{ id: string; name: string }>({ list: '/items' })

    await Promise.all([adapter.get(), adapter.get(), adapter.get()])

    // Each request should complete before next starts: [1,1,2,2,3,3]
    expect(order).toEqual([1, 1, 2, 2, 3, 3])
  })

  it('continues queue on error', async () => {
    const results: string[] = []

    mockFetch = spyOn(globalThis, 'fetch').mockImplementation(async (url) => {
      const id = String(url).split('/').pop()
      if (id === '2') throw new Error('fail')
      results.push(id!)
      return new Response(JSON.stringify({ id, name: 'test' }))
    })

    const adapter = queuedApi<{ id: string; name: string }>({ list: '/items', item: '/items/:id' })

    const promises = [
      adapter.getOne({ id: '1' }).catch(() => 'error'),
      adapter.getOne({ id: '2' }).catch(() => 'error'),
      adapter.getOne({ id: '3' }).catch(() => 'error'),
    ]

    await Promise.all(promises)
    expect(results).toEqual(['1', '3']) // 2 failed but 3 still ran
  })

  it('returns correct data for each caller', async () => {
    mockFetch = spyOn(globalThis, 'fetch').mockImplementation(async (url) => {
      const id = String(url).split('/').pop()
      return new Response(JSON.stringify({ id, name: `name-${id}` }))
    })

    const adapter = queuedApi<{ id: string; name: string }>({ list: '/items', item: '/items/:id' })

    const [r1, r2] = await Promise.all([
      adapter.getOne({ id: '1' }),
      adapter.getOne({ id: '2' }),
    ])

    expect(r1).toEqual({ id: '1', name: 'name-1' })
    expect(r2).toEqual({ id: '2', name: 'name-2' })
  })
})
