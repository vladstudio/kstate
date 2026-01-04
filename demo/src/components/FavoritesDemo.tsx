import { useStore } from 'kstate'
import { favorites, favoriteCount, posts, Post, Favorite } from '../stores'
import { DemoSection } from './DemoSection'

export function FavoritesDemo() {
  const items = useStore<Favorite[]>(favorites)
  const count = useStore<number>(favoriteCount)
  const allPosts = useStore<Post[]>(posts)

  const getPostTitle = (postId: string) =>
    allPosts.find((p: Post) => p.id === postId)?.title ?? `Post #${postId}`

  return (
    <DemoSection
      title="Favorites"
      features="localStorage array store, add/delete, persistence"
      note="Star posts in the Posts tab - they persist across reloads"
      badge={`${count} saved`}
    >
      <div className="actions">
        <button onClick={() => favorites.clear()} disabled={items.length === 0}>Clear All</button>
      </div>

      {items.length === 0 ? (
        <div className="empty-state">No favorites yet. Star some posts!</div>
      ) : (
        <ul className="items-list">
          {items.map((fav) => (
            <li key={fav.id} className="item">
              <div className="item-content">
                <span className="favorite-icon">★</span>
                <span>{getPostTitle(fav.postId)}</span>
                <small>{new Date(fav.addedAt).toLocaleString()}</small>
              </div>
              <div className="item-actions">
                <button onClick={() => favorites.delete({ id: fav.id })} className="danger">Remove</button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="raw-data">
        <h4>localStorage:</h4>
        <pre>{JSON.stringify(items, null, 2)}</pre>
      </div>
    </DemoSection>
  )
}
