import { api } from './api'
import type { ApiAdapterConfig } from '../types'

type QueuedTask = () => Promise<unknown>

const queue: QueuedTask[] = []
let running = false

async function processQueue() {
  if (running) return
  running = true
  while (queue.length > 0) {
    const task = queue.shift()!
    try { await task() } catch { /* continue on error */ }
  }
  running = false
}

function enqueue<T>(task: () => Promise<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    queue.push(async () => {
      try { resolve(await task()) } catch (e) { reject(e) }
    })
    processQueue()
  })
}

export function queuedApi<T extends { id: string }>(config: ApiAdapterConfig) {
  const base = api<T>(config)
  return {
    get: (params?: Record<string, unknown>) => enqueue(() => base.get(params)),
    getOne: (params: { id: string } & Record<string, unknown>) => enqueue(() => base.getOne(params)),
    create: (body: Omit<T, 'id'> | T) => enqueue(() => base.create(body)),
    set: (body: T) => enqueue(() => base.set(body)),
    patch: (body: Partial<T> & { id: string }) => enqueue(() => base.patch(body)),
    delete: (params: { id: string }) => enqueue(() => base.delete(params)),
  }
}
