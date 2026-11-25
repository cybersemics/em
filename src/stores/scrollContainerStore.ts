import ministore from './ministore'

/** The element that scroll-at-edge scrolls during a drag: the nearest [data-scroll-at-edge] ancestor of the touch, such as the Toolbar or the Sidebar, or else the window. Set on each touchmove of a drag and put back to the window when the drag ends, so that it never holds an element after its drag, including one that has since unmounted.
 *
 * The windowScrollTop field is where scroll-at-edge last scrolled the window, or null if it has not scrolled it since the touch began. The touch backend reads it to tell the window's scroll events that scroll-at-edge caused from a native scroll, which ends a drag (see DragAndDropContext). */
const scrollContainerStore = ministore<{ element: Window | HTMLElement; windowScrollTop: number | null }>({
  element: window,
  windowScrollTop: null,
})

export default scrollContainerStore
