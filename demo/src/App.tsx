import { useState } from 'react'
import { PostsDemo } from './components/PostsDemo'
import { UsersDemo } from './components/UsersDemo'
import { TodosDemo } from './components/TodosDemo'
import { SettingsDemo } from './components/SettingsDemo'
import { FavoritesDemo } from './components/FavoritesDemo'
import { StatsDemo } from './components/StatsDemo'
import { FineGrainedDemo } from './components/FineGrainedDemo'

type Tab =
  | 'posts'
  | 'users'
  | 'todos'
  | 'settings'
  | 'favorites'
  | 'stats'
  | 'fine-grained'

export default function App() {
  const [tab, setTab] = useState<Tab>('posts')

  return (
    <div className="app">
      <header>
        <h1>KState Demo</h1>
        <p className="subtitle">
          Using{' '}
          <a
            href="https://jsonplaceholder.typicode.com"
            target="_blank"
            rel="noopener"
          >
            JSONPlaceholder API
          </a>
        </p>
      </header>

      <nav>
        <button
          className={tab === 'posts' ? 'active' : ''}
          onClick={() => setTab('posts')}
        >
          Posts (API Array)
        </button>
        <button
          className={tab === 'users' ? 'active' : ''}
          onClick={() => setTab('users')}
        >
          Users (API Array)
        </button>
        <button
          className={tab === 'todos' ? 'active' : ''}
          onClick={() => setTab('todos')}
        >
          Todos (Optimistic)
        </button>
        <button
          className={tab === 'settings' ? 'active' : ''}
          onClick={() => setTab('settings')}
        >
          Settings (Local)
        </button>
        <button
          className={tab === 'favorites' ? 'active' : ''}
          onClick={() => setTab('favorites')}
        >
          Favorites (Local Array)
        </button>
        <button
          className={tab === 'stats' ? 'active' : ''}
          onClick={() => setTab('stats')}
        >
          Stats (Computed)
        </button>
        <button
          className={tab === 'fine-grained' ? 'active' : ''}
          onClick={() => setTab('fine-grained')}
        >
          Fine-Grained
        </button>
      </nav>

      <main>
        {tab === 'posts' && <PostsDemo />}
        {tab === 'users' && <UsersDemo />}
        {tab === 'todos' && <TodosDemo />}
        {tab === 'settings' && <SettingsDemo />}
        {tab === 'favorites' && <FavoritesDemo />}
        {tab === 'stats' && <StatsDemo />}
        {tab === 'fine-grained' && <FineGrainedDemo />}
      </main>
    </div>
  )
}
