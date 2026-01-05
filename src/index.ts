// Configuration
export { configureKState } from './config'

// Stores
export { createStore } from './stores/createStore'
export { createSetStore } from './stores/createSetStore'
export { computed } from './stores/computed'

// Adapters
export { api, queuedApi, local, sse } from './adapters'

// React hooks
export { useStore } from './hooks/useStore'
export { useStoreStatus } from './hooks/useStoreStatus'

// Types
export type {
  StoreOps,
  SetStoreOps,
  NewStore,
  SetStore,
  ComputedStore,
  StoreStatus,
  ResponseMeta,
  ErrorMeta,
  Operation,
  KStateConfig,
} from './types'
