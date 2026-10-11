import ministore from './ministore'

/** The element that scroll-at-edge scrolls during a drag: the nearest [data-scroll-at-edge] ancestor of the touch, such as the Toolbar or the Sidebar, or else the window. Set on each touchmove of a drag and put back to the window when the drag ends, so that it never holds an element after its drag, including one that has since unmounted. */
const scrollContainerStore = ministore<{ element: Window | HTMLElement }>({ element: window })

export default scrollContainerStore
