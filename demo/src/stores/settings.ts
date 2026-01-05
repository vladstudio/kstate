import { createSetStore, local } from 'kstate'

export interface Settings {
  id: string
  theme: 'light' | 'dark' | 'system'
  postsPerPage: number
  showCompletedTodos: boolean
}

const defaults: Settings[] = [{ id: 'default', theme: 'system', postsPerPage: 10, showCompletedTodos: true }]
export const settings = createSetStore<Settings>(local('kstate-demo-settings', defaults))
