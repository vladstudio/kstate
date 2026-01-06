import { useSyncExternalStore, useCallback, useRef } from 'react'
import type { Path, Listener } from '../types'
import { getProxyPath, getProxySubscribe, getProxyGetData } from '../core/proxy'

export function useStore<T>(proxyOrStore: unknown): T {
  const proxyRef = useRef(proxyOrStore)
  proxyRef.current = proxyOrStore

  const subscribe = useCallback((onStoreChange: Listener) => {
    const current = proxyRef.current
    if (current == null) return () => {}
    const subscribeFn = getProxySubscribe(current)
    if (subscribeFn) return subscribeFn(getProxyPath(current), onStoreChange)
    const store = current as { subscribers?: { subscribe: (path: Path, listener: Listener) => () => void } }
    if (store.subscribers?.subscribe) return store.subscribers.subscribe([], onStoreChange)
    return (console.warn?.('useStore: no subscription available'), () => {})
  }, [])

  const getSnapshot = useCallback(() => {
    const current = proxyRef.current
    const getData = getProxyGetData(current)
    if (getData) return getData()
    if (current == null) return undefined
    return (current as { value?: unknown }).value
  }, [])

  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot) as T
}
