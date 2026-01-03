# Legend-State v3

Super fast all-in-one state library for local and remote state. `npm install @legendapp/state@beta`

## Patterns

### Store options
```js
// One large store
const store$ = observable({
    UI: { windowSize: undefined, activeTab: 'home' },
    settings: { theme: 'light', fontSize: 14 },
    todos: []
})

// Multiple atoms
export const theme$ = observable('light')
export const uiState$ = observable({ windowSize: undefined, activeTab: 'home' })

// Within React
function App() {
  const store$ = useObservable({ profile: { name: "hi" } })
  return <Profile profile={store$.profile} />
}
```

## Performance

### Batching
```js
const state$ = observable({ items: [] })
// ❌ Renders 1000 times
for (let i = 0; i < 1000; i++) state$.items.push({ text: `Item ${i}` })
// ✅ Renders once
batch(() => { for (let i = 0; i < 1000; i++) state$.items.push({ text: `Item ${i}` }) })
```

### Avoid proxy creation in loops
```js
const state$ = observable({ items: [{ data: { value: 10 }}, ...] })
// 🔥 Creates proxies
state$.items.forEach(item => sum += item.data.value.get())
// 💨 No proxies
state$.items.get().forEach(item => sum += item.data.value)
```

### Arrays require unique id
```js
const data$ = observable({
  arr: [],
  arr_keyExtractor: (item) => item.idObject._id, // custom id field
})
```

### For component
```jsx
import { For } from "@legendapp/state/react"
const state$ = observable({ arr: [{ id: 1, text: 'hi' }]})

function Row({ item$ }) {
    return <div>{useValue(item$.text)}</div>
}
// item prop or render function
<For each={state$.arr} item={Row} />
<For each={list}>{item$ => <div>{item$.text.get()}</div>}</For>
// optimized mode for best perf (reuses React nodes)
<For each={list} item={Row} optimized />
```

### Don't get() while mapping
```jsx
// Use peek() for keys to avoid tracking
state$.arr.map((item) => <Row key={item.peek().id} item={item} />)
```

## Observable

### Creating
```js
import { observable } from "@legendapp/state"

const state$ = observable({
    fname: 'Annyong',
    lname: 'Bluth',
    // Computed
    name: () => state$.fname.get() + ' ' + state$.lname.get(),
    // Action
    setName: (name) => {
        const [fname, lname] = name.split(' ')
        state$.assign({ fname, lname })
    }
})
// Or atoms
const fname$ = observable('Annyong')
```

### Methods
```js
const state$ = observable({ text: "hi", profile: { name: '' } })

// get() - retrieves value, tracks in observing contexts
state$.text.get()
state$.get(true) // shallow tracking

// peek() - retrieves without tracking
state$.text.peek()

// set()
state$.text.set("hello")
state$.text.set(prev => prev + " there")
state$.otherKey.otherProp.set("hi") // auto-fills undefined paths

// assign() - shallow merge, batched
state$.assign({ text: "hi!", text2: "there!" })

// delete()
state$.text.delete()
state$[0].delete() // removes from array
```

### Computed
```js
const state$ = observable({
    fname: 'Annyong',
    lname: 'Bluth',
    fullName: () => state$.fname.get() + ' ' + state$.lname.get()
})
// Root computed
const name$ = observable(() => state$.fname.get() + ' ' + state$.lname.get())

// As function - recomputes on call
const fullName = state$.fullName()
// As observable - caches, recomputes on dependency change
const reactiveFullName = state$.fullName.get()
```

### Async
```js
const serverState$ = observable(() => fetch('url').then(res => res.json()))

observe(() => {
    const data = serverState$.get() // undefined until resolved
    if (data) { /* ... */ }
})

// Wait for resolution
const data = await when(serverState$)

// Check status
const status$ = syncState(serverState$)
const { isLoaded, error } = status$.get()
```

### Linked observables
```js
import { linked } from "@legendapp/state"

const selected$ = observable([false, false, false])
const selectedAll$ = observable(linked({
  get: () => selected$.every(val$ => val$.get()),
  set: (value) => selected$.forEach(val$ => val$.set(value))
}))

// With initial value for async
const state$ = observable(linked({
    get: () => fetch('url').then(res => res.json()),
    initial: { numUsers: 0 }
}))
```

### Link to another observable
```js
const state$ = observable({
  items: ["hi", "there", "hello"],
  selectedIndex: 0,
  selectedItem: () => state$.items[state$.selectedIndex.get()],
})
// Set passes through to linked target
state$.selectedItem.set('HELLO!')
// items = ["hi", "there", "HELLO!"]
```

### Lookup table
```ts
const state$ = observable({
    items: { test1: { text: 'hi' }, test2: { text: 'hello' } },
    texts: (key: string) => state$.items[key].text
})
state$.texts['test1'].get() // 'hi'
state$.texts.test1.set('hello') // sets items.test1.text
```

### event
```js
import { event } from "@legendapp/state"
const onClosed$ = event()
onClosed$.on(() => { /* ... */ })
onClosed$.fire()
```

### Safety notes
```js
state$.text = "hi"        // ❌ Can't assign directly
state$.text.set("hi")     // ✅
state$.obj = {}           // ❌ Can't assign objects
state$.set({ text: "hi" }) // ✅
```

### Arrays
Observable arrays have modified looping functions with shallow tracking:
`every`, `filter`, `find`, `findIndex`, `forEach`, `includes`, `join`, `map`, `some`
`filter` returns observable array, `find` returns observable.

### Don't clone
```js
// ❌ Cloning unnecessary
const newRecord = { ...record$.get(), key: 'value' }
record$.set(newRecord)
// ✅ Direct set
record$.key.set('value')

// ❌ Array clone
list$.set([...list$.get(), 'value'])
// ✅ Push
list$.push('value')
```

## Reactivity

### Observing contexts
`get()` inside observing context tracks changes. Contexts: computed, `observe`, `when`, `linked`/`synced` get, `observer`, reactive components.

```js
observe(() => {
    console.log(settings$.theme.get()) // tracks theme
})
```

### What tracks
- `get()`, array looping functions (shallow), `.length`, `Object.keys/values` (shallow)

### What doesn't track
- Accessing through observable: `state$.settings`
- `peek()`

### observe
```js
const dispose = observe((e) => {
  if (!state$.isOnline.get()) {
    const toast = { id: "offline", text: "Offline" }
    state$.toasts.push(toast)
    e.onCleanup = () => state$.toasts.splice(state$.toasts.indexOf(toast), 1)
  }
})
dispose() // cleanup
```

### when
Runs callback once when truthy:
```js
await when(state$.ok) // Promise
when(() => state$.ok.get(), () => console.log("ok")) // callback
```

### onChange
```js
state$.text.onChange(({ value }) => console.log("changed to", value))
```

### Batching
```js
import { batch, beginBatch, endBatch } from "@legendapp/state"
batch(() => { doManyChanges() })
// or
beginBatch(); doManyChanges(); endBatch()
```

## React

### useValue
Primary hook - computes value, tracks observables, re-renders on change:
```jsx
import { useValue } from "@legendapp/state/react"
const state$ = observable({ selected: 1, theme: 'dark' })

const Component = ({ id }) => {
    const isSelected = useValue(() => id === state$.selected.get())
    const theme = useValue(state$.theme)
    // With suspense
    const value = useValue(state$, { suspense: true })
}
```

### observer
Optimization - merges all `useValue` into single hook:
```jsx
import { observer, useValue } from "@legendapp/state/react"
const Component = observer(function Component() {
  const v1 = useValue(state$.value1)
  const v2 = useValue(state$.value2)
  // ...
})
```

### useObservable
Create observable within component:
```jsx
const state$ = useObservable({
    title: 'Title',
    first: '',
    last: ''
})
const fullname$ = useObservable(() => `${state$.first.get()} ${state$.last.get()}`)
```

### useObserve / useObserveEffect
```jsx
// Runs during render
useObserve(() => { document.title = profile$.name.get() })
// Single observable with callback
useObserve(profile$.name, ({ value }) => { document.title = value })
// useObserveEffect runs after mount
```

### useWhen, useWhenReady
Hook versions of `when`.

### useObservableReducer
```jsx
const [age$, dispatch] = useObservableReducer(reducer, { age: 42 })
```

### Context
```tsx
const StateContext = createContext<Observable<UserState>>(undefined as any)
function App() {
  const state$ = useObservable({ profile: { name: "" } })
  return <StateContext.Provider value={state$}><Sidebar /></StateContext.Provider>
}
const Sidebar = function Sidebar() {
  const state$ = useContext(StateContext) // never triggers re-render
  return <div>Name: <Memo>{state$.profile.name}</Memo></div>
}
```

### Utility hooks
```jsx
useEffectOnce(() => {}, []) // runs once even in strict mode
useMount(() => {})
useUnmount(() => {})
usePauseProvider() // pause all legend-state rendering under context
```

## Fine-grained Reactivity

### Memo
Self-updating element, parent doesn't re-render:
```jsx
import { Memo } from "@legendapp/state/react"
const count$ = observable(0)
function Component() {
  return <div>Count: <Memo>{count$}</Memo></div>
}
// With selector
<Memo>{() => <div>Count: {count$.get()}</div>}</Memo>
```

### Reactive components (Web)
```jsx
import { $React } from "@legendapp/state/react-web"
const state$ = useObservable({ name: '', age: 18 })

<$React.div
    $style={() => ({ color: state$.age.get() > 5 ? 'green' : 'red' })}
    $className={() => state$.age.get() > 5 ? 'kid' : 'baby'}
/>
<$React.input $value={state$.name} />
<$React.textarea $value={state$.name} />
<$React.select $value={state$.age}>...</$React.select>
```

### Control-flow

**Computed** - children isolated from parent, but parent changes re-render children:
```jsx
<Computed>{() => state$.messages.map(m => <div key={m.id}>{m.text}</div>)}</Computed>
```

**Memo** - never re-renders from parent, only own observables:
```jsx
<Memo>{() => state$.messages.map(m => <div key={m.id}>{m.text}</div>)}</Memo>
```

**Show** - conditional rendering:
```jsx
<Show
  if={state.show}
  else={() => <div>Nothing here</div>}
  wrap={AnimatePresence}
>
  {() => <Modal />}
</Show>
// ifReady - won't render for empty objects/arrays
<Show ifReady={state$.data}>...</Show>
```

**Switch**:
```jsx
<Switch value={state.index}>
  {{ 0: () => <Tab1 />, 1: () => <Tab2 />, default: () => <Error /> }}
</Switch>
```

**For**:
```jsx
<For each={state$.arr} item={Row} />
<For each={list} optimized>{item$ => <div>{item$.text.get()}</div>}</For>
// Props: each, item, itemProps, sortValues, children
```

### Babel plugin
Converts children to functions automatically:
```jsx
<Computed><div>Count: {state$.count.get()}</div></Computed>
// becomes
<Computed>{() => <div>Count: {state$.count.get()}</div>}</Computed>
```
Config: `plugins: ["@legendapp/state/babel"]`
Types: `/// <reference types="@legendapp/state/types/babel" />`

### reactive / reactiveObserver
```js
import { reactive, reactiveObserver } from "@legendapp/state/react"

// Wrap component to accept $props
const Component = reactive(function Component({ message }) {
  return <div>{message}</div>
})
<Component $message={() => isSignedIn$.get() ? "Hello" : "Goodbye"} />

// Wrap external components
const $MotionDiv = reactive(motion.div)
<$MotionDiv $animate={() => ({ x: width$.get() })}>...</$MotionDiv>

// Both observer and reactive
const Component = reactiveObserver(function Component({ message }) {
  const name = useValue(name$)
  return <div>{message} {name}</div>
})

// Multiple at once
const $Motion = reactiveComponents(motion)
<$Motion.div $animate={() => ({ x: width$.get() })}>...</$Motion.div>
```

## Helper observables

```js
import { currentDay, currentTime } from "@legendapp/state/helpers/time"
import { pageHash, configurePageHash } from '@legendapp/state/helpers/pageHash'
import { pageHashParams } from '@legendapp/state/helpers/pageHashParams'

currentDay.get() // updates at midnight
currentTime.get() // updates every minute

configurePageHash({ setter: 'pushState' }) // pushState | replaceState | location.hash
pageHash.set('value=test') // location.hash == "#value=test"
pageHashParams.userid.set('newuser') // location.hash == "#userid=newuser"
```

## Helper hooks

```jsx
import { useHover } from "@legendapp/state/react-hooks/useHover"
import { useIsMounted } from "@legendapp/state/react/useIsMounted"
import { useMeasure } from "@legendapp/state/react-hooks/useMeasure"
import { createObservableHook } from "@legendapp/state/react-hooks/createObservableHook"

const isHovered = useHover(refButton) // observable boolean
const isMounted = useIsMounted() // observable boolean
const { width, height } = useMeasure(ref) // observable size
const useMyHookObservable = createObservableHook(useMyHook) // convert hook to observable
```

## Tracing

```jsx
import { useTraceListeners, useTraceUpdates, useVerifyNotTracking, useVerifyOneRender } from "@legendapp/state/trace"

const Component = observer(function Component() {
  useTraceListeners() // logs tracked observables
  useTraceUpdates() // logs what caused re-render
  useVerifyNotTracking() // errors if tracking anything
  useVerifyOneRender() // errors if renders more than once
})
```

## Helper Functions

### ObservableHint
```js
import { ObservableHint } from '@legendapp/state'
// opaque - treat as primitive, don't observe children
observable({ body: ObservableHint.opaque(document.body) })
// plain - skip child function/observable scanning (perf optimization)
observable({ child: ObservableHint.plain(bigObject) })
```

### mergeIntoObservable
```js
import { mergeIntoObservable } from "@legendapp/state"
mergeIntoObservable(state$, newValue) // deep merge, retains listeners
```

### trackHistory
```js
import { trackHistory } from '@legendapp/state/helpers/trackHistory'
const history = trackHistory(state$)
// { 1666593133018: { profile: { name: 'Hello' } } }
```

### undoRedo
```js
import { undoRedo } from "@legendapp/state/helpers/undoRedo"
const { undo, redo, getHistory } = undoRedo(state$.todos, { limit: 100 })
```

## Configuration

### enable$GetSet
```js
import { enable$GetSet } from "@legendapp/state/config/enable$GetSet"
enable$GetSet()
state$.text.$ // get()
state$.text.$ = "hello" // set()
state$.num.$++
```

### enable_PeekAssign
```js
import { enable_PeekAssign } from "@legendapp/state/config/enable_PeekAssign"
enable_PeekAssign()
state$.text._ // peek()
state$.text._ = "hello" // modify without notifying
```

### enableReactTracking
```js
import { enableReactTracking } from "@legendapp/state/config/enableReactTracking"
enableReactTracking({ warnMissingUse: true }) // warn if get() without useValue
```

## Sync & Persistence

### Basic persistence
```ts
import { syncObservable } from "@legendapp/state/sync"
import { ObservablePersistLocalStorage } from '@legendapp/state/persist-plugins/local-storage'

syncObservable(store$, {
    persist: { name: 'persistKey', plugin: ObservablePersistLocalStorage }
})

// Or with synced
import { synced } from "@legendapp/state/sync"
const store$ = observable(synced({
    initial: [],
    persist: { name: 'persistKey' }
}))
```

### Async persistence
```js
const status$ = syncState(state$)
await when(status$.isPersistLoaded)
```

### Remote sync
```ts
import { syncedFetch } from "@legendapp/state/sync-plugins/fetch"

const store$ = observable({
    users: syncedFetch({
        initial: [],
        get: 'https://api.com/users',
        set: 'https://api.com/users'
    })
})
```

### Paging
```ts
const store$ = observable({
    usersPage: 1,
    users: syncedFetch({
        get: () => `https://api.com/users?page=${store$.usersPage.get()}`,
        mode: 'append'
    }),
})
store$.users.get() // page 1
store$.usersPage.set(p => p + 1) // page 2
```

### configureSynced
```ts
import { configureSynced } from "@legendapp/state/sync"
const syncPlugin = configureSynced({
    persist: { plugin: ObservablePersistLocalStorage }
})
const state$ = observable(syncPlugin({ persist: { name: 'test' } }))
```

### synced options
```js
synced({
    get: () => fetch('url').then(res => res.json()),
    set: ({ value }) => fetch('url', { method: 'POST', body: JSON.stringify(value) }),
    persist: {
        name: 'test',
        plugin: ObservablePersistLocalStorage,
        retrySync: true,
        options: {}
    },
    initial: { data: [] },
    mode: 'set' | 'assign' | 'merge' | 'append' | 'prepend',
    subscribe: ({ refresh, update }) => {
        const unsubscribe = realtime.subscribe(() => refresh())
        return unsubscribe
    },
    retry: { infinite: true, backoff: 'exponential', maxDelay: 30 },
    debounceSet: 500,
})
```

### syncState
```ts
const state$ = syncState(obs$)
state$.error.get()
state$.isLoaded.get()
state$.isPersistLoaded.get()
state$.isPersistEnabled.get()
state$.isSyncEnabled.get()
state$.lastSync.get()
state$.syncCount.get()
state$.clearPersist()
state$.sync()
state$.getPendingChanges()
```

### Transform
```ts
import { combineTransforms, transformStringifyDates, transformStringifyKeys } from '@legendapp/state/sync'

synced({
    transform: combineTransforms(
        transformStringifyDates(),
        transformStringifyKeys('jsonData'),
        {
            load: async (value) => { /* transform in */ return value },
            save: async (value) => { /* transform out */ return value }
        }
    ),
    persist: {
        transform: { load: (v) => migrate(v) }
    }
})
```

### Persist plugins

**Local Storage:**
```js
import { ObservablePersistLocalStorage } from '@legendapp/state/persist-plugins/local-storage'
```

**IndexedDB:**
```js
import { observablePersistIndexedDB } from "@legendapp/state/persist-plugins/indexeddb"
const persistOptions = configureSynced({
    persist: {
        plugin: observablePersistIndexedDB({
            databaseName: "Legend",
            version: 1,
            tableNames: ["documents", "store"]
        })
    }
})
// Mode 1: dictionary with id fields
syncObservable(state$, persistOptions({ persist: { name: "documents" } }))
// Mode 2: object with itemId
syncObservable(settings$, persistOptions({
    persist: { name: "store", indexedDB: { itemID: "settings" } }
}))
```

## syncedCrud

### get vs list
```ts
import { syncedCrud } from '@legendapp/state/sync-plugins/crud'

// get: value is single object
const profile$ = observable(syncedCrud({
    get: getProfile,
    create: createProfile,
    update: updateProfile,
    delete: deleteProfile,
}))
// profile$.get() is Profile

// list: value is Record<id, object>
const profiles$ = observable(syncedCrud({
    list: listProfiles,
    create: createProfile,
    update: updateProfile,
    delete: deleteProfile,
}))
// profiles$.get() is Record<string, Profile>
// as: 'object' | 'array' | 'Map' | 'value'
```

### create/update/delete
```ts
syncedCrud({
    create: (value, options) => {
        const { data, error } = await serverCreate(value)
        if (error) throw error // triggers retry
        return data // merged back into observable
    },
    update: (value, options) => serverUpdate(value),
    delete: ({ id }, options) => serverDelete(id),
    fieldCreatedAt: 'created_at',
    fieldUpdatedAt: 'updated_at',
    updatePartial: true, // send only changed fields
    fieldDeleted: 'deleted', // soft delete instead of delete function
})
```

### onSaved
```ts
syncedCrud({
    onSavedUpdate: 'createdUpdatedAt', // auto-save timestamp fields
    // or manual:
    onSaved: ({ saved, input, currentValue, isCreate }) => ({
        serverValue: saved.serverValue
    })
})
```

### subscribe
```ts
syncedCrud({
    subscribe: ({ refresh, update }) => {
        const unsubscribe = realtime.subscribe((data) => {
            update(data) // or refresh()
        })
        return unsubscribe
    }
})
```

### changesSince: 'last-sync'
Only sync diffs. Requires: `fieldUpdatedAt`, soft deletes or list includes deleted.
```ts
syncedCrud({
    list: listProfiles,
    changesSince: 'last-sync',
    fieldUpdatedAt: 'updatedAt',
    fieldDeleted: 'deleted'
})
```

### All options
`get`, `list`, `create`, `update`, `delete`, `onSaved`, `onSavedUpdate`, `fieldCreatedAt`, `fieldUpdatedAt`, `fieldDeleted`, `updatePartial`, `changesSince`, `generateId`, `subscribe`, `retry`, `persist`, `debounceSet`, `mode`, `transform`, `waitFor`, `waitForSet`

## syncedFetch

```ts
import { syncedFetch } from '@legendapp/state/sync-plugins/fetch'

const state$ = observable(syncedFetch({
    get: 'https://url.to.get', // or observable/selector function
    set: 'https://url.to.set',
    getInit: { headers: {} },
    setInit: { method: 'POST' },
    valueType: 'json', // function on Response
    onSaved: (value) => ({ updatedAt: value.updatedAt })
}))
```

## syncedKeel

```ts
import { configureSynced } from '@legendapp/state/sync/'
import { generateKeelId, syncedKeel } from '@legendapp/state/sync-plugins/keel'
import { APIClient } from './keelClient'

const client = new APIClient({ baseUrl: process.env.API_BASE_URL })
const isAuthed$ = observable(false)

const sync = configureSynced(syncedKeel, {
    client,
    persist: { plugin: ObservablePersistLocalStorage, retrySync: true },
    debounceSet: 500,
    retry: { infinite: true },
    changesSince: 'last-sync',
    waitFor: isAuthed$
})

const { mutations, queries } = client.api
const messages$ = observable(sync({
    list: queries.getMessages,
    create: mutations.createMessage,
    update: mutations.updateMessage,
    delete: mutations.deleteMessage,
    persist: { name: 'messages' },
}))

// Adding
const id = generateKeelId()
messages$[id].set({ id, text, createdAt: undefined, updatedAt: undefined })

// Updating
messages$[id].text.set(text)

// Wait for save
await when(profile$.createdAt)
```

### Keel model requirements
1. `id` in create actions (Legend generates locally)
2. All changeable fields optional in create/update
3. `updatedAt?` in list for `changesSince: 'last-sync'`

### where / custom actions
```ts
// where parameter
syncedKeel({ list: queries.listMessages, where: { roomId } })

// Custom actions
syncedKeel({
    get: () => queries.getProfile({ userId }),
    create: (data) => mutations.createProfile({ user: { id: staffId }, ...data }),
})
```

### Soft deletes
```ts
syncedKeel({
    update: mutations.updateProfile,
    fieldDeleted: 'deleted' // calls update with { deleted: true }
})
```

## syncedSupabase

```ts
import { configureSyncedSupabase, syncedSupabase } from '@legendapp/state/sync-plugins/supabase'
import { v4 as uuidv4 } from "uuid"

const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY)
configureSyncedSupabase({ generateId: () => uuidv4() })

const messages$ = observable(syncedSupabase({
    supabase,
    collection: 'messages',
    select: (from) => from.select('id,text'),
    filter: (select) => select.eq('user_id', uid),
    actions: ['read', 'create', 'update'], // default: all CRUD
    realtime: { filter: `user_id=eq.${uid}` },
    persist: { name: 'messages', retrySync: true },
    changesSince: 'last-sync',
    as: 'object' | 'Map' | 'value',
}))

// Adding
messages$[generateId()].set({ id, text, created_at: null, updated_at: null })
```

### Realtime
```ts
realtime: true
realtime: { schema: 'public', filter: `user_id=eq.${uid}` }
```

### RPC / Edge functions
```ts
syncedSupabase({
    list: () => supabase.rpc("list_messages"),
    create: (input) => supabase.rpc("create_message", input),
})
```

### Soft deletes (required for changesSince)
```ts
fieldDeleted: 'deleted'
```

SQL setup for timestamps:
```sql
ALTER TABLE YOUR_TABLE
ADD COLUMN created_at timestamptz default now(),
ADD COLUMN updated_at timestamptz default now(),
ADD COLUMN deleted boolean default false;

CREATE OR REPLACE FUNCTION handle_times() RETURNS trigger AS $$
BEGIN
    IF (TG_OP = 'INSERT') THEN
        NEW.created_at := now(); NEW.updated_at := now();
    ELSEIF (TG_OP = 'UPDATE') THEN
        NEW.created_at = OLD.created_at; NEW.updated_at = now();
    END IF;
    RETURN NEW;
END; $$ language plpgsql;

CREATE TRIGGER handle_times BEFORE INSERT OR UPDATE ON YOUR_TABLE
FOR EACH ROW EXECUTE PROCEDURE handle_times();
```

## TanStack Query

### React hook
```tsx
import { useObservableSyncedQuery } from '@legendapp/state/sync-plugins/tanstack-react-query'

function Component() {
    const state$ = useObservableSyncedQuery({
        query: {
            queryKey: ['user'],
            queryFn: () => fetch('url').then(v => v.json()),
        },
        mutation: {
            mutationFn: (vars) => fetch('url', { body: JSON.stringify(vars), method: 'POST' }),
        },
    })
    const state = useValue(state$)
    return <$React.input $value={state$.first_name} />
}
```

### Outside React
```tsx
import { syncedQuery } from '@legendapp/state/sync-plugins/tanstack-query'
import { QueryClient } from '@tanstack/react-query'

const queryClient = new QueryClient()
const state$ = observable(syncedQuery({
    queryClient,
    query: { queryKey: ['user'], queryFn: () => fetch('url').then(v => v.json()) },
    mutation: { mutationFn: (vars) => fetch('url', { body: JSON.stringify(vars), method: 'POST' }) },
}))
