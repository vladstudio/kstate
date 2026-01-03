# Nano Stores

Tiny state manager for React/Preact/Vue. Convention: `$storeName`

```sh
bun install nanostores @nanostores/react
```

---

## Quick Example

```ts
// store/users.ts
import { atom, computed } from 'nanostores'

export const $users = atom<User[]>([])
export const $admins = computed($users, users => users.filter(i => i.isAdmin))

export function addUser(user: User) {
  $users.set([...$users.get(), user])
}
```

```tsx
// React component
import { useStore } from '@nanostores/react'
import { $admins } from '../stores/users'

export const Admins = () => {
  const admins = useStore($admins)
  return <ul>{admins.map(u => <UserItem user={u} />)}</ul>
}
```

---

## Store Types

### atom(initial)
Primitive values, arrays, immutable objects.

```ts
const $counter = atom(0)
const $state = atom<'empty' | 'loading' | 'loaded'>('empty')

$counter.get()           // read
$counter.set(5)          // write
$counter.subscribe(cb)   // subscribe + call immediately
$counter.listen(cb)      // subscribe only on changes
```

Callbacks: `(value, oldValue) => void`

### map(initial)
Objects with key-level updates.

```ts
const $profile = map<{ name: string; email?: string }>({ name: 'anon' })

$profile.set({ name: 'New' })      // replace all
$profile.setKey('name', 'Bob')     // update key
$profile.setKey('email', undefined) // remove optional key
```

Callbacks: `(value, oldValue, changedKey) => void`

Key filtering:
```ts
import { listenKeys, subscribeKeys } from 'nanostores'
listenKeys($profile, ['name'], (value, oldValue, changed) => {})
```

### computed(stores, fn)
Derived from other stores. Updates on every dependency change.

```ts
const $admins = computed($users, users => users.filter(u => u.isAdmin))

// Multiple dependencies
const $newPosts = computed([$lastVisit, $posts], (lastVisit, posts) =>
  posts.filter(p => p.publishedAt > lastVisit)
)

// Async
const $user = computed($userId, id => task(async () => {
  const res = await fetch(`/api/users/${id}`)
  return res.json()
}))
```

### batched(stores, fn)
Like `computed`, but waits until end of tick (batches multiple updates).

```ts
const $link = batched([$sortBy, $categoryId], (sort, cat) =>
  `/api/items?sort=${sort}&cat=${cat}`
)

// Only one update even with multiple sets:
$sortBy.set('date')
$categoryId.set('1')
```

---

## Lifecycle

### Lazy Stores (onMount)
Stores have **mounted** (has listeners) and **disabled** (no listeners) modes.

```ts
import { onMount } from 'nanostores'

onMount($profile, () => {
  // Mount: start connections, timers, etc.
  return () => {
    // Cleanup on disable
  }
})
```

Disable has 1s delay after last unsubscribe.

### Store Events

| Event | Description |
|-------|-------------|
| `onMount(store, cb)` | First listener subscribed (with debounce) |
| `onStart(store, cb)` | First listener subscribed (immediate, low-level) |
| `onStop(store, cb)` | Last listener unsubscribed (low-level) |
| `onSet(store, cb)` | Before applying changes |
| `onNotify(store, cb)` | Before notifying listeners |

`onSet`/`onNotify` can abort:
```ts
onSet($store, ({ newValue, abort }) => {
  if (!validate(newValue)) abort()
})
```

---

## Effects

Subscribe to multiple stores at once:

```ts
import { effect } from 'nanostores'

const cancel = effect([$enabled, $interval], (enabled, interval) => {
  if (!enabled) return
  const id = setInterval(sendPing, interval)
  return () => clearInterval(id)  // cleanup
})
```

---

## Async Tasks

Mark async operations for SSR/testing:

```ts
import { task, allTasks } from 'nanostores'

onMount($post, () => {
  task(async () => {
    $post.set(await loadPost())
  })
})

// Wait for all tasks
await allTasks()
```

---

## Map Creator

Factory for similar stores:

```ts
const User = mapCreator((store, id) => {
  store.set({ id, isLoading: true })
  fetchUser(id).then(data => store.set({ id, isLoading: false, data }))
})

const user1 = User('1')
```

---

## Testing

```ts
import { cleanStores, keepMount, allTasks } from 'nanostores'

afterEach(() => cleanStores($profile))

it('works', async () => {
  keepMount($profile)     // activate store
  await allTasks()        // wait async
  expect($profile.get()).toEqual({ name: 'anon' })
})
```

---

## Types

```ts
import type { StoreValue } from 'nanostores'

type Value = StoreValue<typeof $loadingState>
```

---

## Best Practices

1. **Move logic to stores** - URL routing, validation, API calls. Easier testing, framework-agnostic.

2. **Separate changes from reactions** - Use listeners instead of side effects in actions:
```ts
// Bad: side effect in action
function increase() {
  $counter.set($counter.get() + 1)
  printCounter($counter.get())
}

// Good: separate listener
$counter.listen(counter => printCounter(counter))
```

3. **Avoid `get()` in UI** - Use `useStore()` to auto-rerender on changes:
```ts
// Bad
const { userId } = $profile.get()

// Good
const { userId } = useStore($profile)
```
