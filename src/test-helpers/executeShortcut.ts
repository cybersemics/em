import { Shortcut } from '../types'

/** Execute shortcut. */
const executeShortcut = (shortcut: Shortcut, { store, type, event }: { store: any, type: string, event: Event }) => {
  const canExecute = !shortcut.canExecute || shortcut.canExecute(store.getState, event)
  if (canExecute) shortcut.exec(store.dispatch, store.getState, event, { type })
}

export default executeShortcut
