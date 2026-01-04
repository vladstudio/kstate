import { useEffect, useRef, useState } from 'react'
import { useStore, useStoreStatus } from 'kstate'
import { users, User } from '../stores'
import { DemoSection } from './DemoSection'

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

  return (
    <DemoSection
      title="Fine-Grained Reactivity"
      features="Path-based subscriptions - components re-render only when their specific data changes"
      note="Click Update - only that field's component re-renders"
      isLoading={isLoading || !ready}
    >
      <div className="fine-grained-grid">
        {[0, 1, 2, 3, 4].map((i) => <UserRow key={i} index={i} />)}
      </div>

      <div className="code-example">
        <h4>How it works:</h4>
        <pre>{`// Path-based subscriptions
const name = useStore(users[index].name)
// Only re-renders when users[index].name changes

users.patch({ id: '1', name: 'New' })
// → Only name subscribers re-render`}</pre>
      </div>
    </DemoSection>
  )
}

function UserRow({ index }: { index: number }) {
  const renderCount = useRef(0)
  renderCount.current++

  return (
    <div className="user-row-demo">
      <div className="row-header">
        <span>User {index}</span>
        <span className="render-count">Row: {renderCount.current}</span>
      </div>
      <div className="row-fields">
        <FieldCell index={index} field="name" label="Name" editable />
        <FieldCell index={index} field="email" label="Email" editable />
        <FieldCell index={index} field="address.city" label="City" />
      </div>
    </div>
  )
}

function FieldCell({ index, field, label, editable }: { index: number; field: string; label: string; editable?: boolean }) {
  const userProxy = (users as unknown as Record<number, User>)[index]
  const path = field.split('.').reduce((obj, key) => (obj as Record<string, unknown>)[key], userProxy as unknown)
  const value = useStore<string>(path as unknown as string)
  const id = useStore<string>((userProxy as unknown as Record<string, string>).id)
  const renderCount = useRef(0)
  renderCount.current++

  const handleUpdate = () => {
    const rand = Math.random().toString(36).slice(2, 5)
    const patch = field === 'email' ? { id, email: `${rand}@example.com` } : { id, name: `Updated ${rand}` }
    users.patch(patch)
  }

  return (
    <div className="field-cell">
      <label>{label}</label>
      <span className="field-value">{value}</span>
      <span className="render-count">renders: {renderCount.current}</span>
      {editable && <button onClick={handleUpdate} className="small">Update</button>}
    </div>
  )
}
