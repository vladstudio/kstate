# KState

Minimal, type-safe state management for React SPAs with fine-grained reactivity, optimistic updates, and flexible adapters.

## Features

- **Tiny bundle** — No external dependencies except React
- **Fine-grained reactivity** — Components re-render only when subscribed values change
- **Optimistic updates** — UI updates instantly, auto-rollback on failure
- **Flexible adapters** — Mix REST API, localStorage, and SSE in any combination
- **TypeScript-native** — Full type inference, zero manual annotations

## Getting Started

```bash
bun add kstate
```

```tsx
import { configureKState } from 'kstate'

configureKState({
  baseUrl: 'https://api.example.com',
  getHeaders: async () => {
    const token = localStorage.getItem('token')
    return token ? { Authorization: `Bearer ${token}` } : {}
  },
  onError: (error, operation, meta) => {
    console.error(`[KState] ${operation} failed:`, error.message)
  }
})
```

---

## Stores

### `createSetStore` — Collection of items

For managing collections of objects with unique `id`. Uses `Map<id, T>` internally for O(1) lookups:

```tsx
import { createSetStore, api } from 'kstate'

interface User {
  id: string
  name: string
  email: string
}

const users = createSetStore<User>({
  ...api({ list: '/users', item: '/users/:id' }),
})
```

**Operations:**

```tsx
await users.get()                           // Fetch all
await users.get({ role: 'admin' })          // With query params
await users.getOne({ id: '123' })           // Fetch one
await users.create({ name: 'Jane' })        // Create (returns new item)
await users.patch({ id: '123', name: 'Jo' }) // Partial update (optimistic)
await users.delete({ id: '123' })           // Delete (optimistic)
users.clear()                               // Clear local state
users.dispose()                             // Cleanup listeners
```

### `createStore` — Single value

For managing a single object:

```tsx
import { createStore, local } from 'kstate'

interface Settings {
  theme: 'light' | 'dark'
  language: string
}

const settings = createStore<Settings>(local('settings', { theme: 'light', language: 'en' }))
```

**Operations:**

```tsx
await profile.get()                    // Fetch
await profile.set({ ... })             // Full replace (optimistic)
await profile.patch({ name: 'Jane' })  // Partial update (optimistic)
profile.clear()                        // Clear
```

---

## Adapters

Adapters provide sync logic. Mix them per-operation:

### `api({ list, item?, dataKey?, requestKey? })` — REST API

```tsx
import { api } from 'kstate'

// RESTful API - item defaults to list + '/:id'
const users = createSetStore<User>({
  ...api({ list: '/users' }),  // item: '/users/:id' inferred
})

// Explicit item endpoint
const posts = createSetStore<Post>({
  ...api({ list: '/posts', item: '/posts/:id' }),
})

// Query-based API
const products = createSetStore<Product>({
  ...api({ list: '/products', item: '/products?id=:id' }),
})

// Nested resources
const comments = createSetStore<Comment>({
  ...api({ list: '/posts/:postId/comments', item: '/comments/:id' }),
})

// Response/request wrappers
const items = createSetStore<Item>({
  ...api({ list: '/items', dataKey: 'data', requestKey: 'item' }),
})
```

**Config:**
- `list` — Collection endpoint (GET all, POST create)
- `item` — Single item endpoint (GET one, PUT, PATCH, DELETE). Defaults to `list + '/:id'`
- `dataKey` — Extract data from response wrapper
- `requestKey` — Wrap request body

### `queuedApi({ list, item?, dataKey?, requestKey? })` — Sequential REST API

Like `api`, but requests execute one at a time. Use for low-priority batch operations:

```tsx
import { queuedApi } from 'kstate'

const logs = createSetStore<Log>({
  ...queuedApi({ list: '/logs' }),
})

// 50 calls → executed sequentially, continues on errors
for (const log of items) {
  logs.patch({ id: log.id, synced: true })
}
```

**Note:** All `queuedApi` instances share a single global queue. This ensures low-priority operations across your app don't compete with each other.

### `local(key, defaultValue?)` — localStorage

```tsx
import { local } from 'kstate'

// Shorthand for local-only store
const favorites = createSetStore<Favorite>(local('favorites'))

// Add persistence to API store
const users = createSetStore<User>({
  ...api({ list: '/users' }),
  persist: local('users-cache').persist,
})
```

### `sse(url, opts?)` — Server-Sent Events

```tsx
import { sse } from 'kstate'

const jobs = createSetStore<Job>({
  ...api({ list: '/jobs' }),
  subscribe: sse('/jobs/stream', {
    mode: 'upsert',     // 'replace' | 'append' | 'upsert'
    dataKey: 'items',
    maxItems: 100,      // For 'append' mode
  }),
})
```

### Custom Adapter

Pass custom functions directly for any data source:

```tsx
// Inline functions
const users = createSetStore<User>({
  get: async () => mySource.getUsers(),
  create: async (data) => mySource.createUser(data),
  patch: async (data) => mySource.updateUser(data.id, data),
  delete: async ({ id }) => mySource.deleteUser(id),
})

// Reusable adapter factory
function myAdapter<T extends { id: string }>(source: MySource<T>) {
  return {
    get: async () => source.list(),
    getOne: async ({ id }) => source.find(id),
    create: async (data) => source.create(data),
    patch: async (data) => source.update(data.id, data),
    delete: async ({ id }) => source.remove(id),
  }
}

const posts = createSetStore<Post>({
  ...myAdapter(postsSource),
  persist: local('posts-cache').persist,  // Mix with other adapters
})
```

### Hybrid Example

```tsx
const jobs = createSetStore<Job>({
  ...api({ list: '/jobs' }),
  subscribe: sse('/jobs/stream', { mode: 'upsert' }),
  persist: local('jobs-cache').persist,
  ttl: 60_000,  // Cache for 1 minute
})
```

---

## React Hooks

### `useStore(store)`

Subscribe to store data:

```tsx
import { useStore } from 'kstate'

function UserList() {
  const ids = users.ids  // string[] - ordered IDs
  return ids.map(id => <UserRow key={id} id={id} />)
}

function UserRow({ id }: { id: string }) {
  const user = useStore(users[id])  // subscribe to specific item
  return <div>{user.name}</div>
}
```

### `useStoreStatus(store)`

Subscribe to loading/error state:

```tsx
import { useStoreStatus } from 'kstate'

function UserList() {
  const items = useStore(users)
  const { isLoading, isRevalidating, error, isOffline } = useStoreStatus(users)

  if (isLoading) return <Spinner />
  if (error) return <Error message={error.message} />

  return (
    <>
      {isRevalidating && <RefreshIndicator />}
      {items.map(u => <div key={u.id}>{u.name}</div>)}
    </>
  )
}
```

---

## Fine-Grained Reactivity

Subscribe to specific paths — components only re-render when that exact value changes:

```tsx
function UserName({ id }: { id: string }) {
  const name = useStore(users[id].name)  // Only re-renders on name change
  return <span>{name}</span>
}

function UserEmail({ id }: { id: string }) {
  const email = useStore(users[id].email)  // Only re-renders on email change
  return <span>{email}</span>
}
```

**How paths work:**

```tsx
useStore(users)              // Path: []              - All changes
useStore(users['abc'])       // Path: ['abc']         - Item 'abc' changes
useStore(users['abc'].name)  // Path: ['abc', 'name'] - Item's name only
```

When `users.patch({ id: 'abc', name: 'New' })` is called:
- `useStore(users)` — re-renders (ancestor)
- `useStore(users['abc'])` — re-renders (ancestor)
- `useStore(users['abc'].name)` — re-renders (exact match)
- `useStore(users['abc'].email)` — **does NOT** re-render (sibling)
- `useStore(users['xyz'])` — **does NOT** re-render (different ID)

---

## Optimistic Updates

`patch` and `delete` update local state immediately, then sync with server. On error, auto-rollback:

```tsx
const handleNameChange = (name: string) => {
  users.patch({ id: userId, name })  // UI updates instantly
  // If API fails, rolls back automatically
}

const handleDelete = async () => {
  try {
    await users.delete({ id: userId })  // UI removes instantly
    navigate('/users')
  } catch (error) {
    // Item restored, show error
    toast.error('Failed to delete')
  }
}
```

**Note:** `create` is NOT optimistic — it waits for server response to get the real ID.

---

## Computed Stores

Derived stores that auto-update when sources change:

```tsx
import { computed } from 'kstate'

// Filter
const activeUsers = computed(users, items => items.filter(u => u.isActive))

// Transform
const userStats = computed(users, items => ({
  total: items.length,
  active: items.filter(u => u.isActive).length,
}))

// Multiple sources
const dashboard = computed(
  [users, orders],
  ([userList, orderList]) => ({
    userCount: userList.length,
    orderCount: orderList.length,
  })
)
```

Fine-grained reactivity works with computed too:

```tsx
const total = useStore(userStats.total)  // Only re-renders on total change
```

---

## Complete Examples

### User Management

```tsx
// stores/users.ts
import { createSetStore, api, computed } from 'kstate'

interface User {
  id: string
  name: string
  email: string
  role: 'admin' | 'user'
  isActive: boolean
}

export const users = createSetStore<User>({
  ...api({ list: '/users', dataKey: 'items' }),
})

export const activeUsers = computed(users, items => items.filter(u => u.isActive))
```

```tsx
// components/UserList.tsx
import { useStore, useStoreStatus } from 'kstate'
import { users, activeUsers } from '../stores/users'

export function UserList() {
  const active = useStore(activeUsers)  // computed returns array
  const { isLoading, error } = useStoreStatus(users)

  useEffect(() => { users.get() }, [])

  if (isLoading) return <Spinner />
  if (error) return <Error message={error.message} />

  return (
    <ul>
      {active.map(u => <UserRow key={u.id} id={u.id} />)}
    </ul>
  )
}

function UserRow({ id }: { id: string }) {
  const name = useStore(users[id].name)  // fine-grained subscription
  return (
    <li>
      {name}
      <button onClick={() => users.delete({ id })}>Delete</button>
    </li>
  )
}
```

### Shopping Cart (localStorage)

```tsx
// stores/cart.ts
import { createSetStore, local, computed } from 'kstate'

interface CartItem {
  id: string
  productId: string
  name: string
  price: number
  quantity: number
}

export const cart = createSetStore<CartItem>(local('cart'))

export const cartTotal = computed(cart, items =>
  items.reduce((sum, i) => sum + i.price * i.quantity, 0)
)
```

```tsx
// components/Cart.tsx
function CartSummary() {
  const total = useStore(cartTotal)
  return <span>Total: ${total.toFixed(2)}</span>
}

function AddToCart({ product }: { product: Product }) {
  const handleAdd = () => {
    const existing = [...cart.value.values()].find(i => i.productId === product.id)
    if (existing) {
      cart.patch({ id: existing.id, quantity: existing.quantity + 1 })
    } else {
      cart.create({
        id: crypto.randomUUID(),
        productId: product.id,
        name: product.name,
        price: product.price,
        quantity: 1,
      })
    }
  }
  return <button onClick={handleAdd}>Add to Cart</button>
}
```

### Realtime Jobs (SSE + API)

```tsx
// stores/jobs.ts
import { createSetStore, api, sse, local } from 'kstate'

interface Job {
  id: string
  status: 'pending' | 'running' | 'complete'
  url: string
}

export const jobs = createSetStore<Job>({
  ...api({ list: '/jobs', dataKey: 'items' }),
  subscribe: sse('/jobs/stream', { mode: 'upsert' }),
  persist: local('jobs-cache').persist,
})
```

```tsx
// components/Jobs.tsx
function JobList() {
  useEffect(() => { jobs.get() }, [])

  return jobs.ids.map(id => <JobRow key={id} id={id} />)
}

function JobRow({ id }: { id: string }) {
  const status = useStore(jobs[id].status)
  const url = useStore(jobs[id].url)
  return <div>{status}: {url}</div>
}
```
