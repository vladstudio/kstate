import { useState } from 'react'
import { PostsDemo, UsersDemo, TodosDemo, SettingsDemo, FavoritesDemo, StatsDemo, FineGrainedDemo } from './components'

const tabs = [
  { id: 'posts', label: 'Posts', Component: PostsDemo },
  { id: 'users', label: 'Users', Component: UsersDemo },
  { id: 'todos', label: 'Todos', Component: TodosDemo },
  { id: 'settings', label: 'Settings', Component: SettingsDemo },
  { id: 'favorites', label: 'Favorites', Component: FavoritesDemo },
  { id: 'stats', label: 'Stats', Component: StatsDemo },
  { id: 'fine-grained', label: 'Fine-Grained', Component: FineGrainedDemo },
]

export default function App() {
  const [tabId, setTabId] = useState('posts')
  const { Component } = tabs.find((t) => t.id === tabId)!

  return (
    <div className="app">
      <header>
        <h1>KState Demo</h1>
        <p className="subtitle">
          Using <a href="https://jsonplaceholder.typicode.com" target="_blank" rel="noopener">JSONPlaceholder API</a>
        </p>
      </header>

      <nav>
        {tabs.map((t) => (
          <button key={t.id} className={tabId === t.id ? 'active' : ''} onClick={() => setTabId(t.id)}>
            {t.label}
          </button>
        ))}
      </nav>

      <main>
        <Component />
      </main>
    </div>
  )
}
