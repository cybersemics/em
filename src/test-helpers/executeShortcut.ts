import { NOOP } from '../constants'
import { store as globalStore } from '../store'
import { Store } from 'redux'
import { Shortcut, State } from '../types'

interface Options {
  store?: Store<State, any>
  type?: string
  event?: Event
}

const eventNoop = { preventDefault: NOOP } as Event

/** Execute shortcut. Defaults to global store and keyboard shortcut. */
const executeShortcut = (shortcut: Shortcut, { store, type, event }: Options = {}) => {
  store = store ?? globalStore
  type = type ?? 'keyboard'
  event = event ?? eventNoop

  const canExecute = !shortcut.canExecute || shortcut.canExecute(store.getState)
  if (canExecute) shortcut.exec(store.dispatch, store.getState, event, { type })
}

export default executeShortcut
