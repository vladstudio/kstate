import { useStore } from 'kstate'
import { settings, Settings } from '../stores'
import { DemoSection } from './DemoSection'

export function SettingsDemo() {
  const items = useStore<Settings[]>(settings)
  const value = items[0] ?? { id: 'default', theme: 'system', postsPerPage: 10, showCompletedTodos: true }

  return (
    <DemoSection
      title="Settings"
      features="localStorage store with createSetStore + local() adapter"
      note="Open in another tab to see cross-tab sync"
    >
      <div className="settings-form">
        <div className="setting-row">
          <label>Theme</label>
          <div className="button-group">
            {(['light', 'dark', 'system'] as const).map((t) => (
              <button key={t} className={value.theme === t ? 'active' : ''} onClick={() => settings.patch({ id: value.id, theme: t })}>
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>
          <span className="current-value">{value.theme}</span>
        </div>

        <div className="setting-row">
          <label>Posts per page</label>
          <input
            type="range"
            min="5"
            max="50"
            step="5"
            value={value.postsPerPage}
            onChange={(e) => settings.patch({ id: value.id, postsPerPage: Number(e.target.value) })}
          />
          <span className="current-value">{value.postsPerPage}</span>
        </div>

        <div className="setting-row">
          <label>Show completed</label>
          <input
            type="checkbox"
            checked={value.showCompletedTodos}
            onChange={(e) => settings.patch({ id: value.id, showCompletedTodos: e.target.checked })}
          />
          <span className="current-value">{value.showCompletedTodos ? 'Yes' : 'No'}</span>
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
