import { Key } from 'ts-key-enum'
import { css, cx } from '../../styled-system/css'
import { iconRecipe } from '../../styled-system/recipes'
import { token } from '../../styled-system/tokens'
import Command from '../@types/Command'
import Dispatch from '../@types/Dispatch'
import IconType from '../@types/IconType'
import State from '../@types/State'
import { addMulticursorActionCreator as addMulticursor } from '../actions/addMulticursor'
import { cursorUpActionCreator as cursorUp } from '../actions/cursorUp'
import { removeMulticursorActionCreator as removeMulticursor } from '../actions/removeMulticursor'
import { setCursorActionCreator as setCursor } from '../actions/setCursor'
import { HOME_PATH, HOME_TOKEN } from '../constants'
import * as selection from '../device/selection'
import attributeEquals from '../selectors/attributeEquals'
import { getChildrenSorted } from '../selectors/getChildren'
import hasMulticursor from '../selectors/hasMulticursor'
import isMulticursorPath from '../selectors/isMulticursorPath'
import prevSibling from '../selectors/prevSibling'
import rootedParentOf from '../selectors/rootedParentOf'
import appendToPath from '../util/appendToPath'
import head from '../util/head'
import isRoot from '../util/isRoot'
import parentOf from '../util/parentOf'
// import directly since util/index is not loaded yet when command is initialized
import throttleByAnimationFrame from '../util/throttleByAnimationFrame'

// eslint-disable-next-line jsdoc/require-jsdoc, react-refresh/only-export-components
const Icon = ({ fill = token('colors.bg'), size = 20, style, cssRaw }: IconType) => (
  <svg
    version='1.1'
    className={cx(iconRecipe(), css(cssRaw))}
    xmlns='http://www.w3.org/2000/svg'
    width={size}
    height={size}
    fill={fill}
    style={style}
    viewBox='0 0 19.481 19.481'
    enableBackground='new 0 0 19.481 19.481'
  >
    <g>
      <path d='m10.201,.758l2.478,5.865 6.344,.545c0.44,0.038 0.619,0.587 0.285,0.876l-4.812,4.169 1.442,6.202c0.1,0.431-0.367,0.77-0.745,0.541l-5.452-3.288-5.452,3.288c-0.379,0.228-0.845-0.111-0.745-0.541l1.442-6.202-4.813-4.17c-0.334-0.289-0.156-0.838 0.285-0.876l6.344-.545 2.478-5.864c0.172-0.408 0.749-0.408 0.921,0z' />
    </g>
  </svg>
)

const cursorUpCommand: Command = {
  id: 'cursorUp',
  label: 'Cursor Up',
  keyboard: { key: Key.ArrowUp },
  hideFromHelp: true,
  multicursor: false,
  svg: Icon,
  canExecute: state => {
    const { cursor } = state

    if (!cursor) return true

    // use default browser behavior in prose mode
    const parentId = head(rootedParentOf(state, cursor))
    const isProseView = attributeEquals(state, parentId, '=view', 'Prose')
    const isProseMode = isProseView && selection.offset()! > 0
    if (isProseMode) return false

    // use default browser if selection is on the second or greater line of a multi-line editable
    return selection.isOnFirstLine()
  },
  exec: throttleByAnimationFrame((dispatch: Dispatch, getState: () => State, e: KeyboardEvent) => {
    if (e.shiftKey) {
      const state = getState()
      const isMulticursorEmpty = !hasMulticursor(state)
      const isCurrentCursorMulticursor = state.cursor && isMulticursorPath(state, state.cursor)

      const { cursor } = state
      const path = cursor || HOME_PATH
      const pathParent = rootedParentOf(state, path)

      const prevThought = cursor
        ? // if cursor exists, get the previous sibling
          prevSibling(state, cursor)
        : // otherwise, get the last thought in the home context
          getChildrenSorted(state, HOME_TOKEN).slice(-1)[0]

      const prevPath = prevThought
        ? // non-first child path
          appendToPath(parentOf(path), prevThought.id)
        : // when the cursor is on the first child in a context, move up a level
          !isRoot(pathParent)
          ? pathParent
          : null

      // if there is no previous path, do nothing
      if (!prevPath) return

      const isPrevPathMulticursor = prevPath && isMulticursorPath(state, prevPath)

      dispatch([
        setCursor({ path: prevPath, preserveMulticursor: true }),
        dispatch => {
          // New multicursor set
          if (isMulticursorEmpty) {
            // Add the current cursor to the multicursor, if it exists
            if (state.cursor) {
              dispatch(addMulticursor({ path: state.cursor }))
            }

            // Add the previous cursor to the multicursor, if it exists
            if (prevPath) {
              dispatch(addMulticursor({ path: prevPath }))
            }

            return
          }

          // Extend the multicursor set to the previous cursor
          if (isCurrentCursorMulticursor && !isPrevPathMulticursor && prevPath) {
            dispatch(addMulticursor({ path: prevPath }))
            return
          }

          // Remove the previous cursor from the multicursor set
          if (isCurrentCursorMulticursor && isPrevPathMulticursor && state.cursor) {
            dispatch(removeMulticursor({ path: state.cursor }))
            return
          }
        },
      ])

      requestAnimationFrame(() => {
        selection.clear()
      })
    } else dispatch(cursorUp())
  }),
}

export const cursorUpAlias: Command = {
  ...cursorUpCommand,
  id: 'cursorUpAlias',
  gesture: undefined,
  keyboard: { key: Key.ArrowUp, shift: true },
}

export default cursorUpCommand
