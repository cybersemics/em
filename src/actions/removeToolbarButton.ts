/* eslint-disable import/prefer-default-export */
import CommandId from '../@types/CommandId'
import Thunk from '../@types/Thunk'
import { alertActionCreator as alert } from '../actions/alert'
import { deleteThoughtActionCreator as deleteThought } from '../actions/deleteThought'
import { initUserToolbarActionCreator as initUserToolbar } from '../actions/initUserToolbar'
import { commandById } from '../commands'
import { EM_TOKEN } from '../constants'
import contextToPath from '../selectors/contextToPath'
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
    const userToolbarThoughtId = findDescendant(state, EM_TOKEN, ['Settings', 'Toolbar'])
    const userCommandChildren = getChildrenRanked(getState(), userToolbarThoughtId)
    const userCommandIds = userCommandChildren.map(subthought => subthought.value)

    // user commands must exist since it was created above
    const userCommandsPath = contextToPath(getState(), [EM_TOKEN, 'Settings', 'Toolbar'])!
    const fromIndex = userCommandIds.indexOf(commandId)
    if (fromIndex === -1) return
    const fromThoughtId = userCommandChildren[fromIndex].id

    dispatch([
      alert(`Removed ${command.label} from toolbar`),
      deleteThought({
        thoughtId: fromThoughtId,
        pathParent: userCommandsPath,
      }),
    ])
  }
