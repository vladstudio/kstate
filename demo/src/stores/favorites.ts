import { createLocalArrayStore, computed } from 'kstate'

export interface Favorite {
  id: string
  postId: string
  addedAt: number
}

export const favorites = createLocalArrayStore<Favorite>('kstate-demo-favorites')

export const favoriteCount = computed(favorites, (items) => items.length)
