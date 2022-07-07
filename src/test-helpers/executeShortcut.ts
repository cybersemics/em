import { Store } from 'redux'
import Shortcut from '../@types/Shortcut'
import ShortcutType from '../@types/ShortcutType'
import State from '../@types/State'
import { NOOP } from '../constants'
import { store as globalStore } from '../store'

interface Options {
  store?: Store<State, any>
  type?: ShortcutType
  event?: Event
}

const eventNoop = { preventDefault: NOOP } as Event

/** Execute shortcut. Defaults to global store and keyboard shortcut. */
const executeShortcut = (shortcut: Shortcut, { store, type, event }: Options = {}) => {
  store = store ?? globalStore
  type = type ?? 'keyboard'
  event = event ?? eventNoop

  const canExecute = !shortcut.canExecute || shortcut.canExecute(store.getState)
  if (canExecute) {
    shortcut.exec(store.dispatch, store.getState, event, { type })
  }
}

export default executeShortcut
