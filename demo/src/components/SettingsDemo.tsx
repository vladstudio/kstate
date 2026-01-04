import { useStore } from 'kstate'
import { settings, Settings } from '../stores'
import { DemoSection } from './DemoSection'

export function SettingsDemo() {
  const value = useStore<Settings>(settings)
  const { theme, postsPerPage, showCompletedTodos } = value

  return (
    <DemoSection
      title="Settings"
      features="localStorage store, patch updates, cross-tab sync"
      note="Open in another tab to see cross-tab sync"
    >
      <div className="settings-form">
        <div className="setting-row">
          <label>Theme</label>
          <div className="button-group">
            {(['light', 'dark', 'system'] as const).map((t) => (
              <button key={t} className={theme === t ? 'active' : ''} onClick={() => settings.patch({ theme: t })}>
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>
          <span className="current-value">{theme}</span>
        </div>

        <div className="setting-row">
          <label>Posts per page</label>
          <input
            type="range"
            min="5"
            max="50"
            step="5"
            value={postsPerPage}
            onChange={(e) => settings.patch({ postsPerPage: Number(e.target.value) })}
          />
          <span className="current-value">{postsPerPage}</span>
        </div>

        <div className="setting-row">
          <label>Show completed</label>
          <input
            type="checkbox"
            checked={showCompletedTodos}
            onChange={(e) => settings.patch({ showCompletedTodos: e.target.checked })}
          />
          <span className="current-value">{showCompletedTodos ? 'Yes' : 'No'}</span>
        </div>

        <div className="setting-row">
          <button onClick={() => settings.clear()}>Reset</button>
        </div>
      </div>

      <div className="raw-data">
        <h4>localStorage:</h4>
        <pre>{JSON.stringify(value, null, 2)}</pre>
      </div>
    </DemoSection>
  )
}
