import { editableNode, scrollIntoViewIfNeeded } from '../util'
import { Thunk } from '../@types'

/** Scrolls the cursor into view if needed. If there is no cursor, scroll to top. */
const scrollCursorIntoView =
  (delay?: number): Thunk =>
  (dispatch, getState) => {
    setTimeout(() => {
      const { cursor } = getState()
      if (!cursor) {
        window.scrollTo(0, 0)
      } else {
        const editable = editableNode(cursor)
        if (editable) {
          const childElement = editable.closest('.child') as HTMLElement
          scrollIntoViewIfNeeded(childElement)
        }
      }
    }, delay)
  }

export default scrollCursorIntoView
