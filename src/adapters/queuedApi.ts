import { api } from './api'
import type { ApiAdapterConfig } from '../types'

function createQueue() {
  const queue: (() => Promise<unknown>)[] = []
  let running = false
  async function process() {
    if (running) return
    running = true
    while (queue.length > 0) { try { await queue.shift()!() } catch { /* continue */ } }
    running = false
  }
  return <T>(task: () => Promise<T>): Promise<T> => new Promise((resolve, reject) => {
    queue.push(async () => { try { resolve(await task()) } catch (e) { reject(e) } })
    process()
  })
}

export function queuedApi<T extends { id: string }>(config: ApiAdapterConfig) {
  const base = api<T>(config), enqueue = createQueue()
  return {
    get: (params?: Record<string, unknown>) => enqueue(() => base.get(params)),
    getOne: (params: { id: string } & Record<string, unknown>) => enqueue(() => base.getOne(params)),
    create: (body: Omit<T, 'id'> | T) => enqueue(() => base.create(body)),
    set: (body: T) => enqueue(() => base.set(body)),
    patch: (body: Partial<T> & { id: string }) => enqueue(() => base.patch(body)),
    delete: (params: { id: string }) => enqueue(() => base.delete(params)),
  }
}
