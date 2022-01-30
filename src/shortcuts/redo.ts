import RedoIcon from '../components/RedoIcon'
import { Shortcut } from '../@types'
import { isRedoEnabled } from '../selectors/isRedoEnabled'
import { alert as alertAction } from '../action-creators'
import { startCase } from 'lodash'
import { getLatestActionType } from '../util/getLastActionType'

const redoShortcut: Shortcut = {
  id: 'redo',
  label: 'Redo',
  description: 'Redo',
  svg: RedoIcon,
  exec: (dispatch, getState) => {
    if (!isRedoEnabled(getState())) return

    const lastActionType = getLatestActionType(getState().patches)

    dispatch({ type: 'redoAction' })

    if (!lastActionType) return

    dispatch(
      alertAction(`Redo: ${startCase(lastActionType)}`, { isInline: true, clearDelay: 3000, showCloseLink: false }),
    )
  },
  isActive: getState => isRedoEnabled(getState()),
}

export default redoShortcut
