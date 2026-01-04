export type Operation = 'get' | 'getOne' | 'create' | 'update' | 'patch' | 'delete'

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

export interface StoreConfig<T> {
  endpoints?: {
    get?: string
    update?: string
    patch?: string
    delete?: string
  }
  dataKey?: string
  requestKey?: string
  ttl?: number
  reloadOnMount?: boolean
  reloadOnFocus?: boolean
  reloadOnReconnect?: boolean
  reloadInterval?: number
  onGet?: (data: T, meta: ResponseMeta) => void
  onUpdate?: (data: T, meta: ResponseMeta) => void
  onPatch?: (data: T, meta: ResponseMeta) => void
  onDelete?: (meta: ResponseMeta) => void
  onError?: (error: Error, meta: ErrorMeta) => void
}

export interface ArrayStoreConfig<T> {
  endpoints?: {
    get?: string
    getOne?: string
    create?: string
    update?: string
    patch?: string
    delete?: string
  }
  dataKey?: string
  requestKey?: string
  ttl?: number
  reloadOnMount?: boolean
  reloadOnFocus?: boolean
  reloadOnReconnect?: boolean
  reloadInterval?: number
  onGet?: (data: T[], meta: ResponseMeta) => void
  onGetOne?: (data: T, meta: ResponseMeta) => void
  onCreate?: (data: T, meta: ResponseMeta) => void
  onUpdate?: (data: T, meta: ResponseMeta) => void
  onPatch?: (data: T, meta: ResponseMeta) => void
  onDelete?: (id: string, meta: ResponseMeta) => void
  onError?: (error: Error, meta: ErrorMeta) => void
}

export interface LocalStoreConfig<T> {
  onSet?: (data: T) => void
  onPatch?: (data: T) => void
  onClear?: () => void
}

export interface LocalArrayStoreConfig<T> {
  onAdd?: (item: T) => void
  onUpdate?: (item: T) => void
  onPatch?: (item: T) => void
  onDelete?: (id: string) => void
  onClear?: () => void
}

export interface BaseStore {
  readonly status: StoreStatus
  subscribeToStatus: (listener: Listener) => () => void
  clear: () => void
  dispose: () => void
}

export interface Store<T extends { id: string }> extends BaseStore {
  readonly value: T | null
  get: (params?: Record<string, string | number>) => Promise<T>
  update: (data: T) => Promise<T>
  patch: (data: Partial<T> & { id: string }) => Promise<T>
  delete: (params: { id: string }) => Promise<void>
}

export interface ArrayStore<T extends { id: string }> extends BaseStore {
  readonly value: T[]
  readonly meta: Record<string, unknown>
  get: (params?: Record<string, string | number>) => Promise<T[]>
  getOne: (params: { id: string }) => Promise<T>
  create: (data: Omit<T, 'id'>) => Promise<T>
  update: (data: T) => Promise<T>
  patch: (data: Partial<T> & { id: string }) => Promise<T>
  delete: (params: { id: string }) => Promise<void>
}

export interface LocalStore<T> {
  readonly value: T
  get: () => T
  set: (data: T) => void
  patch: (data: Partial<T>) => void
  clear: () => void
  dispose: () => void
}

export interface LocalArrayStore<T extends { id: string }> {
  readonly value: T[]
  get: () => T[]
  add: (item: T) => void
  update: (item: T) => void
  patch: (data: Partial<T> & { id: string }) => void
  delete: (params: { id: string }) => void
  clear: () => void
  dispose: () => void
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
