import RedoIcon from '../components/RedoIcon'
import { Shortcut } from '../@types'
import { isRedoEnabled } from '../selectors/isRedoEnabled'
import { alert as alertAction } from '../action-creators'
import { NAVIGATION_ACTIONS } from '../constants'

const redoShortcut: Shortcut = {
  id: 'redo',
  label: 'Redo',
  description: 'Redo',
  svg: RedoIcon,
  exec: (dispatch, getState) => {
    if (!isRedoEnabled(getState())) return

    dispatch({ type: 'redoAction' })

    const { inversePatches } = getState()

    // Checks the last action type from inverse patch history. Checks from the state after dispatching a redo action.
    const lastActionType = inversePatches[inversePatches.length - 1]?.[0]?.actions[0]

    if (!lastActionType) return

    // Ignore navigation actions
    if (NAVIGATION_ACTIONS[lastActionType]) return

    dispatch(alertAction(`Redo: ${lastActionType}`, { isInline: true, clearDelay: 3000 }))
  },
  isActive: getState => isRedoEnabled(getState()),
}

export default redoShortcut
