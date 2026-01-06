import { describe, it, expect, mock } from 'bun:test'
import { wrapStoreWithProxy, isKStateProxy, getProxyPath, getProxySubscribe, getProxyGetData } from './proxy'
import { createSubscriberManager } from './subscribers'

describe('wrapStoreWithProxy', () => {
  it('should create a proxy with access to data', () => {
    const subscribers = createSubscriberManager()
    const store = { getValue: () => ({ name: 'John' }), subscribers }

    const proxy = wrapStoreWithProxy<{ name: string }>(store)

    // Primitive values are wrapped; use valueOf() or coercion
    expect(String(proxy.name)).toBe('John')
  })

  it('should handle nested objects', () => {
    const subscribers = createSubscriberManager()
    const store = {
      getValue: () => ({ user: { profile: { name: 'John' } } }),
      subscribers,
    }

    const proxy = wrapStoreWithProxy<{ user: { profile: { name: string } } }>(store)

    expect(String(proxy.user.profile.name)).toBe('John')
  })

  it('should handle arrays', () => {
    const subscribers = createSubscriberManager()
    const store = { getValue: () => [{ id: '1' }, { id: '2' }], subscribers }

    const proxy = wrapStoreWithProxy<{ id: string }[]>(store)

    expect(proxy.length).toBe(2)
    expect(String(proxy[0].id)).toBe('1')
    expect(String(proxy[1].id)).toBe('2')
  })

  it('should return undefined for null data', () => {
    const subscribers = createSubscriberManager()
    const store = { getValue: () => null, subscribers }

    const proxy = wrapStoreWithProxy<{ name: string } | null>(store)

    // Accessing a property on null data returns a proxy (for chaining), but its value is undefined
    const nameProxy = (proxy as { name?: string }).name
    expect(getProxyGetData(nameProxy)?.()).toBeUndefined()
  })

  it('should support array iteration', () => {
    const subscribers = createSubscriberManager()
    const store = { getValue: () => [1, 2, 3], subscribers }

    const proxy = wrapStoreWithProxy<number[]>(store)
    const result: number[] = []
    for (const item of proxy) {
      result.push(item as unknown as number)
    }

    expect(result).toEqual([1, 2, 3])
  })

  it('should support array methods', () => {
    const subscribers = createSubscriberManager()
    const store = { getValue: () => [1, 2, 3, 4], subscribers }

    const proxy = wrapStoreWithProxy<number[]>(store)

    expect(proxy.filter(x => x > 2)).toEqual([3, 4])
    expect(proxy.map(x => x * 2)).toEqual([2, 4, 6, 8])
    expect(proxy.find(x => x === 3)).toBe(3)
    expect(proxy.some(x => x > 3)).toBe(true)
    expect(proxy.every(x => x > 0)).toBe(true)
  })
})

describe('isKStateProxy', () => {
  it('should return true for proxies', () => {
    const subscribers = createSubscriberManager()
    const store = { getValue: () => ({ name: 'John' }), subscribers }
    const proxy = wrapStoreWithProxy(store)

    expect(isKStateProxy(proxy)).toBe(true)
  })

  it('should return false for regular objects', () => {
    expect(isKStateProxy({ name: 'John' })).toBe(false)
    expect(isKStateProxy(null)).toBe(false)
    expect(isKStateProxy(undefined)).toBe(false)
    expect(isKStateProxy(42)).toBe(false)
  })
})

describe('getProxyPath', () => {
  it('should return root path for store proxy', () => {
    const subscribers = createSubscriberManager()
    const store = { getValue: () => ({ user: { name: 'John' } }), subscribers }
    const proxy = wrapStoreWithProxy<{ user: { name: string } }>(store)

    expect(getProxyPath(proxy)).toEqual([])
  })

  it('should return nested path for nested access', () => {
    const subscribers = createSubscriberManager()
    const store = { getValue: () => ({ user: { name: 'John' } }), subscribers }
    const proxy = wrapStoreWithProxy<{ user: { name: string } }>(store)

    expect(getProxyPath(proxy.user)).toEqual(['user'])
    // Primitive values are now wrapped with path tracking
    expect(getProxyPath(proxy.user.name)).toEqual(['user', 'name'])
  })

  it('should return empty array for non-proxies', () => {
    expect(getProxyPath({ name: 'John' })).toEqual([])
  })
})

describe('getProxySubscribe', () => {
  it('should return subscribe function for proxies', () => {
    const subscribers = createSubscriberManager()
    const store = { getValue: () => ({ name: 'John' }), subscribers }
    const proxy = wrapStoreWithProxy(store)

    const subscribeFn = getProxySubscribe(proxy)
    expect(subscribeFn).not.toBeNull()
  })

  it('should return null for non-proxies', () => {
    expect(getProxySubscribe({ name: 'John' })).toBeNull()
  })

  it('should allow subscribing through returned function', () => {
    const subscribers = createSubscriberManager()
    const store = { getValue: () => ({ name: 'John' }), subscribers }
    const proxy = wrapStoreWithProxy(store)

    const subscribeFn = getProxySubscribe(proxy)
    const listener = mock(() => {})
    subscribeFn!([], listener)

    subscribers.notify([[]])

    expect(listener).toHaveBeenCalled()
  })
})

describe('getProxyGetData', () => {
  it('should return getData function for proxies', () => {
    const subscribers = createSubscriberManager()
    const data = { name: 'John' }
    const store = { getValue: () => data, subscribers }
    const proxy = wrapStoreWithProxy(store)

    const getDataFn = getProxyGetData(proxy)
    expect(getDataFn).not.toBeNull()
    expect(getDataFn!()).toEqual(data)
  })

  it('should return null for non-proxies', () => {
    expect(getProxyGetData({ name: 'John' })).toBeNull()
  })
})
