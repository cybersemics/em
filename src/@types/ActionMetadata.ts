import ActionType from './ActionType'

/**
 * Metadata for actions to determine their behavior in the undo/redo system.
 */
export interface ActionMetadata {
  /** Whether the action is undoable. */
  undoable: boolean
  /** Whether the action is a navigation action. */
  isNavigation?: boolean
}

/**
 * Registry to store action metadata.
 */
export const actionMetadataRegistry: Partial<Record<ActionType, ActionMetadata>> = {}

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
export function isUndoable(actionType: ActionType): boolean {
  return actionMetadataRegistry[actionType]?.undoable ?? false
}

/**
 * Returns if an action is navigational, i.e. cursor movements. Contiguous navigation actions will be merged and adjoined with the last non-navigational action.
 */
export function isNavigation(actionType: ActionType): boolean {
  return actionMetadataRegistry[actionType]?.isNavigation ?? false
}
