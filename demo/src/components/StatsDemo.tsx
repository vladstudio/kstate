import { useEffect } from 'react'
import { useStore, useStoreStatus } from 'kstate'
import {
  posts,
  Post,
  postCount,
  postsByUser,
  users,
  userCount,
  todos,
  todoStats,
  favoriteCount,
} from '../stores'

type TodoStats = { total: number; completed: number; pending: number; completionRate: number }

export function StatsDemo() {
  const postsLoaded = useStore<number>(postCount)
  const usersLoaded = useStore<number>(userCount)
  const stats = useStore<TodoStats>(todoStats)
  const favCount = useStore<number>(favoriteCount)
  const grouped = useStore<Record<number, Post[]>>(postsByUser)

  const { isLoading: postsLoading } = useStoreStatus(posts)
  const { isLoading: usersLoading } = useStoreStatus(users)
  const { isLoading: todosLoading } = useStoreStatus(todos)

  useEffect(() => {
    // Load all data if not already loaded
    if (posts.value.length === 0) posts.get({ _limit: 50 })
    if (users.value.length === 0) users.get()
    if (todos.value.length === 0) todos.get({ _limit: 50 })
  }, [])

  const isLoading = postsLoading || usersLoading || todosLoading

  return (
    <div className="demo-section">
      <div className="demo-header">
        <h2>Stats (Computed Stores)</h2>
        {isLoading && <span className="badge revalidating">Loading...</span>}
      </div>

      <div className="demo-info">
        <p>
          <strong>Features demonstrated:</strong> computed() with single and
          multiple sources, derived state that updates automatically
        </p>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <h3>Posts</h3>
          <div className="stat-value">{postsLoaded}</div>
          <div className="stat-label">loaded</div>
        </div>

        <div className="stat-card">
          <h3>Users</h3>
          <div className="stat-value">{usersLoaded}</div>
          <div className="stat-label">loaded</div>
        </div>

        <div className="stat-card">
          <h3>Todos</h3>
          <div className="stat-value">{stats.total}</div>
          <div className="stat-label">total</div>
          <div className="stat-detail">
            {stats.completed} done / {stats.pending} pending
          </div>
        </div>

        <div className="stat-card">
          <h3>Favorites</h3>
          <div className="stat-value">{favCount}</div>
          <div className="stat-label">saved</div>
        </div>
      </div>

      <div className="computed-example">
        <h3>Posts by User (computed grouping)</h3>
        <div className="user-posts-grid">
          {Object.entries(grouped)
            .slice(0, 5)
            .map(([userId, userPosts]) => (
              <div key={userId} className="user-posts-card">
                <h4>User {userId}</h4>
                <span className="post-count">{userPosts.length} posts</span>
                <ul>
                  {userPosts.slice(0, 3).map((post) => (
                    <li key={post.id}>{post.title.slice(0, 30)}...</li>
                  ))}
                  {userPosts.length > 3 && (
                    <li className="more">+{userPosts.length - 3} more</li>
                  )}
                </ul>
              </div>
            ))}
        </div>
      </div>
    </div>
  )
}
