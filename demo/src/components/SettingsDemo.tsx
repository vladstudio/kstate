import { useStore } from 'kstate'
import { settings, Settings } from '../stores'

export function SettingsDemo() {
  // Note: Fine-grained access (settings.theme) requires proxy types not yet exposed
  // For now, subscribe to the whole settings object
  const value = useStore<Settings>(settings)
  const { theme, postsPerPage, showCompletedTodos } = value

  const handleThemeChange = (newTheme: Settings['theme']) => {
    settings.patch({ theme: newTheme })
  }

  const handlePostsPerPageChange = (value: number) => {
    settings.patch({ postsPerPage: value })
  }

  const handleShowCompletedChange = (value: boolean) => {
    settings.patch({ showCompletedTodos: value })
  }

  return (
    <div className="demo-section">
      <div className="demo-header">
        <h2>Settings (localStorage Store)</h2>
      </div>

      <div className="demo-info">
        <p>
          <strong>Features demonstrated:</strong> createLocalStore, patch
          updates, localStorage persistence, cross-tab sync
        </p>
        <p className="note">
          These settings persist in localStorage. Open this page in another tab
          to see cross-tab sync!
        </p>
      </div>

      <div className="settings-form">
        <div className="setting-row">
          <label>Theme</label>
          <div className="button-group">
            <button
              className={theme === 'light' ? 'active' : ''}
              onClick={() => handleThemeChange('light')}
            >
              Light
            </button>
            <button
              className={theme === 'dark' ? 'active' : ''}
              onClick={() => handleThemeChange('dark')}
            >
              Dark
            </button>
            <button
              className={theme === 'system' ? 'active' : ''}
              onClick={() => handleThemeChange('system')}
            >
              System
            </button>
          </div>
          <span className="current-value">Current: {theme}</span>
        </div>

        <div className="setting-row">
          <label>Posts per page</label>
          <input
            type="range"
            min="5"
            max="50"
            step="5"
            value={postsPerPage}
            onChange={(e) => handlePostsPerPageChange(Number(e.target.value))}
          />
          <span className="current-value">{postsPerPage}</span>
        </div>

        <div className="setting-row">
          <label>Show completed todos</label>
          <input
            type="checkbox"
            checked={showCompletedTodos}
            onChange={(e) => handleShowCompletedChange(e.target.checked)}
          />
          <span className="current-value">
            {showCompletedTodos ? 'Yes' : 'No'}
          </span>
        </div>

        <div className="setting-row">
          <button onClick={() => settings.clear()}>Reset to Defaults</button>
        </div>
      </div>

      <div className="raw-data">
        <h4>Raw localStorage value:</h4>
        <pre>{JSON.stringify(value, null, 2)}</pre>
      </div>
    </div>
  )
}
