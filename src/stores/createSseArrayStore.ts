import type { SseArrayStoreConfig, SseArrayStore, SseStatus, Listener } from '../types'
import { createSubscriberManager } from '../core/subscribers'
import { wrapStoreWithProxy } from '../core/proxy'
import { apiFetch } from '../sync/api'

export function createSseArrayStore<T extends { id: string }, P = Record<string, unknown>>(
  config: SseArrayStoreConfig<T, P>
): SseArrayStore<T, P> {
  let items: T[] = []
  let meta: Record<string, unknown> = {}
  let es: EventSource | null = null
  let params: P | undefined
  let retries = 0
  let hbTimer: ReturnType<typeof setTimeout> | null = null
  let reconTimer: ReturnType<typeof setTimeout> | null = null
  const seen = new Set<string>()

  const { mode, eventName = 'message', withCredentials = true, dataKey, persistKey } = config
  const { maxRetries = 10, heartbeatTimeout = 45000 } = config
  const dedupe = config.dedupe ?? ((item: T) => item.id)
  const getDelay = typeof config.retryDelay === 'function'
    ? config.retryDelay
    : (n: number) => Math.min(30000, 1000 * 2 ** n + Math.random() * 1000)

  if (persistKey && typeof localStorage !== 'undefined') {
    try { items = JSON.parse(localStorage.getItem(persistKey) || '[]') } catch {}
  }

  const status: SseStatus = {
    isLoading: false, isRevalidating: false, error: null, lastUpdated: 0,
    isOffline: typeof navigator !== 'undefined' ? !navigator.onLine : false,
    connectionStatus: 'disconnected', lastEventTime: null,
  }
  const subscribers = createSubscriberManager()
  const statusListeners = new Set<Listener>()

  const setStatus = (p: Partial<SseStatus>) => { Object.assign(status, p); statusListeners.forEach(l => l()) }
  const persist = () => { if (persistKey) try { localStorage.setItem(persistKey, JSON.stringify(items)) } catch {} }
  const clearTimers = () => { hbTimer && clearTimeout(hbTimer); reconTimer && clearTimeout(reconTimer); hbTimer = reconTimer = null }

  const resetHb = () => {
    if (!heartbeatTimeout) return
    hbTimer && clearTimeout(hbTimer)
    hbTimer = setTimeout(() => {
      if (es?.readyState === EventSource.OPEN) {
        setStatus({ connectionStatus: 'error', error: new Error('Heartbeat timeout') })
        es?.close(); scheduleReconnect()
      }
    }, heartbeatTimeout)
  }

  const scheduleReconnect = () => {
    if (retries >= maxRetries) { setStatus({ connectionStatus: 'error', error: new Error('Max retries') }); return }
    setStatus({ connectionStatus: 'connecting' })
    reconTimer = setTimeout(doConnect, getDelay(retries++))
  }

  const extractData = (raw: unknown): T[] => {
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw
    if (dataKey && parsed && typeof parsed === 'object') {
      const { [dataKey]: data, ...rest } = parsed as Record<string, unknown>
      meta = rest
      return (data as T[]) ?? []
    }
    return Array.isArray(parsed) ? parsed : [parsed]
  }

  const handleData = (newItems: T[]) => {
    if (mode === 'replace') { items = newItems; seen.clear(); newItems.forEach(i => seen.add(dedupe(i))) }
    else if (mode === 'append') {
      const add = newItems.filter(i => { const k = dedupe(i); if (seen.has(k)) return false; seen.add(k); return true })
      if (add.length) { items = [...items, ...add]; if (config.maxItems) items = items.slice(-config.maxItems) }
    } else { const m = new Map(items.map(i => [i.id, i])); newItems.forEach(i => m.set(i.id, i)); items = [...m.values()] }
    persist(); setStatus({ lastUpdated: Date.now(), error: null }); subscribers.notify([[]])
  }

  const handleMessage = (e: MessageEvent) => {
    resetHb(); setStatus({ lastEventTime: Date.now() })
    try { const d = config.transform ? config.transform(e.data) : extractData(e.data); handleData(d); config.onMessage?.(d, e) } catch {}
  }

  const doConnect = async () => {
    if (typeof document !== 'undefined' && document.hidden && config.pauseOnHidden !== false) return
    if (typeof navigator !== 'undefined' && !navigator.onLine) { setStatus({ connectionStatus: 'error', isOffline: true }); return }
    clearTimers(); es?.close(); setStatus({ connectionStatus: 'connecting', isLoading: !items.length })

    if (config.initialFetch && !items.length) {
      try { const r = await apiFetch<T[]>({ method: 'GET', endpoint: config.initialFetch.endpoint, dataKey: config.initialFetch.dataKey }); handleData(r.data) } catch {}
    }

    const url = typeof config.url === 'function' ? config.url(params as P) : config.url
    es = new EventSource(url, { withCredentials })
    es.onopen = () => { retries = 0; setStatus({ connectionStatus: 'connected', isLoading: false, error: null }); resetHb(); config.onConnect?.() }
    eventName === 'message' ? es.onmessage = handleMessage : es.addEventListener(eventName, handleMessage)
    es.onerror = () => { setStatus({ connectionStatus: 'error', error: new Error('Connection error') }); config.onError?.(new Error('Connection error')); clearTimers(); es?.close(); scheduleReconnect() }
  }

  const connect = (p?: P) => { params = p; doConnect() }
  const disconnect = () => { clearTimers(); es?.close(); es = null; retries = 0; params = undefined; setStatus({ connectionStatus: 'disconnected', isLoading: false }); config.onDisconnect?.() }

  if (typeof window !== 'undefined') {
    document.addEventListener('visibilitychange', () => {
      if (config.pauseOnHidden === false) return
      if (document.hidden) { clearTimers(); es?.close(); es = null; setStatus({ connectionStatus: 'disconnected' }) }
      else if (params !== undefined && config.reconnectOnFocus !== false) { retries = 0; doConnect() }
    })
    window.addEventListener('online', () => { setStatus({ isOffline: false }); if (params !== undefined && config.reconnectOnOnline !== false) { retries = 0; doConnect() } })
    window.addEventListener('offline', () => { setStatus({ isOffline: true }); clearTimers(); es?.close(); es = null; setStatus({ connectionStatus: 'disconnected' }) })
  }

  const store: SseArrayStore<T, P> = {
    get value() { return items },
    get meta() { return meta },
    get status() { return { ...status } },
    subscribeToStatus: (l) => { statusListeners.add(l); return () => statusListeners.delete(l) },
    connect, disconnect,
    update: (item) => { const i = items.findIndex(x => x.id === item.id); items = i >= 0 ? items.map((x, j) => j === i ? item : x) : [...items, item]; persist(); subscribers.notify([[]]) },
    patch: (data) => { const i = items.findIndex(x => x.id === data.id); if (i >= 0) { items = items.map((x, j) => j === i ? { ...x, ...data } : x); persist(); subscribers.notify([[i]]) } },
    remove: (id) => { items = items.filter(x => x.id !== id); seen.delete(id); persist(); subscribers.notify([[]]) },
    clear: () => { items = []; meta = {}; seen.clear(); persistKey && localStorage.removeItem(persistKey); subscribers.notify([[]]) },
    dispose: disconnect,
  }

  const proxy = wrapStoreWithProxy<Record<string | number, unknown>>({ getValue: () => items, subscribers })
  Object.defineProperties(proxy, Object.getOwnPropertyDescriptors(store))
  return proxy as unknown as SseArrayStore<T, P>
}
