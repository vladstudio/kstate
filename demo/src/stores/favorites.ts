import { createSetStore, local, computed } from 'kstate'

export interface Favorite {
  id: string
  postId: string
  addedAt: number
}

export const favorites = createSetStore<Favorite>(local('kstate-demo-favorites'))

export const favoriteCount = computed(favorites, (items) => items.length)
