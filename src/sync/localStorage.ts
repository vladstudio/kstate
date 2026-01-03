export function loadFromStorage<T>(key: string): T | null {
  if (typeof localStorage === 'undefined') return null
  try {
    const stored = localStorage.getItem(key)
    return stored ? JSON.parse(stored) : null
  } catch {
    return null
  }
}

export function saveToStorage<T>(key: string, value: T): void {
  if (typeof localStorage === 'undefined') return
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    console.error('KState: Failed to save to localStorage')
  }
}
