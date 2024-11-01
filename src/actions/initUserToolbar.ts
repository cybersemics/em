import Path from '../@types/Path'
import Thunk from '../@types/Thunk'
import { deleteThoughtActionCreator as deleteThought } from '../actions/deleteThought'
import { importTextActionCreator as importText } from '../actions/importText'
import { EM_TOKEN, TOOLBAR_DEFAULT_SHORTCUTS } from '../constants'
import findDescendant from '../selectors/findDescendant'

/** Action-creator to initialize the user toolbar at /EM/Settings/Toolbar on demand. Does nothing if user toolbar has already been created. */
export const initUserToolbarActionCreator =
  ({
    force,
  }: {
    // resets the toolbar to the default shortcuts
    force?: boolean
  } = {}): Thunk =>
  (dispatch, getState) => {
    const state = getState()
    const settingsId = findDescendant(state, EM_TOKEN, ['Settings'])
    const userToolbarThoughtId = findDescendant(state, settingsId, 'Toolbar')
    dispatch([
      force && userToolbarThoughtId
        ? deleteThought({ thoughtId: userToolbarThoughtId, pathParent: [EM_TOKEN, settingsId] as Path })
        : null,
      force || !userToolbarThoughtId
        ? importText({
            path: [EM_TOKEN],
            text: `
          - Settings
            - Toolbar
${TOOLBAR_DEFAULT_SHORTCUTS.map(shortcutId => '              - ' + shortcutId).join('\n')}
        `,
            preventSetCursor: true,
          })
        : null,
    ])
  }
