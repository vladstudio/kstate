import { createApiArrayStore, computed } from 'kstate'

export interface User {
  id: string
  name: string
  username: string
  email: string
  phone: string
  website: string
  company: {
    name: string
    catchPhrase: string
    bs: string
  }
  address: {
    street: string
    suite: string
    city: string
    zipcode: string
  }
}

export const users = createApiArrayStore<User>({
  endpoints: {
    get: '/users',
    getOne: '/users/:id',
    patch: '/users/:id',
  },
  ttl: 60000,
})

export const userCount = computed(users, (items) => items.length)

export const usersByCompany = computed(users, (items) => {
  const grouped: Record<string, User[]> = {}
  for (const user of items) {
    const company = user.company.name
    if (!grouped[company]) grouped[company] = []
    grouped[company].push(user)
  }
  return grouped
})
