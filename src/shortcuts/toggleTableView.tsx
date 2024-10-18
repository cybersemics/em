import Shortcut from '../@types/Shortcut'
import { toggleAttributeActionCreator as toggleAttribute } from '../actions/toggleAttribute'
import TableViewIcon from '../components/icons/TableViewIcon'
import { HOME_PATH } from '../constants'
import attributeEquals from '../selectors/attributeEquals'
import hasMulticursor from '../selectors/hasMulticursor'
import simplifyPath from '../selectors/simplifyPath'
import head from '../util/head'

const toggleTableViewShortcut: Shortcut = {
  id: 'toggleTableView',
  label: 'Table View',
  description: 'Display the current thought as a table, where each subthought is a separate column.',
  gesture: 'rdlu',
  keyboard: { key: 't', alt: true, shift: true },
  multicursor: true,
  svg: TableViewIcon,
  canExecute: getState => {
    const state = getState()
    return !!state.cursor || hasMulticursor(state)
  },
  exec: (dispatch, getState) => {
    const state = getState()
    const { cursor } = state
    if (!cursor) return

    const simplePath = simplifyPath(state, cursor)

    dispatch(
      toggleAttribute({
        path: simplePath,
        values: ['=view', 'Table'],
      }),
    )
  },
  isActive: getState => {
    const state = getState()
    const { cursor } = state
    const path = cursor ? simplifyPath(state, cursor) : HOME_PATH
    return attributeEquals(state, head(path), '=view', 'Table')
  },
}

export default toggleTableViewShortcut
