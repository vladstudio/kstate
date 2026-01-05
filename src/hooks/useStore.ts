import { useSyncExternalStore, useCallback, useRef } from 'react'
import type { Path, Listener } from '../types'
import { isKStateProxy, getProxyPath, getProxySubscribe, getProxyGetData } from '../core/proxy'

const UNINITIALIZED = Symbol('uninitialized')

export function useStore<T>(proxyOrStore: unknown): T {
  const proxyRef = useRef(proxyOrStore)
  proxyRef.current = proxyOrStore

  const subscribe = useCallback((onStoreChange: Listener) => {
    const current = proxyRef.current

    if (isKStateProxy(current)) {
      const path = getProxyPath(current)
      const subscribeFn = getProxySubscribe(current)
      if (subscribeFn) {
        return subscribeFn(path, onStoreChange)
      }
    }

    // Fallback: try to access subscribers directly on the store
    const store = current as { subscribers?: { subscribe: (path: Path, listener: Listener) => () => void } }
    if (store.subscribers?.subscribe) {
      return store.subscribers.subscribe([], onStoreChange)
    }

    return (console.warn?.('useStore: no subscription available'), () => {})
  }, [])

  const getSnapshot = useCallback(() => {
    const current = proxyRef.current

    if (isKStateProxy(current)) {
      const getData = getProxyGetData(current)
      if (getData) {
        return getData()
      }
    }

    // Fallback: try to access value directly
    const store = current as { value?: unknown }
    return store.value
  }, [])

  const snapshotRef = useRef<unknown>(UNINITIALIZED)

  const getStableSnapshot = useCallback(() => {
    const next = getSnapshot()
    const prev = snapshotRef.current

    // First call - always store the snapshot
    if (prev === UNINITIALIZED) {
      snapshotRef.current = next
      return next
    }

    if (typeof next !== 'object' || next === null) {
      if (prev !== next) snapshotRef.current = next
    } else if (prev === null || typeof prev !== 'object') {
      snapshotRef.current = next
    } else if (Array.isArray(next)) {
      if (!Array.isArray(prev) || next.length !== prev.length || next.some((v, i) => v !== prev[i]))
        snapshotRef.current = next
    } else {
      const keys = Object.keys(next)
      if (keys.length !== Object.keys(prev).length || keys.some(k => (next as Record<string, unknown>)[k] !== (prev as Record<string, unknown>)[k]))
        snapshotRef.current = next
    }
    return snapshotRef.current
  }, [getSnapshot])

  return useSyncExternalStore(subscribe, getStableSnapshot, getStableSnapshot) as T
}
