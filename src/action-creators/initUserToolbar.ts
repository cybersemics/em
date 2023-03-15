import Thunk from '../@types/Thunk'
import importText from '../action-creators/importText'
import { EM_TOKEN, TOOLBAR_DEFAULT_SHORTCUTS } from '../constants'
import findDescendant from '../selectors/findDescendant'

/** Action-creator to initialize the user toolbar at /EM/Settings/Toolbar on demand. Does nothing if user toolbar has already been created. */
const initUserToolbarActionCreator = (): Thunk => (dispatch, getState) => {
  const state = getState()
  const userToolbarThoughtId = findDescendant(state, EM_TOKEN, ['Settings', 'Toolbar'])
  if (!userToolbarThoughtId) {
    dispatch(
      importText({
        path: [EM_TOKEN],
        text: `
          - Settings
            - Toolbar
${TOOLBAR_DEFAULT_SHORTCUTS.map(shortcutId => '              - ' + shortcutId).join('\n')}
        `,
        preventSetCursor: true,
      }),
    )
  }
}

export default initUserToolbarActionCreator
