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
  get: api('/users', { dataKey: 'items' }),
  getOne: api('/users/:id'),
  create: api('/users'),
  patch: api('/users/:id'),
  delete: api('/users/:id'),
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

// REST API
const users = createSetStore<User>({
  ...api('/users'),
})

// localStorage (shorthand)
const favorites = createSetStore<Favorite>(local('favorites'))

// Hybrid: API + SSE for realtime + localStorage for persistence
const jobs = createSetStore<Job>({
  get: api('/jobs', { dataKey: 'items' }),
  create: api('/jobs'),
  subscribe: sse('/jobs/stream', { mode: 'upsert' }),
  persist: local('jobs-cache'),
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
