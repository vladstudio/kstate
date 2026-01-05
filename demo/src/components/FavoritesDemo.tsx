import { useStore } from 'kstate'
import { favorites, favoriteCount, posts } from '../stores'
import { DemoSection } from './DemoSection'

export function FavoritesDemo() {
  const count = useStore<number>(favoriteCount)
  const ids = favorites.ids
  const items = [...favorites.value.values()]

  const getPostTitle = (postId: string) =>
    posts.value.get(postId)?.title ?? `Post #${postId}`

  return (
    <DemoSection
      title="Favorites"
      features="localStorage set store, add/delete, persistence"
      note="Star posts in the Posts tab - they persist across reloads"
      badge={`${count} saved`}
    >
      <div className="actions">
        <button onClick={() => favorites.clear()} disabled={ids.length === 0}>Clear All</button>
      </div>

      {ids.length === 0 ? (
        <div className="empty-state">No favorites yet. Star some posts!</div>
      ) : (
        <ul className="items-list">
          {ids.map(id => {
            const fav = favorites.value.get(id)!
            return (
              <li key={id} className="item">
                <div className="item-content">
                  <span className="favorite-icon">★</span>
                  <span>{getPostTitle(fav.postId)}</span>
                  <small>{new Date(fav.addedAt).toLocaleString()}</small>
                </div>
                <div className="item-actions">
                  <button onClick={() => favorites.delete({ id })} className="danger">Remove</button>
                </div>
              </li>
            )
          })}
        </ul>
      )}

      <div className="raw-data">
        <h4>localStorage:</h4>
        <pre>{JSON.stringify(items, null, 2)}</pre>
      </div>
    </DemoSection>
  )
}
