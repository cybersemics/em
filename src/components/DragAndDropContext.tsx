import { FC, PropsWithChildren } from 'react'
import { DndProvider } from 'react-dnd'
import { HTML5Backend } from 'react-dnd-html5-backend'
import { TouchBackend } from 'react-dnd-touch-backend'
import { isTouch } from '../browser'
import { TIMEOUT_LONG_PRESS_THOUGHT, TOUCH_SLOP } from '../constants'
import scrollContainerStore from '../stores/scrollContainerStore'

/** How far above a popup at the bottom of the screen the drop target is searched for, while the finger is over the popup. Leaves room for the drop hover bar, which is drawn across the top edge of the thought that is hovered, so that the bar is not hidden behind the popup. */
const DROP_ABOVE_POPUP_MARGIN = 8

const options = {
  delayTouchStart: TIMEOUT_LONG_PRESS_THOUGHT,
  preview: true,
  touchSlop: TOUCH_SLOP,
  // Read by the patched TouchBackend, which ends a drag on a native scroll. A window scroll that lands exactly where
  // scroll-at-edge last put the window is scroll-at-edge's own, and must not end the drag it scrolls for (#6281).
  ignoreScroll: () => scrollContainerStore.getState().windowScrollTop === document.documentElement.scrollTop,
  // Read by the patched TouchBackend to find the drop target. While the finger is over a popup at the bottom of the
  // screen, such as the drag-and-drop alert where scroll-at-edge scrolls, search just above the popup instead of under
  // the finger, so that the drop hover is not hidden behind the popup (#6281).
  dropPoint: (x: number, y: number) => {
    const popup = [...document.querySelectorAll('[data-drop-above]')]
      .map(el => el.getBoundingClientRect())
      .find(rect => x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom)
    return popup ? { x, y: popup.top - DROP_ABOVE_POPUP_MARGIN } : { x, y }
  },
}

/** Drag and Drop Provider HOC. */
const DragAndDropContext: FC<PropsWithChildren> = ({ children }) => (
  <DndProvider backend={isTouch ? TouchBackend : HTML5Backend} options={options}>
    {children}
  </DndProvider>
)

export default DragAndDropContext
