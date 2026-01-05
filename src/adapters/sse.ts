import { getConfig } from '../config'

interface SseOpts<T> {
  mode?: 'replace' | 'append' | 'upsert'
  eventName?: string
  dataKey?: string
  withCredentials?: boolean
  dedupe?: (item: T) => string
  maxItems?: number
}

export function sse<T extends { id: string }>(url: string, opts: SseOpts<T> = {}) {
  const { mode = 'replace', eventName = 'message', dataKey, withCredentials = true, dedupe = (i: T) => i.id, maxItems } = opts

  return {
    subscribe: (cb: (items: T[]) => void) => {
      const config = getConfig()
      const fullUrl = url.startsWith('http') ? url : `${config.baseUrl}${url}`
      const es = new EventSource(fullUrl, { withCredentials })
      const seen = new Set<string>()
      let items: T[] = []

      const handler = (e: MessageEvent) => {
        let parsed = JSON.parse(e.data)
        let data: T[] = dataKey ? parsed[dataKey] : parsed
        if (!Array.isArray(data)) data = [data]

        if (mode === 'replace') { items = data; seen.clear() }
        else if (mode === 'append') {
          const newItems = data.filter(i => { const k = dedupe(i); if (seen.has(k)) return false; seen.add(k); return true })
          items = maxItems ? [...items, ...newItems].slice(-maxItems) : [...items, ...newItems]
        } else {
          const map = new Map(items.map(i => [i.id, i]))
          data.forEach(i => map.set(i.id, { ...map.get(i.id), ...i }))
          items = [...map.values()]
        }
        cb(items)
      }

      if (eventName === 'message') es.onmessage = handler
      else es.addEventListener(eventName, handler)
      return () => es.close()
    },
  }
}
