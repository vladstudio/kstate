import { useSyncExternalStore, useCallback, useRef } from 'react'
import type { Path, Listener } from '../types'
import {
  isKStateProxy,
  getProxyPath,
  getProxySubscribe,
  getProxyGetData,
} from '../core/proxy'

export function useStore<T>(proxyOrStore: unknown): T {
  // Use refs to maintain stable references
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

    // No subscription possible
    return () => {}
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

  // For the proxy case, we need to create a stable snapshot reference
  // to avoid unnecessary re-renders
  const snapshotRef = useRef<unknown>(null)
  const versionRef = useRef(0)

  const getStableSnapshot = useCallback(() => {
    const newSnapshot = getSnapshot()

    // For primitive values, return directly
    if (typeof newSnapshot !== 'object' || newSnapshot === null) {
      if (snapshotRef.current !== newSnapshot) {
        snapshotRef.current = newSnapshot
        versionRef.current++
      }
      return snapshotRef.current
    }

    // For objects/arrays, do a shallow comparison
    const prev = snapshotRef.current
    if (prev === null || typeof prev !== 'object') {
      snapshotRef.current = newSnapshot
      versionRef.current++
      return snapshotRef.current
    }

    // Shallow compare
    if (Array.isArray(newSnapshot) && Array.isArray(prev)) {
      if (newSnapshot.length !== prev.length || newSnapshot.some((v, i) => v !== prev[i])) {
        snapshotRef.current = newSnapshot
        versionRef.current++
      }
    } else {
      const newKeys = Object.keys(newSnapshot)
      const prevKeys = Object.keys(prev)
      if (newKeys.length !== prevKeys.length ||
          newKeys.some(k => (newSnapshot as Record<string, unknown>)[k] !== (prev as Record<string, unknown>)[k])) {
        snapshotRef.current = newSnapshot
        versionRef.current++
      }
    }

    return snapshotRef.current
  }, [getSnapshot])

  return useSyncExternalStore(subscribe, getStableSnapshot, getStableSnapshot) as T
}
