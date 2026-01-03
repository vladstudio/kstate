import { useSyncExternalStore, useCallback, useRef } from 'react'
import type { StoreStatus, Listener } from '../types'

interface StoreWithStatus {
  status: StoreStatus
  subscribeToStatus: (listener: Listener) => () => void
}

export function useStoreStatus(store: StoreWithStatus): StoreStatus {
  const storeRef = useRef(store)
  storeRef.current = store

  const subscribe = useCallback((onStoreChange: Listener) => {
    return storeRef.current.subscribeToStatus(onStoreChange)
  }, [])

  const getSnapshot = useCallback(() => {
    return storeRef.current.status
  }, [])

  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
}
