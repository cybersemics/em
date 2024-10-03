import Shortcut from '../@types/Shortcut'
import { toggleAttributeActionCreator as toggleAttribute } from '../actions/toggleAttribute'
import ProseViewIcon from '../components/icons/ProseViewIcon'
import { HOME_PATH } from '../constants'
import attributeEquals from '../selectors/attributeEquals'
import simplifyPath from '../selectors/simplifyPath'
import head from '../util/head'
import isDocumentEditable from '../util/isDocumentEditable'

const proseViewShortcut: Shortcut = {
  id: 'proseView',
  label: 'Prose View',
  description: 'Display subthoughts of the current thought as indented paragraphs.',
  gesture: 'rudr',
  keyboard: { key: 'p', shift: true, alt: true },
  svg: ProseViewIcon,
  canExecute: getState => isDocumentEditable() && !!getState().cursor,
  exec: (dispatch, getState) => {
    const state = getState()
    const { cursor } = state
    if (!cursor) return

    const simplePath = simplifyPath(state, cursor)

    dispatch(
      toggleAttribute({
        path: simplePath,
        values: ['=view', 'Prose'],
      }),
    )
  },
  isActive: getState => {
    const state = getState()
    const { cursor } = state
    const path = cursor ? simplifyPath(state, cursor) : HOME_PATH
    return attributeEquals(state, head(path), '=view', 'Prose')
  },
}

export default proseViewShortcut
