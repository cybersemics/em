import RedoIcon from '../components/RedoIcon'
import { Patch, Shortcut } from '../@types'
import { isRedoEnabled } from '../selectors/isRedoEnabled'
import { alert as alertAction } from '../action-creators'
import { NAVIGATION_ACTIONS } from '../constants'

/**
 * Recursively calculates last action type from patches history if it is one of the navigation actions and finally returns the action.
 */
const getActionTypeRecursively = (patches: Patch[], n = 1): string => {
  const lastActionType = patches[patches.length - n]?.[0]?.actions[0]
  if (NAVIGATION_ACTIONS[lastActionType]) return getActionTypeRecursively(patches, n + 1)
  return lastActionType
}

const redoShortcut: Shortcut = {
  id: 'redo',
  label: 'Redo',
  description: 'Redo',
  svg: RedoIcon,
  exec: (dispatch, getState) => {
    if (!isRedoEnabled(getState())) return

    const lastActionType = getActionTypeRecursively(getState().patches)

    dispatch({ type: 'redoAction' })

    if (!lastActionType) return

    dispatch(alertAction(`Redo: ${lastActionType}`, { isInline: true, clearDelay: 3000, showCloseLink: false }))
  },
  isActive: getState => isRedoEnabled(getState()),
}

export default redoShortcut
