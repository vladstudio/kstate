export type Operation = 'get' | 'getOne' | 'create' | 'patch' | 'delete'
export type Path = (string | number)[]
export type Listener = () => void

export interface ResponseMeta {
  status: number
  headers: Record<string, string>
  url: string
  duration: number
  [key: string]: unknown
}

export interface ErrorMeta {
  operation: Operation
  endpoint: string
  params: Record<string, string | number>
  rollbackData: unknown | null
}

export interface StoreStatus {
  isLoading: boolean
  isRevalidating: boolean
  isOffline: boolean
  error: Error | null
  lastUpdated: number
}

export interface KStateConfig {
  baseUrl?: string
  getHeaders?: () => Promise<Record<string, string>> | Record<string, string>
  onError?: (error: Error, operation: Operation, meta: ErrorMeta) => void
}

export interface ComputedStore<T> {
  readonly value: T
  dispose: () => void
}

export interface SubscriberManager {
  subscribe: (path: Path, listener: Listener) => () => void
  notify: (changedPaths: Path[]) => void
}

export interface ProxyContext<T> {
  getData: () => T
  subscribe: (path: Path, listener: Listener) => () => void
  path: Path
}

export const KSTATE_PROXY = Symbol('kstate-proxy')
export const KSTATE_PATH = Symbol('kstate-path')
export const KSTATE_SUBSCRIBE = Symbol('kstate-subscribe')
export const KSTATE_GET_DATA = Symbol('kstate-get-data')

// Adapter-based API
export interface StoreOps<T> {
  get?: (params?: Record<string, unknown>) => Promise<T> | T
  set?: (data: T) => Promise<T> | T | void
  patch?: (data: Partial<T>) => Promise<T> | T | void
  delete?: (params?: Record<string, unknown>) => Promise<void> | void
  subscribe?: (cb: (data: T) => void) => () => void
  persist?: { load: () => T | null; save: (data: T) => void }
}

export interface SetStoreOps<T extends { id: string }> {
  get?: (params?: Record<string, unknown>) => Promise<T[]> | T[]
  getOne?: (params: { id: string } & Record<string, unknown>) => Promise<T> | T
  create?: (data: Omit<T, 'id'> | T) => Promise<T> | T
  patch?: (data: Partial<T> & { id: string }) => Promise<T> | T
  delete?: (params: { id: string }) => Promise<void> | void
  subscribe?: (cb: (items: T[]) => void) => () => void
  persist?: { load: () => T[]; save: (items: T[]) => void }
  ttl?: number
}

export interface NewStore<T> {
  readonly value: T | null
  readonly status: StoreStatus
  get: (params?: Record<string, unknown>) => Promise<T>
  set: (data: T) => Promise<T>
  patch: (data: Partial<T>) => Promise<T>
  delete: (params?: Record<string, unknown>) => Promise<void>
  clear: () => void
  dispose: () => void
  subscribeToStatus: (listener: Listener) => () => void
}

export interface SetStore<T extends { id: string }> {
  readonly value: T[]
  readonly meta: Record<string, unknown>
  readonly status: StoreStatus
  get: (params?: Record<string, unknown>) => Promise<T[]>
  getOne: (params: { id: string } & Record<string, unknown>) => Promise<T>
  create: (data: Omit<T, 'id'> | T) => Promise<T>
  patch: (data: Partial<T> & { id: string }) => Promise<T>
  delete: (params: { id: string }) => Promise<void>
  clear: () => void
  dispose: () => void
  subscribeToStatus: (listener: Listener) => () => void
}
