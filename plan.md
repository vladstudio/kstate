KState — Complete Technical Specification v1.0

1. Overview

KState is a minimal, type-safe state management library for React SPAs (Vite + TypeScript). It provides global stores with fine-grained proxy-based reactivity, optimistic updates with auto-rollback, and sync adapters for REST APIs and localStorage.

Design Principles

- Minimal bundle size: No external dependencies except React
- Zero boilerplate: Convention over configuration
- Optimistic-first: UI updates before network confirmation
- Fine-grained reactivity: Components re-render only when their subscribed path changes
- TypeScript-native: Full type inference, no manual type annotations needed

Tech Stack

- React 18+
- TypeScript 5+
- Vite (client-side SPA only)
- No SSR support

---
2. Public API

Exports from kstate

// Configuration
export { configureKState } from './config'

// Store creators
export { createApiStore } from './stores/createApiStore'
export { createApiArrayStore } from './stores/createApiArrayStore'
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

---
3. Type Definitions

// ============================================
// OPERATIONS
// ============================================

type Operation = 'get' | 'getOne' | 'create' | 'update' | 'patch' | 'delete'

// ============================================
// META TYPES
// ============================================

interface ResponseMeta {
  status: number
  headers: Record<string, string>
  url: string
  duration: number // ms
  [key: string]: unknown // Additional fields from response (pagination, etc.)
}

interface ErrorMeta {
  operation: Operation
  endpoint: string
  params: Record<string, string>
  rollbackData: unknown | null // Previous state (for optimistic rollback)
}

// ============================================
// STORE STATUS
// ============================================

interface StoreStatus {
  isLoading: boolean      // True during first fetch (no data yet)
  isRevalidating: boolean // True when fetching but already has data
  isOffline: boolean      // True when navigator.onLine === false
  error: Error | null     // Last error, cleared on successful fetch
  lastUpdated: number     // Timestamp (Date.now()) of last successful fetch, 0 if never
}

// ============================================
// GLOBAL CONFIG
// ============================================

interface KStateConfig {
  baseUrl?: string
  getHeaders?: () => Promise<Record<string, string>> | Record<string, string>
  onError?: (error: Error, operation: Operation, meta: ErrorMeta) => void
}

// ============================================
// SINGLE STORE
// ============================================

interface StoreConfig<T> {
  endpoints?: {
    get?: string    // e.g., '/users/:id'
    update?: string // e.g., '/users/:id'
    patch?: string  // e.g., '/users/:id'
    delete?: string // e.g., '/users/:id'
  }
  dataKey?: string    // Response unwrap key, e.g., 'user'
  requestKey?: string // Request wrap key, e.g., 'user'

  // Revalidation
  ttl?: number                 // Cache TTL in ms. Default: 60000
  reloadOnMount?: boolean      // Default: false
  reloadOnFocus?: boolean      // Default: false
  reloadOnReconnect?: boolean  // Default: true
  reloadInterval?: number      // ms, 0 = disabled. Default: 0

  // Event handlers
  onGet?: (data: T, meta: ResponseMeta) => void
  onUpdate?: (data: T, meta: ResponseMeta) => void
  onPatch?: (data: T, meta: ResponseMeta) => void
  onDelete?: (meta: ResponseMeta) => void
  onError?: (error: Error, meta: ErrorMeta) => void
}

interface Store<T> {
  // Current value (non-reactive, for reading outside React)
  readonly value: T | null

  // Status
  readonly status: StoreStatus

  // Operations
  get(params?: Record<string, string | number>): Promise<T>
  update(data: T): Promise<T>
  patch(data: Partial<T> & { id: string }): Promise<T>
  delete(params: { id: string }): Promise<void>
  clear(): void

  // For proxy-based access (internal)
  [key: string]: unknown
}

// ============================================
// ARRAY STORE
// ============================================

interface ArrayStoreConfig<T> {
  endpoints?: {
    get?: string     // e.g., '/users'
    getOne?: string  // e.g., '/users/:id'
    create?: string  // e.g., '/users'
    update?: string  // e.g., '/users/:id'
    patch?: string   // e.g., '/users/:id'
    delete?: string  // e.g., '/users/:id'
  }
  dataKey?: string    // Response unwrap key for arrays, e.g., 'items'
  requestKey?: string // Request wrap key

  // Same revalidation options as StoreConfig
  ttl?: number
  reloadOnMount?: boolean
  reloadOnFocus?: boolean
  reloadOnReconnect?: boolean
  reloadInterval?: number

  // Event handlers
  onGet?: (data: T[], meta: ResponseMeta) => void
  onGetOne?: (data: T, meta: ResponseMeta) => void
  onCreate?: (data: T, meta: ResponseMeta) => void
  onUpdate?: (data: T, meta: ResponseMeta) => void
  onPatch?: (data: T, meta: ResponseMeta) => void
  onDelete?: (id: string, meta: ResponseMeta) => void
  onError?: (error: Error, meta: ErrorMeta) => void
}

interface ArrayStore<T extends { id: string }> {
  // Current array (non-reactive)
  readonly value: T[]

  // Response meta from last get() call
  readonly meta: Record<string, unknown>

  // Status
  readonly status: StoreStatus

  // Operations
  get(params?: Record<string, string | number>): Promise<T[]>
  getOne(params: { id: string }): Promise<T>
  create(data: Omit<T, 'id'>): Promise<T>
  update(data: T): Promise<T>
  patch(data: Partial<T> & { id: string }): Promise<T>
  delete(params: { id: string }): Promise<void>
  clear(): void

  // Array index access for proxy (internal)
  [index: number]: T
}

// ============================================
// LOCAL STORES
// ============================================

interface LocalStoreConfig<T> {
  // No network options, just event handlers
  onSet?: (data: T) => void
  onPatch?: (data: T) => void
  onClear?: () => void
}

interface LocalStore<T> {
  readonly value: T
  get(): T
  set(data: T): void
  patch(data: Partial<T>): void
  clear(): void // Resets to defaultValue

  [key: string]: unknown
}

interface LocalArrayStoreConfig<T> {
  onAdd?: (item: T) => void
  onUpdate?: (item: T) => void
  onPatch?: (item: T) => void
  onDelete?: (id: string) => void
  onClear?: () => void
}

interface LocalArrayStore<T extends { id: string }> {
  readonly value: T[]
  get(): T[]
  add(item: T): void
  update(item: T): void
  patch(data: Partial<T> & { id: string }): void
  delete(params: { id: string }): void
  clear(): void

  [index: number]: T
}

// ============================================
// COMPUTED STORE
// ============================================

interface ComputedStore<T> {
  readonly value: T
  [key: string]: unknown // For proxy access
}

---
4. Global Configuration

configureKState(config)

Must be called once at app startup, before any store operations.

// src/config.ts

let globalConfig: KStateConfig = {
  baseUrl: '',
  getHeaders: () => ({}),
  onError: undefined,
}

export function configureKState(config: KStateConfig): void {
  globalConfig = { ...globalConfig, ...config }
}

export function getConfig(): KStateConfig {
  return globalConfig
}

Usage Example

// main.tsx
import { configureKState } from 'kstate'
import { supabase } from './supabase'

configureKState({
  baseUrl: 'https://api.myapp.com',

  getHeaders: async () => {
    const { data } = await supabase.auth.getSession()
    const token = data.session?.access_token
    return token ? { Authorization: `Bearer ${token}` } : {}
  },

  onError: (error, operation, meta) => {
    console.error(`[KState] ${operation} failed:`, error.message)
    // Show toast, log to Sentry, etc.
  },
})

---
5. URL & Request Handling

URL Parameter Replacement

URL params use :paramName syntax. Replacement algorithm:

function buildUrl(
  template: string,
  params: Record<string, string | number>
): { url: string; queryParams: Record<string, string | number> } {
  const queryParams: Record<string, string | number> = {}

  let url = template.replace(/:([a-zA-Z_][a-zA-Z0-9_]*)/g, (match, key) => {
    if (key in params) {
      const value = params[key]
      // Mark as used by not adding to queryParams
      return encodeURIComponent(String(value))
    }
    throw new Error(`Missing URL parameter: ${key}`)
  })

  // Remaining params become query string
  for (const [key, value] of Object.entries(params)) {
    if (!template.includes(`:${key}`)) {
      queryParams[key] = value
    }
  }

  return { url, queryParams }
}

function appendQueryString(
  url: string,
  params: Record<string, string | number>
): string {
  const entries = Object.entries(params)
  if (entries.length === 0) return url

  const queryString = entries
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
    .join('&')

  return `${url}?${queryString}`
}

Examples

buildUrl('/users/:id', { id: '123', page: 1 })
// → { url: '/users/123', queryParams: { page: 1 } }

buildUrl('/users', { page: 1, pageSize: 100 })
// → { url: '/users', queryParams: { page: 1, pageSize: 100 } }

appendQueryString('/users/123', {})
// → '/users/123'

appendQueryString('/users', { page: 1, pageSize: 100 })
// → '/users?page=1&pageSize=100'

Reserved Parameter: _force

The _force parameter bypasses TTL cache:

await users.get({ page: 1, _force: true })
// Always fetches, ignores cache

_force is stripped before building the URL and never sent to the server.

---
6. API Fetch Implementation

Core Fetch Function

// src/sync/api.ts

interface FetchOptions {
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  endpoint: string
  params?: Record<string, string | number>
  body?: unknown
  dataKey?: string
  requestKey?: string
}

interface FetchResult<T> {
  data: T
  meta: ResponseMeta
}

async function apiFetch<T>(options: FetchOptions): Promise<FetchResult<T>> {
  const config = getConfig()
  const startTime = Date.now()

  // Build URL
  const { url: pathUrl, queryParams } = buildUrl(
    options.endpoint,
    options.params ?? {}
  )
  const fullUrl = appendQueryString(
    `${config.baseUrl}${pathUrl}`,
    queryParams
  )

  // Build headers
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(await config.getHeaders?.() ?? {}),
  }

  // Build body
  let body: string | undefined
  if (options.body !== undefined) {
    const payload = options.requestKey
      ? { [options.requestKey]: options.body }
      : options.body
    body = JSON.stringify(payload)
  }

  // Execute fetch
  const response = await fetch(fullUrl, {
    method: options.method,
    headers,
    body,
  })

  // Parse response
  const duration = Date.now() - startTime

  if (!response.ok) {
    const errorBody = await response.text()
    let message = `HTTP ${response.status}`
    try {
      const parsed = JSON.parse(errorBody)
      message = parsed.message ?? parsed.error ?? message
    } catch {}
    throw new Error(message)
  }

  // Handle empty response (204 No Content)
  if (response.status === 204) {
    return {
      data: undefined as T,
      meta: {
        status: response.status,
        headers: Object.fromEntries(response.headers.entries()),
        url: fullUrl,
        duration,
      },
    }
  }

  const json = await response.json()

  // Extract data using dataKey
  let data: T
  const meta: ResponseMeta = {
    status: response.status,
    headers: Object.fromEntries(response.headers.entries()),
    url: fullUrl,
    duration,
  }

  if (options.dataKey && options.dataKey in json) {
    data = json[options.dataKey]
    // Put remaining keys into meta
    for (const [key, value] of Object.entries(json)) {
      if (key !== options.dataKey) {
        meta[key] = value
      }
    }
  } else {
    data = json
  }

  return { data, meta }
}

Response Unwrapping Examples

// API returns: { user: { id: '1', name: 'John' }, updatedAt: '2024-01-01' }
// Config: dataKey: 'user'
// Result: data = { id: '1', name: 'John' }, meta = { ..., updatedAt: '2024-01-01' }

// API returns: { items: [...], page: 1, totalPages: 5, hasMore: true }
// Config: dataKey: 'items'
// Result: data = [...], meta = { ..., page: 1, totalPages: 5, hasMore: true }

// API returns: { id: '1', name: 'John' }
// Config: dataKey: undefined
// Result: data = { id: '1', name: 'John' }, meta = { ... }

Request Wrapping Examples

// Input: { name: 'John', age: 30 }
// Config: requestKey: 'user'
// Sent: { user: { name: 'John', age: 30 } }

// Input: { name: 'John', age: 30 }
// Config: requestKey: undefined
// Sent: { name: 'John', age: 30 }

---
7. Subscription System

Core Subscriber Manager

// src/core/subscribers.ts

type Listener = () => void
type Path = (string | number)[]

interface Subscription {
  path: Path
  listener: Listener
}

class SubscriberManager {
  private subscriptions = new Set<Subscription>()

  subscribe(path: Path, listener: Listener): () => void {
    const subscription: Subscription = { path, listener }
    this.subscriptions.add(subscription)

    // Return unsubscribe function
    return () => {
      this.subscriptions.delete(subscription)
    }
  }

  notify(changedPaths: Path[]): void {
    for (const subscription of this.subscriptions) {
      if (this.shouldNotify(subscription.path, changedPaths)) {
        subscription.listener()
      }
    }
  }

  private shouldNotify(subscribedPath: Path, changedPaths: Path[]): boolean {
    for (const changedPath of changedPaths) {
      if (this.pathMatches(subscribedPath, changedPath)) {
        return true
      }
    }
    return false
  }

  private pathMatches(subscribed: Path, changed: Path): boolean {
    // Subscribed to root → always notify
    if (subscribed.length === 0) return true

    // Changed at root → notify everyone
    if (changed.length === 0) return true

    // Check if paths overlap
    const minLen = Math.min(subscribed.length, changed.length)
    for (let i = 0; i < minLen; i++) {
      if (subscribed[i] !== changed[i]) {
        return false
      }
    }

    // Paths overlap: either subscribed is ancestor or descendant of changed
    return true
  }
}

Path Matching Examples

Subscribed: []           Changed: ['items', 0, 'name']  → NOTIFY (root)
Subscribed: ['items']    Changed: ['items', 0, 'name']  → NOTIFY (ancestor)
Subscribed: ['items', 0] Changed: ['items', 0, 'name']  → NOTIFY (ancestor)
Subscribed: ['items', 0, 'name'] Changed: ['items', 0]  → NOTIFY (descendant)
Subscribed: ['items', 0] Changed: ['items', 1]          → NO (different index)
Subscribed: ['items', 0, 'name'] Changed: ['items', 0, 'age'] → NO (sibling)

---
8. Reactive Proxy System

Proxy Factory

Creates a proxy that tracks property access paths for fine-grained subscriptions.

// src/core/proxy.ts

interface ProxyContext<T> {
  getData: () => T
  subscribe: (path: Path, listener: Listener) => () => void
  path: Path
}

function createReactiveProxy<T extends object>(context: ProxyContext<T>): T {
  const handler: ProxyHandler<T> = {
    get(target, prop, receiver) {
      // Handle special properties
      if (prop === '__isKStateProxy') return true
      if (prop === '__path') return context.path
      if (prop === '__subscribe') return context.subscribe
      if (prop === '__getData') return context.getData

      // Get current data
      const data = context.getData()
      if (data === null || data === undefined) {
        return undefined
      }

      const value = Reflect.get(data, prop, receiver)

      // For primitive values, return as-is
      if (value === null || typeof value !== 'object') {
        return value
      }

      // For objects/arrays, return nested proxy
      const newPath = [...context.path, prop as string | number]
      return createReactiveProxy({
        getData: () => {
          const d = context.getData()
          return d?.[prop as keyof typeof d] as object
        },
        subscribe: context.subscribe,
        path: newPath,
      })
    },
  }

  // Create a dummy target (actual data comes from getData)
  const target = (Array.isArray(context.getData()) ? [] : {}) as T
  return new Proxy(target, handler)
}

Store Proxy Wrapper

function wrapStoreWithProxy<T>(store: {
  getValue: () => T
  subscribers: SubscriberManager
}): T & { __isKStateProxy: true } {
  return createReactiveProxy({
    getData: store.getValue as () => T & object,
    subscribe: (path, listener) => store.subscribers.subscribe(path, listener),
    path: [],
  }) as T & { __isKStateProxy: true }
}

---
9. React Hooks Implementation

useStore

// src/hooks/useStore.ts

import { useSyncExternalStore, useRef, useCallback } from 'react'

type ProxyOrStore = {
  __isKStateProxy?: boolean
  __path?: Path
  __subscribe?: (path: Path, listener: Listener) => () => void
  __getData?: () => unknown
  value?: unknown
  subscribers?: SubscriberManager
}

export function useStore<T>(proxyOrStore: ProxyOrStore): T {
  // Determine if this is a proxy path or a store root
  const isProxy = proxyOrStore.__isKStateProxy === true

  const subscribe = useCallback((onStoreChange: () => void) => {
    if (isProxy) {
      // Subscribe to specific path
      const path = proxyOrStore.__path ?? []
      const subscribeFn = proxyOrStore.__subscribe!
      return subscribeFn(path, onStoreChange)
    } else {
      // Subscribe to root
      const store = proxyOrStore as { subscribers: SubscriberManager }
      return store.subscribers.subscribe([], onStoreChange)
    }
  }, [proxyOrStore, isProxy])

  const getSnapshot = useCallback(() => {
    if (isProxy) {
      return proxyOrStore.__getData?.()
    } else {
      return (proxyOrStore as { value: unknown }).value
    }
  }, [proxyOrStore, isProxy])

  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot) as T
}

useStoreStatus

// src/hooks/useStoreStatus.ts

import { useSyncExternalStore } from 'react'

interface StoreWithStatus {
  status: StoreStatus
  subscribeToStatus: (listener: () => void) => () => void
}

export function useStoreStatus(store: StoreWithStatus): StoreStatus {
  return useSyncExternalStore(
    store.subscribeToStatus,
    () => store.status,
    () => store.status
  )
}

---
10. Single Store Implementation

createApiStore<T>

// src/stores/createApiStore.ts

export function createApiStore<T extends { id: string }>(
  config: StoreConfig<T> = {}
): Store<T> {
  // Internal state
  let data: T | null = null
  let status: StoreStatus = {
    isLoading: false,
    isRevalidating: false,
    isOffline: !navigator.onLine,
    error: null,
    lastUpdated: 0,
  }
  let lastFetchParams: string | null = null
  let fetchPromise: Promise<T> | null = null

  // Subscribers
  const subscribers = new SubscriberManager()
  const statusSubscribers = new Set<() => void>()

  // Defaults
  const ttl = config.ttl ?? 60000
  const reloadOnMount = config.reloadOnMount ?? false
  const reloadOnFocus = config.reloadOnFocus ?? false
  const reloadOnReconnect = config.reloadOnReconnect ?? true
  const reloadInterval = config.reloadInterval ?? 0

  // Status update helper
  function setStatus(updates: Partial<StoreStatus>) {
    status = { ...status, ...updates }
    statusSubscribers.forEach(listener => listener())
  }

  // Network listeners
  function setupNetworkListeners() {
    window.addEventListener('online', () => {
      setStatus({ isOffline: false })
      if (reloadOnReconnect && lastFetchParams !== null) {
        store.get(JSON.parse(lastFetchParams))
      }
    })

    window.addEventListener('offline', () => {
      setStatus({ isOffline: true })
    })

    if (reloadOnFocus) {
      window.addEventListener('focus', () => {
        if (lastFetchParams !== null) {
          store.get(JSON.parse(lastFetchParams))
        }
      })
    }

    if (reloadInterval > 0) {
      setInterval(() => {
        if (lastFetchParams !== null) {
          store.get(JSON.parse(lastFetchParams))
        }
      }, reloadInterval)
    }
  }

  const store: Store<T> = {
    get value() {
      return data
    },

    get status() {
      return status
    },

    async get(params = {}) {
      const endpoint = config.endpoints?.get
      if (!endpoint) throw new Error('No get endpoint configured')

      const paramsKey = JSON.stringify(params)
      const force = '_force' in params
      const cleanParams = { ...params }
      delete cleanParams._force

      // Check cache
      const now = Date.now()
      const isFresh = lastFetchParams === paramsKey &&
                      now - status.lastUpdated < ttl

      if (isFresh && !force) {
        // Return cached data, maybe revalidate in background
        if (now - status.lastUpdated > ttl / 2) {
          // Stale-while-revalidate
          fetchInBackground()
        }
        return data!
      }

      // Deduplicate concurrent requests
      if (fetchPromise && lastFetchParams === paramsKey) {
        return fetchPromise
      }

      lastFetchParams = paramsKey

      async function fetchInBackground() {
        setStatus({ isRevalidating: true })
        try {
          const result = await apiFetch<T>({
            method: 'GET',
            endpoint,
            params: cleanParams,
            dataKey: config.dataKey,
          })
          data = result.data
          setStatus({
            isRevalidating: false,
            error: null,
            lastUpdated: Date.now(),
          })
          subscribers.notify([[]])
          config.onGet?.(result.data, result.meta)
        } catch (error) {
          setStatus({ isRevalidating: false, error: error as Error })
          handleError(error as Error, 'get', cleanParams, null)
        }
      }

      // First load or force refresh
      setStatus({ isLoading: data === null, isRevalidating: data !== null })

      fetchPromise = (async () => {
        try {
          const result = await apiFetch<T>({
            method: 'GET',
            endpoint,
            params: cleanParams,
            dataKey: config.dataKey,
          })
          data = result.data
          setStatus({
            isLoading: false,
            isRevalidating: false,
            error: null,
            lastUpdated: Date.now(),
          })
          subscribers.notify([[]])
          config.onGet?.(result.data, result.meta)
          return data
        } catch (error) {
          setStatus({
            isLoading: false,
            isRevalidating: false,
            error: error as Error,
          })
          handleError(error as Error, 'get', cleanParams, null)
          throw error
        } finally {
          fetchPromise = null
        }
      })()

      return fetchPromise
    },

    async update(newData: T) {
      const endpoint = config.endpoints?.update
      if (!endpoint) throw new Error('No update endpoint configured')

      // Optimistic update
      const previousData = data
      data = newData
      subscribers.notify([[]])

      try {
        const result = await apiFetch<T>({
          method: 'PUT',
          endpoint,
          params: { id: newData.id },
          body: newData,
          dataKey: config.dataKey,
          requestKey: config.requestKey,
        })
        data = result.data
        setStatus({ lastUpdated: Date.now(), error: null })
        subscribers.notify([[]])
        config.onUpdate?.(result.data, result.meta)
        return data
      } catch (error) {
        // Rollback
        data = previousData
        subscribers.notify([[]])
        handleError(error as Error, 'update', { id: newData.id }, previousData)
        throw error
      }
    },

    async patch(partialData: Partial<T> & { id: string }) {
      const endpoint = config.endpoints?.patch
      if (!endpoint) throw new Error('No patch endpoint configured')
      if (!data) throw new Error('No data to patch')

      // Optimistic update
      const previousData = data
      data = { ...data, ...partialData }
      subscribers.notify([[]])

      try {
        const result = await apiFetch<T>({
          method: 'PATCH',
          endpoint,
          params: { id: partialData.id },
          body: partialData,
          dataKey: config.dataKey,
          requestKey: config.requestKey,
        })
        data = result.data
        setStatus({ lastUpdated: Date.now(), error: null })
        subscribers.notify([[]])
        config.onPatch?.(result.data, result.meta)
        return data
      } catch (error) {
        // Rollback
        data = previousData
        subscribers.notify([[]])
        handleError(error as Error, 'patch', { id: partialData.id }, previousData)
        throw error
      }
    },

    async delete(params: { id: string }) {
      const endpoint = config.endpoints?.delete
      if (!endpoint) throw new Error('No delete endpoint configured')

      // Optimistic update
      const previousData = data
      data = null
      subscribers.notify([[]])

      try {
        const result = await apiFetch<void>({
          method: 'DELETE',
          endpoint,
          params,
        })
        setStatus({ lastUpdated: Date.now(), error: null })
        config.onDelete?.(result.meta)
      } catch (error) {
        // Rollback
        data = previousData
        subscribers.notify([[]])
        handleError(error as Error, 'delete', params, previousData)
        throw error
      }
    },

    clear() {
      data = null
      lastFetchParams = null
      setStatus({
        isLoading: false,
        isRevalidating: false,
        error: null,
        lastUpdated: 0,
      })
      subscribers.notify([[]])
    },

    subscribeToStatus(listener: () => void) {
      statusSubscribers.add(listener)
      return () => statusSubscribers.delete(listener)
    },
  }

  function handleError(
    error: Error,
    operation: Operation,
    params: Record<string, string>,
    rollbackData: T | null
  ) {
    const meta: ErrorMeta = {
      operation,
      endpoint: config.endpoints?.[operation] ?? '',
      params,
      rollbackData,
    }
    config.onError?.(error, meta)
    getConfig().onError?.(error, operation, meta)
  }

  // Setup network listeners
  setupNetworkListeners()

  // Return proxy-wrapped store
  return wrapStoreWithProxy({
    getValue: () => data,
    subscribers,
  }) as unknown as Store<T>
}

---
11. Array Store Implementation

createApiArrayStore<T>

// src/stores/createApiArrayStore.ts

export function createApiArrayStore<T extends { id: string }>(
  config: ArrayStoreConfig<T> = {}
): ArrayStore<T> {
  // Internal state
  let items: T[] = []
  let meta: Record<string, unknown> = {}
  let status: StoreStatus = {
    isLoading: false,
    isRevalidating: false,
    isOffline: !navigator.onLine,
    error: null,
    lastUpdated: 0,
  }
  let lastFetchParams: string | null = null
  let fetchPromise: Promise<T[]> | null = null

  // Subscribers
  const subscribers = new SubscriberManager()
  const statusSubscribers = new Set<() => void>()

  // Defaults (same as single store)
  const ttl = config.ttl ?? 60000
  const reloadOnReconnect = config.reloadOnReconnect ?? true
  // ... other defaults

  function setStatus(updates: Partial<StoreStatus>) {
    status = { ...status, ...updates }
    statusSubscribers.forEach(listener => listener())
  }

  function findIndex(id: string): number {
    return items.findIndex(item => item.id === id)
  }

  const store: ArrayStore<T> = {
    get value() {
      return items
    },

    get meta() {
      return meta
    },

    get status() {
      return status
    },

    async get(params = {}) {
      const endpoint = config.endpoints?.get
      if (!endpoint) throw new Error('No get endpoint configured')

      const paramsKey = JSON.stringify(params)
      const force = '_force' in params
      const cleanParams = { ...params }
      delete cleanParams._force

      // Determine if this is pagination (appending) or fresh fetch
      const isPagination = 'page' in cleanParams &&
                            lastFetchParams !== null &&
                            cleanParams.page > 1

      // Cache check (only for same params, not pagination)
      const now = Date.now()
      const isFresh = lastFetchParams === paramsKey &&
                      now - status.lastUpdated < ttl

      if (isFresh && !force && !isPagination) {
        return items
      }

      // Deduplicate
      if (fetchPromise && lastFetchParams === paramsKey && !isPagination) {
        return fetchPromise
      }

      if (!isPagination) {
        lastFetchParams = paramsKey
      }

      setStatus({
        isLoading: items.length === 0 && !isPagination,
        isRevalidating: items.length > 0 || isPagination,
      })

      fetchPromise = (async () => {
        try {
          const result = await apiFetch<T[]>({
            method: 'GET',
            endpoint,
            params: cleanParams,
            dataKey: config.dataKey,
          })

          if (isPagination) {
            // Append new items, avoiding duplicates by id
            const existingIds = new Set(items.map(i => i.id))
            const newItems = result.data.filter(i => !existingIds.has(i.id))
            items = [...items, ...newItems]
          } else {
            // Replace
            items = result.data
          }

          meta = result.meta
          setStatus({
            isLoading: false,
            isRevalidating: false,
            error: null,
            lastUpdated: Date.now(),
          })
          subscribers.notify([[]])
          config.onGet?.(items, result.meta)
          return items
        } catch (error) {
          setStatus({
            isLoading: false,
            isRevalidating: false,
            error: error as Error,
          })
          handleError(error as Error, 'get', cleanParams, null)
          throw error
        } finally {
          fetchPromise = null
        }
      })()

      return fetchPromise
    },

    async getOne(params: { id: string }) {
      const endpoint = config.endpoints?.getOne
      if (!endpoint) throw new Error('No getOne endpoint configured')

      setStatus({ isRevalidating: true })

      try {
        const result = await apiFetch<T>({
          method: 'GET',
          endpoint,
          params,
          dataKey: config.dataKey,
        })

        // Add or update in array
        const index = findIndex(params.id)
        if (index >= 0) {
          items = items.map((item, i) => i === index ? result.data : item)
          subscribers.notify([[index]])
        } else {
          items = [...items, result.data]
          subscribers.notify([[items.length - 1]])
        }

        setStatus({
          isRevalidating: false,
          error: null,
          lastUpdated: Date.now(),
        })
        config.onGetOne?.(result.data, result.meta)
        return result.data
      } catch (error) {
        setStatus({ isRevalidating: false, error: error as Error })
        handleError(error as Error, 'getOne', params, null)
        throw error
      }
    },

    async create(data: Omit<T, 'id'>) {
      const endpoint = config.endpoints?.create
      if (!endpoint) throw new Error('No create endpoint configured')

      // NOT optimistic - wait for server response with real ID
      setStatus({ isRevalidating: true })

      try {
        const result = await apiFetch<T>({
          method: 'POST',
          endpoint,
          body: data,
          dataKey: config.dataKey,
          requestKey: config.requestKey,
        })

        items = [...items, result.data]
        setStatus({
          isRevalidating: false,
          error: null,
          lastUpdated: Date.now(),
        })
        subscribers.notify([[items.length - 1]])
        config.onCreate?.(result.data, result.meta)
        return result.data
      } catch (error) {
        setStatus({ isRevalidating: false, error: error as Error })
        handleError(error as Error, 'create', {}, null)
        throw error
      }
    },

    async update(data: T) {
      const endpoint = config.endpoints?.update
      if (!endpoint) throw new Error('No update endpoint configured')

      const index = findIndex(data.id)
      if (index < 0) throw new Error(`Item with id ${data.id} not found`)

      // Optimistic update
      const previousItems = items
      items = items.map((item, i) => i === index ? data : item)
      subscribers.notify([[index]])

      try {
        const result = await apiFetch<T>({
          method: 'PUT',
          endpoint,
          params: { id: data.id },
          body: data,
          dataKey: config.dataKey,
          requestKey: config.requestKey,
        })

        items = items.map((item, i) => i === index ? result.data : item)
        setStatus({ lastUpdated: Date.now(), error: null })
        subscribers.notify([[index]])
        config.onUpdate?.(result.data, result.meta)
        return result.data
      } catch (error) {
        // Rollback
        items = previousItems
        subscribers.notify([[index]])
        handleError(error as Error, 'update', { id: data.id }, previousItems[index])
        throw error
      }
    },

    async patch(data: Partial<T> & { id: string }) {
      const endpoint = config.endpoints?.patch
      if (!endpoint) throw new Error('No patch endpoint configured')

      const index = findIndex(data.id)
      if (index < 0) throw new Error(`Item with id ${data.id} not found`)

      // Optimistic update
      const previousItems = items
      const previousItem = items[index]
      items = items.map((item, i) =>
        i === index ? { ...item, ...data } : item
      )
      subscribers.notify([[index]])

      try {
        const result = await apiFetch<T>({
          method: 'PATCH',
          endpoint,
          params: { id: data.id },
          body: data,
          dataKey: config.dataKey,
          requestKey: config.requestKey,
        })

        items = items.map((item, i) => i === index ? result.data : item)
        setStatus({ lastUpdated: Date.now(), error: null })
        subscribers.notify([[index]])
        config.onPatch?.(result.data, result.meta)
        return result.data
      } catch (error) {
        // Rollback
        items = previousItems
        subscribers.notify([[index]])
        handleError(error as Error, 'patch', { id: data.id }, previousItem)
        throw error
      }
    },

    async delete(params: { id: string }) {
      const endpoint = config.endpoints?.delete
      if (!endpoint) throw new Error('No delete endpoint configured')

      const index = findIndex(params.id)
      if (index < 0) throw new Error(`Item with id ${params.id} not found`)

      // Optimistic delete
      const previousItems = items
      const previousItem = items[index]
      items = items.filter(item => item.id !== params.id)
      subscribers.notify([[]])  // Notify all (indices shift)

      try {
        const result = await apiFetch<void>({
          method: 'DELETE',
          endpoint,
          params,
        })
        setStatus({ lastUpdated: Date.now(), error: null })
        config.onDelete?.(params.id, result.meta)
      } catch (error) {
        // Rollback
        items = previousItems
        subscribers.notify([[]])
        handleError(error as Error, 'delete', params, previousItem)
        throw error
      }
    },

    clear() {
      items = []
      meta = {}
      lastFetchParams = null
      setStatus({
        isLoading: false,
        isRevalidating: false,
        error: null,
        lastUpdated: 0,
      })
      subscribers.notify([[]])
    },

    subscribeToStatus(listener: () => void) {
      statusSubscribers.add(listener)
      return () => statusSubscribers.delete(listener)
    },
  }

  function handleError(
    error: Error,
    operation: Operation,
    params: Record<string, string>,
    rollbackData: T | null
  ) {
    const meta: ErrorMeta = {
      operation,
      endpoint: config.endpoints?.[operation] ?? '',
      params,
      rollbackData,
    }
    config.onError?.(error, meta)
    getConfig().onError?.(error, operation, meta)
  }

  // Setup network listeners (same as single store)
  setupNetworkListeners()

  // Return proxy-wrapped store
  return wrapStoreWithProxy({
    getValue: () => items,
    subscribers,
  }) as unknown as ArrayStore<T>
}

---
12. localStorage Store Implementation

createLocalStore<T>

// src/stores/createLocalStore.ts

export function createLocalStore<T>(
  key: string,
  defaultValue: T,
  config: LocalStoreConfig<T> = {}
): LocalStore<T> {
  // Internal state
  let data: T = loadFromStorage() ?? defaultValue

  // Subscribers
  const subscribers = new SubscriberManager()

  function loadFromStorage(): T | null {
    try {
      const stored = localStorage.getItem(key)
      return stored ? JSON.parse(stored) : null
    } catch {
      return null
    }
  }

  function saveToStorage(value: T): void {
    try {
      localStorage.setItem(key, JSON.stringify(value))
    } catch (error) {
      console.error('KState: Failed to save to localStorage', error)
    }
  }

  // Cross-tab sync
  window.addEventListener('storage', (event) => {
    if (event.key === key && event.newValue !== null) {
      try {
        data = JSON.parse(event.newValue)
        subscribers.notify([[]])
      } catch {}
    }
  })

  const store: LocalStore<T> = {
    get value() {
      return data
    },

    get() {
      return data
    },

    set(newData: T) {
      data = newData
      saveToStorage(data)
      subscribers.notify([[]])
      config.onSet?.(data)
    },

    patch(partial: Partial<T>) {
      data = { ...data, ...partial }
      saveToStorage(data)
      subscribers.notify([[]])
      config.onPatch?.(data)
    },

    clear() {
      data = defaultValue
      saveToStorage(data)
      subscribers.notify([[]])
      config.onClear?.()
    },
  }

  // Return proxy-wrapped store
  return wrapStoreWithProxy({
    getValue: () => data,
    subscribers,
  }) as unknown as LocalStore<T>
}

createLocalArrayStore<T>

// src/stores/createLocalArrayStore.ts

export function createLocalArrayStore<T extends { id: string }>(
  key: string,
  config: LocalArrayStoreConfig<T> = {}
): LocalArrayStore<T> {
  // Internal state
  let items: T[] = loadFromStorage() ?? []

  // Subscribers
  const subscribers = new SubscriberManager()

  function loadFromStorage(): T[] | null {
    try {
      const stored = localStorage.getItem(key)
      return stored ? JSON.parse(stored) : null
    } catch {
      return null
    }
  }

  function saveToStorage(value: T[]): void {
    try {
      localStorage.setItem(key, JSON.stringify(value))
    } catch (error) {
      console.error('KState: Failed to save to localStorage', error)
    }
  }

  function findIndex(id: string): number {
    return items.findIndex(item => item.id === id)
  }

  // Cross-tab sync
  window.addEventListener('storage', (event) => {
    if (event.key === key && event.newValue !== null) {
      try {
        items = JSON.parse(event.newValue)
        subscribers.notify([[]])
      } catch {}
    }
  })

  const store: LocalArrayStore<T> = {
    get value() {
      return items
    },

    get() {
      return items
    },

    add(item: T) {
      items = [...items, item]
      saveToStorage(items)
      subscribers.notify([[items.length - 1]])
      config.onAdd?.(item)
    },

    update(item: T) {
      const index = findIndex(item.id)
      if (index < 0) throw new Error(`Item with id ${item.id} not found`)

      items = items.map((i, idx) => idx === index ? item : i)
      saveToStorage(items)
      subscribers.notify([[index]])
      config.onUpdate?.(item)
    },

    patch(data: Partial<T> & { id: string }) {
      const index = findIndex(data.id)
      if (index < 0) throw new Error(`Item with id ${data.id} not found`)

      const updated = { ...items[index], ...data }
      items = items.map((i, idx) => idx === index ? updated : i)
      saveToStorage(items)
      subscribers.notify([[index]])
      config.onPatch?.(updated)
    },

    delete(params: { id: string }) {
      const index = findIndex(params.id)
      if (index < 0) throw new Error(`Item with id ${params.id} not found`)

      items = items.filter(item => item.id !== params.id)
      saveToStorage(items)
      subscribers.notify([[]])  // All indices shift
      config.onDelete?.(params.id)
    },

    clear() {
      items = []
      saveToStorage(items)
      subscribers.notify([[]])
      config.onClear?.()
    },
  }

  // Return proxy-wrapped store
  return wrapStoreWithProxy({
    getValue: () => items,
    subscribers,
  }) as unknown as LocalArrayStore<T>
}

---
13. Computed Stores

computed

// src/stores/computed.ts

type SourceStore = { value: unknown; subscribers: SubscriberManager }

// Single source
export function computed<T, R>(
  source: SourceStore & { value: T },
  selector: (value: T) => R
): ComputedStore<R>

// Multiple sources
export function computed<T extends unknown[], R>(
  sources: { [K in keyof T]: SourceStore & { value: T[K] } },
  selector: (values: T) => R
): ComputedStore<R>

export function computed(
  sourceOrSources: SourceStore | SourceStore[],
  selector: (value: unknown) => unknown
): ComputedStore<unknown> {
  const sources = Array.isArray(sourceOrSources)
    ? sourceOrSources
    : [sourceOrSources]

  // Subscribers
  const subscribers = new SubscriberManager()

  // Subscribe to all sources
  for (const source of sources) {
    source.subscribers.subscribe([], () => {
      subscribers.notify([[]])
    })
  }

  function getValue(): unknown {
    if (Array.isArray(sourceOrSources)) {
      const values = sources.map(s => s.value)
      return selector(values)
    } else {
      return selector(sourceOrSources.value)
    }
  }

  const store: ComputedStore<unknown> = {
    get value() {
      return getValue()
    },
  }

  // Return proxy-wrapped
  return wrapStoreWithProxy({
    getValue,
    subscribers,
  }) as unknown as ComputedStore<unknown>
}

Usage Examples

// Single source
const activeUsers = computed(users, items =>
  items.filter(u => u.isActive)
)

// Multiple sources
const dashboard = computed(
  [users, orders],
  ([userList, orderList]) => ({
    userCount: userList.length,
    orderCount: orderList.length,
    avgOrdersPerUser: orderList.length / userList.length,
  })
)

// In component
function Stats() {
  const stats = useStore(dashboard)
  return <div>Users: {stats.userCount}</div>
}

// Fine-grained
function UserCount() {
  const count = useStore(dashboard.userCount)
  return <span>{count}</span>
}

---
14. Complete Usage Example

// src/stores/users.ts
import { createApiArrayStore, computed } from 'kstate'

interface User {
  id: string
  name: string
  email: string
  isActive: boolean
  role: 'admin' | 'user'
}

export const users = createApiArrayStore<User>({
  endpoints: {
    get: '/users',
    getOne: '/users/:id',
    create: '/users',
    update: '/users/:id',
    patch: '/users/:id',
    delete: '/users/:id',
  },
  dataKey: 'items',
  requestKey: 'user',
  ttl: 30000,
  reloadOnFocus: true,

  onError: (error, meta) => {
    console.error(`Failed to ${meta.operation}:`, error.message)
  },
})

export const activeUsers = computed(users, items =>
  items.filter(u => u.isActive)
)

export const adminUsers = computed(users, items =>
  items.filter(u => u.role === 'admin')
)

// src/stores/settings.ts
import { createLocalStore } from 'kstate'

interface Settings {
  theme: 'light' | 'dark'
  language: string
  notifications: boolean
}

export const settings = createLocalStore<Settings>('app-settings', {
  theme: 'light',
  language: 'en',
  notifications: true,
})

// src/main.tsx
import { configureKState } from 'kstate'
import { supabase } from './supabase'

configureKState({
  baseUrl: import.meta.env.VITE_API_URL,
  getHeaders: async () => {
    const { data } = await supabase.auth.getSession()
    return data.session
      ? { Authorization: `Bearer ${data.session.access_token}` }
      : {}
  },
  onError: (error, operation, meta) => {
    toast.error(`Operation failed: ${error.message}`)
  },
})

ReactDOM.createRoot(document.getElementById('root')!).render(
  <App />
)

// src/components/UserList.tsx
import { useStore, useStoreStatus } from 'kstate'
import { users } from '../stores/users'
import { useEffect } from 'react'

export function UserList() {
  const items = useStore(users)
  const { isLoading, isRevalidating, error } = useStoreStatus(users)

  useEffect(() => {
    users.get({ pageSize: 100 })
  }, [])

  if (isLoading) return <Spinner />
  if (error) return <ErrorMessage error={error} />

  return (
    <div>
      {isRevalidating && <RefreshIndicator />}
      {items.map((user, index) => (
        <UserRow key={user.id} index={index} />
      ))}
      <button onClick={() => users.get({ page: 2, pageSize: 100 })}>
        Load More
      </button>
    </div>
  )
}

// Fine-grained: only re-renders when this specific user's name changes
function UserRow({ index }: { index: number }) {
  const name = useStore(users[index].name)
  const isActive = useStore(users[index].isActive)

  return (
    <div>
      <span>{name}</span>
      <span>{isActive ? '✓' : '✗'}</span>
    </div>
  )
}

// src/components/UserEditor.tsx
import { useStore } from 'kstate'
import { users } from '../stores/users'

export function UserEditor({ userId }: { userId: string }) {
  const user = useStore(users).find(u => u.id === userId)

  if (!user) return null

  const handleNameChange = (name: string) => {
    // Optimistic update - UI updates immediately
    users.patch({ id: userId, name })
  }

  const handleDelete = () => {
    // Optimistic delete - item removed immediately
    users.delete({ id: userId })
  }

  return (
    <div>
      <input
        value={user.name}
        onChange={e => handleNameChange(e.target.value)}
      />
      <button onClick={handleDelete}>Delete</button>
    </div>
  )
}

// src/components/ThemeToggle.tsx
import { useStore } from 'kstate'
import { settings } from '../stores/settings'

export function ThemeToggle() {
  const theme = useStore(settings.theme)

  return (
    <button onClick={() => settings.patch({
      theme: theme === 'light' ? 'dark' : 'light'
    })}>
      {theme === 'light' ? '🌙' : '☀️'}
    </button>
  )
}

---
15. File Structure

src/
├── index.ts                    # Public exports
├── config.ts                   # Global configuration
├── types.ts                    # All TypeScript types
├── stores/
│   ├── createApiStore.ts          # Single value API store
│   ├── createApiArrayStore.ts     # Array API store
│   ├── createLocalStore.ts     # Single value localStorage store
│   ├── createLocalArrayStore.ts # Array localStorage store
│   └── computed.ts             # Computed/derived stores
├── hooks/
│   ├── useStore.ts             # Main reactive hook
│   └── useStoreStatus.ts       # Network status hook
├── sync/
│   ├── api.ts                  # Fetch wrapper, URL building
│   └── localStorage.ts         # localStorage helpers
└── core/
    ├── proxy.ts                # Reactive proxy factory
    └── subscribers.ts          # Subscription manager

---
16. Edge Cases & Behavior

Concurrent Requests

- Same get() params: Deduplicated, single request, promise shared
- Different params: Both execute
- Pagination: Never deduplicated (always appends)

Network Offline

- isOffline becomes true
- Operations still attempt (will fail)
- On reconnect: Auto-refetch if reloadOnReconnect: true

Optimistic Rollback

- Rollback restores exact previous state
- onError receives rollbackData in meta
- UI updates twice: optimistic → rollback

localStorage Quota

- On quota error: Log warning, continue without persistence
- Data remains in memory until page refresh

Empty Responses

- GET returning []: Valid, items = []
- DELETE returning 204: Valid, no body expected
- Null/undefined in dataKey: Throws error

Cross-Tab Sync

- Only localStorage stores
- Only via storage event (not same tab)
- Same tab changes: Normal subscriber notification

---
17. Bundle Considerations

No External Dependencies

- Uses native fetch
- Uses native Proxy
- Uses React's useSyncExternalStore
- No lodash, no axios, no external state libraries

Estimated Size

- Target: < 5KB minified + gzipped
- All features included (no tree-shaking needed per requirements)