# KState User Guide

Complete usage guide for React/TypeScript developers.

## Table of Contents

1. [Getting Started](#getting-started)
2. [Global Configuration](#global-configuration)
3. [API Stores](#api-stores)
   - [Single Store](#single-store-createstore)
   - [Array Store](#array-store-createarraystore)
4. [localStorage Stores](#localstorage-stores)
   - [Local Store](#local-store-createlocalstore)
   - [Local Array Store](#local-array-store-createlocalarraystore)
5. [SSE Stores](#sse-stores)
6. [Computed Stores](#computed-stores)
7. [React Hooks](#react-hooks)
   - [useStore](#usestore)
   - [useStoreStatus](#usestorestatus)
8. [Fine-Grained Reactivity](#fine-grained-reactivity)
9. [Optimistic Updates](#optimistic-updates)
10. [Caching & Revalidation](#caching--revalidation)
11. [Pagination](#pagination)
12. [Error Handling](#error-handling)
13. [TypeScript](#typescript)
14. [Complete Examples](#complete-examples)

---

## Getting Started

### Installation

```bash
bun add kstate
```

### Basic Setup

```tsx
// main.tsx
import { configureKState } from 'kstate'

configureKState({
  baseUrl: 'https://api.example.com',
  getHeaders: async () => {
    const token = localStorage.getItem('token')
    return token ? { Authorization: `Bearer ${token}` } : {}
  }
})

// Then render your app
ReactDOM.createRoot(document.getElementById('root')!).render(<App />)
```

---

## Global Configuration

Call `configureKState()` once at app startup, before any store operations.

```tsx
import { configureKState } from 'kstate'

configureKState({
  // Base URL prepended to all API endpoints
  baseUrl: 'https://api.example.com',

  // Headers for all API requests (can be async)
  getHeaders: async () => {
    const { data } = await supabase.auth.getSession()
    return data.session
      ? { Authorization: `Bearer ${data.session.access_token}` }
      : {}
  },

  // Global error handler (called for all store errors)
  onError: (error, operation, meta) => {
    console.error(`[KState] ${operation} failed:`, error.message)
    toast.error(error.message)
  }
})
```

### Configuration Options

| Option | Type | Description |
|--------|------|-------------|
| `baseUrl` | `string` | Base URL for all API requests |
| `getHeaders` | `() => Promise<Record<string, string>> \| Record<string, string>` | Function returning headers for requests |
| `onError` | `(error, operation, meta) => void` | Global error handler |

---

## API Stores

### Single Store (`createApiStore`)

For managing a single JSON object synced with an API.

```tsx
import { createApiStore } from 'kstate'

interface UserProfile {
  id: string
  name: string
  email: string
  avatar: string
}

export const userProfile = createApiStore<UserProfile>({
  endpoints: {
    get: '/users/:id',
    update: '/users/:id',
    patch: '/users/:id',
    delete: '/users/:id'
  },
  dataKey: 'user',      // Response: { user: {...} }
  requestKey: 'user',   // Request body: { user: {...} }
  ttl: 60000,           // Cache for 1 minute
  reloadOnFocus: true,  // Refetch when tab gains focus
})
```

#### Store Operations

```tsx
// Fetch data
await userProfile.get({ id: '123' })

// Full update (replaces entire object)
await userProfile.update({
  id: '123',
  name: 'John Doe',
  email: 'john@example.com',
  avatar: 'https://...'
})

// Partial update (merges with existing)
await userProfile.patch({ id: '123', name: 'Johnny' })

// Delete
await userProfile.delete({ id: '123' })

// Clear local state
userProfile.clear()

// Access current value (non-reactive)
console.log(userProfile.value)

// Cleanup (removes event listeners)
userProfile.dispose()
```

#### Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `endpoints.get` | `string` | - | GET endpoint URL |
| `endpoints.update` | `string` | - | PUT endpoint URL |
| `endpoints.patch` | `string` | - | PATCH endpoint URL |
| `endpoints.delete` | `string` | - | DELETE endpoint URL |
| `dataKey` | `string` | - | Key to extract data from response |
| `requestKey` | `string` | - | Key to wrap request body |
| `ttl` | `number` | `60000` | Cache TTL in milliseconds |
| `reloadOnMount` | `boolean` | `false` | Refetch on component mount |
| `reloadOnFocus` | `boolean` | `false` | Refetch when tab gains focus |
| `reloadOnReconnect` | `boolean` | `true` | Refetch when coming back online |
| `reloadInterval` | `number` | `0` | Auto-refetch interval (0 = disabled) |

#### Event Handlers

```tsx
const userProfile = createApiStore<UserProfile>({
  endpoints: { ... },

  onGet: (data, meta) => {
    console.log('Fetched user:', data)
  },

  onUpdate: (data, meta) => {
    console.log('Updated user:', data)
  },

  onPatch: (data, meta) => {
    console.log('Patched user:', data)
  },

  onDelete: (meta) => {
    console.log('Deleted user')
  },

  onError: (error, meta) => {
    console.error('Error:', error.message)
    console.log('Operation:', meta.operation)
    console.log('Rollback data:', meta.rollbackData)
  }
})
```

---

### Array Store (`createApiArrayStore`)

For managing arrays of JSON objects synced with an API.

```tsx
import { createApiArrayStore } from 'kstate'

interface User {
  id: string
  name: string
  email: string
  role: 'admin' | 'user'
  isActive: boolean
}

export const users = createApiArrayStore<User>({
  endpoints: {
    get: '/users',
    getOne: '/users/:id',
    create: '/users',
    update: '/users/:id',
    patch: '/users/:id',
    delete: '/users/:id'
  },
  dataKey: 'items',     // Response: { items: [...], page: 1, totalPages: 5 }
  requestKey: 'user',   // Request body: { user: {...} }
  ttl: 30000,
})
```

#### Store Operations

```tsx
// Fetch list
await users.get()

// Fetch with query params
await users.get({ role: 'admin', isActive: true })

// Fetch single item (adds/updates in array)
await users.getOne({ id: '123' })

// Create new item (waits for server response)
const newUser = await users.create({
  name: 'Jane Doe',
  email: 'jane@example.com',
  role: 'user',
  isActive: true
})

// Full update (optimistic)
await users.update({
  id: '123',
  name: 'Jane Smith',
  email: 'jane@example.com',
  role: 'admin',
  isActive: true
})

// Partial update (optimistic)
await users.patch({ id: '123', role: 'admin' })

// Delete (optimistic)
await users.delete({ id: '123' })

// Clear all data
users.clear()

// Access current array (non-reactive)
console.log(users.value)

// Access response meta (pagination info, etc.)
console.log(users.meta) // { page: 1, totalPages: 5, hasMore: true }

// Cleanup (removes event listeners)
users.dispose()
```

#### Configuration Options

Same as Single Store, plus:

| Option | Type | Description |
|--------|------|-------------|
| `endpoints.getOne` | `string` | GET single item endpoint |
| `endpoints.create` | `string` | POST endpoint for creating |

#### Event Handlers

```tsx
const users = createApiArrayStore<User>({
  endpoints: { ... },

  onGet: (items, meta) => {
    console.log(`Fetched ${items.length} users`)
  },

  onGetOne: (item, meta) => {
    console.log('Fetched user:', item.name)
  },

  onCreate: (item, meta) => {
    console.log('Created user:', item.id)
  },

  onUpdate: (item, meta) => {
    console.log('Updated user:', item.name)
  },

  onPatch: (item, meta) => {
    console.log('Patched user:', item.name)
  },

  onDelete: (id, meta) => {
    console.log('Deleted user:', id)
  },

  onError: (error, meta) => {
    toast.error(`Failed to ${meta.operation}: ${error.message}`)
  }
})
```

---

## localStorage Stores

### Local Store (`createLocalStore`)

For managing a single value in localStorage with cross-tab sync.

```tsx
import { createLocalStore } from 'kstate'

interface Settings {
  theme: 'light' | 'dark'
  language: string
  notifications: boolean
}

export const settings = createLocalStore<Settings>(
  'app-settings',  // localStorage key
  {                // default value
    theme: 'light',
    language: 'en',
    notifications: true
  }
)
```

#### Store Operations

```tsx
// Get current value
const current = settings.get()

// Replace entire value
settings.set({
  theme: 'dark',
  language: 'en',
  notifications: false
})

// Partial update
settings.patch({ theme: 'dark' })

// Reset to default
settings.clear()

// Access current value (non-reactive)
console.log(settings.value)

// Cleanup (removes storage event listener)
settings.dispose()
```

#### Event Handlers

```tsx
const settings = createLocalStore<Settings>('app-settings', defaultValue, {
  onSet: (data) => {
    console.log('Settings replaced:', data)
  },

  onPatch: (data) => {
    console.log('Settings patched:', data)
  },

  onClear: () => {
    console.log('Settings reset')
  }
})
```

---

### Local Array Store (`createLocalArrayStore`)

For managing arrays in localStorage with cross-tab sync.

```tsx
import { createLocalArrayStore } from 'kstate'

interface Favorite {
  id: string
  productId: string
  addedAt: number
}

export const favorites = createLocalArrayStore<Favorite>('favorites')
```

#### Store Operations

```tsx
// Get current array
const items = favorites.get()

// Add item
favorites.add({
  id: crypto.randomUUID(),
  productId: '123',
  addedAt: Date.now()
})

// Full update
favorites.update({
  id: 'abc',
  productId: '123',
  addedAt: Date.now()
})

// Partial update
favorites.patch({ id: 'abc', addedAt: Date.now() })

// Delete
favorites.delete({ id: 'abc' })

// Clear all
favorites.clear()

// Access current array (non-reactive)
console.log(favorites.value)

// Cleanup (removes storage event listener)
favorites.dispose()
```

#### Event Handlers

```tsx
const favorites = createLocalArrayStore<Favorite>('favorites', {
  onAdd: (item) => {
    console.log('Added favorite:', item.productId)
  },

  onUpdate: (item) => {
    console.log('Updated favorite:', item.id)
  },

  onPatch: (item) => {
    console.log('Patched favorite:', item.id)
  },

  onDelete: (id) => {
    console.log('Deleted favorite:', id)
  },

  onClear: () => {
    console.log('Cleared all favorites')
  }
})
```

### Cross-Tab Sync

All localStorage stores automatically sync across browser tabs:

```tsx
// Tab 1: Update settings
settings.patch({ theme: 'dark' })

// Tab 2: Automatically receives the update and re-renders
```

---

## SSE Stores

For real-time data via Server-Sent Events with auto-reconnect, heartbeat monitoring, and visibility handling.

### `createSseArrayStore`

```tsx
import { createSseArrayStore } from 'kstate'

interface Job {
  id: string
  status: string
  url: string
}

export const jobs = createSseArrayStore<Job>({
  url: 'https://api.example.com/sse/jobs',
  mode: 'replace',           // 'replace' | 'append' | 'upsert'
  eventName: 'jobs-update',  // SSE event name (default: 'message')
  dataKey: 'items',          // Extract array from { items: [...] }
  persistKey: 'jobs-cache',  // Cache in localStorage

  initialFetch: {            // Fetch data before SSE connects
    endpoint: '/jobs',
    dataKey: 'items',
  },
})
```

#### Connection Lifecycle

```tsx
// Connect (call once, e.g., in useEffect)
jobs.connect()

// Disconnect
jobs.disconnect()

// Clear data
jobs.clear()

// Cleanup (same as disconnect)
jobs.dispose()
```

#### Modes

| Mode | Behavior |
|------|----------|
| `replace` | Each message replaces the entire array |
| `append` | Each message adds new items (with deduplication) |
| `upsert` | Each message updates existing or adds new items by `id` |

#### Optimistic Local Mutations

SSE stores support optimistic updates for immediate UI feedback:

```tsx
// Update item locally (SSE will sync truth from server)
jobs.update({ id: '123', status: 'complete', url: '...' })

// Partial update
jobs.patch({ id: '123', status: 'complete' })

// Remove item locally
jobs.remove('123')
```

#### Connection Status

```tsx
import { useStoreStatus } from 'kstate'

function JobList() {
  const items = useStore(jobs)
  const { connectionStatus, lastEventTime, error } = useStoreStatus(jobs)

  return (
    <div>
      {connectionStatus === 'connecting' && <Spinner />}
      {connectionStatus === 'error' && <Banner>{error?.message}</Banner>}
      {items.map(job => <JobCard key={job.id} job={job} />)}
    </div>
  )
}
```

#### Status Properties

| Property | Type | Description |
|----------|------|-------------|
| `connectionStatus` | `'disconnected' \| 'connecting' \| 'connected' \| 'error'` | SSE connection state |
| `lastEventTime` | `number \| null` | Timestamp of last received event |
| `isOffline` | `boolean` | `navigator.onLine === false` |
| `error` | `Error \| null` | Last error |

#### Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `url` | `string \| (params) => string` | - | SSE endpoint URL |
| `mode` | `'replace' \| 'append' \| 'upsert'` | - | How to handle incoming data |
| `eventName` | `string` | `'message'` | SSE event name to listen for |
| `dataKey` | `string` | - | Extract array from response object |
| `withCredentials` | `boolean` | `true` | Send cookies with request |
| `persistKey` | `string` | - | localStorage key for caching |
| `dedupe` | `(item) => string` | `item.id` | Deduplication key (append mode) |
| `maxItems` | `number` | - | Limit array size (append mode) |
| `maxRetries` | `number` | `10` | Max reconnection attempts |
| `retryDelay` | `number \| (attempt) => number` | exponential | Delay between retries |
| `heartbeatTimeout` | `number` | `45000` | Reconnect if no events (0 = disabled) |
| `reconnectOnFocus` | `boolean` | `true` | Reconnect when tab gains focus |
| `reconnectOnOnline` | `boolean` | `true` | Reconnect when back online |
| `pauseOnHidden` | `boolean` | `true` | Disconnect when tab hidden |
| `initialFetch` | `{ endpoint, dataKey }` | - | REST fetch before SSE connects |

#### Dynamic URL Parameters

```tsx
interface Params {
  sessionId: string
  token: string
}

const events = createSseArrayStore<Event, Params>({
  url: (params) => `https://api.example.com/sse?token=${params.token}&id=${params.sessionId}`,
  mode: 'append',
  dedupe: (e) => e.id,
  maxItems: 1000,
})

// Connect with params
events.connect({ sessionId: '123', token: 'abc' })
```

#### Event Handlers

```tsx
const jobs = createSseArrayStore<Job>({
  url: '/sse/jobs',
  mode: 'replace',

  onConnect: () => console.log('Connected'),
  onDisconnect: () => console.log('Disconnected'),
  onMessage: (items, event) => console.log('Received', items.length, 'items'),
  onError: (error) => console.error('SSE error:', error),
})
```

---

## Computed Stores

Derived stores that automatically update when source stores change.

### Single Source

```tsx
import { computed } from 'kstate'

// Filter active users
const activeUsers = computed(users, items =>
  items.filter(u => u.isActive)
)

// Calculate stats
const userStats = computed(users, items => ({
  total: items.length,
  active: items.filter(u => u.isActive).length,
  admins: items.filter(u => u.role === 'admin').length
}))
```

### Multiple Sources

```tsx
import { computed } from 'kstate'

const orders = createApiArrayStore<Order>({ ... })
const products = createApiArrayStore<Product>({ ... })

// Combine data from multiple stores
const dashboard = computed(
  [users, orders, products],
  ([userList, orderList, productList]) => ({
    userCount: userList.length,
    orderCount: orderList.length,
    productCount: productList.length,
    revenue: orderList.reduce((sum, o) => sum + o.total, 0)
  })
)
```

### Using Computed Stores

```tsx
function Dashboard() {
  const stats = useStore(dashboard)

  return (
    <div>
      <p>Users: {stats.userCount}</p>
      <p>Orders: {stats.orderCount}</p>
      <p>Revenue: ${stats.revenue}</p>
    </div>
  )
}

// Cleanup (unsubscribes from source stores)
dashboard.dispose()
```

---

## React Hooks

### `useStore`

Subscribe to store data with automatic re-renders.

```tsx
import { useStore } from 'kstate'

function UserList() {
  const items = useStore(users)
  //    ^? User[]

  return items.map(user => <UserCard key={user.id} user={user} />)
}
```

### `useStoreStatus`

Subscribe to network status.

```tsx
import { useStoreStatus } from 'kstate'

function UserList() {
  const items = useStore(users)
  const { isLoading, isRevalidating, error, isOffline } = useStoreStatus(users)

  if (isLoading) return <Spinner />
  if (error) return <ErrorMessage error={error} />

  return (
    <div>
      {isOffline && <OfflineBanner />}
      {isRevalidating && <RefreshIndicator />}
      {items.map(user => <UserCard key={user.id} user={user} />)}
    </div>
  )
}
```

#### Status Properties

| Property | Type | Description |
|----------|------|-------------|
| `isLoading` | `boolean` | First fetch, no data yet |
| `isRevalidating` | `boolean` | Has data, fetching fresh in background |
| `isOffline` | `boolean` | `navigator.onLine === false` |
| `error` | `Error \| null` | Last error (cleared on success) |
| `lastUpdated` | `number` | Timestamp of last successful fetch (read-only, won't trigger re-renders) |

> **Note:** Only changes to `isLoading`, `isRevalidating`, `isOffline`, and `error` trigger re-renders. `lastUpdated` updates silently to avoid unnecessary re-renders.

---

## Fine-Grained Reactivity

KState uses proxies for fine-grained subscriptions. Components only re-render when their specific subscribed path changes.

> **Important:** Fine-grained reactivity prevents re-renders from *store updates*. However, if a parent component re-renders for any reason, React will still re-render all children by default. Use `React.memo()` on child components if you need complete isolation.

### Subscribe to Nested Paths

```tsx
function UserName({ index }: { index: number }) {
  // Only re-renders when users[index].name changes
  const name = useStore(users[index].name)
  //    ^? string

  return <span>{name}</span>
}

function UserEmail({ index }: { index: number }) {
  // Only re-renders when users[index].email changes
  const email = useStore(users[index].email)
  //    ^? string

  return <span>{email}</span>
}

function UserRow({ index }: { index: number }) {
  return (
    <div>
      <UserName index={index} />
      <UserEmail index={index} />
    </div>
  )
}
```

### How It Works

```tsx
// These components subscribe to different paths:
useStore(users)              // Path: []           - All changes
useStore(users[0])           // Path: [0]          - First user changes
useStore(users[0].name)      // Path: [0, 'name']  - First user's name only
useStore(users[0].email)     // Path: [0, 'email'] - First user's email only

// When you call: users.patch({ id: '1', name: 'New Name' })
// KState notifies path [0, 'name'], so:
// ✓ useStore(users)         - re-renders (ancestor)
// ✓ useStore(users[0])      - re-renders (ancestor)
// ✓ useStore(users[0].name) - re-renders (exact match)
// ✗ useStore(users[0].email)- does NOT re-render (sibling)
// ✗ useStore(users[1])      - does NOT re-render (different index)
```

### Computed Store Paths

Fine-grained subscriptions work with computed stores too:

```tsx
const dashboard = computed(...)

function UserCount() {
  // Only re-renders when userCount changes
  const count = useStore(dashboard.userCount)
  return <span>{count}</span>
}

function Revenue() {
  // Only re-renders when revenue changes
  const revenue = useStore(dashboard.revenue)
  return <span>${revenue}</span>
}
```

---

## Optimistic Updates

`update`, `patch`, and `delete` operations are optimistic:

1. **Immediate**: Local state updates instantly
2. **Background**: API request fires
3. **Success**: State remains, `lastUpdated` updates
4. **Failure**: Auto-rollback to previous state, `onError` called

```tsx
function UserEditor({ userId }: { userId: string }) {
  const user = useStore(users).find(u => u.id === userId)

  const handleNameChange = (name: string) => {
    // UI updates immediately
    users.patch({ id: userId, name })
    // If API fails, automatically rolls back to previous name
  }

  const handleDelete = async () => {
    try {
      // UI removes item immediately
      await users.delete({ id: userId })
      // Navigate away on success
      navigate('/users')
    } catch (error) {
      // Item is restored, show error
      toast.error('Failed to delete user')
    }
  }

  return (
    <div>
      <input
        value={user?.name ?? ''}
        onChange={e => handleNameChange(e.target.value)}
      />
      <button onClick={handleDelete}>Delete</button>
    </div>
  )
}
```

### Create is NOT Optimistic

`create` waits for the server response because it needs the real ID:

```tsx
const handleCreate = async () => {
  setIsCreating(true)
  try {
    const newUser = await users.create({
      name: 'New User',
      email: 'new@example.com'
    })
    // newUser.id is the real server-assigned ID
    navigate(`/users/${newUser.id}`)
  } catch (error) {
    toast.error('Failed to create user')
  } finally {
    setIsCreating(false)
  }
}
```

---

## Caching & Revalidation

### TTL (Time-To-Live)

```tsx
const users = createApiArrayStore<User>({
  endpoints: { get: '/users' },
  ttl: 60000  // 1 minute
})

// First call: fetches from API
await users.get()

// Within TTL: returns cached, no fetch
await users.get()

// After TTL: returns cached immediately, fetches in background
await users.get() // isRevalidating = true
```

### Stale-While-Revalidate

When cached data is past 50% of TTL, KState returns stale data immediately while fetching fresh data in the background:

```tsx
// ttl = 60000 (1 minute)
// After 30+ seconds: returns cached, fetches in background
```

### Force Refresh

Bypass cache with `_force`:

```tsx
await users.get({ _force: true })
```

### Manual Invalidation

```tsx
// Clear all data and refetch
users.clear()
await users.get()
```

### Auto-Revalidation

```tsx
const users = createApiArrayStore<User>({
  endpoints: { get: '/users' },

  // Refetch when component mounts (if data exists)
  reloadOnMount: true,

  // Refetch when browser tab gains focus
  reloadOnFocus: true,

  // Refetch when coming back online
  reloadOnReconnect: true,

  // Refetch every 30 seconds
  reloadInterval: 30000
})
```

---

## Pagination

KState supports append-based pagination. Subsequent page fetches append to existing data.

```tsx
const users = createApiArrayStore<User>({
  endpoints: { get: '/users' },
  dataKey: 'items'  // Response: { items: [...], page: 1, hasMore: true }
})

function UserList() {
  const items = useStore(users)
  const { isLoading, isRevalidating } = useStoreStatus(users)

  // Initial load
  useEffect(() => {
    users.get({ page: 1, pageSize: 20 })
  }, [])

  const loadMore = () => {
    const nextPage = (users.meta.page as number) + 1
    users.get({ page: nextPage, pageSize: 20 })
  }

  if (isLoading) return <Spinner />

  return (
    <div>
      {items.map(user => <UserCard key={user.id} user={user} />)}

      {users.meta.hasMore && (
        <button onClick={loadMore} disabled={isRevalidating}>
          {isRevalidating ? 'Loading...' : 'Load More'}
        </button>
      )}
    </div>
  )
}
```

### How Pagination Works

```tsx
// Page 1: items = [A, B, C]
await users.get({ page: 1, pageSize: 3 })

// Page 2: items = [A, B, C, D, E, F] (appended)
await users.get({ page: 2, pageSize: 3 })

// Fresh fetch: items = [A, B, C] (replaced)
users.clear()
await users.get({ page: 1, pageSize: 3 })
```

### Accessing Pagination Meta

Response fields other than `dataKey` are stored in `meta`:

```tsx
// Response: { items: [...], page: 1, totalPages: 5, hasMore: true }

console.log(users.meta)
// { page: 1, totalPages: 5, hasMore: true, status: 200, ... }
```

---

## Error Handling

### Per-Store Error Handler

```tsx
const users = createApiArrayStore<User>({
  endpoints: { ... },

  onError: (error, meta) => {
    console.error(`Operation: ${meta.operation}`)
    console.error(`Endpoint: ${meta.endpoint}`)
    console.error(`Params:`, meta.params)
    console.error(`Rollback data:`, meta.rollbackData)

    // Show toast based on operation
    switch (meta.operation) {
      case 'get':
        toast.error('Failed to load users')
        break
      case 'create':
        toast.error('Failed to create user')
        break
      case 'patch':
      case 'update':
        toast.error('Failed to update user')
        break
      case 'delete':
        toast.error('Failed to delete user')
        break
    }
  }
})
```

### Global Error Handler

```tsx
configureKState({
  onError: (error, operation, meta) => {
    // Log all errors
    Sentry.captureException(error, {
      extra: { operation, ...meta }
    })

    // Show generic toast
    toast.error(error.message)
  }
})
```

### Try-Catch

```tsx
const handleUpdate = async () => {
  try {
    await users.patch({ id: userId, name: newName })
    toast.success('User updated!')
  } catch (error) {
    // Rollback already happened
    toast.error(`Failed: ${error.message}`)
  }
}
```

### Error Meta

```tsx
interface ErrorMeta {
  operation: 'get' | 'getOne' | 'create' | 'update' | 'patch' | 'delete'
  endpoint: string
  params: Record<string, string | number>
  rollbackData: unknown | null  // Previous state for rollback
}
```

---

## TypeScript

KState is TypeScript-native with full type inference.

### Store Types

```tsx
interface User {
  id: string
  name: string
  email: string
  age: number
}

const users = createApiArrayStore<User>({ ... })

users.value        // User[]
users.get()        // Promise<User[]>
users.create({...}) // Requires Omit<User, 'id'>
users.patch({...}) // Requires Partial<User> & { id: string }
```

### Hook Types

```tsx
const items = useStore(users)
//    ^? User[]

const name = useStore(users[0].name)
//    ^? string

const age = useStore(users[0].age)
//    ^? number
```

### Computed Types

```tsx
const stats = computed(users, items => ({
  total: items.length,
  avgAge: items.reduce((sum, u) => sum + u.age, 0) / items.length
}))

const value = useStore(stats)
//    ^? { total: number; avgAge: number }

const total = useStore(stats.total)
//    ^? number
```

---

## Complete Examples

### User Management

```tsx
// stores/users.ts
import { createApiArrayStore, computed } from 'kstate'

interface User {
  id: string
  name: string
  email: string
  role: 'admin' | 'user'
  isActive: boolean
}

export const users = createApiArrayStore<User>({
  endpoints: {
    get: '/users',
    getOne: '/users/:id',
    create: '/users',
    update: '/users/:id',
    patch: '/users/:id',
    delete: '/users/:id'
  },
  dataKey: 'items',
  requestKey: 'user',
  ttl: 30000,
  reloadOnFocus: true,

  onError: (error, meta) => {
    toast.error(`Failed to ${meta.operation}: ${error.message}`)
  }
})

export const activeUsers = computed(users, items =>
  items.filter(u => u.isActive)
)

export const adminUsers = computed(users, items =>
  items.filter(u => u.role === 'admin')
)
```

```tsx
// components/UserList.tsx
import { useStore, useStoreStatus } from 'kstate'
import { users, activeUsers } from '../stores/users'
import { useEffect } from 'react'

export function UserList() {
  const items = useStore(activeUsers)
  const { isLoading, isRevalidating, error } = useStoreStatus(users)

  useEffect(() => {
    users.get()
  }, [])

  if (isLoading) return <Spinner />
  if (error) return <ErrorMessage error={error} />

  return (
    <div>
      {isRevalidating && <RefreshIndicator />}
      <ul>
        {items.map((user, index) => (
          <UserRow key={user.id} index={index} />
        ))}
      </ul>
      <CreateUserButton />
    </div>
  )
}

function UserRow({ index }: { index: number }) {
  const name = useStore(users[index].name)
  const email = useStore(users[index].email)
  const id = useStore(users[index].id)

  return (
    <li>
      <span>{name}</span>
      <span>{email}</span>
      <button onClick={() => users.delete({ id })}>Delete</button>
    </li>
  )
}

function CreateUserButton() {
  const [isCreating, setIsCreating] = useState(false)

  const handleCreate = async () => {
    setIsCreating(true)
    try {
      await users.create({
        name: 'New User',
        email: 'new@example.com',
        role: 'user',
        isActive: true
      })
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <button onClick={handleCreate} disabled={isCreating}>
      {isCreating ? 'Creating...' : 'Add User'}
    </button>
  )
}
```

### Theme Settings

```tsx
// stores/settings.ts
import { createLocalStore } from 'kstate'

interface Settings {
  theme: 'light' | 'dark' | 'system'
  language: string
  notifications: boolean
}

export const settings = createLocalStore<Settings>('app-settings', {
  theme: 'system',
  language: 'en',
  notifications: true
})
```

```tsx
// components/ThemeToggle.tsx
import { useStore } from 'kstate'
import { settings } from '../stores/settings'

export function ThemeToggle() {
  const theme = useStore(settings.theme)

  const nextTheme = () => {
    const themes: Settings['theme'][] = ['light', 'dark', 'system']
    const currentIndex = themes.indexOf(theme)
    const nextIndex = (currentIndex + 1) % themes.length
    settings.patch({ theme: themes[nextIndex] })
  }

  return (
    <button onClick={nextTheme}>
      {theme === 'light' && '☀️'}
      {theme === 'dark' && '🌙'}
      {theme === 'system' && '💻'}
    </button>
  )
}
```

### Shopping Cart

```tsx
// stores/cart.ts
import { createLocalArrayStore, computed } from 'kstate'

interface CartItem {
  id: string
  productId: string
  name: string
  price: number
  quantity: number
}

export const cart = createLocalArrayStore<CartItem>('shopping-cart')

export const cartTotal = computed(cart, items =>
  items.reduce((sum, item) => sum + item.price * item.quantity, 0)
)

export const cartCount = computed(cart, items =>
  items.reduce((sum, item) => sum + item.quantity, 0)
)
```

```tsx
// components/Cart.tsx
import { useStore } from 'kstate'
import { cart, cartTotal, cartCount } from '../stores/cart'

export function CartSummary() {
  const count = useStore(cartCount)
  const total = useStore(cartTotal)

  return (
    <div>
      <span>Items: {count}</span>
      <span>Total: ${total.toFixed(2)}</span>
    </div>
  )
}

export function CartItems() {
  const items = useStore(cart)

  const updateQuantity = (id: string, quantity: number) => {
    if (quantity <= 0) {
      cart.delete({ id })
    } else {
      cart.patch({ id, quantity })
    }
  }

  return (
    <ul>
      {items.map(item => (
        <li key={item.id}>
          <span>{item.name}</span>
          <span>${item.price}</span>
          <button onClick={() => updateQuantity(item.id, item.quantity - 1)}>-</button>
          <span>{item.quantity}</span>
          <button onClick={() => updateQuantity(item.id, item.quantity + 1)}>+</button>
        </li>
      ))}
    </ul>
  )
}

export function AddToCartButton({ product }: { product: Product }) {
  const handleAdd = () => {
    const existingItem = cart.value.find(i => i.productId === product.id)

    if (existingItem) {
      cart.patch({
        id: existingItem.id,
        quantity: existingItem.quantity + 1
      })
    } else {
      cart.add({
        id: crypto.randomUUID(),
        productId: product.id,
        name: product.name,
        price: product.price,
        quantity: 1
      })
    }
  }

  return <button onClick={handleAdd}>Add to Cart</button>
}
```

---

## URL Parameters

### Path Parameters

Use `:paramName` syntax in endpoints:

```tsx
const users = createApiArrayStore<User>({
  endpoints: {
    getOne: '/users/:id',
    patch: '/users/:id'
  }
})

// Call with object
await users.getOne({ id: '123' })
// Request: GET /users/123

await users.patch({ id: '123', name: 'John' })
// Request: PATCH /users/123
```

### Query Parameters

Parameters not in the URL path become query params:

```tsx
await users.get({ page: 1, pageSize: 20, role: 'admin' })
// Request: GET /users?page=1&pageSize=20&role=admin
```

### Combined

```tsx
const projects = createApiArrayStore<Project>({
  endpoints: {
    get: '/orgs/:orgId/projects'
  }
})

await projects.get({ orgId: 'abc', status: 'active', page: 1 })
// Request: GET /orgs/abc/projects?status=active&page=1
```
