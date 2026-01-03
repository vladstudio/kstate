import { useStore } from 'kstate'
import { favorites, favoriteCount, posts, Post, Favorite } from '../stores'

export function FavoritesDemo() {
  const items = useStore<Favorite[]>(favorites)
  const count = useStore<number>(favoriteCount)
  const allPosts = useStore<Post[]>(posts)

  const handleRemove = (id: string) => {
    favorites.delete({ id })
  }

  const handleClear = () => {
    favorites.clear()
  }

  const getPostTitle = (postId: string) => {
    const post = allPosts.find((p: Post) => p.id === postId)
    return post?.title ?? `Post #${postId}`
  }

  return (
    <div className="demo-section">
      <div className="demo-header">
        <h2>Favorites (localStorage Array Store)</h2>
        <span className="badge">{count} favorites</span>
      </div>

      <div className="demo-info">
        <p>
          <strong>Features demonstrated:</strong> createLocalArrayStore, add,
          delete, clear, localStorage persistence
        </p>
        <p className="note">
          Add favorites from the Posts tab by clicking the star icon. They
          persist across page reloads!
        </p>
      </div>

      <div className="actions">
        <button onClick={handleClear} disabled={items.length === 0}>
          Clear All
        </button>
      </div>

      {items.length === 0 ? (
        <div className="empty-state">
          <p>No favorites yet. Go to Posts tab and click ☆ to add some!</p>
        </div>
      ) : (
        <ul className="items-list">
          {items.map((fav) => (
            <li key={fav.id} className="item">
              <div className="item-content">
                <span className="favorite-icon">★</span>
                <span>{getPostTitle(fav.postId)}</span>
                <small>Added {new Date(fav.addedAt).toLocaleString()}</small>
              </div>
              <div className="item-actions">
                <button
                  onClick={() => handleRemove(fav.id)}
                  className="danger"
                >
                  Remove
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="raw-data">
        <h4>Raw localStorage value:</h4>
        <pre>{JSON.stringify(items, null, 2)}</pre>
      </div>
    </div>
  )
}
