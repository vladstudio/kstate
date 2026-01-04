import type { Path, Listener, SubscriberManager } from '../types'

interface Subscription {
  path: Path
  listener: Listener
}

export function createSubscriberManager(onFirstSubscribe?: () => void): SubscriberManager {
  const subscriptions = new Set<Subscription>()
  let hadSubscribers = false

  function subscribe(path: Path, listener: Listener): () => void {
    const subscription: Subscription = { path, listener }
    subscriptions.add(subscription)
    if (!hadSubscribers && onFirstSubscribe) {
      hadSubscribers = true
      onFirstSubscribe()
    }
    return () => { subscriptions.delete(subscription) }
  }

  function notify(changedPaths: Path[]): void {
    if (subscriptions.size === 0) return
    for (const subscription of subscriptions) {
      if (shouldNotify(subscription.path, changedPaths)) subscription.listener()
    }
  }

  function shouldNotify(subscribedPath: Path, changedPaths: Path[]): boolean {
    for (const changedPath of changedPaths) {
      if (pathMatches(subscribedPath, changedPath)) {
        return true
      }
    }
    return false
  }

  function pathMatches(subscribed: Path, changed: Path): boolean {
    // Subscribed to root → always notify
    if (subscribed.length === 0) return true
    // Changed at root → notify everyone
    if (changed.length === 0) return true
    // Check if paths overlap
    const minLen = Math.min(subscribed.length, changed.length)
    for (let i = 0; i < minLen; i++) {
      if (subscribed[i] !== changed[i]) {
        return false
      }
    }
    // Paths overlap: either subscribed is ancestor or descendant of changed
    return true
  }

  return { subscribe, notify }
}
