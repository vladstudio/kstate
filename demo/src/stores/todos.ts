import { createArrayStore, computed } from 'kstate'

export interface Todo {
  id: string
  userId: number
  title: string
  completed: boolean
}

export const todos = createArrayStore<Todo>({
  endpoints: {
    get: '/todos',
    patch: '/todos/:id',
    delete: '/todos/:id',
  },
  ttl: 30000,
})

export const completedTodos = computed(todos, (items) =>
  items.filter((t) => t.completed)
)

export const pendingTodos = computed(todos, (items) =>
  items.filter((t) => !t.completed)
)

export const todoStats = computed(todos, (items) => ({
  total: items.length,
  completed: items.filter((t) => t.completed).length,
  pending: items.filter((t) => !t.completed).length,
  completionRate:
    items.length > 0
      ? Math.round(
          (items.filter((t) => t.completed).length / items.length) * 100
        )
      : 0,
}))
