import { Key } from 'ts-key-enum'
import Command from '../@types/Command'
import Dispatch from '../@types/Dispatch'
import State from '../@types/State'
import { addMulticursorActionCreator as addMulticursor } from '../actions/addMulticursor'
import { cursorUpActionCreator as cursorUp } from '../actions/cursorUp'
import { removeMulticursorActionCreator as removeMulticursor } from '../actions/removeMulticursor'
import { setCursorActionCreator as setCursor } from '../actions/setCursor'
import CursorUpIcon from '../components/icons/CursorUp'
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
import throttleByAnimationFrame from '../util/throttleByAnimationFrame'

const cursorUpCommand = {
  id: 'cursorUp',
  label: 'Cursor Up',
  keyboard: [{ key: Key.ArrowUp }, { key: Key.ArrowUp, shift: true }],
  hideFromHelp: true,
  multicursor: false,
  svg: CursorUpIcon,
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
} satisfies Command

export default cursorUpCommand
