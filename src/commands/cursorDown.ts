import { Key } from 'ts-key-enum'
import Command from '../@types/Command'
import Dispatch from '../@types/Dispatch'
import State from '../@types/State'
import { addMulticursorActionCreator as addMulticursor } from '../actions/addMulticursor'
import { cursorDownActionCreator as cursorDown } from '../actions/cursorDown'
import { removeMulticursorActionCreator as removeMulticursor } from '../actions/removeMulticursor'
import { setCursorActionCreator as setCursor } from '../actions/setCursor'
import CursorDownIcon from '../components/icons/CursorDownIcon'
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
import throttleByAnimationFrame from '../util/throttleByAnimationFrame'

const cursorDownCommand = {
  id: 'cursorDown',
  label: 'Cursor Down',
  keyboard: [{ key: Key.ArrowDown }, { key: Key.ArrowDown, shift: true }],
  hideFromHelp: true,
  multicursor: false,
  svg: CursorDownIcon,
  canExecute: state => {
    const { cursor } = state

    if (!cursor) return true

    // use default browser behavior in prose mode
    const parentId = head(rootedParentOf(state, cursor))
    const isProseView = attributeEquals(state, parentId, '=view', 'Prose')
    const cursorValue = headValue(state, cursor)
    const isProseMode =
      isProseView && selection.isActive() && cursorValue !== undefined && cursorValue.length - 1 > selection.offset()!
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
        setCursor({ path: nextPath, preserveMulticursor: true }),
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
      ])

      requestAnimationFrame(() => {
        selection.clear()
      })
    } else dispatch(cursorDown())
  }),
} satisfies Command

export default cursorDownCommand
