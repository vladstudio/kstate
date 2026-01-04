import { useEffect } from 'react'
import { useStore, useStoreStatus } from 'kstate'
import { posts, Post, postCount, postsByUser, users, userCount, todos, todoStats, favoriteCount } from '../stores'
import { DemoSection } from './DemoSection'

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
    if (posts.value.length === 0) posts.get({ _limit: 50 })
    if (users.value.length === 0) users.get()
    if (todos.value.length === 0) todos.get({ _limit: 50 })
  }, [])

  const isLoading = postsLoading || usersLoading || todosLoading

  return (
    <DemoSection
      title="Stats"
      features="Computed stores with single/multiple sources, auto-updating derived state"
      isRevalidating={isLoading}
    >
      <div className="stats-grid">
        <StatCard title="Posts" value={postsLoaded} />
        <StatCard title="Users" value={usersLoaded} />
        <StatCard title="Todos" value={stats.total} detail={`${stats.completed}/${stats.pending}`} />
        <StatCard title="Favorites" value={favCount} />
      </div>

      <div className="computed-example">
        <h3>Posts by User</h3>
        <div className="user-posts-grid">
          {Object.entries(grouped).slice(0, 5).map(([userId, userPosts]) => (
            <div key={userId} className="user-posts-card">
              <h4>User {userId}</h4>
              <span className="post-count">{userPosts.length} posts</span>
              <ul>
                {userPosts.slice(0, 3).map((post) => (
                  <li key={post.id}>{post.title.slice(0, 25)}...</li>
                ))}
                {userPosts.length > 3 && <li className="more">+{userPosts.length - 3} more</li>}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </DemoSection>
  )
}

function StatCard({ title, value, detail }: { title: string; value: number; detail?: string }) {
  return (
    <div className="stat-card">
      <h3>{title}</h3>
      <div className="stat-value">{value}</div>
      {detail && <div className="stat-detail">{detail}</div>}
    </div>
  )
}
