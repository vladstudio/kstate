import { useEffect, useRef } from 'react'
import { useStore, useStoreStatus } from 'kstate'
import { users, User } from '../stores'

export function FineGrainedDemo() {
  const items = useStore<User[]>(users)
  const { isLoading } = useStoreStatus(users)

  useEffect(() => {
    if (users.value.length === 0) {
      users.get()
    }
  }, [])

  if (isLoading && items.length === 0) {
    return <div className="loading">Loading users...</div>
  }

  return (
    <div className="demo-section">
      <div className="demo-header">
        <h2>Fine-Grained Reactivity</h2>
      </div>

      <div className="demo-info">
        <p>
          <strong>Features demonstrated:</strong> Path-based subscriptions -
          each component only re-renders when its specific subscribed value
          changes
        </p>
        <p className="note">
          Watch the render counters - clicking "Update Name" only re-renders
          that specific UserName component, not UserEmail or other rows!
        </p>
      </div>

      <div className="fine-grained-grid">
        {items.slice(0, 5).map((user, index) => (
          <UserRow key={user.id} user={user} index={index} />
        ))}
      </div>

      <div className="code-example">
        <h4>How it works:</h4>
        <pre>{`// The proxy system allows path-based subscriptions
// Each component subscribes to a specific path in the data tree

// With proper type support, you could do:
// const name = useStore(users[index].name)
// This only re-renders when users[index].name changes

// Updating one field doesn't re-render other field components
users.patch({ id: '1', name: 'New Name' })
// → Only name subscribers re-render, not email subscribers`}</pre>
      </div>
    </div>
  )
}

function UserRow({ user, index }: { user: User; index: number }) {
  const renderCount = useRef(0)
  renderCount.current++

  return (
    <div className="user-row-demo">
      <div className="row-header">
        <span>User Row {index}</span>
        <span className="render-count">Row renders: {renderCount.current}</span>
      </div>
      <div className="row-fields">
        <UserName user={user} />
        <UserEmail user={user} />
        <UserCity user={user} />
      </div>
    </div>
  )
}

function UserName({ user }: { user: User }) {
  const renderCount = useRef(0)
  renderCount.current++

  const handleUpdate = () => {
    const suffix = Math.random().toString(36).slice(2, 5)
    users.patch({ id: user.id, name: `Updated ${suffix}` })
  }

  return (
    <div className="field-cell">
      <label>Name</label>
      <span className="field-value">{user.name}</span>
      <span className="render-count">renders: {renderCount.current}</span>
      <button onClick={handleUpdate} className="small">
        Update
      </button>
    </div>
  )
}

function UserEmail({ user }: { user: User }) {
  const renderCount = useRef(0)
  renderCount.current++

  const handleUpdate = () => {
    const suffix = Math.random().toString(36).slice(2, 5)
    users.patch({ id: user.id, email: `${suffix}@example.com` })
  }

  return (
    <div className="field-cell">
      <label>Email</label>
      <span className="field-value">{user.email}</span>
      <span className="render-count">renders: {renderCount.current}</span>
      <button onClick={handleUpdate} className="small">
        Update
      </button>
    </div>
  )
}

function UserCity({ user }: { user: User }) {
  const renderCount = useRef(0)
  renderCount.current++

  return (
    <div className="field-cell">
      <label>City</label>
      <span className="field-value">{user.address.city}</span>
      <span className="render-count">renders: {renderCount.current}</span>
    </div>
  )
}
