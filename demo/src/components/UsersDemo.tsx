import { useEffect, useState } from 'react'
import { useStore, useStoreStatus } from 'kstate'
import { users, User, userCount, usersByCompany } from '../stores'

export function UsersDemo() {
  const items = useStore<User[]>(users)
  const count = useStore<number>(userCount)
  const grouped = useStore<Record<string, User[]>>(usersByCompany)
  const { isLoading, isRevalidating, error } = useStoreStatus(users)
  const [viewMode, setViewMode] = useState<'list' | 'grouped'>('list')
  const [selectedUser, setSelectedUser] = useState<User | null>(null)

  useEffect(() => {
    users.get()
  }, [])

  const handleGetOne = async (id: string) => {
    const user = await users.getOne({ id })
    setSelectedUser(user)
  }

  if (isLoading && items.length === 0) {
    return <div className="loading">Loading users...</div>
  }

  if (error) {
    return <div className="error">Error: {error.message}</div>
  }

  return (
    <div className="demo-section">
      <div className="demo-header">
        <h2>Users (API Array Store)</h2>
        <span className="badge">{count} users</span>
        {isRevalidating && <span className="badge revalidating">Syncing...</span>}
      </div>

      <div className="demo-info">
        <p>
          <strong>Features demonstrated:</strong> createArrayStore, get, getOne,
          computed stores with grouping, TTL caching
        </p>
      </div>

      <div className="actions">
        <button
          className={viewMode === 'list' ? 'active' : ''}
          onClick={() => setViewMode('list')}
        >
          List View
        </button>
        <button
          className={viewMode === 'grouped' ? 'active' : ''}
          onClick={() => setViewMode('grouped')}
        >
          By Company
        </button>
        <button onClick={() => users.get({ _force: 1 })}>Refresh</button>
      </div>

      {selectedUser && (
        <div className="user-detail">
          <h3>{selectedUser.name}</h3>
          <p>@{selectedUser.username}</p>
          <p>{selectedUser.email}</p>
          <p>{selectedUser.phone}</p>
          <p>
            {selectedUser.address.city}, {selectedUser.address.street}
          </p>
          <p>
            <strong>{selectedUser.company.name}</strong> -{' '}
            {selectedUser.company.catchPhrase}
          </p>
          <button onClick={() => setSelectedUser(null)}>Close</button>
        </div>
      )}

      {viewMode === 'list' ? (
        <ul className="items-list">
          {items.map((user) => (
            <li key={user.id} className="item">
              <div className="item-content">
                <strong>{user.name}</strong>
                <small>@{user.username}</small>
                <small>{user.email}</small>
              </div>
              <div className="item-actions">
                <button onClick={() => handleGetOne(user.id)}>Details</button>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <div className="grouped-view">
          {Object.entries(grouped).map(([company, companyUsers]) => (
            <div key={company} className="group">
              <h3>{company}</h3>
              <ul>
                {companyUsers.map((user) => (
                  <li key={user.id}>
                    {user.name} (@{user.username})
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
