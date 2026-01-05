import { createSetStore, api, computed } from 'kstate'

export interface Post {
  id: string
  userId: number
  title: string
  body: string
}

export const posts = createSetStore<Post>({
  ...api({ list: '/posts' }),
  ttl: 60_000,
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
