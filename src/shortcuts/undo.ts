import UndoIcon from '../components/UndoIcon'
import { Shortcut } from '../@types'
import { isUndoEnabled } from '../selectors/isUndoEnabled'
import { alert as alertAction } from '../action-creators'
import { NAVIGATION_ACTIONS } from '../constants'

const undoShortcut: Shortcut = {
  id: 'undo',
  label: 'Undo',
  description: 'Undo.',
  svg: UndoIcon,
  exec: (dispatch, getState) => {
    if (!isUndoEnabled(getState())) return

    const { inversePatches } = getState()

    // Checks the last action type from inverse patch history.
    const lastActionType = inversePatches[inversePatches.length - 1]?.[0]?.actions[0]
    dispatch({ type: 'undoAction' })

    if (!lastActionType) return

    // Ignore navigation actions
    if (NAVIGATION_ACTIONS[lastActionType]) return

    dispatch(alertAction(`Undo: ${lastActionType}`, { isInline: true, clearDelay: 3000 }))
  },
  isActive: getState => isUndoEnabled(getState()),
}

export default undoShortcut
