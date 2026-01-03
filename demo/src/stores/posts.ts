import { createArrayStore, computed } from 'kstate'

export interface Post {
  id: string
  userId: number
  title: string
  body: string
}

export const posts = createArrayStore<Post>({
  endpoints: {
    get: '/posts',
    getOne: '/posts/:id',
    create: '/posts',
    update: '/posts/:id',
    patch: '/posts/:id',
    delete: '/posts/:id',
  },
  ttl: 30000,
  reloadOnFocus: true,
  onError: (error, meta) => {
    console.error(`[Posts] ${meta.operation} failed:`, error.message)
  },
})

export const postCount = computed(posts, (items) => items.length)

export const postsByUser = computed(posts, (items) => {
  const grouped: Record<number, Post[]> = {}
  for (const post of items) {
    if (!grouped[post.userId]) grouped[post.userId] = []
    grouped[post.userId].push(post)
  }
  return grouped
})
