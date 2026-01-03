import { createLocalStore } from 'kstate'

export interface Settings {
  theme: 'light' | 'dark' | 'system'
  postsPerPage: number
  showCompletedTodos: boolean
}

export const settings = createLocalStore<Settings>('kstate-demo-settings', {
  theme: 'system',
  postsPerPage: 10,
  showCompletedTodos: true,
})
