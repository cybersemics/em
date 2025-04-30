import { actionMetadataRegistry } from '../@types/ActionMetadata'
import ActionType from '../@types/ActionType'
import * as actions from '../actions'

/**
 * Validates that all actions have been registered in the metadata registry.
 */
export default function validateActionRegistrations(): void {
  const allActionTypes = Object.keys(actions) as ActionType[]
  const unregisteredActions = allActionTypes.filter(action => !actionMetadataRegistry[action])

  if (unregisteredActions.length > 0) {
    console.error(
      `The following actions are not registered in the metadata registry: ${unregisteredActions.join(', ')}`,
    )
    if (process.env.NODE_ENV === 'development') {
      throw new Error(`Some actions are not registered in the metadata registry. See console for details.`)
    }
  } else {
    console.info('All actions successfully registered in the metadata registry')
  }
}
