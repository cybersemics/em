import { Key } from 'ts-key-enum'
import { css, cx } from '../../styled-system/css'
import { iconRecipe } from '../../styled-system/recipes'
import { token } from '../../styled-system/tokens'
import Command from '../@types/Command'
import Dispatch from '../@types/Dispatch'
import IconType from '../@types/IconType'
import State from '../@types/State'
import { addMulticursorActionCreator as addMulticursor } from '../actions/addMulticursor'
import { cursorDownActionCreator as cursorDown } from '../actions/cursorDown'
import { removeMulticursorActionCreator as removeMulticursor } from '../actions/removeMulticursor'
import { setCursorActionCreator as setCursor } from '../actions/setCursor'
import { HOME_PATH, HOME_TOKEN } from '../constants'
import * as selection from '../device/selection'
import attributeEquals from '../selectors/attributeEquals'
import { getChildrenSorted } from '../selectors/getChildren'
import hasMulticursor from '../selectors/hasMulticursor'
import isMulticursorPath from '../selectors/isMulticursorPath'
import nextSibling from '../selectors/nextSibling'
import nextThought from '../selectors/nextThought'
import rootedParentOf from '../selectors/rootedParentOf'
import appendToPath from '../util/appendToPath'
import head from '../util/head'
import headValue from '../util/headValue'
import parentOf from '../util/parentOf'
// import directly since util/index is not loaded yet when shortcut is initialized
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

const cursorDownShortcut: Command = {
  id: 'cursorDown',
  label: 'Cursor Down',
  keyboard: { key: Key.ArrowDown },
  hideFromHelp: true,
  multicursor: 'ignore',
  svg: Icon,
  canExecute: state => {
    const { cursor } = state

    if (!cursor) return true

    // use default browser behavior in prose mode
    const parentId = head(rootedParentOf(state, cursor))
    const isProseView = attributeEquals(state, parentId, '=view', 'Prose')
    const isProseMode = isProseView && selection.isActive() && selection.offset()! < headValue(state, cursor).length - 1
    if (isProseMode) return false

    // use default browser behavior (i.e. caret down) if there is a valid selection and it's not on the last line of a multi-line editable
    return selection.isOnLastLine()
  },
  exec: throttleByAnimationFrame((dispatch: Dispatch, getState: () => State, e: KeyboardEvent) => {
    if (e.shiftKey) {
      const state = getState()
      const { cursor } = state
      const path = cursor || HOME_PATH
      const isMulticursorEmpty = !hasMulticursor(state)
      const isCurrentCursorMulticursor = cursor && isMulticursorPath(state, cursor)

      const nextSiblingThought = cursor
        ? // if cursor exists, get the next sibling
          nextSibling(state, cursor)
        : // otherwise, get the first thought in the home context
          getChildrenSorted(state, HOME_TOKEN)[0]

      const nextPath = nextSiblingThought
        ? // non-first child path
          appendToPath(parentOf(path), nextSiblingThought.id)
        : nextThought(state)

      // if there is no next path, do nothing
      if (!nextPath) return

      const isNextPathMulticursor = nextPath && isMulticursorPath(state, nextPath)

      dispatch([
        dispatch => {
          // New multicursor set
          if (isMulticursorEmpty) {
            // Add the current cursor to the multicursor, if it exists
            if (cursor) {
              dispatch(addMulticursor({ path: cursor }))
            }

            // Add the next cursor to the multicursor, if it exists
            if (nextPath) {
              dispatch(addMulticursor({ path: nextPath }))
            }

            return
          }

          // Extend the multicursor set to the next cursor
          if (isCurrentCursorMulticursor && !isNextPathMulticursor && nextPath) {
            dispatch(addMulticursor({ path: nextPath }))
            return
          }

          // Remove the next cursor from the multicursor set
          if (isCurrentCursorMulticursor && isNextPathMulticursor && cursor) {
            dispatch(removeMulticursor({ path: cursor }))
            return
          }
        },
        setCursor({ path: nextPath, preserveMulticursor: true }),
      ])

      requestAnimationFrame(() => {
        selection.clear()
      })
    } else dispatch(cursorDown())
  }),
}

export const cursorDownAlias: Command = {
  ...cursorDownShortcut,
  id: 'cursorDownAlias',
  gesture: undefined,
  keyboard: { key: Key.ArrowDown, shift: true },
}

export default cursorDownShortcut
