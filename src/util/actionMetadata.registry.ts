import ActionType from '../@types/ActionType'

/**
 * Metadata for actions to determine their behavior in the undo/redo system.
 */
interface ActionMetadata {
  /** Whether the action is undoable. */
  undoable: boolean
  /** Whether the action is a navigation action. */
  isNavigation?: boolean
}

/**
 * Registry to store action metadata.
 */
const actionMetadataRegistry: Partial<Record<ActionType, ActionMetadata>> = {}

/**
 * Register metadata for an action.
 * This should be called in each action file to register its metadata.
 */
export function registerActionMetadata(actionType: ActionType, metadata: ActionMetadata): void {
  if (actionMetadataRegistry[actionType]) {
    throw new Error(`Action "${actionType}" is already registered in the metadata registry.`)
  }
  actionMetadataRegistry[actionType] = metadata
}

/**
 * Returns if an action is undoable.
 */
export function isUndoable(actionType?: ActionType): boolean {
  return (actionType && actionMetadataRegistry[actionType]?.undoable) ?? false
}

/**
 * Returns if an action is navigational, i.e. cursor movements.
 * Contiguous navigation actions will be merged and adjoined with the last non-navigational action.
 */
export function isNavigation(actionType?: ActionType): boolean {
  return (actionType && actionMetadataRegistry[actionType]?.isNavigation) ?? false
}

/**
 * Validates that all actions have been registered in the metadata registry.
 * Lazy-loads the actions module to avoid circular dependencies.
 */
export default function validateActionRegistrations(): void {
  import('../actions')
    .then(actions => {
      const allActionTypes = Object.keys(actions) as ActionType[]
      const unregisteredActions = allActionTypes.filter(action => !actionMetadataRegistry[action])

      if (unregisteredActions.length > 0) {
        console.error(
          `The following actions are not registered in the metadata registry: ${unregisteredActions.join(', ')}`,
        )
        if (process.env.NODE_ENV === 'development') {
          throw new Error(`Some actions are not registered in the metadata registry. See console for details.`)
        }
      }
    })
    .catch(error => {
      console.error('Action metadata validation failed:', error)
    })
}
