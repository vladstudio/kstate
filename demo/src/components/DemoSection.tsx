import { ReactNode } from 'react'

type Props = {
  title: string
  features: string
  note?: string
  badge?: string | number
  isRevalidating?: boolean
  isLoading?: boolean
  error?: Error | null
  children: ReactNode
}

export function DemoSection({
  title,
  features,
  note,
  badge,
  isRevalidating,
  isLoading,
  error,
  children,
}: Props) {
  if (isLoading) return <div className="loading">Loading...</div>
  if (error) return <div className="error">Error: {error.message}</div>

  return (
    <div className="demo-section">
      <div className="demo-header">
        <h2>{title}</h2>
        {badge !== undefined && <span className="badge">{badge}</span>}
        {isRevalidating && <span className="badge revalidating">Syncing...</span>}
      </div>
      <div className="demo-info">
        <p>{features}</p>
        {note && <p className="note">{note}</p>}
      </div>
      {children}
    </div>
  )
}
