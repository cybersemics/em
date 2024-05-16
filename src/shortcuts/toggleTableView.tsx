import IconType from '../@types/Icon'
import Shortcut from '../@types/Shortcut'
import { toggleAttributeActionCreator as toggleAttribute } from '../actions/toggleAttribute'
import { HOME_PATH } from '../constants'
import attributeEquals from '../selectors/attributeEquals'
import simplifyPath from '../selectors/simplifyPath'
import head from '../util/head'

// eslint-disable-next-line jsdoc/require-jsdoc
const Icon = ({ size = 20, style }: IconType) => (
  <svg
    version='1.1'
    className='icon'
    xmlns='http://www.w3.org/2000/svg'
    width={size}
    height={size}
    style={style}
    viewBox='-2 -2 28 28'
  >
    <g>
      <path d='M 21.5 24 L 2.5 24 C 1.122 24 0 22.879 0 21.5 L 0 2.5 C 0 1.121 1.122 0 2.5 0 L 21.5 0 C 22.878 0 24 1.121 24 2.5 L 24 21.5 C 24 22.879 22.878 24 21.5 24 Z M 3 1.634 C 2.173 1.634 1.5 2.224 1.5 3.051 L 1.5 21 C 1.5 21.827 2.173 22.5 2.5 22.5 L 21 22.5 C 21.827 22.5 22.5 21.827 22.5 21 L 22.5 3 C 22.5 2.173 21.827 1.5 21 1.6 L 3 1.634 Z'></path>
      <path d='M 23.5 12.75 L 0.5 12.75 C 0.256 12.75 0 12.276 0 12 C 0 11.724 0.224 11.25 0.5 11.25 L 23.5 11.25 C 23.776 11.25 24 11.724 24 12 C 24 12.276 23.776 12.75 23.5 12.75 Z'></path>
      <path d='M 12 24 C 11.724 24 11.496 23.776 11.25 23.5 L 11.25 0.5 C 11.25 0.224 11.724 0 12 0 C 12.276 0 12.75 0.224 12.75 0.5 L 12.75 23.5 C 12.75 23.776 12.276 24 12 24 Z'></path>
    </g>
  </svg>
)

const toggleTableViewShortcut: Shortcut = {
  id: 'toggleTableView',
  label: 'Table View',
  description: 'Display the current thought as a table, where each subthought is a separate column.',
  gesture: 'rdlu',
  hideFromInstructions: true,
  keyboard: { key: 't', alt: true, shift: true },
  svg: Icon,
  canExecute: getState => !!getState().cursor,
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
