import { Store } from 'redux'
import { CommandPatchMetadata } from '../@types/Patch'

type CommandMetadata = Omit<CommandPatchMetadata, 'isNavigation'> | null

/** Store-scoped command transaction handlers registered by undoRedoEnhancer. */
const handlers = new WeakMap<Store['getState'], (value: CommandMetadata) => void>()

/** Registers the undo enhancer's command transaction handler for a store. */
export const registerCommandMetadataStore = (store: Store, handler: (value: CommandMetadata) => void) => {
  // Middleware enhancers return a shallow store wrapper with a different object identity but retain getState.
  handlers.set(store.getState, handler)
}

/** Opens or closes a command transaction without dispatching an observable Redux action. */
const setCommandMetadata = (store: Store, value: CommandMetadata) => {
  const handler = handlers.get(store.getState)
  if (!handler) throw new Error('Command metadata handler is not registered for this store')
  handler(value)
}

export default setCommandMetadata
