# SWR

React hooks for data fetching with caching, revalidation, focus tracking, and more.

```sh
bun install swr
```

---

## Quick Start

```tsx
import useSWR from 'swr'

const fetcher = (url: string) => fetch(url).then(r => r.json())

function Profile({ userId }) {
  const { data, error, isLoading } = useSWR(`/api/user/${userId}`, fetcher)
  if (error) return <div>failed</div>
  if (isLoading) return <div>loading...</div>
  return <div>{data.name}</div>
}
```

---

## API

```ts
const { data, error, isLoading, isValidating, mutate } = useSWR(key, fetcher, options)
```

### Parameters

| Param | Description |
|-------|-------------|
| `key` | Unique identifier (string, array, object, function, or `null` to skip) |
| `fetcher` | Async function: `(key) => data` |
| `options` | Config object |

### Return Values

| Value | Description |
|-------|-------------|
| `data` | Resolved data or `undefined` |
| `error` | Error or `undefined` |
| `isLoading` | Loading with no data yet |
| `isValidating` | Request in progress |
| `mutate` | `(data?, opts?) => void` - mutate cached data |

### Options

**Revalidation:**
- `revalidateIfStale = true` - revalidate even with stale data
- `revalidateOnMount` - on component mount
- `revalidateOnFocus = true` - on window focus
- `revalidateOnReconnect = true` - on network reconnect

**Polling:**
- `refreshInterval = 0` - polling ms (0 = disabled)
- `refreshWhenHidden = false` - poll when hidden
- `refreshWhenOffline = false` - poll when offline

**Retry:**
- `shouldRetryOnError = true` - retry on error
- `errorRetryInterval = 5000` - retry interval ms
- `errorRetryCount` - max retries

**Timing:**
- `dedupingInterval = 2000` - dedup same-key requests ms
- `focusThrottleInterval = 5000` - throttle focus revalidation ms
- `loadingTimeout = 3000` - trigger `onLoadingSlow` ms

**Data:**
- `fallbackData` - initial data for this hook
- `fallback` - `{ [key]: data }` object
- `keepPreviousData = false` - show prev key's data until new loads
- `compare(a, b)` - custom equality check

**Callbacks:**
- `onSuccess(data, key, config)`
- `onError(err, key, config)`
- `onLoadingSlow(key, config)`
- `onErrorRetry(err, key, config, revalidate, { retryCount })`
- `onDiscarded(key)` - request ignored (race condition)

**Other:**
- `suspense = false` - React Suspense mode
- `isPaused()` - return true to pause
- `use` - middleware array

---

## Key Patterns

### Multiple Arguments
```ts
useSWR(['/api/user', token], ([url, token]) => fetchWithToken(url, token))
```

### Object Keys (auto-serialized)
```ts
useSWR({ url: '/api/orders', args: user }, fetcher)
```

### Conditional Fetching
```ts
useSWR(shouldFetch ? '/api/data' : null, fetcher)
useSWR(() => user ? `/api/projects?uid=${user.id}` : null, fetcher)
```

---

## Fetchers

```ts
// Fetch
const fetcher = url => fetch(url).then(r => r.json())

// Axios
const fetcher = url => axios.get(url).then(res => res.data)

// GraphQL
const fetcher = query => request('/api/graphql', query)
```

### Error Handling
```ts
const fetcher = async url => {
  const res = await fetch(url)
  if (!res.ok) {
    const error = new Error('Failed')
    error.info = await res.json()
    error.status = res.status
    throw error
  }
  return res.json()
}
```

Note: `data` and `error` can coexist (show stale data + error state).

---

## Global Config

```tsx
import { SWRConfig } from 'swr'

<SWRConfig value={{
  fetcher: url => fetch(url).then(r => r.json()),
  refreshInterval: 3000,
  onError: (err, key) => reportError(err)
}}>
  <App />
</SWRConfig>
```

Nested configs merge (objects deep-merge, primitives override).

```tsx
// Access config
import { useSWRConfig } from 'swr'
const { cache, mutate, ...config } = useSWRConfig()
```

---

## Mutation

### Bound Mutate
```ts
const { data, mutate } = useSWR('/api/user', fetcher)
mutate({ ...data, name: 'New' })  // update cache
mutate()  // revalidate
```

### Global Mutate
```ts
import { mutate } from 'swr'
mutate('/api/user')  // revalidate
mutate('/api/user', newData)  // update + revalidate
```

### mutate Options
- `optimisticData` - immediate UI update (value or `current => new`)
- `revalidate = true` - refetch after mutation
- `populateCache = true` - write result to cache
- `rollbackOnError = true` - revert on failure
- `throwOnError = true` - throw errors

### Optimistic Update
```ts
mutate('/api/user', updateFn(newName), {
  optimisticData: { ...data, name: newName },
  rollbackOnError: true
})
```

### Filter Keys
```ts
mutate(key => key.startsWith('/api/item'), undefined, { revalidate: true })
mutate(() => true, undefined, { revalidate: false })  // clear all
```

---

## useSWRMutation

Manual mutations (not automatic like `useSWR`):

```ts
import useSWRMutation from 'swr/mutation'

async function updateUser(url, { arg }: { arg: { name: string } }) {
  return fetch(url, { method: 'POST', body: JSON.stringify(arg) }).then(r => r.json())
}

function Profile() {
  const { trigger, isMutating, data, error, reset } = useSWRMutation('/api/user', updateUser)
  return <button disabled={isMutating} onClick={() => trigger({ name: 'New' })}>Update</button>
}
```

Options same as `mutate`, plus `onSuccess`/`onError` callbacks. Default `populateCache = false`.

---

## Infinite Loading

```ts
import useSWRInfinite from 'swr/infinite'

const getKey = (pageIndex, prevData) => {
  if (prevData && !prevData.length) return null  // end
  return `/api/users?page=${pageIndex}`
}

function App() {
  const { data, size, setSize, isLoading } = useSWRInfinite(getKey, fetcher)
  const users = data ? data.flat() : []

  return <>
    {users.map(u => <User key={u.id} {...u} />)}
    <button onClick={() => setSize(size + 1)}>Load More</button>
  </>
}
```

### Options (extends useSWR)
- `initialSize = 1` - pages to load initially
- `revalidateAll = false` - revalidate all pages
- `revalidateFirstPage = true` - always revalidate first
- `persistSize = false` - keep size on key change
- `parallel = false` - fetch pages in parallel

### Cursor-Based
```ts
const getKey = (pageIndex, prevData) => {
  if (prevData && !prevData.nextCursor) return null
  if (pageIndex === 0) return '/api/users?limit=10'
  return `/api/users?cursor=${prevData.nextCursor}&limit=10`
}
```

### Global Mutate
```ts
import { unstable_serialize } from 'swr/infinite'
mutate(unstable_serialize(getKey))
```

---

## Prefetching

### HTML Preload
```html
<link rel="preload" href="/api/data" as="fetch" crossorigin="anonymous">
```

### Programmatic
```ts
import { preload } from 'swr'
preload('/api/user', fetcher)
```

### Fallback Data
```ts
useSWR('/api/data', fetcher, { fallbackData: prefetched })

// Or global
<SWRConfig value={{ fallback: { '/api/user': userData } }}>
```

---

## Suspense

```tsx
function Profile() {
  const { data } = useSWR('/api/user', fetcher, { suspense: true })
  return <div>{data.name}</div>  // data always ready
}

<Suspense fallback={<Loading />}>
  <ErrorBoundary fallback={<Error />}>
    <Profile />
  </ErrorBoundary>
</Suspense>
```

Preload to avoid waterfalls:
```ts
preload('/api/user', fetcher)
preload('/api/posts', fetcher)
```

---

## Subscription

Real-time data sources:

```ts
import useSWRSubscription from 'swr/subscription'

function App() {
  const { data, error } = useSWRSubscription('ws://...', (key, { next }) => {
    const socket = new WebSocket(key)
    socket.addEventListener('message', e => next(null, e.data))
    socket.addEventListener('error', e => next(e.error))
    return () => socket.close()  // cleanup
  })
}
```

Same-key subscriptions are deduped. Closes when last component unmounts.

---

## Immutable Data

For data that never changes:

```ts
import useSWRImmutable from 'swr/immutable'
useSWRImmutable(key, fetcher)

// Equivalent to:
useSWR(key, fetcher, {
  revalidateIfStale: false,
  revalidateOnFocus: false,
  revalidateOnReconnect: false
})
```

---

## TypeScript

```ts
// Inferred from fetcher
const { data } = useSWR('/api/user', getUser)

// Explicit
const { data } = useSWR<User, Error>('/api/user', fetcher)

// Typed fetcher
import type { Fetcher } from 'swr'
const fetcher: Fetcher<User, string> = id => getUserById(id)

// Infinite
import type { SWRInfiniteKeyLoader } from 'swr/infinite'
const getKey: SWRInfiniteKeyLoader = (index, prev) => ...

// Subscription
import type { SWRSubscription } from 'swr/subscription'
const sub: SWRSubscription<string, number, Error> = (key, { next }) => ...

// Middleware
import type { Middleware, SWRHook } from 'swr'
const middleware: Middleware = (useSWRNext: SWRHook) => (key, fetcher, config) => ...
```
