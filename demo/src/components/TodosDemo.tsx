import { useEffect } from 'react'
import { useStore, useStoreStatus } from 'kstate'
import { todos, Todo, todoStats, completedTodos, pendingTodos } from '../stores'
import { DemoSection } from './DemoSection'

type TodoStats = { total: number; completed: number; pending: number; completionRate: number }

export function TodosDemo() {
  const stats = useStore<TodoStats>(todoStats)
  const completed = useStore<Todo[]>(completedTodos)
  const pending = useStore<Todo[]>(pendingTodos)
  const { isLoading, isRevalidating, error } = useStoreStatus(todos)

  useEffect(() => { todos.get({ _limit: 20 }) }, [])

  return (
    <DemoSection
      title="Todos"
      features="Optimistic updates, computed filtering"
      note="Toggle/delete - UI updates instantly before the request completes"
      isLoading={isLoading && pending.length === 0 && completed.length === 0}
      isRevalidating={isRevalidating}
      error={error}
    >
      <div className="stats-bar">
        <Stat value={stats.total} label="Total" />
        <Stat value={stats.completed} label="Done" />
        <Stat value={stats.pending} label="Pending" />
        <Stat value={`${stats.completionRate}%`} label="Rate" />
      </div>

      <div className="todo-columns">
        <TodoColumn title="Pending" items={pending} />
        <TodoColumn title="Completed" items={completed} completed />
      </div>
    </DemoSection>
  )
}

function Stat({ value, label }: { value: string | number; label: string }) {
  return (
    <div className="stat">
      <span className="stat-value">{value}</span>
      <span className="stat-label">{label}</span>
    </div>
  )
}

function TodoColumn({ title, items, completed = false }: { title: string; items: Todo[]; completed?: boolean }) {
  return (
    <div className="todo-column">
      <h3>{title} ({items.length})</h3>
      <ul className="items-list compact">
        {items.slice(0, 10).map((todo) => (
          <li key={todo.id} className={`item${completed ? ' completed' : ''}`}>
            <label>
              <input
                type="checkbox"
                checked={completed}
                onChange={() => todos.patch({ id: todo.id, completed: !todo.completed })}
              />
              <span>{todo.title}</span>
            </label>
            <button className="danger small" onClick={() => todos.delete({ id: todo.id })}>×</button>
          </li>
        ))}
      </ul>
    </div>
  )
}
