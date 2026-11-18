import { FC, PropsWithChildren } from 'react'
import { DndProvider } from 'react-dnd'
import { HTML5Backend } from 'react-dnd-html5-backend'
import { TouchBackend } from 'react-dnd-touch-backend'
import { isTouch } from '../browser'
import { TIMEOUT_LONG_PRESS_THOUGHT, TOUCH_SLOP } from '../constants'
import scrollContainerStore from '../stores/scrollContainerStore'

const options = {
  delayTouchStart: TIMEOUT_LONG_PRESS_THOUGHT,
  preview: true,
  touchSlop: TOUCH_SLOP,
  // Read by the patched TouchBackend, which ends a drag on a native scroll. A window scroll that lands exactly where
  // scroll-at-edge last put the window is scroll-at-edge's own, and must not end the drag it scrolls for (#6281).
  ignoreScroll: () => scrollContainerStore.getState().windowScrollTop === document.documentElement.scrollTop,
}

/** Drag and Drop Provider HOC. */
const DragAndDropContext: FC<PropsWithChildren> = ({ children }) => (
  <DndProvider backend={isTouch ? TouchBackend : HTML5Backend} options={options}>
    {children}
  </DndProvider>
)

export default DragAndDropContext
