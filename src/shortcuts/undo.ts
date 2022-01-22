import UndoIcon from '../components/UndoIcon'
import { Patch, Shortcut } from '../@types'
import { isUndoEnabled } from '../selectors/isUndoEnabled'
import { alert as alertAction } from '../action-creators'
import { NAVIGATION_ACTIONS } from '../constants'
import { startCase } from 'lodash'

/**
 * Recursively calculates last action type from inversePatches history if it is one of the navigation actions and finally returns the action.
 */
const getLatestActionType = (inversePatches: Patch[], n = 1): string => {
  const lastActionType = inversePatches[inversePatches.length - n]?.[0]?.actions[0]
  if (NAVIGATION_ACTIONS[lastActionType]) return getLatestActionType(inversePatches, n + 1)
  return lastActionType
}

const undoShortcut: Shortcut = {
  id: 'undo',
  label: 'Undo',
  description: 'Undo.',
  svg: UndoIcon,
  exec: (dispatch, getState) => {
    if (!isUndoEnabled(getState())) return

    const lastActionType = getLatestActionType(getState().inversePatches)

    dispatch({ type: 'undoAction' })

    if (!lastActionType) return

    dispatch(
      alertAction(`Undo: ${startCase(lastActionType)}`, { isInline: true, clearDelay: 3000, showCloseLink: false }),
    )
  },
  isActive: getState => isUndoEnabled(getState()),
}

export default undoShortcut
