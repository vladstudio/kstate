import { describe, it, expect, mock } from 'bun:test'
import { createSubscriberManager } from './subscribers'

describe('createSubscriberManager', () => {
  describe('subscribe', () => {
    it('should register a listener', () => {
      const manager = createSubscriberManager()
      const listener = mock(() => {})

      manager.subscribe([], listener)
      manager.notify([[]])

      expect(listener).toHaveBeenCalledTimes(1)
    })

    it('should return unsubscribe function', () => {
      const manager = createSubscriberManager()
      const listener = mock(() => {})

      const unsubscribe = manager.subscribe([], listener)
      unsubscribe()
      manager.notify([[]])

      expect(listener).not.toHaveBeenCalled()
    })

    it('should call onFirstSubscribe only once', () => {
      const onFirstSubscribe = mock(() => {})
      const manager = createSubscriberManager(onFirstSubscribe)

      manager.subscribe([], () => {})
      manager.subscribe([], () => {})

      expect(onFirstSubscribe).toHaveBeenCalledTimes(1)
    })
  })

  describe('path matching', () => {
    it('should notify root subscribers on any change', () => {
      const manager = createSubscriberManager()
      const listener = mock(() => {})

      manager.subscribe([], listener)
      manager.notify([['user', 'name']])

      expect(listener).toHaveBeenCalled()
    })

    it('should notify all subscribers on root change', () => {
      const manager = createSubscriberManager()
      const listener = mock(() => {})

      manager.subscribe(['user', 'name'], listener)
      manager.notify([[]])

      expect(listener).toHaveBeenCalled()
    })

    it('should notify ancestor subscribers', () => {
      const manager = createSubscriberManager()
      const listener = mock(() => {})

      manager.subscribe(['user'], listener)
      manager.notify([['user', 'name']])

      expect(listener).toHaveBeenCalled()
    })

    it('should notify descendant subscribers', () => {
      const manager = createSubscriberManager()
      const listener = mock(() => {})

      manager.subscribe(['user', 'name'], listener)
      manager.notify([['user']])

      expect(listener).toHaveBeenCalled()
    })

    it('should not notify sibling subscribers', () => {
      const manager = createSubscriberManager()
      const listener = mock(() => {})

      manager.subscribe(['user', 'name'], listener)
      manager.notify([['user', 'email']])

      expect(listener).not.toHaveBeenCalled()
    })

    it('should not notify unrelated paths', () => {
      const manager = createSubscriberManager()
      const listener = mock(() => {})

      manager.subscribe(['posts'], listener)
      manager.notify([['user']])

      expect(listener).not.toHaveBeenCalled()
    })

    it('should handle numeric indices in paths', () => {
      const manager = createSubscriberManager()
      const listener = mock(() => {})

      manager.subscribe([0, 'name'], listener)
      manager.notify([[0, 'name']])

      expect(listener).toHaveBeenCalled()
    })

    it('should not notify different array indices', () => {
      const manager = createSubscriberManager()
      const listener = mock(() => {})

      manager.subscribe([0], listener)
      manager.notify([[1]])

      expect(listener).not.toHaveBeenCalled()
    })
  })

  describe('multiple changed paths', () => {
    it('should notify if any changed path matches', () => {
      const manager = createSubscriberManager()
      const listener = mock(() => {})

      manager.subscribe(['user', 'name'], listener)
      manager.notify([['posts'], ['user', 'name']])

      expect(listener).toHaveBeenCalledTimes(1)
    })
  })
})
