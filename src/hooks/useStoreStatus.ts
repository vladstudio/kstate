import { useSyncExternalStore, useCallback, useRef } from 'react'
import type { StoreStatus, Listener } from '../types'

interface StoreWithStatus {
  status: StoreStatus
  subscribeToStatus: (listener: Listener) => () => void
}

const idle: StoreStatus = { isLoading: false, isRevalidating: false, isOffline: false, error: null, lastUpdated: 0 }

export function useStoreStatus(store: StoreWithStatus | null | undefined): StoreStatus {
  const storeRef = useRef(store)
  storeRef.current = store

  const subscribe = useCallback((onStoreChange: Listener) => {
    return storeRef.current?.subscribeToStatus(onStoreChange) ?? (() => {})
  }, [])

  const getSnapshot = useCallback(() => {
    return storeRef.current?.status ?? idle
  }, [])

  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
}
