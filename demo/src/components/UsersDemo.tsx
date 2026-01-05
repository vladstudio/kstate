import { useEffect, useState } from 'react'
import { useStore, useStoreStatus } from 'kstate'
import { users, User, userCount, usersByCompany } from '../stores'
import { DemoSection } from './DemoSection'

export function UsersDemo() {
  const count = useStore<number>(userCount)
  const grouped = useStore<Record<string, User[]>>(usersByCompany)
  const { isLoading, isRevalidating, error } = useStoreStatus(users)
  const [viewMode, setViewMode] = useState<'list' | 'grouped'>('list')
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [ids, setIds] = useState<readonly string[]>([])

  useEffect(() => { users.get().then(() => setIds(users.ids)) }, [])

  return (
    <DemoSection
      title="Users"
      features="API set store, getOne, computed grouping, TTL caching"
      badge={`${count} users`}
      isLoading={isLoading && ids.length === 0}
      isRevalidating={isRevalidating}
      error={error}
    >
      <div className="actions">
        <button className={viewMode === 'list' ? 'active' : ''} onClick={() => setViewMode('list')}>
          List
        </button>
        <button className={viewMode === 'grouped' ? 'active' : ''} onClick={() => setViewMode('grouped')}>
          By Company
        </button>
        <button onClick={() => users.get({ _force: 1 }).then(() => setIds(users.ids))}>Refresh</button>
      </div>

      {selectedUser && (
        <div className="user-detail">
          <h3>{selectedUser.name}</h3>
          <p>@{selectedUser.username} · {selectedUser.email}</p>
          <p>{selectedUser.address.city} · {selectedUser.company.name}</p>
          <button onClick={() => setSelectedUser(null)}>Close</button>
        </div>
      )}

      {viewMode === 'list' ? (
        <ul className="items-list">
          {ids.map(id => {
            const user = users.value.get(id)!
            return (
              <li key={id} className="item">
                <div className="item-content">
                  <strong>{user.name}</strong>
                  <small>@{user.username} · {user.email}</small>
                </div>
                <div className="item-actions">
                  <button onClick={async () => setSelectedUser(await users.getOne({ id }))}>
                    Details
                  </button>
                </div>
              </li>
            )
          })}
        </ul>
      ) : (
        <div className="grouped-view">
          {Object.entries(grouped).map(([company, companyUsers]) => (
            <div key={company} className="group">
              <h3>{company}</h3>
              <ul>
                {companyUsers.map((user) => (
                  <li key={user.id}>{user.name} (@{user.username})</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </DemoSection>
  )
}
