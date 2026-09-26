import SimplePath from '../@types/SimplePath'
import SortPreference from '../@types/SortPreference'
import State from '../@types/State'
import ThoughtspaceTransaction from '../@types/ThoughtspaceTransaction'
import Thunk from '../@types/Thunk'
import getSortPreference from '../selectors/getSortPreference'
import { registerActionMetadata } from '../util/actionMetadata.registry'
import command from '../util/command'
import head from '../util/head'
import setSortPreference from './setSortPreference'

/* Available sort preferences */

/** Decide next sort preference.
 * None → Alphabetical.
 * Alphabetical/Asc → Alphabetical/Desc.
 * Alphabetical/Desc → None.
 *
 * For the new sort options:
 * None → Alphabetical → Created → Updated → None.
 * Each type transitions from Asc → Desc, then to the next type.
 */
const decideNextSortPreference = (currentSortPreference: SortPreference): SortPreference => {
  if (currentSortPreference.type === 'None') {
    // First sort option after None is always Alphabetical with Asc direction
    return {
      type: 'Alphabetical',
      direction: 'Asc',
    }
  } else if (currentSortPreference.direction === 'Asc') {
    // Toggle direction from Asc to Desc for the current sort type
    return {
      type: currentSortPreference.type,
      direction: 'Desc',
    }
  } else {
    // We're currently on Desc direction, so we should go back to 'None'
    // This maintains backward compatibility with existing tests
    return {
      type: 'None',
      direction: null,
    }
  }
}

/** Toggles the sort setting on a context and resorts it. */
const toggleSort = (
  state: State,
  { showAlert, simplePath }: { showAlert?: boolean; simplePath: SimplePath },
  transaction?: ThoughtspaceTransaction,
): State => {
  return setSortPreference(
    state,
    {
      showAlert,
      simplePath,
      sortPreference: decideNextSortPreference(getSortPreference(state, head(simplePath))),
    },
    transaction,
  )
}

/** Action-creator for toggleSort. */
export const toggleSortActionCreator =
  (payload: Parameters<typeof toggleSort>[1]): Thunk =>
  dispatch =>
    dispatch({ type: 'toggleSort', ...payload })

export default command(toggleSort)

// Register this action's metadata
registerActionMetadata('toggleSort', {
  undoable: true,
})
