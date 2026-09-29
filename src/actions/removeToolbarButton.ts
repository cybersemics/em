/* eslint-disable import/prefer-default-export */
import CommandId from '../@types/CommandId'
import Path from '../@types/Path'
import Thunk from '../@types/Thunk'
import { alertActionCreator as alert } from '../actions/alert'
import { deleteThoughtActionCreator as deleteThought } from '../actions/deleteThought'
import { initUserToolbarActionCreator as initUserToolbar } from '../actions/initUserToolbar'
import { commandById } from '../commands'
import { EM_TOKEN } from '../constants'
import findDescendant from '../selectors/findDescendant'
import { getChildrenRanked } from '../selectors/getChildren'

/** Removes a toolbar button. */
export const removeToolbarButtonActionCreator =
  (commandId: CommandId): Thunk =>
  (dispatch, getState) => {
    const command = commandById(commandId)

    // initialize EM/Settings/Toolbar/Visible with default commands
    dispatch(initUserToolbar())
    const state = getState()
    const settingsId = findDescendant(state, EM_TOKEN, ['Settings'])
    const userToolbarThoughtId = findDescendant(state, settingsId, 'Toolbar')
    const userCommandChildren = getChildrenRanked(getState(), userToolbarThoughtId)
    const userCommandIds = userCommandChildren.map(subthought => subthought.value)

    const fromIndex = userCommandIds.indexOf(commandId)
    // settingsId and userToolbarThoughtId cannot be null once a command has been found, since userCommandIds is
    // empty otherwise. They are checked anyway to narrow the type.
    if (fromIndex === -1 || !settingsId || !userToolbarThoughtId) return
    const fromThoughtId = userCommandChildren[fromIndex].id

    // EM/Settings/Toolbar. The EM token is omitted, reproducing the rootless path contextToPath returned here.
    const userCommandsPath = [settingsId, userToolbarThoughtId] as Path

    dispatch([
      alert(`Removed ${command.label} from toolbar`),
      deleteThought({
        thoughtId: fromThoughtId,
        pathParent: userCommandsPath,
      }),
    ])
  }
