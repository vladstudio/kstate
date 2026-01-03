import { Window } from 'happy-dom'

const window = new Window({ url: 'http://localhost' })

Object.assign(globalThis, {
  window,
  document: window.document,
  navigator: window.navigator,
  HTMLElement: window.HTMLElement,
  Element: window.Element,
  Node: window.Node,
  Event: window.Event,
  CustomEvent: window.CustomEvent,
  localStorage: window.localStorage,
  sessionStorage: window.sessionStorage,
})
