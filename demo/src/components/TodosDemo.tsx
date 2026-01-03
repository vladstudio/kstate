import { useEffect } from 'react'
import { useStore, useStoreStatus } from 'kstate'
import { todos, Todo, todoStats, completedTodos, pendingTodos } from '../stores'

type TodoStats = { total: number; completed: number; pending: number; completionRate: number }

export function TodosDemo() {
  const items = useStore<Todo[]>(todos)
  const stats = useStore<TodoStats>(todoStats)
  const completed = useStore<Todo[]>(completedTodos)
  const pending = useStore<Todo[]>(pendingTodos)
  const { isLoading, isRevalidating, error } = useStoreStatus(todos)

  useEffect(() => {
    todos.get({ _limit: 20 })
  }, [])

  const handleToggle = (id: string, completed: boolean) => {
    // Optimistic update - UI updates immediately
    todos.patch({ id, completed: !completed })
  }

  const handleDelete = (id: string) => {
    // Optimistic delete - item removed immediately
    todos.delete({ id })
  }

  if (isLoading && items.length === 0) {
    return <div className="loading">Loading todos...</div>
  }

  if (error) {
    return <div className="error">Error: {error.message}</div>
  }

  return (
    <div className="demo-section">
      <div className="demo-header">
        <h2>Todos (Optimistic Updates)</h2>
        {isRevalidating && <span className="badge revalidating">Syncing...</span>}
      </div>

      <div className="demo-info">
        <p>
          <strong>Features demonstrated:</strong> Optimistic updates (UI updates
          instantly, rolls back on error), computed stores for filtering
        </p>
        <p className="note">
          Try toggling or deleting - notice how UI updates instantly before the
          network request completes!
        </p>
      </div>

      <div className="stats-bar">
        <div className="stat">
          <span className="stat-value">{stats.total}</span>
          <span className="stat-label">Total</span>
        </div>
        <div className="stat">
          <span className="stat-value">{stats.completed}</span>
          <span className="stat-label">Completed</span>
        </div>
        <div className="stat">
          <span className="stat-value">{stats.pending}</span>
          <span className="stat-label">Pending</span>
        </div>
        <div className="stat">
          <span className="stat-value">{stats.completionRate}%</span>
          <span className="stat-label">Rate</span>
        </div>
      </div>

      <div className="todo-columns">
        <div className="todo-column">
          <h3>Pending ({pending.length})</h3>
          <ul className="items-list compact">
            {pending.slice(0, 10).map((todo) => (
              <li key={todo.id} className="item">
                <label>
                  <input
                    type="checkbox"
                    checked={false}
                    onChange={() => handleToggle(todo.id, todo.completed)}
                  />
                  <span>{todo.title}</span>
                </label>
                <button
                  className="danger small"
                  onClick={() => handleDelete(todo.id)}
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div className="todo-column">
          <h3>Completed ({completed.length})</h3>
          <ul className="items-list compact">
            {completed.slice(0, 10).map((todo) => (
              <li key={todo.id} className="item completed">
                <label>
                  <input
                    type="checkbox"
                    checked={true}
                    onChange={() => handleToggle(todo.id, todo.completed)}
                  />
                  <span>{todo.title}</span>
                </label>
                <button
                  className="danger small"
                  onClick={() => handleDelete(todo.id)}
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}
