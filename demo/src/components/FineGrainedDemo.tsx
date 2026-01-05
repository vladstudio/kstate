import { useEffect, useRef, useState } from 'react'
import { useStore, useStoreStatus } from 'kstate'
import { users } from '../stores'
import { DemoSection } from './DemoSection'

export function FineGrainedDemo() {
  const { isLoading } = useStoreStatus(users)
  const [ready, setReady] = useState(false)
  const [ids, setIds] = useState<readonly string[]>([])

  useEffect(() => {
    if (users.value.size === 0) {
      users.get().then(() => { setIds(users.ids.slice(0, 5)); setReady(true) })
    } else {
      setIds(users.ids.slice(0, 5)); setReady(true)
    }
  }, [])

  return (
    <DemoSection
      title="Fine-Grained Reactivity"
      features="ID-based subscriptions - components re-render only when their specific data changes"
      note="Click Update - only that field's component re-renders"
      isLoading={isLoading || !ready}
    >
      <div className="fine-grained-grid">
        {ids.map(id => <UserRow key={id} id={id} />)}
      </div>

      <div className="code-example">
        <h4>How it works:</h4>
        <pre>{`// ID-based subscriptions
const name = useStore(users[id].name)
// Only re-renders when users[id].name changes

users.patch({ id: 'abc', name: 'New' })
// → Only name subscribers for 'abc' re-render`}</pre>
      </div>
    </DemoSection>
  )
}

function UserRow({ id }: { id: string }) {
  const renderCount = useRef(0)
  renderCount.current++

  return (
    <div className="user-row-demo">
      <div className="row-header">
        <span>User {id}</span>
        <span className="render-count">Row: {renderCount.current}</span>
      </div>
      <div className="row-fields">
        <FieldCell id={id} field="name" label="Name" editable />
        <FieldCell id={id} field="email" label="Email" editable />
        <CityCell id={id} />
      </div>
    </div>
  )
}

function FieldCell({ id, field, label, editable }: { id: string; field: 'name' | 'email'; label: string; editable?: boolean }) {
  const value = useStore<string>((users[id] as { name: string; email: string })[field] as unknown)
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

function CityCell({ id }: { id: string }) {
  const city = useStore<string>((users[id] as { address: { city: string } }).address.city as unknown)
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
