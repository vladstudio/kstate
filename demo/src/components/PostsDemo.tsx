import { useEffect, useState } from 'react'
import { useStore, useStoreStatus } from 'kstate'
import { posts, Post, postCount } from '../stores'
import { favorites } from '../stores/favorites'

export function PostsDemo() {
  const items = useStore<Post[]>(posts)
  const count = useStore<number>(postCount)
  const { isLoading, isRevalidating, error } = useStoreStatus(posts)
  const [page, setPage] = useState(1)
  const [editingId, setEditingId] = useState<string | null>(null)

  useEffect(() => {
    posts.get({ _limit: 10, _page: page })
  }, [page])

  const handleCreate = async () => {
    const newPost = await posts.create({
      userId: 1,
      title: `New Post ${Date.now()}`,
      body: 'This is a new post created via KState',
    })
    console.log('Created post:', newPost)
  }

  const handleDelete = (id: string) => {
    posts.delete({ id })
  }

  const handlePatch = (id: string, title: string) => {
    posts.patch({ id, title })
    setEditingId(null)
  }

  const toggleFavorite = (postId: string) => {
    const existing = favorites.value.find((f: { id: string; postId: string }) => f.postId === postId)
    if (existing) {
      favorites.delete({ id: existing.id })
    } else {
      favorites.add({
        id: crypto.randomUUID(),
        postId,
        addedAt: Date.now(),
      })
    }
  }

  const isFavorite = (postId: string) =>
    favorites.value.some((f: { postId: string }) => f.postId === postId)

  if (isLoading && items.length === 0) {
    return <div className="loading">Loading posts...</div>
  }

  if (error) {
    return <div className="error">Error: {error.message}</div>
  }

  return (
    <div className="demo-section">
      <div className="demo-header">
        <h2>Posts (API Array Store)</h2>
        <span className="badge">{count} loaded</span>
        {isRevalidating && <span className="badge revalidating">Syncing...</span>}
      </div>

      <div className="demo-info">
        <p>
          <strong>Features demonstrated:</strong> createArrayStore, get with
          pagination, create, patch, delete, useStore, useStoreStatus, computed
          stores
        </p>
      </div>

      <div className="actions">
        <button onClick={handleCreate}>+ Create Post</button>
        <button onClick={() => posts.get({ _force: 1, _limit: 10, _page: 1 })}>
          Force Refresh
        </button>
        <button onClick={() => posts.clear()}>Clear</button>
      </div>

      <div className="pagination">
        <button disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
          Previous
        </button>
        <span>Page {page}</span>
        <button onClick={() => setPage((p) => p + 1)}>Next</button>
      </div>

      <ul className="items-list">
        {items.map((post) => (
          <PostItem
            key={post.id}
            post={post}
            isEditing={editingId === post.id}
            isFavorite={isFavorite(post.id)}
            onEdit={() => setEditingId(post.id)}
            onSave={(title) => handlePatch(post.id, title)}
            onCancel={() => setEditingId(null)}
            onDelete={() => handleDelete(post.id)}
            onToggleFavorite={() => toggleFavorite(post.id)}
          />
        ))}
      </ul>
    </div>
  )
}

function PostItem({
  post,
  isEditing,
  isFavorite,
  onEdit,
  onSave,
  onCancel,
  onDelete,
  onToggleFavorite,
}: {
  post: Post
  isEditing: boolean
  isFavorite: boolean
  onEdit: () => void
  onSave: (title: string) => void
  onCancel: () => void
  onDelete: () => void
  onToggleFavorite: () => void
}) {
  const [title, setTitle] = useState(post.title)

  if (isEditing) {
    return (
      <li className="item editing">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          autoFocus
        />
        <div className="item-actions">
          <button onClick={() => onSave(title)}>Save</button>
          <button onClick={onCancel}>Cancel</button>
        </div>
      </li>
    )
  }

  return (
    <li className="item">
      <div className="item-content">
        <strong>#{post.id}</strong> {post.title}
        <small>by User {post.userId}</small>
      </div>
      <div className="item-actions">
        <button
          className={isFavorite ? 'favorite active' : 'favorite'}
          onClick={onToggleFavorite}
        >
          {isFavorite ? '★' : '☆'}
        </button>
        <button onClick={onEdit}>Edit</button>
        <button onClick={onDelete} className="danger">
          Delete
        </button>
      </div>
    </li>
  )
}
