import type { StoreStatus, Listener } from '../types'

export interface NetworkManager {
  setStatus: (updates: Partial<StoreStatus>) => void
  getStatus: () => StoreStatus
  subscribeToStatus: (listener: Listener) => () => void
  dispose: () => void
}

interface NetworkConfig {
  reloadOnFocus: boolean
  reloadOnReconnect: boolean
  reloadInterval: number
  onReload: () => void
}

export function createNetworkManager(config: NetworkConfig): NetworkManager {
  const statusSubscribers = new Set<Listener>()
  const cleanups: (() => void)[] = []

  let status: StoreStatus = {
    isLoading: false,
    isRevalidating: false,
    isOffline: typeof navigator !== 'undefined' ? !navigator.onLine : false,
    error: null,
    lastUpdated: 0,
  }

  function setStatus(updates: Partial<StoreStatus>): void {
    status = { ...status, ...updates }
    statusSubscribers.forEach(l => l())
  }

  if (typeof window !== 'undefined') {
    const onOnline = () => {
      setStatus({ isOffline: false })
      if (config.reloadOnReconnect) config.onReload()
    }
    const onOffline = () => setStatus({ isOffline: true })
    window.addEventListener('online', onOnline)
    window.addEventListener('offline', onOffline)
    cleanups.push(() => {
      window.removeEventListener('online', onOnline)
      window.removeEventListener('offline', onOffline)
    })

    if (config.reloadOnFocus) {
      const onFocus = () => config.onReload()
      window.addEventListener('focus', onFocus)
      cleanups.push(() => window.removeEventListener('focus', onFocus))
    }

    if (config.reloadInterval > 0) {
      const id = setInterval(config.onReload, config.reloadInterval)
      cleanups.push(() => clearInterval(id))
    }
  }

  return {
    setStatus,
    getStatus: () => status,
    subscribeToStatus: (listener: Listener) => {
      statusSubscribers.add(listener)
      return () => statusSubscribers.delete(listener)
    },
    dispose: () => cleanups.forEach(fn => fn()),
  }
}
