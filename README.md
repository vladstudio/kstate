# KState

Minimal, type-safe state management for React SPAs with fine-grained reactivity, optimistic updates, and flexible sync adapters.

## Features

- **Tiny bundle** — No external dependencies except React
- **Fine-grained reactivity** — Components re-render only when subscribed values change
- **Optimistic updates** — UI updates instantly, auto-rollback on failure
- **Stale-while-revalidate** — Show cached data while fetching fresh data
- **TypeScript-native** — Full type inference, zero manual annotations
- **Multiple sync adapters** — REST API and localStorage out of the box

## Installation

```bash
bun add kstate
```

## Quick Start

```tsx
import { configureKState, createArrayStore, useStore } from 'kstate'

// Configure once at app startup
configureKState({
  baseUrl: 'https://api.example.com',
  getHeaders: async () => ({
    Authorization: `Bearer ${getToken()}`
  })
})

// Define a store
interface User {
  id: string
  name: string
  email: string
}

const users = createArrayStore<User>({
  endpoints: {
    get: '/users',
    create: '/users',
    patch: '/users/:id',
    delete: '/users/:id'
  },
  dataKey: 'items'
})

// Use in components
function UserList() {
  const items = useStore(users)

  useEffect(() => {
    users.get()
  }, [])

  return items.map(user => <div key={user.id}>{user.name}</div>)
}
```

## Documentation

See [GUIDE.md](./GUIDE.md) for complete usage documentation.

## Development

### Prerequisites

- [Bun](https://bun.sh) >= 1.0

### Setup

```bash
# Clone the repository
git clone https://github.com/your-org/kstate.git
cd kstate

# Install dependencies
bun install
```

### Scripts

```bash
# Build the library
bun run build

# Watch mode (rebuild on changes)
bun run dev

# Type check without emitting
bun run typecheck
```

### Project Structure

```
src/
├── index.ts              # Public exports
├── config.ts             # Global configuration
├── types.ts              # TypeScript types
├── core/
│   ├── proxy.ts          # Reactive proxy system
│   └── subscribers.ts    # Subscription manager
├── hooks/
│   ├── useStore.ts       # Main reactive hook
│   └── useStoreStatus.ts # Network status hook
├── stores/
│   ├── createStore.ts         # Single value API store
│   ├── createArrayStore.ts    # Array API store
│   ├── createLocalStore.ts    # Single localStorage store
│   ├── createLocalArrayStore.ts # Array localStorage store
│   └── computed.ts            # Derived stores
└── sync/
    └── api.ts            # Fetch wrapper
```

### Building for Production

```bash
bun run build
```

Output is written to `dist/` with:
- ES modules (`.js`)
- TypeScript declarations (`.d.ts`)
- Source maps (`.js.map`, `.d.ts.map`)

### Publishing

```bash
# Bump version
bun version patch  # or minor, major

# Build and publish
bun run build
bun publish
```

## License

MIT
