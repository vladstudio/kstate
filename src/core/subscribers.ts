import type { Path, Listener, SubscriberManager } from '../types'

interface Subscription { path: Path; listener: Listener }

export function createSubscriberManager(onFirstSubscribe?: () => void): SubscriberManager {
  const rootSubs = new Set<Subscription>()
  const indexedSubs = new Map<string | number, Set<Subscription>>()
  let hadSubscribers = false

  function subscribe(path: Path, listener: Listener): () => void {
    const sub: Subscription = { path, listener }
    if (path.length === 0) {
      rootSubs.add(sub)
    } else {
      const key = path[0]
      let set = indexedSubs.get(key)
      if (!set) { set = new Set(); indexedSubs.set(key, set) }
      set.add(sub)
    }
    if (!hadSubscribers && onFirstSubscribe) { hadSubscribers = true; onFirstSubscribe() }
    return () => {
      if (path.length === 0) rootSubs.delete(sub)
      else indexedSubs.get(path[0])?.delete(sub)
    }
  }

  function notify(changedPaths: Path[]): void {
    if (rootSubs.size === 0 && indexedSubs.size === 0) return
    const toCall = new Set<Listener>()
    for (const changed of changedPaths) {
      for (const sub of rootSubs) toCall.add(sub.listener)
      if (changed.length === 0) {
        for (const set of indexedSubs.values()) for (const sub of set) toCall.add(sub.listener)
      } else {
        const set = indexedSubs.get(changed[0])
        if (set) for (const sub of set) if (pathMatches(sub.path, changed)) toCall.add(sub.listener)
      }
    }
    for (const fn of toCall) fn()
  }

  function pathMatches(subscribed: Path, changed: Path): boolean {
    const minLen = Math.min(subscribed.length, changed.length)
    for (let i = 0; i < minLen; i++) if (subscribed[i] !== changed[i]) return false
    return true
  }

  return { subscribe, notify }
}
