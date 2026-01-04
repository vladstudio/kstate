import { useEffect, useRef, useState } from 'react'
import { useStore, useStoreStatus } from 'kstate'
import { users, User } from '../stores'

export function FineGrainedDemo() {
  const { isLoading } = useStoreStatus(users)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (users.value.length === 0) {
      users.get().then(() => setReady(true))
    } else {
      setReady(true)
    }
  }, [])

  if (isLoading || !ready) {
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
          each component only re-renders when its specific subscribed data
          changes
        </p>
        <p className="note">
          Watch the render counters - clicking "Update" only re-renders
          components subscribed to that specific row!
        </p>
      </div>

      <div className="fine-grained-grid">
        {[0, 1, 2, 3, 4].map((index) => (
          <UserRow key={index} index={index} />
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

function UserRow({ index }: { index: number }) {
  const renderCount = useRef(0)
  renderCount.current++

  return (
    <div className="user-row-demo">
      <div className="row-header">
        <span>User Row {index}</span>
        <span className="render-count">Row renders: {renderCount.current}</span>
      </div>
      <div className="row-fields">
        <UserName index={index} />
        <UserEmail index={index} />
        <UserCity index={index} />
      </div>
    </div>
  )
}

function UserName({ index }: { index: number }) {
  const userProxy = (users as unknown as Record<number, User>)[index]
  const name = useStore<string>((userProxy as unknown as Record<string, string>).name)
  const id = useStore<string>((userProxy as unknown as Record<string, string>).id)
  const renderCount = useRef(0)
  renderCount.current++

  const handleUpdate = () => {
    users.patch({ id, name: `Updated ${Math.random().toString(36).slice(2, 5)}` })
  }

  return (
    <div className="field-cell">
      <label>Name</label>
      <span className="field-value">{name}</span>
      <span className="render-count">renders: {renderCount.current}</span>
      <button onClick={handleUpdate} className="small">Update</button>
    </div>
  )
}

function UserEmail({ index }: { index: number }) {
  const userProxy = (users as unknown as Record<number, User>)[index]
  const email = useStore<string>((userProxy as unknown as Record<string, string>).email)
  const id = useStore<string>((userProxy as unknown as Record<string, string>).id)
  const renderCount = useRef(0)
  renderCount.current++

  const handleUpdate = () => {
    users.patch({ id, email: `${Math.random().toString(36).slice(2, 5)}@example.com` })
  }

  return (
    <div className="field-cell">
      <label>Email</label>
      <span className="field-value">{email}</span>
      <span className="render-count">renders: {renderCount.current}</span>
      <button onClick={handleUpdate} className="small">Update</button>
    </div>
  )
}

function UserCity({ index }: { index: number }) {
  const userProxy = (users as unknown as Record<number, User>)[index]
  const city = useStore<string>((userProxy as unknown as Record<string, Record<string, string>>).address.city)
  const renderCount = useRef(0)
  renderCount.current++

  return (
    <div className="field-cell">
      <label>City</label>
      <span className="field-value">{city}</span>
      <span className="render-count">renders: {renderCount.current}</span>
    </div>
  )
}
