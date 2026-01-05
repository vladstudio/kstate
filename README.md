# KState

Minimal, type-safe state management for React SPAs with fine-grained reactivity, optimistic updates, and flexible adapters.

## Features

- **Tiny bundle** — No external dependencies except React
- **Fine-grained reactivity** — Components re-render only when subscribed values change
- **Optimistic updates** — UI updates instantly, auto-rollback on failure
- **Flexible adapters** — Mix REST API, localStorage, and SSE in any combination
- **TypeScript-native** — Full type inference, zero manual annotations

## Installation

```bash
bun add kstate
```

## Quick Start

```tsx
import { configureKState, createSetStore, api, useStore } from 'kstate'

// Configure once at app startup
configureKState({
  baseUrl: 'https://api.example.com',
  getHeaders: async () => ({ Authorization: `Bearer ${getToken()}` })
})

// Define a store with adapters
interface User {
  id: string
  name: string
  email: string
}

const users = createSetStore<User>({
  ...api({ list: '/users', item: '/users/:id' }),
})

// Use in components
function UserList() {
  const items = useStore(users)

  useEffect(() => { users.get() }, [])

  return items.map(user => <div key={user.id}>{user.name}</div>)
}
```

## Adapters

Adapters provide the sync logic. Mix and match as needed:

```tsx
import { api, local, sse } from 'kstate'

// REST API - item defaults to list + '/:id'
const users = createSetStore<User>({
  ...api({ list: '/users' }),
})

// Custom item endpoint for query-based APIs
const products = createSetStore<Product>({
  ...api({ list: '/products', item: '/products?id=:id' }),
})

// localStorage (shorthand)
const favorites = createSetStore<Favorite>(local('favorites'))

// Hybrid: API + SSE for realtime + localStorage cache
const jobs = createSetStore<Job>({
  ...api({ list: '/jobs' }),
  subscribe: sse('/jobs/stream', { mode: 'upsert' }),
  persist: local('jobs-cache').persist,
})
```

## Fine-Grained Reactivity

Subscribe to specific paths — only re-render when that value changes:

```tsx
// Only re-renders when users[0].name changes
const name = useStore(users[0].name)

// Only re-renders when users[0].email changes
const email = useStore(users[0].email)
```

## Documentation

See [GUIDE.md](./GUIDE.md) for complete usage documentation.

## Development

```bash
bun install      # Install dependencies
bun run build    # Build library
bun run dev      # Watch mode
bun test         # Run tests
```

## License

MIT
