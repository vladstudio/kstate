# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
bun install     # Install dependencies
bun run build   # Build library to dist/
bun run dev     # Watch mode (rebuild on changes)
bun run typecheck  # Type check without emitting
bun test        # Run all tests
bun test src/core/proxy.test.ts  # Run single test file
```

## Architecture

KState is a minimal, type-safe state management library for React with fine-grained reactivity and optimistic updates.

### Core Layers

**Reactive Proxy System** (`src/core/proxy.ts`, `src/core/subscribers.ts`)
- Stores are wrapped in ES6 Proxies that track property access paths
- When you access `store[0].name`, it builds path `[0, 'name']`
- Components subscribe to specific paths; only notified when that path changes

**Adapters** (`src/adapters/`)
- `api({ list, item? })` - REST API adapter with separate collection/item endpoints
- `local(key, defaultValue)` - localStorage adapter
- `sse(url, opts)` - Server-Sent Events adapter
- Mix adapters per-operation for maximum flexibility

**Stores** (`src/stores/`)
- `createSetStore<T>` - Array of items with flexible adapter configuration
- `createStore<T>` - Single value with flexible adapter configuration
- `computed` - Derived stores that auto-update when sources change

**React Integration** (`src/hooks/`)
- `useStore(store)` or `useStore(store[0].name)` - Subscribes to data at any path
- `useStoreStatus(store)` - Subscribes to loading/error/offline status

### Key Patterns

**Adapter Composition**: Mix adapters per-operation:
```ts
const users = createSetStore<User>({
  ...api({ list: '/users' }),
  subscribe: sse('/users/stream'),
  persist: local('users-cache').persist,
  ttl: 60_000,
})
```

**Optimistic Updates**: `patch`, `delete` apply changes immediately, then sync. On failure, auto-rollback.

**Path-Based Notifications**: When `store.patch({id: '1', name: 'New'})` is called, only subscribers to paths `[]`, `[0]`, `[0, 'name']` re-render—not `[0, 'email']` or `[1]`.

### Type Exports

All public types are re-exported from `src/index.ts`. Store interfaces require `{ id: string }` for items.
