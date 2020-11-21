import { NOOP } from '../constants'
import { Shortcut } from '../types'
import { store as globalStore } from '../store'
import { Store } from 'redux'
import { State } from '../util/initialState'

interface Options {
  store?: Store<State, any>,
  type?: string,
  event?: Event,
}

const eventNoop = { preventDefault: NOOP } as Event

/** Execute shortcut. Defaults to global store and keyboard shortcut. */
const executeShortcut = (shortcut: Shortcut, { store, type, event }: Options = {}) => {

  store = store ?? globalStore
  type = type ?? 'keyboard'
  event = event ?? eventNoop

  const canExecute = !shortcut.canExecute || shortcut.canExecute(store.getState, event)
  if (canExecute) shortcut.exec(store.dispatch, store.getState, event, { type })
}

export default executeShortcut
