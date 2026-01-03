// Configuration
export { configureKState } from './config'

// Store creators
export { createStore } from './stores/createStore'
export { createArrayStore } from './stores/createArrayStore'
export { createLocalStore } from './stores/createLocalStore'
export { createLocalArrayStore } from './stores/createLocalArrayStore'
export { computed } from './stores/computed'

// React hooks
export { useStore } from './hooks/useStore'
export { useStoreStatus } from './hooks/useStoreStatus'

// Types
export type {
  StoreConfig,
  ArrayStoreConfig,
  LocalStoreConfig,
  LocalArrayStoreConfig,
  Store,
  ArrayStore,
  LocalStore,
  LocalArrayStore,
  ComputedStore,
  StoreStatus,
  ResponseMeta,
  ErrorMeta,
  Operation,
  KStateConfig,
} from './types'
