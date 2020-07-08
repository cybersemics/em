import { store } from '../store'
import { editableNode, scrollIntoViewIfNeeded } from '../util'

/** Scrolls the cursor into view if needed. If there is no cursor, scroll to top. */
export const scrollCursorIntoView = () => {
  const { cursor } = store.getState()
  if (!cursor) {
    window.scrollTo(0, 0)
  }
  else {
    const editable = editableNode(cursor)
    if (editable) {
      const childElement = editable.closest('.child') as HTMLElement
      scrollIntoViewIfNeeded(childElement)
    }
  }
}
