import Command from '../@types/Command'
import { toggleAttributeActionCreator as toggleAttribute } from '../actions/toggleAttribute'
import ProseViewIcon from '../components/icons/ProseViewIcon'
import { HOME_PATH } from '../constants'
import attributeEquals from '../selectors/attributeEquals'
import hasMulticursor from '../selectors/hasMulticursor'
import simplifyPath from '../selectors/simplifyPath'
import head from '../util/head'
import isDocumentEditable from '../util/isDocumentEditable'

const proseViewCommand: Command = {
  id: 'proseView',
  label: 'Prose View',
  description: 'Display subthoughts of the current thought as indented paragraphs.',
  gesture: 'rudr',
  keyboard: { key: 'p', shift: true, alt: true },
  multicursor: true,
  svg: ProseViewIcon,
  canExecute: state => {
    return isDocumentEditable() && (!!state.cursor || hasMulticursor(state))
  },
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
  isActive: state => {
    const { cursor } = state
    const path = cursor ? simplifyPath(state, cursor) : HOME_PATH
    return attributeEquals(state, head(path), '=view', 'Prose')
  },
}

export default proseViewCommand
