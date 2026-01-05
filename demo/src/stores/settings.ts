import { createSetStore, local } from 'kstate'

export interface Settings {
  id: string
  theme: 'light' | 'dark' | 'system'
  postsPerPage: number
  showCompletedTodos: boolean
}

export const settings = createSetStore<Settings>(local('kstate-demo-settings', [{
  id: 'default',
  theme: 'system',
  postsPerPage: 10,
  showCompletedTodos: true,
}]))
