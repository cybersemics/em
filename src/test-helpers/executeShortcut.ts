import { Shortcut } from '../types'
import { Action, Dispatch, Store } from 'redux'
import { State } from '../util/initialState'

/** Execute shortcut. */
const executeShortcut = (shortcut: Shortcut, { store, type, event }: { store: Store<State, any>, type: string, event: Event }) => {
  const canExecute = !shortcut.canExecute || shortcut.canExecute(store.getState, event)
  if (canExecute) shortcut.exec(store.dispatch, store.getState, event, { type })
}

export default executeShortcut
